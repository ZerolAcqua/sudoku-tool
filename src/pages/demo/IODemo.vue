<template>
    <div class="bg-white shadow rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">交互式数独</h2>
        <div class="flex flex-col items-center gap-4">
            <!-- 控制按钮 -->
            <div class="flex flex-wrap gap-2 justify-center">
                <button @click="saveAsImage"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    保存为图片
                </button>
                <button @click="savePuzzle"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    保存盘面数据
                </button>
                <button @click="loadPuzzle"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    加载盘面
                </button>
                <button @click="exportPuzzle"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    导出为文件
                </button>
                <input ref="fileInput" type="file" accept=".json" @change="importPuzzle" class="hidden">
                <button @click="fileInput?.click()"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    导入文件
                </button>
                <button @click="clearUserInput"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    清空输入
                </button>
                <button @click="clearPuzzle"
                    class="px-4 py-2 bg-gray-100 border border-gray-400 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    清空全部
                </button>
            </div>

            <!-- 数独盘面 -->
            <SudokuBoard ref="sudokuBoard" :board="board" :given="given" :show-candidates="true" :candidates="candidates" @cell-click="onClick" />

            <!-- 保存的盘面列表 -->
            <div v-if="savedPuzzles.length > 0" class="w-full mt-4">
                <h3 class="text-lg font-semibold mb-2">已保存的盘面：</h3>
                <div class="flex flex-wrap gap-2">
                    <button v-for="(puzzle, index) in savedPuzzles" :key="index" @click="loadSavedPuzzle(index)"
                        class="px-3 py-1 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors">
                        盘面 {{ index + 1 }} ({{ puzzle.timestamp }})
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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



const savedPuzzles = ref<any[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const sudokuBoard = ref(null)

onMounted(() => {
    loadSavedPuzzlesFromStorage()
    genCandidates()
})

function onClick(pos: any) {
    console.log('点击单元格', pos)
}

async function saveAsImage() {
    try {
        // 使用当前 IODemo 中的 SudokuBoard 实例的 $el（其根元素就是 SVG）
        const svgElement = (sudokuBoard.value as any)?.$el as SVGElement | null
        if (!svgElement) {
            alert('找不到 SVG 元素，请确保数独盘面已正确加载')
            return
        }
        
        const candidatesInSVG = svgElement.querySelectorAll('text[font-size="22"]')
        console.log('SVG 中找到的候选数 text 元素数量:', candidatesInSVG.length)
        if (!svgElement) {
            alert('找不到 SVG 元素，请确保数独盘面已正确加载')
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
        link.download = `sudoku-${new Date().toISOString().slice(0, 10)}-${Date.now()}.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        alert('数独盘面已保存为 SVG 文件！')
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
        genCandidates()
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
        candidates.forEach((row) => row.forEach((cell) => (cell.length = 0)))
        console.log('盘面已全部清空')
    }
}
</script>
