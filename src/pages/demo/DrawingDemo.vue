<template>
  <div>
    <!-- 交互式绘图工具 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">交互式绘图工具</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">点击单元格进行绘图操作</p>

        <!-- 绘图工具栏 -->
        <div class="w-full max-w-3xl space-y-4">
          <!-- 绘图模式选择 -->
          <div class="flex flex-wrap gap-2">
            <span class="text-sm font-medium text-gray-700 self-center min-w-20">绘图模式:</span>
            <button v-for="mode in drawingModes" :key="mode.id" @click="currentDrawMode = mode.id" :class="['px-3 py-1 text-sm rounded transition-colors',
              currentDrawMode === mode.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">
              {{ mode.label }}
            </button>
          </div>

          <!-- 标记类型（仅在标记模式下显示） -->
          <div v-if="currentDrawMode === 'marker'" class="flex flex-wrap gap-2">
            <span class="text-sm font-medium text-gray-700 self-center min-w-20">标记类型:</span>
            <button v-for="type in markerTypes" :key="type" @click="currentMarkerType = type" :class="['px-3 py-1 text-sm rounded transition-colors',
              currentMarkerType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">
              {{ type }}
            </button>
          </div>

          <!-- 链样式（仅在链模式下显示） -->
          <div v-if="currentDrawMode === 'chain'" class="flex flex-wrap gap-2">
            <span class="text-sm font-medium text-gray-700 self-center min-w-20">链样式:</span>
            <button v-for="style in chainStyles" :key="style.id" @click="currentChainStyle = style.id" :class="['px-3 py-1 text-sm rounded transition-colors',
              currentChainStyle === style.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">
              {{ style.label }}
            </button>
            <label class="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 border border-gray-400 rounded">
              <input type="checkbox" v-model="chainArrow" class="rounded">
              <span>箭头</span>
            </label>
          </div>

          <!-- 颜色选择 -->
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-sm font-medium text-gray-700 min-w-20">颜色:</span>
            <button v-for="color in drawingColors" :key="color.value" @click="currentColor = color.value" :class="['w-8 h-8 rounded border-2 transition-all',
              currentColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-300']"
              :style="{ backgroundColor: color.value }" :title="color.name"></button>
          </div>

          <!-- 候选数选择开关（仅高亮和链模式显示，链模式强制启用） -->
          <div v-if="currentDrawMode === 'highlight' || currentDrawMode === 'chain'" class="flex items-center gap-2">
            <label class="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 border border-gray-400 rounded"
              :class="currentDrawMode === 'chain' ? 'opacity-60 cursor-not-allowed' : ''">
              <input type="checkbox" v-model="selectCandidateMode" :disabled="currentDrawMode === 'chain'"
                class="rounded">
              <span>选择候选数</span>
              <span v-if="currentDrawMode === 'chain'" class="text-xs text-gray-500">(链必须)</span>
            </label>
            <span v-if="selectCandidateMode && selectedCandidate" class="text-sm text-gray-700">
              已选择: {{ selectedCandidate }}
            </span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-wrap gap-2">
            <button v-if="currentDrawMode === 'chain' && drawingChain.length > 0" @click="finishChain"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              完成链 ({{ drawingChain.length }} 个节点)
            </button>
            <button v-if="currentDrawMode === 'chain' && drawingChain.length > 0" @click="cancelChain"
              class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
              取消
            </button>
            <button @click="clearDrawing"
              class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
              清空绘图
            </button>
          </div>
        </div>

        <!-- 数独盘面 -->
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :showCandidates="true" 
          :candidates="candidates"
          :customHighlights="drawnHighlights" 
          :markers="drawnMarkers" 
          :chains="drawnChains"
          :candidateMarkers="drawnCandidateMarkers" 
          :selectedCandidate="selectCandidateMode && selectedCandidate ? currentDrawingCandidate : null"
          :mode="selectCandidateMode && (currentDrawMode === 'highlight' || currentDrawMode === 'chain') ? 'candidate' : 'interactive'" 
          @cell-click="onDrawingCellClick"
          @candidate-click="onDrawingCandidateClick" 
        />

        <div class="text-xs text-gray-500 space-y-1">
          <p>• <strong>高亮模式:</strong> 点击单元格添加/移除高亮。启用"选择候选数"后可直接点击候选数进行高亮</p>
          <p>• <strong>标记模式:</strong> 点击单元格添加标记（圆圈、叉号等）</p>
          <p>• <strong>摒除线模式:</strong> 依次点击起点和终点（起点自动添加圆圈）</p>
          <p>• <strong>链模式:</strong> 直接点击候选数添加节点，点击"完成链"按钮结束</p>
        </div>
      </div>
    </div>

    <!-- 静态示例 -->
