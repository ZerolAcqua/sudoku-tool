<template>
  <div>
    <!-- 不同尺寸展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">不同尺寸的数独盘面（展示模式无交互）</h2>
      <div class="flex flex-wrap items-end justify-center gap-8">
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">小尺寸 (300px)</p>
          <SudokuBoard :board="board" :given="given" :size="300" mode="display" />
        </div>
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">默认尺寸 (450px)</p>
          <SudokuBoard :board="board" :given="given" :size="450" mode="display" />
        </div>
        <div class="flex flex-col items-center">
          <p class="text-sm text-gray-600 mb-2">大尺寸 (600px)</p>
          <SudokuBoard :board="board" :given="given" :size="600" mode="display" />
        </div>
      </div>
    </div>

    <!-- 已知数与填入数展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">已知数与填入数的区别</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">黑色数字为题目给定的明数，蓝色数字为玩家填入的数字。</p>
        <SudokuBoard :board="boardWithUserInput" :given="given" mode="display" />
      </div>
    </div>

    <!-- 候选数展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">候选数示例</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">展示在空格中的候选数（笔记），数字在格内按 3×3 小网格排布。</p>
        <SudokuBoard :board="board" :given="given" :showCandidates="true" :candidates="candidates" mode="display" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import SudokuBoard from '@/components/SudokuBoard.vue'

const board = reactive<number[][]>([
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
])

const boardWithUserInput = reactive<number[][]>([
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
])

const given = reactive<boolean[][]>([
  [true, true, false, false, true, false, false, false, false],
  [true, false, false, true, true, true, false, false, false],
  [false, true, true, false, false, false, false, true, false],
  [true, false, false, false, true, false, false, false, true],
  [true, false, false, true, false, true, false, false, true],
  [true, false, false, false, true, false, false, false, true],
  [false, true, false, false, false, false, true, true, false],
  [false, false, false, true, true, true, false, false, true],
  [false, false, false, false, true, false, false, true, true]
])

const candidates = reactive<number[][][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])))

onMounted(() => {
  genCandidates()
})

function clearCandidates() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      candidates[r]![c] = []
    }
  }
}

function genCandidates() {
  clearCandidates()
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r]![c] === 0) {
        const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
        for (let col = 0; col < 9; col++) {
          const val = board[r]![col]
          if (val !== undefined && val > 0) possible.delete(val)
        }
        for (let row = 0; row < 9; row++) {
          const val = board[row]?.[c]
          if (val && val > 0) possible.delete(val)
        }
        const boxStartRow = Math.floor(r / 3) * 3
        const boxStartCol = Math.floor(c / 3) * 3
        for (let row = boxStartRow; row < boxStartRow + 3; row++) {
          for (let col = boxStartCol; col < boxStartCol + 3; col++) {
            const val = board[row]?.[col]
            if (val && val > 0) possible.delete(val)
          }
        }
        candidates[r]![c] = Array.from(possible).sort((a, b) => a - b)
      }
    }
  }
}
</script>
