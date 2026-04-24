import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/SIGAT-ES/);
});

test('page loads', async ({ page }) => {
  await page.goto('/');

  // Check if the root div is present
  await expect(page.locator('#root')).toBeVisible();
});