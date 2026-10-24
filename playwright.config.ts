import { defineConfig, devices } from '@playwright/test';

// E2E：只覆盖必须在真实浏览器里才能验证的行为（拖动选区、下载 / 剪贴板、手势、一屏布局）。
// 逻辑类断言放在 Vitest 单测里（npm test）。
const PORT = 5174;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chrome',
      // 默认使用本机已安装的 Chrome，无需下载浏览器；
      // 没装 Chrome 的环境可设 PW_BUNDLED=1 并先执行 `npx playwright install chromium`。
      use: { ...devices['Desktop Chrome'], ...(process.env.PW_BUNDLED ? {} : { channel: 'chrome' }) },
    },
  ],
  // 跑在开发服务器上：开发模式保留模板注释等，能暴露只在 dev 下出现的问题（如组件 $el 异常）
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