<div>
    <!-- 自定义高亮示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">自定义单元格高亮</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">为特定单元格添加自定义颜色高亮</p>
        <SudokuBoard :board="board" :given="given" :customHighlights="[
          { cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }], color: '#ffeb3b', opacity: 0.4 },
          { cells: [{ row: 1, col: 3 }, { row: 2, col: 3 }], color: '#4caf50', opacity: 0.3 },
          { cells: [{ row: 4, col: 4 }], color: '#f44336', opacity: 0.5 }
        ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 黄色：第一行前三格</p>
          <p>• 绿色：第 4 列的第 2、3 行</p>
          <p>• 红色：中心格</p>
        </div>
      </div>
    </div>

    <!-- 标记示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">单元格标记（圆圈、叉号、点、星号）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">为单元格添加不同类型的标记符号</p>
        <SudokuBoard :board="board" :given="given" :markers="[
          { cell: { row: 0, col: 4 }, type: 'circle', color: '#f44336', strokeWidth: 3 },
          { cell: { row: 0, col: 6 }, type: 'cross', color: '#2196f3', strokeWidth: 3 },
          { cell: { row: 2, col: 0 }, type: 'dot', color: '#4caf50', size: 10 },
          { cell: { row: 2, col: 2 }, type: 'star', color: '#ff9800', size: 45 }
        ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 红色圆圈：第 1 行第 5 格</p>
          <p>• 蓝色叉号：第 1 行第 7 格</p>
          <p>• 绿色圆点：第 3 行第 1 格</p>
          <p>• 橙色星号：第 3 行第 3 格</p>
        </div>
      </div>
    </div>

    <!-- 摒除线示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">摒除线绘制</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">在两个单元格之间绘制摒除线，从起点圆圈边缘指向目标格</p>
        <SudokuBoard :board="board" :given="given" :markers="[
          { cell: { row: 0, col: 0 }, type: 'circle', color: '#9c27b0', strokeWidth: 3, size: 35 },
          { cells: [{ row: 0, col: 0 }, { row: 0, col: 8 }], type: 'line', color: '#9c27b0', strokeWidth: 3 },
          { cell: { row: 3, col: 1 }, type: 'circle', color: '#ff5722', strokeWidth: 3, size: 35 },
          { cells: [{ row: 3, col: 1 }, { row: 5, col: 1 }], type: 'line', color: '#ff5722', strokeWidth: 3 },
          { cell: { row: 6, col: 6 }, type: 'circle', color: '#00bcd4', strokeWidth: 3, size: 35 },
          { cells: [{ row: 6, col: 6 }, { row: 8, col: 8 }], type: 'line', color: '#00bcd4', strokeWidth: 3 }
        ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 紫色圆圈 + 线：第 1 行横跨，线从圆圈边缘开始</p>
          <p>• 橙色圆圈 + 线：第 2 列部分竖线</p>
          <p>• 青色圆圈 + 线：右下角斜线</p>
        </div>
      </div>
    </div>

    <!-- 链绘制示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">链绘制</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">绘制连接多个单元格的链，支持实线、虚线和箭头</p>
        <SudokuBoard :board="board" :given="given" :chains="[
          {
            cells: [{ row: 0, col: 0 }, { row: 0, col: 3 }, { row: 0, col: 6 }],
            style: 'solid',
            color: '#4caf50',
            strokeWidth: 3,
            arrow: true
          },
          {
            cells: [{ row: 3, col: 0 }, { row: 3, col: 4 }, { row: 3, col: 8 }],
            style: 'dashed',
            color: '#2196f3',
            strokeWidth: 2
          },
          {
            cells: [{ row: 6, col: 0 }, { row: 7, col: 1 }, { row: 8, col: 2 }],
            style: 'dotted',
            color: '#f44336',
            strokeWidth: 2,
            arrow: true
          }
        ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 绿色实线箭头：第 1 行三格连接</p>
          <p>• 蓝色虚线：第 4 行三格连接</p>
          <p>• 红色点线箭头：左下角斜向连接</p>
        </div>
      </div>
    </div>

    <!-- 候选到候选的链示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">候选数级链（直线/曲线）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">链节点可以定位到单元格中的具体候选数（1-9），支持多节点路径。每相邻两个节点间生成一条箭头线，末端显示箭头。</p>
        <SudokuBoard :board="board" :given="given" :showCandidates="true" :candidates="candidates" :chains="[
          {
            cells: [
              { row: 0, col: 2, candidate: 3 },
              { row: 0, col: 2, candidate: 7 }
            ],
            style: 'solid',
            color: '#8e44ad',
            strokeWidth: 2,
            arrow: true,
            curve: 'straight'
          },
          {
            cells: [
              { row: 2, col: 0, candidate: 1 },
              { row: 2, col: 3, candidate: 9 },
              { row: 2, col: 6, candidate: 5 }
            ],
            style: 'dashed',
            color: '#16a085',
            strokeWidth: 3,
            arrow: true,
            curve: 'smooth'
          },
          {
            cells: [
              { row: 3, col: 5, candidate: 3 },
              { row: 5, col: 4, candidate: 7 },
              { row: 7, col: 5, candidate: 2 }
            ],
            style: 'solid',
            color: '#f39c12',
            strokeWidth: 2.5,
            arrow: true,
            curve: 'smooth'
          }
        ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 紫色直线：同格候选 3 → 7</p>
          <p>• 绿色平滑虚线（多段）：跨格候选 1 → 9 → 5（每段都有V形箭头）</p>
          <p>• 橙色平滑线（多段）：竖向S形曲线 3 → 7 → 2（明显的弧度）</p>
        </div>
      </div>
    </div>

    <!-- 候选数强调 + 链综合示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">候选数强调 + 链组合示例</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">演示候选数显示 + 候选数强调标记 + 链箭头的组合使用</p>
        <SudokuBoard :board="board" :given="given" :showCandidates="true" :candidates="candidates" :candidateMarkers="[
          { row: 0, col: 2, candidate: 2, color: '#FF6B6B', opacity: 0.7 },
          { row: 0, col: 2, candidate: 4, color: '#4ECDC4', opacity: 0.7 },
          { row: 2, col: 0, candidate: 1, color: '#95E1D3', opacity: 0.7 },
          { row: 2, col: 3, candidate: 3, color: '#FFE66D', opacity: 0.7 },
          { row: 2, col: 6, candidate: 4, color: '#C7CEEA', opacity: 0.7 }
        ]" :chains="[
            {
              cells: [
                { row: 0, col: 2, candidate: 2 },
                { row: 2, col: 0, candidate: 1 },
                { row: 2, col: 3, candidate: 3 }
              ],
              style: 'solid',
              color: '#FF6B6B',
              strokeWidth: 2.5,
              arrow: true,
              curve: 'smooth'
            },
            {
              cells: [
                { row: 0, col: 2, candidate: 4 },
                { row: 2, col: 6, candidate: 4 }
              ],
              style: 'dashed',
              color: '#4ECDC4',
              strokeWidth: 2,
              arrow: true,
              curve: 'straight'
            }
          ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 彩色实心圆：候选数强调标记（背景圆圈突出候选数）</p>
          <p>• 红色平滑线：连接候选 2 → 1 → 3（每段有V形箭头）</p>
          <p>• 青色虚线：连接候选 4 → 4（直线箭头）</p>
        </div>
      </div>
    </div>

    <!-- 综合示例 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">综合绘图示例（教学演示）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">结合高亮、标记和链，模拟教学场景</p>
        <SudokuBoard :board="board" :given="given" :customHighlights="[
          { cells: [{ row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }], color: '#E8F4F8', opacity: 0.6 },
          { cells: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }], color: '#FFF9C4', opacity: 0.5 }
        ]" :markers="[
            { cell: { row: 2, col: 2 }, type: 'circle', color: '#f44336', strokeWidth: 3 },
            { cell: { row: 0, col: 2 }, type: 'cross', color: '#2196f3', strokeWidth: 2 },
            { cells: [{ row: 2, col: 0 }, { row: 2, col: 2 }], type: 'line', color: '#9c27b0', strokeWidth: 2 }
          ]" :chains="[
            {
              cells: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
              style: 'dashed',
              color: '#4caf50',
              strokeWidth: 2,
              arrow: true
            }
          ]" mode="display" />
        <div class="text-xs text-gray-500 space-y-1">
          <p>• 蓝色背景：第 3 列前三格（相关区域）</p>
          <p>• 黄色背景：第 3 行前三格（候选数区域）</p>
          <p>• 红色圆圈：目标格</p>
          <p>• 紫色摒除线：行内关系</p>
          <p>• 绿色虚线箭头：推理路径</p>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive, onMounted } from 'vue'
