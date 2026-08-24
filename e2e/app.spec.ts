import { test, expect } from '@playwright/test';

test('home page loads and displays hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Skillable Access Control Policy Builder');
  await expect(page.locator('text=Start New Policy')).toBeVisible();
});

test('navigation works', async ({ page }) => {
  await page.goto('/');
  await page.click('a:has-text("Examples")');
  await expect(page.locator('h2')).toContainText('Official Example Explorer');
});

test('example explorer shows Azure patterns', async ({ page }) => {
  await page.goto('/#/explorer');
  await expect(page.locator('text=Block All VMs')).toBeVisible();
});

test('docs page shows evidence classifications', async ({ page }) => {
  await page.goto('/#/docs');
  await expect(page.locator('text=Evidence Standard')).toBeVisible();
  await expect(page.locator('text=Class A')).toBeVisible();
});

test('about page shows source version', async ({ page }) => {
  await page.goto('/#/about');
  await expect(page.locator('text=Source version')).toBeVisible();
  await expect(page.locator('text=LearnOnDemandSystems/labauthor')).toBeVisible();
});

test('theme toggle works', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const initialTheme = await html.getAttribute('data-theme');
  await page.click('.theme-toggle');
  const newTheme = await html.getAttribute('data-theme');
  expect(newTheme).not.toBe(initialTheme);
});
