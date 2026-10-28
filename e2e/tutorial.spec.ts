import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

// 教程：书架 → 书内阅读（GitBook 式常驻目录）、文章内链接与锚点跳转。
// 锚点要滚到正文列（独立滚动容器）里，只有真实浏览器能验证。

const QTQJ = '/tutorial/qianti-qianjie';
const sidebar = (page: Page) => page.locator('nav[aria-label="教程目录"]:visible');

test('书架列出各本书，点开进入本书首页', async ({ page }) => {
  await page.goto('/tutorial');
  const cards = page.locator('main a[href^="/tutorial/"]');
  await expect(cards.locator('h2')).toHaveText(['千题千解', '写作指南']);
  await cards.filter({ hasText: '千题千解' }).click();
  await expect(page).toHaveURL(new RegExp(`${QTQJ}$`));
  await expect(page.locator('article h1')).toHaveText('前言');
  // 目录顶部可以回到书架
  await sidebar(page).getByRole('link', { name: '数独教程' }).click();
  await expect(page).toHaveURL(/\/tutorial$/);
});

test('目录常驻，点目录切换文章', async ({ page }) => {
  await page.goto(QTQJ);
  await sidebar(page).getByRole('link', { name: '唯余法' }).click();
  await expect(page).toHaveURL(new RegExp(`${QTQJ}/basic/naked-single$`));
  await expect(page.locator('article h1')).toHaveText('唯余法');
  // 切换后目录仍在，当前文章高亮，下面列出本篇小节
  await expect(sidebar(page).getByRole('link', { name: '唯余法' })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar(page).getByRole('list', { name: '本页目录' }).getByRole('link')).toHaveText(['思路', '例题', '小结']);
});

test('文章内链接跳到其他文章的锚点，并滚动到该标题', async ({ page }) => {
  await page.goto('/tutorial/guide/links');
  await page.locator('article').getByRole('link', { name: 'Excel 表格', exact: true }).last().click();
  await expect(page).toHaveURL(/\/tutorial\/guide\/sudoku-text-formats#/);
  const heading = page.locator('[id="excel-表格"]');
  await expect(heading).toBeInViewport();
  // 标题停在正文顶部附近
  await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(200);
});

test('跨书链接：切到另一本书，目录随之换成那本书的', async ({ page }) => {
  await page.goto('/tutorial/guide/links');
  await page.locator('article').getByRole('link', { name: '宫摒除' }).last().click();
  await expect(page).toHaveURL(new RegExp(`${QTQJ}/basic/box-hidden-single$`));
  await expect(page.locator('article h1')).toHaveText('宫摒除');
  await expect(sidebar(page).getByRole('link', { name: '千题千解' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Markdown 基础语法' })).toHaveCount(0);
});

test('盘面说明里的站内链接走路由跳转', async ({ page }) => {
  await page.goto('/tutorial/guide/links');
  await page.locator('.sudoku-figure a[data-router-link]').first().click();
  await expect(page).toHaveURL(new RegExp(`${QTQJ}/basic/naked-single$`));
  await expect(page.locator('article h1')).toHaveText('唯余法');
});

test('上一篇 / 下一篇按本书目录顺序', async ({ page }) => {
  await page.goto('/tutorial/guide/sudoku-figure');
  const pager = page.getByRole('navigation', { name: '上一篇 / 下一篇' });
  await expect(pager.getByRole('link')).toHaveText([/链接/, /坐标与颜色/]);
});

test('不存在的文章 / 书显示提示', async ({ page }) => {
  await page.goto(`${QTQJ}/nope`);
  await expect(page.getByRole('heading', { name: '没有找到这篇文章' })).toBeVisible();
  await page.goto('/tutorial/nope');
  await expect(page.getByRole('heading', { name: '没有找到这本书' })).toBeVisible();
});

test('窄屏：目录收进抽屉，选择文章后自动收起', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(QTQJ);
  await page.getByRole('button', { name: '目录' }).click();
  await sidebar(page).getByRole('link', { name: '宫摒除' }).click();
  await expect(page.locator('article h1')).toHaveText('宫摒除');
  await expect(page.getByRole('dialog')).toBeHidden();
});