import SudokuBoard from '@/components/SudokuBoard.vue'
import DrawingExamples from './DrawingExamples.vue'
import type { CellHighlight, CellMarker, Chain, CandidateMarker } from '@/types/sudoku'

// 数独数据

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



// 交互式绘图状态
const currentDrawMode = ref<'highlight' | 'marker' | 'line' | 'chain'>('marker')
const currentMarkerType = ref<'circle' | 'cross' | 'dot' | 'star'>('circle')
const currentChainStyle = ref<'solid' | 'dashed' | 'dotted'>('solid')
const chainArrow = ref(true)
const currentColor = ref('#f44336')

const drawnHighlights = ref<CellHighlight[]>([])
const drawnMarkers = ref<CellMarker[]>([])
const drawnChains = ref<Chain[]>([])
const drawnCandidateMarkers = ref<CandidateMarker[]>([])
const drawingChain = ref<{ row: number, col: number, candidate?: number }[]>([])
const lineStartCell = ref<{ row: number, col: number } | null>(null)

const drawingModes: Array<{ id: 'highlight' | 'marker' | 'line' | 'chain'; label: string }> = [
  { id: 'highlight', label: '高亮' },
  { id: 'marker', label: '标记' },
  { id: 'line', label: '摒除线' },
  { id: 'chain', label: '链' }
]

