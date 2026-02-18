import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

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
