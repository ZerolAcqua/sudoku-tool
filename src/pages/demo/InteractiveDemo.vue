<template>
    <div>
        <div class="bg-white shadow rounded-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">唯余练习模式（程序给定目标格）</h2>
            <div class="flex flex-col items-center gap-4">
                <p class="text-sm text-gray-600">测试不同的高亮类型：行唯一数、列唯一数、宫唯一数、唯一余数</p>
                <SudokuBoard :board="board" :given="given" :focusCell="practiceCell" :focusHighlight="highlightType"
                    mode="practice" />
            </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">交互模式（用户点击选中目标格）</h2>
            <div class="flex flex-col items-center gap-4">
                <p class="text-sm text-gray-600">点击单元格选中，选中状态会持续显示</p>
                <SudokuBoard :board="board" :given="given" :selected="selectedCell" @cell-click="onCellSelect"
                    mode="interactive" />
                <p v-if="selectedCell" class="text-sm text-gray-700">
                    当前选中: r{{ selectedCell.row + 1 }}c{{ selectedCell.col + 1 }}
                </p>
                    <p v-else class="text-sm text-gray-700">
                    请点击任意单元格
                </p>
            </div>
        </div>

        <div class="bg-white shadow rounded-lg p-6 mb-8">
            <h2 class="text-xl font-semibold mb-4">候选数交互模式</h2>
            <div class="flex flex-col items-center gap-4">
                <p class="text-sm text-gray-600">点击候选数进行选择，悬浮和选中时显示高亮效果</p>
                <SudokuBoard :board="board" :given="given" :showCandidates="true" :candidates="candidates"
                    :selectedCandidate="selectedCandidateDemo" @candidate-click="onCandidateSelect" mode="candidate" />
                <p v-if="selectedCandidateDemo" class="text-sm text-gray-700">
                    当前选中候选数: {{
                        selectedCandidateDemo.candidate }}r{{ selectedCandidateDemo.row + 1 }}c{{ selectedCandidateDemo.col
                        + 1 }}
                </p>
                <p v-else class="text-sm text-gray-700">
                    请点击任意候选数
                </p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
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

const selectedCell = ref<{ row: number, col: number } | null>(null)
const selectedCandidateDemo = ref<{ row: number, col: number, candidate: number } | null>(null)
const practiceCell = ref<{ row: number, col: number } | null>({ row: 0, col: 2 })
const highlightType = ref<'row' | 'col' | 'box' | 'all' | 'none'>('all')

let rotationTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
    genCandidates()
    randomizePracticeCell()
    rotationTimer = setInterval(() => {
        const order = ['row', 'col', 'box', 'all'] as const
        const idx = order.indexOf(highlightType.value as any)
        highlightType.value = order[(idx + 1) % order.length]!
        randomizePracticeCell()
    }, 1000)
})

onUnmounted(() => {
    if (rotationTimer) clearInterval(rotationTimer)
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

function onCellSelect(pos: { row: number, col: number }) {
    selectedCell.value = pos
}

function onCandidateSelect(pos: { row: number, col: number, candidate: number }) {
    selectedCandidateDemo.value = pos
}

function randomizePracticeCell() {
    const empties: { row: number, col: number }[] = []
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r]![c] === 0) {
                empties.push({ row: r, col: c })
            }
        }
    }
    if (empties.length > 0) {
        const i = Math.floor(Math.random() * empties.length)
        practiceCell.value = empties[i]!
    }
}

</script>