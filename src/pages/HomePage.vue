<template>
  <!-- 用 flex 列把内容区撑开，页脚作为兄弟节点放在外面：
       footer 不需要 mt-auto（那是给 flex item 用的），也不会被误设为 flex item。
       内容区里的 section 都是普通块级元素，宽度不受 flex 影响。
       根元素必须用 flex-1 而不是 min-h-full：父级 main 的高度来自 flex-1，
       是解析后的高度，min-height:100% 解析不到会退化成内容高度。 -->
  <div class="flex flex-1 flex-col">
    <div class="flex-1">
      <!-- Hero -->
      <section class="border-b border-border bg-card">
      <div class="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div class="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p class="text-sm font-medium text-brand">让数独更简单 · 让思考更有趣</p>
            <h1 class="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              欢迎来到<br />丘卡的数独小站
            </h1>
            <p class="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              各式各样的数独工具，助你提升解题能力，享受数独的乐趣。
            </p>
            <div class="mt-8 flex flex-wrap gap-3">
              <Button as-child size="lg">
                <router-link to="/practice">
                  开始体验
                  <ArrowRight />
                </router-link>
              </Button>
              <Button as-child variant="outline" size="lg">
                <router-link to="/tutorial">了解更多</router-link>
              </Button>
            </div>
          </div>

          <!-- Hero 插图：盘面示意 + 浮起数字 -->
          <div class="relative hidden justify-center lg:flex">
            <div class="relative">
              <div class="grid size-56 grid-cols-3 gap-1 rounded-2xl border-2 border-brand bg-card p-2 shadow-lg">
                <div v-for="i in 9" :key="'hero-' + i"
                  class="grid place-items-center rounded-md text-2xl font-semibold text-muted-foreground"
                  :class="i % 2 === 0 ? 'bg-secondary' : 'bg-card'">
                  {{ [5, 3, 7, 6, 1, 9, 8, 4, 2][i - 1] }}
                </div>
              </div>
              <span
                class="absolute -left-6 top-4 grid size-12 place-items-center rounded-xl bg-brand text-xl font-bold text-brand-foreground shadow-md">1</span>
              <span
                class="absolute -right-5 top-1/2 grid size-12 place-items-center rounded-xl bg-card text-xl font-bold text-brand shadow-md ring-1 ring-border">9</span>
              <span
                class="absolute -bottom-4 left-10 grid size-12 place-items-center rounded-xl bg-brand-container text-xl font-bold text-brand-container-foreground shadow-md">3</span>
            </div>
          </div>
        </div>
      </div>
    </section>

      <!-- 功能入口 -->
      <section class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <router-link v-for="feature in features" :key="feature.path" :to="feature.path" class="group">
            <Card class="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <span class="grid size-11 place-items-center rounded-lg bg-brand-container text-brand">
                  <component :is="feature.icon" class="size-5" />
                </span>
                <CardTitle class="mt-3">{{ feature.title }}</CardTitle>
                <CardDescription>{{ feature.description }}</CardDescription>
              </CardHeader>
              <CardContent>
                <span class="inline-flex items-center gap-1 text-sm font-medium text-brand">
                  {{ feature.action }}
                  <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </router-link>
        </div>
      </section>
    </div>

    <!-- 底栏：仅首页。作为 flex 列的兄弟节点，由上面的 flex-1 内容区把它顶到底部 -->
    <footer class="border-t border-border bg-card">
      <div class="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:gap-3 sm:px-6 lg:px-8">
        <Lightbulb class="size-4 shrink-0 text-brand" />
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          数独，数字与孤独……
        </p>
        <span class="text-xs text-muted-foreground sm:ml-auto">made with love by Acqua & Deepseek</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Grid3x3, Lightbulb, PenLine, ScanText, BookOpen } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    title: '唯余练习',
    description: '多种题型、多种难度，专项训练唯余判断能力。',
    action: '开始练习',
    path: '/practice',
    icon: Grid3x3,
  },
  {
    title: '绘图工具',
    description: '标记候选数、链、摒除线等，探索数独的更多解法。',
    action: '进入工具',
    path: '/draw',
    icon: PenLine,
  },
  {
    title: '数独识别',
    description: '上传图片智能识别，快速生成可编辑盘面。',
    action: '开始识别',
    path: '/solver',
    icon: ScanText,
  },
  {
    title: '数独教程',
    description: '千题千解，图文详解，掌握解题思路。',
    action: '查看教程',
    path: '/tutorial',
    icon: BookOpen,
  },
]
</script>
