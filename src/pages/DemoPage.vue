<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">功能测试 Demo</h1>
    
    <!-- Tab Navigation -->
    <div class="bg-white shadow rounded-lg mb-8">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content: 基础展示 -->
    <div v-show="activeTab === 'basic'">
    <!-- 不同尺寸展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">不同尺寸的数独盘面（纯展示模式）</h2>
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
    
    <!-- 候选数展示 -->
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">候选数示例（显示候选数）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">展示在空格中的候选数（铅笔记），数字在格内按 3×3 小网格排布。</p>
        <div class="flex flex-wrap gap-2 justify-center">
          <button @click="loadSampleCandidates" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">加载示例候选</button>
          <button @click="clearCandidates" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">清空候选</button>
        </div>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :showCandidates="true" 
          :candidates="candidates" 
          mode="display"
        />
      </div>
    </div>
    </div>

    <!-- Tab Content: 交互模式 -->
    <div v-show="activeTab === 'interactive'">
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">唯余练习模式（程序预设目标格）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">测试不同的高亮类型：行唯余、列唯余、宫唯余、复杂唯余</p>
        <div class="flex flex-wrap gap-2 justify-center mb-2">
          <button @click="highlightType = 'row'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'row' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">行唯一数</button>
          <button @click="highlightType = 'col'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'col' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">列唯一数</button>
          <button @click="highlightType = 'box'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'box' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">宫唯一数</button>
          <button @click="highlightType = 'all'" :class="['px-3 py-1 text-sm rounded transition-colors', highlightType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200']">唯一余数</button>
        </div>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :focusCell="practiceCell"
          :focusHighlight="highlightType"
          @cell-click="onPracticeCellClick"
          mode="practice"
        />
        <div class="flex gap-2">
          <button 
            @click="nextPracticeCell" 
            class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            下一题
          </button>
          <button 
            @click="practiceCell = null" 
            class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            清除高亮
          </button>
        </div>
      </div>
    </div>
    
    <div class="bg-white shadow rounded-lg p-6 mb-8">
      <h2 class="text-xl font-semibold mb-4">交互模式（用户点击选中）</h2>
      <div class="flex flex-col items-center gap-4">
        <p class="text-sm text-gray-600">点击单元格选中，选中状态会持续显示（蓝色）</p>
        <SudokuBoard 
          :board="board" 
          :given="given" 
          :selected="selectedCell"
          @cell-click="onCellSelect"
          mode="interactive"
        />
        <p v-if="selectedCell" class="text-sm text-gray-700">
          当前选中: 行 {{ selectedCell.row + 1 }}, 列 {{ selectedCell.col + 1 }}
        </p>
      </div>
    </div>
    </div>

    <!-- Tab Content: 完整功能 -->
    <div v-show="activeTab === 'full'">
    <div class="bg-white shadow rounded-lg p-6">
      <h2 class="text-xl font-semibold mb-4">交互式数独</h2>
      <div class="flex flex-col items-center gap-4">
        <!-- 控制按钮 -->
        <div class="flex flex-wrap gap-2 justify-center">
          <button @click="saveAsImage" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            保存为图片
          </button>
          <button @click="savePuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            保存盘面数据
          </button>
          <button @click="loadPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            加载盘面
          </button>
          <button @click="exportPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            导出为文件
          </button>
          <input ref="fileInput" type="file" accept=".json" @change="importPuzzle" class="hidden">
          <button @click="fileInput?.click()" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            导入文件
          </button>
          <button @click="clearUserInput" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            清空输入
          </button>
          <button @click="clearPuzzle" class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
            清空全部
          </button>
        </div>
        
        <!-- 数独盘面 -->
        <SudokuBoard ref="sudokuBoard" :board="board" :given="given" @cell-click="onClick" />
        
        <!-- 保存的盘面列表 -->
        <div v-if="savedPuzzles.length > 0" class="w-full mt-4">
          <h3 class="text-lg font-semibold mb-2">已保存的盘面：</h3>
          <div class="flex flex-wrap gap-2">
            <button 
              v-for="(puzzle, index) in savedPuzzles" 
              :key="index"
              @click="loadSavedPuzzle(index)"
              class="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              盘面 {{ index + 1 }} ({{ puzzle.timestamp }})
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import type { DefineComponent } from 'vue'
import SudokuBoard from '../components/SudokuBoard.vue'

const board = reactive([
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9]
])

const given = reactive([
  [true,true,false,false,true,false,false,false,false],
  [true,false,false,true,true,true,false,false,false],
  [false,true,true,false,false,false,false,true,false],
  [true,false,false,false,true,false,false,false,true],
  [true,false,false,true,false,true,false,false,true],
  [true,false,false,false,true,false,false,false,true],
  [false,true,false,false,false,false,true,true,false],
  [false,false,false,true,true,true,false,false,true],
  [false,false,false,false,true,false,false,true,true]
])

const savedPuzzles = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const sudokuBoard = ref(null)
const selectedCell = ref<{ row: number, col: number } | null>(null)
const practiceCell = ref<{ row: number, col: number } | null>({ row: 0, col: 2 })
const highlightType = ref<'row' | 'col' | 'box' | 'all' | 'none'>('all')

// Tab state
const activeTab = ref('basic')
const tabs = [
  { id: 'basic', label: '基础展示' },
  { id: 'interactive', label: '交互模式' },
  { id: 'full', label: '完整功能' }
]

