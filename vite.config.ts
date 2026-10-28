import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { tutorialMarkdown } from './plugins/tutorialMarkdown';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE || '/',
    // 生产构建时用 terser 压缩，并将 logger.debug / logger.info 调用整体剔除（含日志文案）。
    // 开发环境不压缩，不受影响，仍输出全部日志。
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          pure_funcs: ['logger.debug', 'logger.info'],
        },
      },
    },
    // 教程文章是 content/tutorial/ 下的 Markdown，编译成 Vue 组件（见 plugins/tutorialMarkdown.ts）
    plugins: [
      vue({ include: [/\.vue$/, /\.md$/] }),
      tutorialMarkdown(fileURLToPath(new URL('./content/tutorial', import.meta.url))),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
