import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicJobs, getPublicJobBySlug, getRelatedJobs } from '@/lib/publicJobs';
import JobDetailPage, { revalidate, generateMetadata } from '@/app/(public)/jobs/[slug]/page';

vi.mock('@/lib/db', () => ({
  default: vi.fn().mockResolvedValue(true),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

let mockJobs = [];
let mockUsers = [];

vi.mock('@/models/Job', () => ({
  default: {
    find: vi.fn().mockImplementation((query) => {
      let filtered = [...mockJobs];

      if (query?.status) {
        if (typeof query.status === 'string') {
          filtered = filtered.filter((j) => j.status === query.status);
        } else if (query.status.$in) {
          filtered = filtered.filter((j) => query.status.$in.includes(j.status));
        }
      }

      if (query?._id?.$ne) {
        filtered = filtered.filter((j) => j._id.toString() !== query._id.$ne.toString());
      }

      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve(filtered),
            }),
          }),
          limit: (n) => ({
            lean: () => Promise.resolve(filtered.slice(0, n)),
          }),
        }),
      };
    }),
    countDocuments: vi.fn().mockImplementation((query) => {
      let filtered = [...mockJobs];
      if (query?.status) {
        filtered = filtered.filter((j) => j.status === query.status);
      }
      return Promise.resolve(filtered.length);
    }),
    findOne: vi.fn().mockImplementation((query) => {
      const match = mockJobs.find((j) => {
        if (query?.slug && j.slug !== query.slug) return false;
        if (query?.status?.$in && !query.status.$in.includes(j.status)) return false;
        if (typeof query?.status === 'string' && j.status !== query.status) return false;
        return true;
      });

      return {
        lean: () => Promise.resolve(match || null),
      };
    }),
  },
}));

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn().mockImplementation((id) => {
      const user = mockUsers.find((u) => u._id.toString() === id.toString());
      return {
        select: (fields) => ({
          lean: () => {
            if (!user) return Promise.resolve(null);
            // Strictly simulate field selection
            if (fields === 'displayName bio photoId') {
              return Promise.resolve({
                _id: user._id,
                displayName: user.displayName,
                bio: user.bio,
                photoId: user.photoId,
              });
            }
            return Promise.resolve(user);
          },
        }),
      };
    }),
  },
}));