// 候选数二维数组（9×9），每个格子是一个 number[]，为空数组表示无候选
const candidates = reactive<number[][][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])))

onMounted(() => {
  loadSavedPuzzlesFromStorage()
})

function onClick(pos: any) {
  console.log('点击单元格', pos)
}

function onCellSelect(pos: { row: number, col: number }) {
  selectedCell.value = pos
  console.log('选中单元格', pos)
}

function onPracticeCellClick(pos: { row: number, col: number }) {
  console.log('唯余练习模式点击', pos)
}

function nextPracticeCell() {
  // 随机选择一个空格
  const emptyCells: Array<{ row: number, col: number }> = []
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r]![c] === 0) {
        emptyCells.push({ row: r, col: c })
      }
    }
  }
  if (emptyCells.length > 0) {
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    if (randomCell) {
      practiceCell.value = randomCell
    }
  }
}

function loadSampleCandidates() {
  // 自动计算候选数
  clearCandidates()
  
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      // 只为空格计算候选数
      if (board[r]![c] === 0) {
        const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
        
        // 排除同行的数字
        for (let col = 0; col < 9; col++) {
          const val = board[r]![col]
          if (val !== undefined && val > 0) possible.delete(val)
        }
        
        // 排除同列的数字
        for (let row = 0; row < 9; row++) {
          const val = board[row]?.[c]
          if (val && val > 0) possible.delete(val)
        }
        
        // 排除同宫的数字
        const boxStartRow = Math.floor(r / 3) * 3
        const boxStartCol = Math.floor(c / 3) * 3
        for (let row = boxStartRow; row < boxStartRow + 3; row++) {
          for (let col = boxStartCol; col < boxStartCol + 3; col++) {
            const val = board[row]?.[col]
            if (val && val > 0) possible.delete(val)
          }
        }
        
        // 将可能的数字设置为候选数
        candidates[r]![c] = Array.from(possible).sort((a, b) => a - b)
      }
    }
  }
}

function clearCandidates() {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      candidates[r]![c] = []
    }
  }
}

async function saveAsImage() {
  try {
    const svgElement = document.querySelector('.sudoku-svg')
    if (!svgElement) {
      alert('找不到SVG元素，请确保数独盘面已正确加载')
      return
    }

    const clonedSvg = svgElement.cloneNode(true) as SVGElement
    clonedSvg.setAttribute('width', '900')
    clonedSvg.setAttribute('height', '900')
    
    const serializer = new XMLSerializer()
    let svgString = serializer.serializeToString(clonedSvg)
    svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `sudoku-${new Date().toISOString().slice(0,10)}-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert('数独盘面已保存为SVG文件！')
  } catch (error: any) {
    console.error('保存图片时出错:', error)
    alert('保存图片失败: ' + error.message)
  }
}

function savePuzzle() {
  const puzzleData = {
    board: JSON.parse(JSON.stringify(board)),
    given: JSON.parse(JSON.stringify(given)),
    timestamp: new Date().toLocaleString('zh-CN')
  }
  
  savedPuzzles.value.push(puzzleData)
  localStorage.setItem('sudoku-puzzles', JSON.stringify(savedPuzzles.value))
  alert('盘面已保存！')
}

function loadSavedPuzzle(index: number) {
  const puzzle = savedPuzzles.value[index]
  if (puzzle) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r]![c] = puzzle.board[r][c]
        given[r]![c] = puzzle.given[r][c]
      }
    }
    console.log('已加载盘面:', puzzle.timestamp)
  }
}

function loadSavedPuzzlesFromStorage() {
  const saved = localStorage.getItem('sudoku-puzzles')
  if (saved) {
    try {
      savedPuzzles.value = JSON.parse(saved)
    } catch (e) {
      console.error('加载保存的盘面失败:', e)
    }
  }
}

function loadPuzzle() {
  if (savedPuzzles.value.length > 0) {
    loadSavedPuzzle(savedPuzzles.value.length - 1)
    alert('已加载最近保存的盘面！')
  } else {
    alert('没有已保存的盘面')
  }
}

function exportPuzzle() {
  const puzzleData = {
    board: board,
    given: given,
    timestamp: new Date().toLocaleString('zh-CN'),
    version: '1.0'
  }
  
  const dataStr = JSON.stringify(puzzleData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `sudoku-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

function importPuzzle(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const puzzleData = JSON.parse(e.target?.result as string)
      
      if (puzzleData.board && puzzleData.given) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            board[r]![c] = puzzleData.board[r][c]
            given[r]![c] = puzzleData.given[r][c]
          }
        }
        alert('文件导入成功！')
      } else {
        alert('文件格式不正确')
      }
    } catch (err: any) {
      alert('文件解析失败: ' + err.message)
    }
  }
  reader.readAsText(file)
  target.value = ''
}

function clearUserInput() {
  if (confirm('确定要清空用户输入吗？（保留原题数字）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!given[r]![c]) {
          board[r]![c] = 0
        }
      }
    }
    console.log('用户输入已清空，原题保留')
  }
}

function clearPuzzle() {
  if (confirm('确定要清空整个盘面吗？这将清空所有数字（包括原题）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r]![c] = 0
        given[r]![c] = false
      }
    }
    console.log('盘面已全部清空')
  }
}
</script>
