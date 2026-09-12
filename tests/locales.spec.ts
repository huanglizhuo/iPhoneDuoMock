import { test, expect } from '@playwright/test';

for (const [locale, code, mode] of [
  ['en-US', 'en', 'Screenshots'],
  ['zh-CN', 'zh', '截图制作'],
  ['ja-JP', 'ja', 'スクリーンショット'],
  ['fr-CA', 'fr', 'Captures'],
]) {
  test(`first visit follows ${locale}`, async ({ browser }) => {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5173/');
    const select = page.locator('select.lang-switch');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue(code);
    await expect(page.getByRole('button', { name: mode, exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', code === 'zh' ? 'zh-Hans' : code);
    await context.close();
  });
}
test('manual choice persists and explicit URLs win without losing project edits', async ({
  page,
}) => {
  await page.goto('/ja/');
  await expect(page.locator('select.lang-switch')).toHaveValue('ja');
  const project = page.getByRole('textbox', { name: 'プロジェクト名', exact: true });
  await project.fill('Locale switching project');
  await page.locator('select.lang-switch').selectOption('fr');
  await expect(page.getByRole('textbox', { name: 'Nom du projet', exact: true })).toHaveValue(
    'Locale switching project',
  );
  await expect(page).toHaveURL(/\/fr\/$/);
  await expect(
    page.getByRole('link', { name: 'Guide d’utilisation', exact: true }),
  ).toHaveAttribute('href', '/fr/guide/');
  await page.goto('/');
  await expect(page.locator('select.lang-switch')).toHaveValue('fr');
  await page.goto('/zh/');
  await expect(page.locator('select.lang-switch')).toHaveValue('zh');
  await page.locator('select.lang-switch').selectOption('en');
  await page.reload();
  await expect(page.locator('select.lang-switch')).toHaveValue('en');
});