describe('Public Jobs Data Access & Privacy (lib/publicJobs.js)', () => {
  beforeEach(() => {
    mockUsers = [
      {
        _id: 'user_contributor_1',
        name: 'Jane Doe',
        displayName: 'Jane D.',
        email: 'private.jane@example.com', // MUST NEVER BE LEAKED
        bio: 'Tech recruiter and career mentor for graduates.',
        photoId: 'img_avatar_1',
        role: 'contributor',
      },
    ];

    mockJobs = [
      {
        _id: 'job_active_1',
        title: 'Junior React Developer',
        slug: 'junior-react-developer-at-techcorp',
        company: { name: 'TechCorp', slug: 'techcorp' },
        type: 'fresher',
        workMode: 'remote',
        locations: ['Bengaluru'],
        batches: [2024, 2025],
        skills: ['React', 'JavaScript'],
        summary: 'Exciting opportunity for junior frontend developers to join our team.',
        applyUrl: 'https://techcorp.example.com/apply',
        lastDate: new Date(Date.now() + 86400000 * 5), // 5 days in future
        status: 'published',
        createdBy: 'user_contributor_1',
        postedByName: 'Jane D.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'job_expired_1',
        title: 'Backend Node Intern',
        slug: 'backend-node-intern-at-acme',
        company: { name: 'Acme Corp', slug: 'acme-corp' },
        type: 'intern',
        workMode: 'onsite',
        locations: ['Pune'],
        batches: [2025],
        skills: ['Node.js', 'Express'],
        summary: 'Paid internship for final year students interested in backend development.',
        applyUrl: 'https://acme.example.com/apply',
        lastDate: new Date('2020-01-01'), // Long expired
        status: 'published',
        createdBy: 'user_contributor_1',
        postedByName: 'Jane D.',
        createdAt: new Date('2020-01-01'),
        updatedAt: new Date('2020-01-01'),
      },
      {
        _id: 'job_draft_1',
        title: 'Unpublished QA Engineer',
        slug: 'unpublished-qa-engineer-at-acme',
        company: { name: 'Acme Corp', slug: 'acme-corp' },
        type: 'experienced',
        workMode: 'hybrid',
        locations: ['Hyderabad'],
        summary: 'Unpublished internal draft position awaiting approval.',
        applyUrl: 'https://acme.example.com/qa',
        status: 'draft',
        createdBy: 'user_contributor_1',
        postedByName: 'Jane D.',
      },
    ];
  });

  it('should list published non-expired jobs and filter out expired jobs', async () => {
    const { jobs, pagination } = await getPublicJobs();

    expect(pagination.total).toBe(2); // count of published in mock
    expect(jobs).toHaveLength(1); // expired job is filtered out in memory
    expect(jobs[0].title).toBe('Junior React Developer');
    expect(jobs.some((j) => j._id === 'job_expired_1')).toBe(false);
  });

  it('should retrieve a published job by slug and protect contributor privacy', async () => {
    const result = await getPublicJobBySlug('junior-react-developer-at-techcorp');

    expect(result).not.toBeNull();
    expect(result.job.title).toBe('Junior React Developer');
    expect(result.isExpired).toBe(false);

    // CRITICAL: Contributor email must NEVER be returned or exposed
    expect(result.author.displayName).toBe('Jane D.');
    expect(result.author.bio).toBe('Tech recruiter and career mentor for graduates.');
    expect(result.author.photoId).toBe('img_avatar_1');
    expect(result.author.email).toBeUndefined();
  });

  it('should flag expired jobs with isExpired: true on detail view', async () => {
    const result = await getPublicJobBySlug('backend-node-intern-at-acme');

    expect(result).not.toBeNull();
    expect(result.job.title).toBe('Backend Node Intern');
    expect(result.isExpired).toBe(true);
  });

  it('should return null for draft, scheduled, or unpublished jobs', async () => {
    const result = await getPublicJobBySlug('unpublished-qa-engineer-at-acme');
    expect(result).toBeNull();
  });

  it('should return related opportunities matching skills or type', async () => {
    // Add another published job
    mockJobs.push({
      _id: 'job_related_1',
      title: 'React Native Fresher',
      slug: 'react-native-fresher-at-startup',
      company: { name: 'Startup', slug: 'startup' },
      type: 'fresher',
      workMode: 'remote',
      locations: ['Bengaluru'],
      skills: ['React', 'React Native'],
      summary: 'Build mobile apps with React Native.',
      applyUrl: 'https://startup.example.com/apply',
      lastDate: new Date(Date.now() + 86400000 * 10),
      status: 'published',
      createdBy: 'user_contributor_1',
      postedByName: 'Jane D.',
    });

    const currentJob = mockJobs[0];
    const related = await getRelatedJobs(currentJob, 4);

    expect(related).toBeDefined();
    // Should exclude current job itself
    expect(related.some((j) => j._id === currentJob._id)).toBe(false);
  });

  it('should export revalidate = 300 and set robots noindex for expired job metadata', async () => {
    expect(revalidate).toBe(300);

    // Active job metadata
    const activeMeta = await generateMetadata({
      params: Promise.resolve({ slug: 'junior-react-developer-at-techcorp' }),
    });
    expect(activeMeta.robots).toEqual({ index: true, follow: true });

    // Expired job metadata: MUST have index: false
    const expiredMeta = await generateMetadata({
      params: Promise.resolve({ slug: 'backend-node-intern-at-acme' }),
    });
    expect(expiredMeta.robots).toEqual({ index: false, follow: true });
  });

  it('should render expired alert banner when accessing an expired job page', async () => {
    // Expired job should show role="alert" banner
    const expiredPage = await JobDetailPage({
      params: Promise.resolve({ slug: 'backend-node-intern-at-acme' }),
    });

    expect(expiredPage).toBeDefined();
    const expiredBanner = expiredPage.props.children[1];
    expect(expiredBanner).toBeTruthy();
    expect(expiredBanner.props.role).toBe('alert');
    expect(expiredBanner.props.className).toContain('bg-rose-50');

    // Active job should NOT show expired banner
    const activePage = await JobDetailPage({
      params: Promise.resolve({ slug: 'junior-react-developer-at-techcorp' }),
    });
    const activeBanner = activePage.props.children[1];
    expect(activeBanner).toBeFalsy();
  });
});
