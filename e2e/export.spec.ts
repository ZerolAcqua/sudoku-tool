import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// 先画一点东西，确保导出的不是空盘
async function drawSomething(page: Page) {
  await page.goto('/draw');
  const board = page.locator('svg.sudoku-svg');
  await expect(board).toBeVisible();
  const box = (await board.boundingBox())!;
  const cell = box.width / 920 * 100;
  await page.mouse.click(box.x + cell * 0.6, box.y + cell * 0.6);
  await expect(board.locator('rect[fill="#e5484d"]')).toHaveCount(1);
}

async function exportVia(page: Page, item: string) {
  await page.getByRole('button', { name: '导出' }).click();
  await page.getByRole('menuitem', { name: item }).click();
}

test('导出 SVG：下载独立可用的 SVG 文件', async ({ page }) => {
  await drawSomething(page);
  const [download] = await Promise.all([page.waitForEvent('download'), exportVia(page, '下载 SVG')]);
  expect(download.suggestedFilename()).toMatch(/^sudoku-drawing-\d{4}-\d{2}-\d{2}\.svg$/);

  const text = await readFile((await download.path())!, 'utf8');
  expect(text.startsWith('<?xml')).toBe(true);
  // 颜色已内联：文件脱离页面后不依赖 CSS 变量
  expect(text).not.toMatch(/(fill|stroke)="var\(/);
  // 高亮颜色被保留
  expect(text).toContain('#e5484d');
  // 浏览器能把它当作独立 XML 解析（无重复属性等错误）
  const parsed = await page.evaluate((svg) => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return doc.documentElement.tagName;
  }, text);
  expect(parsed).toBe('svg');
  await expect(page.getByText('已导出 SVG')).toBeVisible();
});

test('导出 PNG：下载 PNG 图片', async ({ page }) => {
  await drawSomething(page);
  const [download] = await Promise.all([page.waitForEvent('download'), exportVia(page, '下载 PNG')]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const bytes = await readFile((await download.path())!);
  // PNG 文件头
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(bytes.length).toBeGreaterThan(10_000);
  await expect(page.getByText('已导出 PNG')).toBeVisible();
});

test('复制图片：剪贴板中是 PNG', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await drawSomething(page);
  await exportVia(page, '复制图片');
  await expect(page.getByText('已复制图片到剪贴板')).toBeVisible();

  const clip = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    const blob = await item!.getType('image/png');
    return { types: item!.types, size: blob.size };
  });
  expect(clip.types).toContain('image/png');
  expect(clip.size).toBeGreaterThan(10_000);
});
