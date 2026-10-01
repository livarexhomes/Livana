import { test } from 'playwright/test';

test('homepage renders', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER_CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message));
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/livarex-home.png', fullPage: true });
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();
  console.log('PAGE_TITLE:', title);
  console.log('BODY_SNIPPET:', bodyText.slice(0, 500));
  console.log('HAS_CONTENT:', (bodyText.trim().length > 0).toString());
});
