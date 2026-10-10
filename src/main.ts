import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Roboto：UI 默认字体（400/500/700 三档，只引 latin 子集——中文由系统字体回退）。
// 仅 UI 使用；盘面字体钉在 SudokuBoard 的 svg 上，不受这里影响。
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'

// Tailwind v4 入口（含 preflight 与 @theme 生成的设计 token 工具类）
import './style.css'

import App from './App.vue'
import router from './router'

// 初始化 Emscripten Module 对象（OpenCV.js 所需）
declare global {
  interface Window {
    Module?: any
  }
}

if (!window.Module) {
  window.Module = {}
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
