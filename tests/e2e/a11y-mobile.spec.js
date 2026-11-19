import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & Mobile Viewport Audits', () => {
  test('home page passes axe accessibility scan with zero critical violations', async ({
    page,
  }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('job detail page passes axe accessibility scan with zero critical violations', async ({
    page,
  }) => {
    await page.goto('/jobs/frontend-engineer-trainee-at-techcorp');
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('guides hub passes axe accessibility scan with zero critical violations', async ({
    page,
  }) => {
    await page.goto('/guides');
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('admin login page passes axe accessibility scan with zero critical violations', async ({
    page,
  }) => {
    await page.goto('/admin/login');
    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  test('mobile viewport renders responsive drawer and navigation cleanly', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Applies to mobile emulation projects only');

    await page.goto('/');

    const toggleBtn = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(toggleBtn).toBeVisible();

    // Open mobile menu
    await toggleBtn.click();

    // Verify navigation links inside mobile menu
    const mobileNav = page.locator('div.md\\:hidden nav');
    await expect(mobileNav.locator('a:has-text("Freshers")')).toBeVisible();
    await expect(mobileNav.locator('a:has-text("Guides")')).toBeVisible();
    await expect(mobileNav.locator('a:has-text("Saved")')).toBeVisible();

    // Close mobile menu
    await toggleBtn.click();
    await expect(mobileNav).not.toBeVisible();
  });
});
