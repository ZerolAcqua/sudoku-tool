import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// 复用 vite.config 的插件与 @ 别名；两个测试项目环境不同，分开配置：
// - unit：组件 / 工具函数，jsdom 模拟浏览器 DOM
// - ocr ：OCR 回归，真实 Node 环境 + tfjs-node + node-canvas（与浏览器 DOM 模拟互斥）
export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'jsdom',
            include: ['src/**/__tests__/**/*.spec.ts'],
            exclude: [...configDefaults.exclude, 'e2e/**'],
            root: fileURLToPath(new URL('./', import.meta.url)),
          },
        },
        {
          extends: true,
          test: {
            name: 'ocr',
            environment: 'node',
            include: ['test/**/*.spec.ts'],
            // 必须先于 @tensorflow/tfjs-node 加载：补回 Node 22+ 删除的 util.isXxx
            setupFiles: ['./ml/polyfill-util.ts'],
            // OpenCV.js 的 CJS 导出本身是个 Promise：按外部 ESM 加载时命名空间上会带 then，
            // 被当成 thenable 再 await 一次就报「incompatible receiver」。内联后走 Vite 的 CJS 互操作即可。
            server: { deps: { inline: ['@techstark/opencv-js'] } },
            // tfjs-node 是原生扩展，放在子进程里跑更稳；模型加载 + 逐张识别较慢
            pool: 'forks',
            testTimeout: 60_000,
            hookTimeout: 60_000,
          },
        },
      ],
    },
  })
);
