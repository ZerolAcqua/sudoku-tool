<template>
  <!-- 用 flex 列把内容区撑开，页脚作为兄弟节点放在外面：
       footer 不需要 mt-auto（那是给 flex item 用的），也不会被误设为 flex item。
       内容区里的 section 都是普通块级元素，宽度不受 flex 影响。
       根元素必须用 flex-1 而不是 min-h-full：父级 main 的高度来自 flex-1，
       是解析后的高度，min-height:100% 解析不到会退化成内容高度。 -->
  <div class="flex flex-1 flex-col">
    <div class="flex-1">
      <!-- Hero -->
      <section>
      <div class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div class="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p class="text-sm text-muted-foreground">让数独更简单 · 让思考更有趣</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
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

          <!-- Hero 插图：一张真实盘面 + 少量标注，展示「纸上推理」的样子 -->
          <div class="hidden justify-center lg:flex" aria-hidden="true">
            <SudokuBoard :board="HERO_BOARD" :given="HERO_GIVEN" :size="360" :showCandidates="false" mode="display"
              :customHighlights="HERO_HIGHLIGHTS" :markers="HERO_MARKERS" />
          </div>
        </div>
      </div>
    </section>

      <!-- 功能入口 -->
      <section class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <router-link v-for="feature in features" :key="feature.path" :to="feature.path" class="group">
            <Card class="h-full transition-colors group-hover:border-foreground/30">
              <CardHeader>
                <component :is="feature.icon" class="size-5 text-foreground" :stroke-width="1.5" />
                <CardTitle class="mt-3 text-base font-medium">{{ feature.title }}</CardTitle>
                <CardDescription>{{ feature.description }}</CardDescription>
              </CardHeader>
              <CardContent>
                <span class="inline-flex items-center gap-1 text-sm text-brand">
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
    <footer class="border-t border-border">
      <div class="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 sm:flex-row sm:gap-3 sm:px-6 lg:px-8">
        <Lightbulb class="size-4 shrink-0 text-muted-foreground" />
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          数独，数字与孤独……
        </p>
        <span class="text-xs text-muted-foreground sm:ml-auto">made with love by Acqua & Deepseek</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Lightbulb } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SudokuBoard from '@/components/SudokuBoard.vue'
import { FEATURES as features } from '@/constants/features'
import { DRAWING_COLORS } from '@/composables/useDrawingState'
import type { CellHighlight, CellMarker } from '@/types/sudoku'

// Hero 示例盘面：经典开局题，高亮第 5 列并圈出一个可确定的格子
const HERO_BOARD: number[][] = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]
const HERO_GIVEN = HERO_BOARD.map((row) => row.map((v) => v > 0))
const yellow = DRAWING_COLORS.find((c) => c.name === '黄色')!.value
const blue = DRAWING_COLORS.find((c) => c.name === '蓝色')!.value
const HERO_HIGHLIGHTS: CellHighlight[] = [
  { cells: Array.from({ length: 9 }, (_, row) => ({ row, col: 4 })), color: yellow, opacity: 0.18 },
]
const HERO_MARKERS: CellMarker[] = [{ cell: { row: 4, col: 4 }, type: 'circle', color: blue, size: 35, strokeWidth: 3 }]
</script>
