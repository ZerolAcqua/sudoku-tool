<template>
  <div style="display:flex;flex-direction:column;align-items:center;padding:2rem;gap:1rem;">
    <!-- 控制按钮 -->
    <div style="display:flex;gap:1rem;margin-bottom:1rem;">
      <button @click="saveAsImage" style="padding:0.5rem 1rem;background:#007acc;color:white;border:none;border-radius:4px;cursor:pointer;">
        保存为图片
      </button>
      <button @click="savePuzzle" style="padding:0.5rem 1rem;background:#28a745;color:white;border:none;border-radius:4px;cursor:pointer;">
        保存盘面数据
      </button>
      <button @click="loadPuzzle" style="padding:0.5rem 1rem;background:#6c757d;color:white;border:none;border-radius:4px;cursor:pointer;">
        加载盘面
      </button>
      <button @click="exportPuzzle" style="padding:0.5rem 1rem;background:#fd7e14;color:white;border:none;border-radius:4px;cursor:pointer;">
        导出为文件
      </button>
      <input ref="fileInput" type="file" accept=".json" @change="importPuzzle" style="display:none;">
      <button @click="fileInput.click()" style="padding:0.5rem 1rem;background:#6f42c1;color:white;border:none;border-radius:4px;cursor:pointer;">
        导入文件
      </button>
      <button @click="clearUserInput" style="padding:0.5rem 1rem;background:#ffc107;color:black;border:none;border-radius:4px;cursor:pointer;">
        清空输入
      </button>
      <button @click="clearPuzzle" style="padding:0.5rem 1rem;background:#dc3545;color:white;border:none;border-radius:4px;cursor:pointer;">
        清空全部
      </button>
    </div>
    
    <!-- 数独盘面 -->
    <SudokuBoard ref="sudokuBoard" :board="board" :given="given" @cell-click="onClick" />
    
    <!-- 保存的盘面列表 -->
    <div v-if="savedPuzzles.length > 0" style="margin-top:1rem;">
      <h3>已保存的盘面：</h3>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
        <button 
          v-for="(puzzle, index) in savedPuzzles" 
          :key="index"
          @click="loadSavedPuzzle(index)"
          style="padding:0.3rem 0.8rem;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;cursor:pointer;"
        >
          盘面 {{ index + 1 }} ({{ puzzle.timestamp }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import SudokuBoard from './components/SudokuBoard.vue'

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

// 创建给定数字的标记 (原题中已有的数字)
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

const savedPuzzles = ref([])
const fileInput = ref(null)
const sudokuBoard = ref(null)

// 加载已保存的盘面
onMounted(() => {
  loadSavedPuzzlesFromStorage()
})

function onClick(pos) {
  console.log('点击单元格', pos)
}

// 保存数独盘面为图片
async function saveAsImage() {
  try {
    // 直接从DOM中查找SVG元素
    const svgElement = document.querySelector('.sudoku-svg')
    if (!svgElement) {
      alert('找不到SVG元素，请确保数独盘面已正确加载')
      return
    }

    // 克隆SVG元素以避免修改原始元素
    const clonedSvg = svgElement.cloneNode(true)
    
    // 设置SVG的尺寸和样式
    clonedSvg.setAttribute('width', '900')
    clonedSvg.setAttribute('height', '900')
    
    // 序列化SVG
    const serializer = new XMLSerializer()
    let svgString = serializer.serializeToString(clonedSvg)
    
    // 添加XML声明和确保有白色背景
    svgString = `<?xml version="1.0" encoding="UTF-8"?>
${svgString}`

    // 创建下载链接
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `sudoku-${new Date().toISOString().slice(0,10)}-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理
    URL.revokeObjectURL(url)
    
    alert('数独盘面已保存为SVG文件！')
    
  } catch (error) {
    console.error('保存图片时出错:', error)
    alert('保存图片失败: ' + error.message)
  }
}

// 保存盘面到本地存储
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

// 加载指定的已保存盘面
function loadSavedPuzzle(index) {
  const puzzle = savedPuzzles.value[index]
  if (puzzle) {
    // 更新盘面数据
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r][c] = puzzle.board[r][c]
        given[r][c] = puzzle.given[r][c]
      }
    }
    console.log('已加载盘面:', puzzle.timestamp)
  }
}

// 从本地存储加载所有已保存的盘面
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

// 快速加载最近保存的盘面
function loadPuzzle() {
  if (savedPuzzles.value.length > 0) {
    loadSavedPuzzle(savedPuzzles.value.length - 1)
    alert('已加载最近保存的盘面！')
  } else {
    alert('没有已保存的盘面')
  }
}

// 导出盘面为JSON文件
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

// 从文件导入盘面
function importPuzzle(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const puzzleData = JSON.parse(e.target.result)
      
      if (puzzleData.board && puzzleData.given) {
        // 更新盘面数据
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            board[r][c] = puzzleData.board[r][c]
            given[r][c] = puzzleData.given[r][c]
          }
        }
        alert('文件导入成功！')
      } else {
        alert('文件格式不正确')
      }
    } catch (err) {
      alert('文件解析失败: ' + err.message)
    }
  }
  reader.readAsText(file)
  
  // 清空文件输入
  event.target.value = ''
}

// 清空用户输入（保留原题）
function clearUserInput() {
  if (confirm('确定要清空用户输入吗？（保留原题数字）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!given[r][c]) {  // 只清空非给定的格子
          board[r][c] = 0
        }
      }
    }
    console.log('用户输入已清空，原题保留')
  }
}

// 清空整个盘面
function clearPuzzle() {
  if (confirm('确定要清空整个盘面吗？这将清空所有数字（包括原题）')) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        board[r][c] = 0  // 清空所有格子
        given[r][c] = false  // 同时清空给定标记
      }
    }
    console.log('盘面已全部清空')
  }
}
</script>
