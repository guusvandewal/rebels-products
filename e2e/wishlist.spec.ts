import { expect, test } from '@playwright/test';

test.describe('Wishlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('adding a product updates the header badge and the wishlist page', async ({ page }) => {
    const firstCard = page.locator('.card').first();
    const productName = await firstCard.locator('.card__name').innerText();

    await firstCard.getByRole('button', { name: /add .* to wishlist/i }).click();

    await expect(page.locator('.site-nav__badge')).toHaveText('1');

    await page.getByRole('link', { name: /Wishlist/ }).click();
    await expect(page.getByRole('heading', { name: 'Wishlist' })).toBeVisible();
    await expect(page.getByText(productName)).toBeVisible();

    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nothing saved' })).toBeVisible();
    await expect(page.locator('.site-nav__badge')).toHaveCount(0);
  });
});
