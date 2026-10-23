<template>
  <TooltipProvider>
    <!-- 全高列：让各页面能撑满视口（首页页脚据此贴底），footer 本身仍由页面自行提供 -->
    <div class="flex min-h-screen flex-col">
      <AppNav />

      <main class="flex flex-1 flex-col">
        <RouterView />
      </main>
    </div>

    <!-- 全站轻提示（复制 / 导出等），页面里用 vue-sonner 的 toast() 触发 -->
    <Toaster position="bottom-center" />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppNav from './components/AppNav.vue'
</script>
