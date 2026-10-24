<template>
  <!-- 一屏首页：Hero 吃掉剩余高度（盘面按可用高度缩放），功能入口与页脚固定在下方 -->
  <div class="flex flex-1 flex-col lg:min-h-0">
    <!-- Hero -->
    <section class="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:min-h-0 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:px-8">
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

      <!-- Hero 插图：一张真实盘面 + 少量标注；容器占满 Hero 高度，盘面取宽高较小者 -->
      <div ref="heroBoardRef" class="hidden h-full min-h-0 items-center justify-center lg:flex" aria-hidden="true">
        <SudokuBoard :board="HERO_BOARD" :given="HERO_GIVEN" :size="heroBoardSize" :showCandidates="false"
          mode="display" :customHighlights="HERO_HIGHLIGHTS" :markers="HERO_MARKERS" />
      </div>
    </section>

    <!-- 功能入口：紧凑卡片（图标与标题同行） -->
    <section class="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <router-link v-for="feature in features" :key="feature.path" :to="feature.path" class="group">
          <Card class="h-full gap-2 p-5 transition-colors group-hover:border-foreground/30">
            <div class="flex items-center gap-2">
              <component :is="feature.icon" class="size-4 text-foreground" :stroke-width="1.75" />
              <h2 class="text-base font-medium text-foreground">{{ feature.title }}</h2>
            </div>
            <p class="text-sm text-muted-foreground">{{ feature.description }}</p>
            <span class="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-foreground underline-offset-4 group-hover:underline">
              {{ feature.action }}
              <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Card>
        </router-link>
      </div>
    </section>

    <footer class="border-t border-border">
      <div class="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-4 sm:flex-row sm:gap-3 sm:px-6 lg:px-8">
        <Lightbulb class="size-4 shrink-0 text-muted-foreground" />
        <p class="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          数独，数字与孤独……
        </p>
        <span class="text-xs text-muted-foreground sm:ml-auto">made with love by Acqua & AI</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight, Lightbulb } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import SudokuBoard from '@/components/SudokuBoard.vue'
import { FEATURES as features } from '@/constants/features'
import { useBoardSize } from '@/composables/useBoardSize'
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
const red = DRAWING_COLORS.find((c) => c.name === '红色')!.value
const HERO_HIGHLIGHTS: CellHighlight[] = [
  { cells: Array.from({ length: 9 }, (_, row) => ({ row, col: 4 })), color: yellow, opacity: 0.18 },
]
const HERO_MARKERS: CellMarker[] = [{ cell: { row: 4, col: 4 }, type: 'circle', color: red, size: 35, strokeWidth: 3 }]

const heroBoardRef = ref<HTMLElement | null>(null)
const heroBoardSize = useBoardSize(heroBoardRef, { min: 220, max: 420, initial: 360, fitHeight: true })
</script>
