import { test, expect } from '@playwright/test';
import { generateSync } from 'otplib';
import { TEST_ADMIN, TEST_CONTRIBUTOR } from './fixtures/seed.js';

test.describe('Admin & Contributor End-to-End Workflows', () => {
  test.describe.configure({ mode: 'serial' });

  test('admin login requires credentials and valid TOTP 2FA code', async ({ page }) => {
    await page.goto('/admin/login');

    // 1. Verify invalid credentials rejection (use unseeded email so admin is not locked out)
    await page.fill('#email', 'unknown-user@jivikahunt.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password.')).toBeVisible();

    // 2. Supply valid password -> triggers 2FA prompt
    await page.fill('#email', TEST_ADMIN.email);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');

    // 2FA container becomes visible
    await expect(page.locator('#totpCode')).toBeVisible();
    await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();

    // 3. Submit invalid 2FA code
    await page.fill('#totpCode', '000000');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid 2FA code')).toBeVisible();

    // 4. Submit genuine TOTP code generated using otplib
    const validCode = generateSync({ secret: TEST_ADMIN.totpSecret });
    await page.fill('#totpCode', validCode);
    await page.click('button[type="submit"]');

    // Verify successful redirection to admin dashboard
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator('h1:has-text("Welcome back, Founder Admin!")')).toBeVisible();
  });

  test('admin creates a new contributor account', async ({ page }) => {
    // Log in as Admin first
    await page.goto('/admin/login');
    await page.fill('#email', TEST_ADMIN.email);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('#totpCode')).toBeVisible();
    const validCode = generateSync({ secret: TEST_ADMIN.totpSecret });
    await page.fill('#totpCode', validCode);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin$/);

    // Navigate to /admin/users
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('Contributors & Team Access');

    // Open Invite modal
    await page.click('button:has-text("+ Invite Contributor")');
    await expect(page.locator('text=Invite New Contributor')).toBeVisible();

    const uniqueEmail = `test-contrib-${Date.now()}@jivikahunt.com`;
    const uniqueName = `Kavita Nair ${Date.now()}`;
    await page.fill('input[placeholder="Aditi Sharma"]', uniqueName);
    await page.fill('input[placeholder="Aditi S."]', 'Kavita N.');
    await page.fill('input[placeholder="aditi@example.com"]', uniqueEmail);

    await page.click('button:has-text("Send Invitation")');

    // Verify success modal
    await expect(page.locator('text=Contributor Created Successfully!')).toBeVisible();
    await expect(page.locator(`text=${uniqueEmail}`).first()).toBeVisible();

    await page.click('button:has-text("Close")');

    // Verify new contributor appears in list
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();
  });

  test('contributor logs in, sees ChatGPT helper, and publishes a new job', async ({ page }) => {
    // Contributor login does not require 2FA
    await page.goto('/admin/login');
    await page.fill('#email', TEST_CONTRIBUTOR.email);
    await page.fill('#password', TEST_CONTRIBUTOR.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.locator(`h1:has-text("Welcome back, ${TEST_CONTRIBUTOR.displayName}!")`)
    ).toBeVisible();

    // Navigate to post new job
    await page.goto('/admin/jobs/new');
    await expect(page.locator('h1')).toContainText('Post a New Job');

    // Verify ChatGPT Extraction Prompt panel exists
    await expect(page.locator('text=ChatGPT Extraction Prompt')).toBeVisible();
    await expect(page.locator('button:has-text("Copy ChatGPT Prompt")')).toBeVisible();

    // Fill job fields
    const testJobTitle = `Cloud Support Associate ${Date.now()}`;
    await page.fill('input[placeholder="e.g. Graduate Software Engineer"]', testJobTitle);
    await page.fill('input[placeholder="e.g. Infosys"]', 'CloudSolutions India');
    await page.selectOption('select:has(option[value="fresher"])', 'fresher');
    await page.selectOption('select:has(option[value="remote"])', 'remote');
    await page.fill('input[placeholder="e.g. Bengaluru, Pune, Hyderabad"]', 'Hyderabad, Remote');
    await page.fill(
      'textarea[placeholder="Concise overview explaining the role, department, and opportunity..."]',
      'Exciting opportunity for fresh college graduates to join CloudSolutions India building and managing robust cloud architecture for enterprise clients.'
    );
    await page.fill(
      'input[placeholder="https://careers.company.com/jobs/12345"]',
      'https://cloudsolutions.example.com/careers/associate'
    );

    // Publish immediately
    await page.click('button:has-text("Publish Immediately")');

    // Redirect to /admin/jobs and verify the new job is in the list
    await expect(page).toHaveURL(/\/admin\/jobs$/);

    await expect(page.locator(`text=${testJobTitle}`)).toBeVisible();

    await expect(page.locator('span:has-text("published")').first()).toBeVisible();
  });
});
