import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

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
    plugins: [vue(), vueDevTools()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
