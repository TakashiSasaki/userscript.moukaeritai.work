import { test, expect } from '@playwright/test';
import path from 'path';

test('Check visually', async ({ page }) => {
  await page.goto('file://' + path.resolve(__dirname, 'gemini.google.com/index.html'));
  await page.screenshot({ path: 'index_test_gemini.png', fullPage: true });
});