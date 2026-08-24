import { expect, test } from '@playwright/test';

test.describe('Products page', () => {
  test('shows the product grid in English by default', async ({ page }) => {
    await page.goto('/products');

    await expect(page.getByRole('heading', { name: 'Sell' })).toBeVisible();
    await expect(page.getByText(/^\d+ products$/)).toBeVisible();
  });

  test('filters products by search query', async ({ page }) => {
    await page.goto('/products');

    await page.getByPlaceholder('What are you looking for?').fill('laptop');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByRole('heading', { name: 'High-Performance Laptop' })).toBeVisible();
    await expect(page.getByText('Gaming Mouse')).toHaveCount(0);
  });

  test('filters products by category and clears filters', async ({ page }) => {
    await page.goto('/products');

    await page.getByLabel('Category').selectOption('Electronics');
    await expect(page.getByText('Gaming Mouse')).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByRole('button', { name: 'Clear filters' })).toHaveCount(0);
    await expect(page.getByText('Gaming Mouse')).toBeVisible();
  });

  test('filters products by selecting multiple brands', async ({ page }) => {
    await page.goto('/products');

    const brandInput = page.getByLabel('Brand');
    const menu = page.locator('.ms__menu');

    await brandInput.click();
    await brandInput.fill('GamerGadgets');
    await menu.getByText('GamerGadgets', { exact: true }).click();

    await brandInput.fill('SoundWave');
    await menu.getByText('SoundWave', { exact: true }).click();

    await expect(page.getByText('Gaming Mouse')).toBeVisible();
    await expect(page.getByText('Bluetooth Headphones')).toBeVisible();
    await expect(page.getByText('High-Performance Laptop')).toHaveCount(0);
  });

  test('navigates to a product detail page', async ({ page }) => {
    await page.goto('/products');

    await page.locator('.card__link').first().click();

    await expect(page.getByRole('heading', { name: /Specifications/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Electronics' })).toBeVisible();
  });

  test('breadcrumb on a product page filters back to its category', async ({ page }) => {
    await page.goto('/products');

    await page.locator('.card__link').first().click();
    await page.getByRole('link', { name: 'Electronics' }).click();

    await expect(page).toHaveURL(/category=Electronics/);
    await expect(page.getByLabel('Category')).toHaveValue('Electronics');
    await expect(page.getByText('Gaming Mouse')).toHaveCount(0);
  });
});