const markerTypes: Array<'circle' | 'cross' | 'dot' | 'star'> = ['circle', 'cross', 'dot', 'star']

const chainStyles: Array<{ id: 'solid' | 'dashed' | 'dotted'; label: string }> = [
  { id: 'solid', label: '实线' },
  { id: 'dashed', label: '虚线' },
  { id: 'dotted', label: '点线' }
]

const drawingColors = [
  { name: '红色', value: '#f44336' },
  { name: '粉色', value: '#e91e63' },
  { name: '紫色', value: '#9c27b0' },
  { name: '蓝色', value: '#2196f3' },
  { name: '青色', value: '#00bcd4' },
  { name: '绿色', value: '#4caf50' },
  { name: '橙色', value: '#ff9800' },
  { name: '棕色', value: '#795548' }
]

// 候选数选择相关状态
const selectCandidateMode = ref(false)
const selectedCandidate = ref<number | null>(null)
const currentDrawingCandidate = ref<{ row: number, col: number, candidate: number } | null>(null)

// 监听绘图模式变化，链模式强制启用候选数选择
watch(currentDrawMode, (newMode) => {
  if (newMode === 'chain') {
    selectCandidateMode.value = true
  }
})

// 交互式绘图事件处理
function onDrawingCellClick(pos: { row: number, col: number }) {
  // 候选数模式下不处理单元格点击
  if (selectCandidateMode.value && (currentDrawMode.value === 'highlight' || currentDrawMode.value === 'chain')) {
    return
  }

  switch (currentDrawMode.value) {
    case 'highlight':
      toggleHighlight(pos)
      break
    case 'marker':
      addMarker(pos)
      break
    case 'line':
      addLinePoint(pos)
      break
    case 'chain':
      addChainPoint(pos)
      break
  }
}

// 候选数点击处理
function onDrawingCandidateClick(pos: { row: number, col: number, candidate: number }) {
  currentDrawingCandidate.value = pos
  selectedCandidate.value = pos.candidate

  if (currentDrawMode.value === 'highlight') {
    toggleHighlightCandidate(pos)
  } else if (currentDrawMode.value === 'chain') {
    addChainPointCandidate(pos)
  }
}

