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

test('professional mode validates and merges custom JSON', async ({ page }) => {
  // Navigate to the new policy wizard
  await page.goto('/');
  await page.click('a:has-text("Start New Policy")');

  // Step 1: Project — enter a project name
  await page.fill('input', 'E2E Test Policy');
  await page.click('button:has-text("Next")');

  // Step 2: Platform — select AWS
  await page.click('text=Amazon Web Services');
  await page.click('button:has-text("Next")');

  // Step 3: Purpose — skip
  await page.click('button:has-text("Next")');

  // Step 4: Deployment — skip
  await page.click('button:has-text("Next")');

  // Step 5: Region — skip
  await page.click('button:has-text("Next")');

  // Step 6: Services — skip (no services)
  await page.click('button:has-text("Next")');

  // Step 7: Operations — skip
  await page.click('button:has-text("Next")');

  // Step 8: Review — Professional Mode section should be visible
  await expect(page.locator('text=Professional Mode')).toBeVisible();

  // Paste invalid JSON and see a danger alert
  const textarea = page.locator('#professional-json');
  await textarea.fill('{ not valid json');
  await expect(page.locator('.alert-danger:has-text("not valid JSON")')).toBeVisible();

  // Paste a valid AWS IAM statement and see a success alert
  await textarea.fill(
    JSON.stringify({ Action: 'logs:CreateLogGroup', Resource: '*', Effect: 'Allow' }, null, 2),
  );
  await expect(page.locator('.alert-success')).toBeVisible();

  // Generate the policy
  await page.click('button:has-text("Generate Policy")');

  // On the Review page, the Custom Additions card should appear
  await expect(page.locator('text=Custom Additions')).toBeVisible();
  await expect(page.locator('.evidence-F')).toBeVisible();
});

test('professional mode rejects AWS statement without Effect', async ({ page }) => {
  await page.goto('/');
  await page.click('a:has-text("Start New Policy")');
  await page.fill('input', 'Semantic Validation Test');
  await page.click('button:has-text("Next")');
  await page.click('text=Amazon Web Services');
  await page.click('button:has-text("Next")');
  // Skip steps 3-7
  for (let i = 0; i < 5; i++) {
    await page.click('button:has-text("Next")');
  }

  // Paste a statement missing Effect
  const textarea = page.locator('#professional-json');
  await textarea.fill(JSON.stringify({ Action: 's3:GetObject', Resource: '*' }));
  await expect(page.locator('.alert-danger:has-text("Effect")')).toBeVisible();
});
