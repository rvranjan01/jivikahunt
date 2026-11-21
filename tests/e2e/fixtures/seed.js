/**
 * @file tests/e2e/fixtures/seed.js
 * @description Seeds standard test fixtures into the test database before running Playwright tests.
 */

import { connectToDatabase } from '../../../lib/db.js';
import User from '../../../models/User.js';
import Job from '../../../models/Job.js';
import Guide from '../../../models/Guide.js';
import Report from '../../../models/Report.js';
import LoginAttempt from '../../../models/LoginAttempt.js';
import bcrypt from 'bcryptjs';

export const TEST_ADMIN = {
  email: 'e2e-admin@jivikahunt.com',
  password: 'AdminPassword123!',
  displayName: 'Founder Admin',
  role: 'admin',
};

export const TEST_CONTRIBUTOR = {
  email: 'e2e-contributor@jivikahunt.com',
  password: 'ContributorPass123!',
  displayName: 'Priya Sharma',
  role: 'contributor',
};

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Seeds required test data for Playwright test runs.
 */
export async function seedTestData() {
  await connectToDatabase();

  // Reset rate limits and test reports
  await LoginAttempt.deleteMany({});
  await Report.deleteMany({});
  await Job.deleteMany({ title: /^Cloud Support Associate/ });

  // 1. Seed or update Admin

  const adminPasswordHash = await hashPassword(TEST_ADMIN.password);
  let admin = await User.findOne({ email: TEST_ADMIN.email });
  if (!admin) {
    admin = await User.create({
      name: 'Founder Admin',
      displayName: TEST_ADMIN.displayName,
      email: TEST_ADMIN.email,
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
      tokenVersion: 1,
      bio: 'Administrator at JivikaHunt team.',
    });
  } else {
    admin.passwordHash = adminPasswordHash;
    admin.isActive = true;
    admin.mustChangePassword = false;
    await admin.save();
  }

  // 2. Seed or update Contributor
  const contribPasswordHash = await hashPassword(TEST_CONTRIBUTOR.password);
  let contrib = await User.findOne({ email: TEST_CONTRIBUTOR.email });
  if (!contrib) {
    contrib = await User.create({
      name: 'Priya Sharma',
      displayName: TEST_CONTRIBUTOR.displayName,
      email: TEST_CONTRIBUTOR.email,
      passwordHash: contribPasswordHash,
      role: 'contributor',
      isActive: true,
      mustChangePassword: false,
      tokenVersion: 1,
      bio: 'Technical Recruiter and Career Mentor.',
    });
  } else {
    contrib.passwordHash = contribPasswordHash;
    contrib.isActive = true;
    contrib.mustChangePassword = false;
    await contrib.save();
  }

  // 3. Seed active job
  const activeSlug = 'frontend-engineer-trainee-at-techcorp';
  await Job.deleteOne({ slug: activeSlug });
  await Job.create({
    title: 'Frontend Engineer Trainee',
    slug: activeSlug,
    company: {
      name: 'TechCorp',
      slug: 'techcorp',
      description: 'TechCorp is a high-growth cloud SaaS enterprise.',
    },
    type: 'fresher',
    workMode: 'remote',
    locations: ['Bengaluru', 'Remote'],
    batches: [2024, 2025],
    salary: '6 - 8 LPA',
    skills: ['react', 'javascript', 'tailwind', 'node'],

    summary:
      'Exciting opportunity for college freshers to join TechCorp frontend team building next-generation web applications.',
    responsibilities: [
      'Build performant React components',
      'Collaborate with backend engineers and UI designers',
    ],
    eligibility: [
      'B.Tech / BE / MCA in Computer Science or related fields',
      'Solid foundation in JavaScript and modern web standards',
    ],
    applyUrl: 'https://techcorp.example.com/careers/frontend',
    lastDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
    status: 'published',
    views: 120,
    createdBy: contrib._id,
    postedByName: contrib.displayName,
  });

  // 4. Seed expired job
  const expiredSlug = 'expired-backend-intern-at-oldcorp';
  await Job.deleteOne({ slug: expiredSlug });
  await Job.create({
    title: 'Expired Backend Intern',
    slug: expiredSlug,
    company: {
      name: 'OldCorp',
      slug: 'oldcorp',
      description: 'Legacy software enterprise.',
    },
    type: 'intern',
    workMode: 'onsite',
    locations: ['Pune'],
    batches: [2024],
    salary: '₹20,000/month',
    skills: ['node', 'sql'],
    summary:
      'An expired internship posting strictly for testing deadline handling and expired notice banner rendering.',
    applyUrl: 'https://oldcorp.example.com/careers/intern',
    lastDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days past
    status: 'published',
    views: 45,
    createdBy: admin._id,
    postedByName: admin.displayName,
  });

  // 5. Seed sample guide
  const guideSlug = 'top-10-interview-questions-freshers';
  await Guide.deleteOne({ slug: guideSlug });
  await Guide.create({
    title: 'Top 10 Technical Interview Questions for Freshers',
    slug: guideSlug,
    summary:
      'A comprehensive walkthrough of the top 10 technical questions asked in fresher software engineer interviews.',
    body: '## Overview\n\nPreparation is key to cracking technical interviews.\n\n### 1. Data Structures\n\nUnderstand Arrays, Maps, and Sets.',
    status: 'published',
    readingTime: 3,
    createdBy: admin._id,
    postedByName: admin.displayName,
  });

  return { admin, contrib };
}

/**
 * CLI runner for manual test database seeding.
 */
if (process.argv[1]?.endsWith('seed.js')) {
  seedTestData()
    .then(() => {
      console.info('Test fixtures seeded successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed fixtures:', err);
      process.exit(1);
    });
}
