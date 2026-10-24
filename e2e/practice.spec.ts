import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const numpadKey = (page: Page, n: number) => page.getByRole('button', { name: `输入 ${n}` });
const questionNo = async (page: Page) =>
  Number((await page.locator('aside').getByText(/第 \d+ 题/).textContent())!.match(/\d+/)![0]);

test.describe('唯余练习：盘面手势输入', () => {
  // 方位与九宫键盘一致：点按 5，滑动到哪个方位就是哪个数字
  for (const { name, dx, dy, digit } of [
    { name: '点按', dx: 0, dy: 0, digit: 5 },
    { name: '左划', dx: -60, dy: 0, digit: 4 },
    { name: '右上', dx: 50, dy: -50, digit: 9 },
    { name: '下划', dx: 0, dy: 60, digit: 2 },
  ]) {
    test(`${name} → ${digit}`, async ({ page }) => {
      await page.goto('/practice');
      const box = (await page.locator('svg.sudoku-svg').boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const before = await questionNo(page);

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + dx, y + dy, { steps: 6 });
      // 手势进行中：数字键盘高亮对应键（手势图例）
      await expect(numpadKey(page, digit)).toHaveClass(/bg-board-focus/);
      await page.mouse.up();

      // 抬起即提交：进入下一题，高亮消失
      await expect.poll(() => questionNo(page)).toBe(before + 1);
      await expect(numpadKey(page, digit)).not.toHaveClass(/bg-board-focus/, { timeout: 1000 });
    });
  }
});

test.describe('一屏布局', () => {
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
  ]) {
    test(`${width}×${height} 下各功能页无滚动条，练习页侧栏与盘面等高`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      for (const path of ['/', '/practice', '/draw', '/solver', '/tutorial']) {
        await page.goto(path);
        await expect(page.locator('main')).toBeVisible();
        const overflow = await page.evaluate(() => {
          const main = document.querySelector('main')!;
          return {
            main: main.scrollHeight - main.clientHeight,
            doc: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          };
        });
        expect(overflow, `${path} 不应出现滚动`).toEqual({ main: 0, doc: 0 });
      }

      await page.goto('/practice');
      const board = (await page.locator('svg.sudoku-svg').boundingBox())!;
      const aside = (await page.locator('aside').boundingBox())!;
      expect(Math.abs(aside.y - board.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(aside.y + aside.height - (board.y + board.height))).toBeLessThanOrEqual(1);
    });
  }
});
