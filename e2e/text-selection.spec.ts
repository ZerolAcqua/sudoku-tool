import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

// 在元素上从左到右拖动鼠标，返回浏览器实际得到的选区文本
async function dragSelect(page: Page, target: Locator): Promise<string> {
  const box = (await target.boundingBox())!;
  const y = box.y + box.height / 2;
  await page.evaluate(() => getSelection()?.removeAllRanges());
  await page.mouse.move(box.x + 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2, y, { steps: 8 });
  await page.mouse.up();
  return page.evaluate(() => getSelection()?.toString() ?? '');
}

test.describe('工具页面：禁止拖动选中文本', () => {
  for (const [path, name] of [
    ['/', '首页'],
    ['/practice', '唯余练习'],
    ['/draw', '绘图工具'],
    ['/solver', '数独识别'],
  ]) {
    test(`${name}（${path}）`, async ({ page }) => {
      await page.goto(path);
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
      expect(await dragSelect(page, heading)).toBe('');
      // 描述 / 正文段落同样不可选
      expect(await dragSelect(page, page.locator('main p').first())).toBe('');
    });
  }
});

test('文档页面（教程）：可以拖动选中文本', async ({ page }) => {
  await page.goto('/tutorial/qianti-qianjie');
  expect((await dragSelect(page, page.locator('article p').first())).length).toBeGreaterThan(5);
});

test('表单控件始终可以选中与编辑', async ({ page }) => {
  await page.goto('/draw');
  await page.getByRole('button', { name: '导入题目' }).click();
  const textarea = page.getByRole('dialog').locator('textarea');
  await textarea.fill('530070000');
  await textarea.selectText();
  const selected = await textarea.evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd));
  expect(selected).toBe('530070000');
});