function toggleHighlightCandidate(pos: { row: number, col: number, candidate: number }) {
  const existingIndex = drawnCandidateMarkers.value.findIndex(m =>
    m.row === pos.row && m.col === pos.col && m.candidate === pos.candidate
  )

  if (existingIndex >= 0) {
    drawnCandidateMarkers.value.splice(existingIndex, 1)
  } else {
    drawnCandidateMarkers.value.push({
      row: pos.row,
      col: pos.col,
      candidate: pos.candidate,
      color: currentColor.value,
      opacity: 0.6
    })
  }
}

function toggleHighlight(pos: { row: number, col: number }) {
  const existingIndex = drawnHighlights.value.findIndex(h =>
    h.cells.some(c => c.row === pos.row && c.col === pos.col)
  )

  if (existingIndex >= 0) {
    drawnHighlights.value.splice(existingIndex, 1)
  } else {
    drawnHighlights.value.push({
      cells: [pos],
      color: currentColor.value,
      opacity: 0.5
    })
  }
}

function addMarker(pos: { row: number, col: number }) {
  drawnMarkers.value.push({
    cell: pos,
    type: currentMarkerType.value,
    color: currentColor.value,
    strokeWidth: 3,
    size: currentMarkerType.value === 'circle' ? 35 : currentMarkerType.value === 'star' ? 45 : 10
  })
}

function addLinePoint(pos: { row: number, col: number }) {
  if (!lineStartCell.value) {
    lineStartCell.value = pos
    drawnMarkers.value.push({
      cell: pos,
      type: 'circle',
      color: currentColor.value,
      strokeWidth: 3,
      size: 35
    })
  } else {
    drawnMarkers.value.push({
      cells: [lineStartCell.value, pos],
      type: 'line',
      color: currentColor.value,
      strokeWidth: 3
    })
    lineStartCell.value = null
  }
}

function addChainPoint(pos: { row: number, col: number }) {
  const lastPoint = drawingChain.value[drawingChain.value.length - 1]
  if (lastPoint && lastPoint.row === pos.row && lastPoint.col === pos.col) {
    return
  }

  if (selectCandidateMode.value && selectedCandidate.value) {
    drawingChain.value.push({
      row: pos.row,
      col: pos.col,
      candidate: selectedCandidate.value
    })
  } else {
    drawingChain.value.push(pos)
  }
}

function addChainPointCandidate(pos: { row: number, col: number, candidate: number }) {
  const lastPoint = drawingChain.value[drawingChain.value.length - 1]
  if (lastPoint && lastPoint.row === pos.row && lastPoint.col === pos.col && 
      'candidate' in lastPoint && lastPoint.candidate === pos.candidate) {
    return
  }

  drawingChain.value.push({
    row: pos.row,
    col: pos.col,
    candidate: pos.candidate
  })
}

function finishChain() {
  const filteredChain = drawingChain.value.filter((point, index) => {
    if (index === 0) return true
    const prev = drawingChain.value[index - 1]
    if (!prev) return true
    
    if (prev.row !== point.row || prev.col !== point.col) return true
    
    const prevHasCandidate = 'candidate' in prev && prev.candidate !== undefined
    const pointHasCandidate = 'candidate' in point && point.candidate !== undefined
    
    if (prevHasCandidate && pointHasCandidate) {
      return prev.candidate !== point.candidate
    }
    
    return true
  })

  if (filteredChain.length >= 2) {
    drawnChains.value.push({
      cells: [...filteredChain],
      style: currentChainStyle.value as any,
      color: currentColor.value,
      strokeWidth: 2.5,
      arrow: chainArrow.value,
      curve: 'smooth'
    })
  }
  drawingChain.value = []
  selectedCandidate.value = null
  currentDrawingCandidate.value = null
}

function cancelChain() {
  drawingChain.value = []
}

function clearDrawing() {
  drawnHighlights.value = []
  drawnMarkers.value = []
  drawnChains.value = []
  drawnCandidateMarkers.value = []
  drawingChain.value = []
  lineStartCell.value = null
}
</script>
