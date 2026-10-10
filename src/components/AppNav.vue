<template>
  <nav class="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between gap-4">
        <!-- Logo -->
        <router-link to="/" class="flex shrink-0 items-center gap-2 text-xl font-semibold text-foreground">
          <span
            class="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">丘</span>
          <span class="hidden sm:inline">丘卡的数独小站</span>
        </router-link>

        <!-- 桌面导航 -->
        <div class="hidden items-center gap-1 md:flex">
          <router-link v-for="item in navItems" :key="item.path" :to="item.path"
            class="rounded-md px-3 py-2 text-sm font-medium transition-colors" :class="isActive(item.path)
              ? 'bg-brand-container text-brand-container-foreground'
              : 'text-muted-foreground hover:bg-secondary hover:text-foreground'">
            {{ item.name }}
          </router-link>
        </div>

        <!-- 移动端菜单按钮 -->
        <Sheet v-model:open="mobileMenuOpen">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" class="md:hidden" aria-label="打开导航菜单">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="w-72">
            <SheetHeader>
              <SheetTitle class="text-left">丘卡的数独小站</SheetTitle>
              <SheetDescription class="text-left">让数独更简单 · 让思考更有趣</SheetDescription>
            </SheetHeader>
            <div class="flex flex-col gap-1 px-4">
              <router-link v-for="item in navItems" :key="item.path" :to="item.path"
                class="rounded-md px-3 py-2.5 text-base font-medium transition-colors" :class="isActive(item.path)
                  ? 'bg-brand-container text-brand-container-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'"
                @click="mobileMenuOpen = false">
                {{ item.name }}
              </router-link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const route = useRoute()
const mobileMenuOpen = ref(false)

// 「功能测试」是开发沙箱，不占主导航位（Desktop 与移动端口径一致）
const navItems = [
  { name: '首页', path: '/' },
  { name: '唯余练习', path: '/practice' },
  { name: '绘图工具', path: '/draw' },
  { name: '数独识别', path: '/solver' },
  { name: '数独教程', path: '/tutorial' },
]

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>
