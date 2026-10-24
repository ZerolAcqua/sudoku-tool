import { test as base, expect } from '@playwright/test';

// 每个用例自动收集页面上的 console.error / 未捕获异常，结束时断言为空
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));
      await use(errors);
      expect(errors, '页面不应出现控制台错误').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
