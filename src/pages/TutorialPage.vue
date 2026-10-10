<template>
  <div class="page-container">
    <h1 class="page-title mb-2">数独教程</h1>
    <p class="text-sm text-muted-foreground mb-8">千题千解文档化，图文详解，掌握解题思路</p>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <!-- 侧栏：分类导航 -->
      <nav class="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        <span
          class="hidden px-3 text-xs font-medium tracking-wide text-muted-foreground lg:block">新手入门</span>
        <a v-for="item in categories" :key="item" href="#"
          class="shrink-0 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          {{ item }}
        </a>
      </nav>

      <!-- 内容区：尚未接入题解数据 -->
      <Card>
        <CardContent class="items-center py-16 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <p class="mt-4 text-base font-medium text-foreground">题解内容筹备中</p>
          <p class="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            教程将会按技巧分类收录图文题解：每篇包含盘面演示、推理步骤与关键技巧说明。
          </p>
          <Button as-child variant="outline" class="mt-5">
            <router-link to="/draw">先去绘图工具试试</router-link>
          </Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BookOpen } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// 技巧分类：与「数独教程」的定位一致，先给出导航骨架，题解数据后续接入
const categories = ['基础技巧', '进阶技巧', '链', '唯一矩形', '经典题型']
</script>
