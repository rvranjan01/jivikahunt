import { test, expect } from '@playwright/test';
import { TEST_CONTRIBUTOR } from './fixtures/seed.js';

test.describe('Public Portal End-to-End Workflows', () => {
  test('job card appears in public lists and search filters function properly', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify brand header and active job card
    await expect(page.locator('header')).toContainText('JivikaHunt');
    await expect(page.locator('text=Frontend Engineer Trainee').first()).toBeVisible();
    await expect(page.locator('text=TechCorp').first()).toBeVisible();

    // Verify filter interaction via search query input
    const searchInput = page.locator('input[placeholder*="Search title, company"]');
    await searchInput.fill('Frontend');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/q=Frontend/);
    await expect(page.locator('text=Frontend Engineer Trainee').first()).toBeVisible();

    // Filter by work mode: Remote
    await page.goto('/jobs?workMode=remote');
    await expect(page.locator('text=Frontend Engineer Trainee').first()).toBeVisible();
  });

  test('job detail page displays correct hierarchy, author box, apply link, and share widget', async ({
    page,
  }) => {
    await page.goto('/jobs/frontend-engineer-trainee-at-techcorp');

    // Header & Badges
    await expect(page.locator('h1')).toContainText('Frontend Engineer Trainee');
    await expect(page.locator('text=TechCorp').first()).toBeVisible();

    // Posted by attribution
    await expect(
      page.locator(`text=Posted by ${TEST_CONTRIBUTOR.displayName}, JivikaHunt Team`)
    ).toBeVisible();

    // Apply button security attributes (rel nofollow noopener noreferrer, new tab)
    const applyBtn = page.locator('a:has-text("Apply on Official Company Site")');
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toHaveAttribute('target', '_blank');
    await expect(applyBtn).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    await expect(applyBtn).toHaveAttribute('href', 'https://techcorp.example.com/careers/frontend');

    // Share buttons
    await expect(page.locator('a[aria-label="Share on WhatsApp"]')).toBeVisible();
    await expect(page.locator('a[aria-label="Share on Telegram"]')).toBeVisible();
    await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();

    // Author box
    await expect(page.locator(`text=${TEST_CONTRIBUTOR.displayName}`).last()).toBeVisible();
    await expect(page.locator('text=Technical Recruiter and Career Mentor.')).toBeVisible();
    await expect(
      page.locator('aside[aria-label="Job curator details"]').locator('text=contact@jivikahunt.com')
    ).toBeVisible();

    // Contributor personal email must NEVER be exposed
    const pageContent = await page.content();
    expect(pageContent).not.toContain(TEST_CONTRIBUTOR.email);
  });

  test('visitor can submit a broken link report', async ({ page }) => {
    await page.goto('/jobs/frontend-engineer-trainee-at-techcorp');

    // Open Report Modal using dedicated button
    const reportBtn = page.locator('#report-broken-link-btn');
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();
    await expect(page.locator('text=Report Listing Issue')).toBeVisible();

    // Select reason & fill note
    await page.selectOption('select', 'broken_link');
    await page.fill('#report-note', 'Careers page returns 404 Not Found error.');

    await page.click('button:has-text("Submit Report")');

    // Verify submission confirmation
    await expect(page.locator('text=Report submitted successfully')).toBeVisible();
  });

  test('visitor bookmarks jobs in localStorage and manages saved list', async ({ page }) => {
    // 1. Visit job detail and click heart save button
    await page.goto('/jobs/frontend-engineer-trainee-at-techcorp');

    const saveButton = page.locator('button[aria-label="Save this job"]').first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Button updates to Saved state
    await expect(page.locator('button[aria-label="Remove from saved jobs"]').first()).toBeVisible();

    // 2. Navigate to /saved
    await page.goto('/saved');
    await expect(page.locator('h1')).toContainText('Saved Jobs');
    await expect(page.locator('text=Frontend Engineer Trainee').first()).toBeVisible();

    // 3. Clear all saved jobs
    await page.click('button:has-text("Clear all")');
    await expect(page.locator('text=No saved jobs yet')).toBeVisible();
  });

  test('expired job displays expired notice, noindex tag, and related jobs', async ({ page }) => {
    await page.goto('/jobs/expired-backend-intern-at-oldcorp');

    // Notice banner
    await expect(page.locator('text=This job listing has expired')).toBeVisible();

    // Noindex robots tag in page head
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', /noindex/);

    // Related jobs section rendered
    await expect(page.locator('text=Related Opportunities')).toBeVisible();
  });

  test('cookie consent banner gates ads and respects user preferences', async ({
    page,
    context,
  }) => {
    // Clear cookies and storage for fresh visitor
    await context.clearCookies();
    await page.goto('/');

    // Consent banner is visible on initial visit
    const banner = page.locator('aside[aria-label="Cookie consent banner"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('We respect your privacy');

    // Click Accept
    await banner.locator('button:has-text("Accept")').click();

    // Banner is dismissed
    await expect(banner).not.toBeVisible();

    // Verify localStorage has accepted state
    const consentValue = await page.evaluate(() => localStorage.getItem('jh_cookie_consent'));
    expect(consentValue).toBe('accepted');
  });
});
