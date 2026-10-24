<template>
  <TooltipProvider>
    <!-- 一屏布局：外壳恰好等于视口高度，导航固定在上，内容区占满剩余高度。
         页面按剩余高度排版（盘面按可用高度缩放），桌面端不出现整页滚动；
         内容确实放不下时（小屏 / 长内容）只在 main 内部滚动。 -->
    <div class="flex h-dvh flex-col">
      <AppNav />

      <main class="flex min-h-0 flex-1 flex-col overflow-y-auto">
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
