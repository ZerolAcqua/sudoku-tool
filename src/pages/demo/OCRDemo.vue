<template>
    <div class="space-y-6">
        <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">数独识别演示</h2>
            <p class="text-gray-600 mb-6">
                上传清晰的数独图片，系统会自动检测网格并识别数字。支持笔直的网格图像。
            </p>

            <!-- 上传区域 -->
            <div ref="uploadArea"
                class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 transition-colors"
                :class="{ 'border-blue-500 bg-blue-50': isDraggingOver }" @dragover.prevent="isDraggingOver = true"
                @dragleave.prevent="isDraggingOver = false" @drop.prevent="handleDrop">
                <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

                <div class="space-y-3">
                    <button
                        class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        @click="fileInput?.click()" :disabled="state.isLoading">
                        选择图片
                    </button>
                    <p class="text-gray-500 text-sm">或拖拽图片到此处</p>
                    <p class="text-gray-400 text-xs">或按 Ctrl+V / Cmd+V 从剪切板粘贴</p>
                </div>
            </div>

            <!-- 原始图像预览 -->
            <div v-if="originalImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">原始图像</h3>
                <div class="bg-gray-100 rounded-lg p-4 max-h-[600px] overflow-auto">
                    <canvas ref="originalCanvas" class="max-w-full h-auto block"></canvas>
                </div>
            </div>

            <!-- 处理后的图像预览 -->
            <div v-if="state.processedImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">二值化处理后</h3>
                <div class="bg-gray-100 rounded-lg p-4 max-h-[600px] overflow-auto">
                    <canvas ref="processedCanvas" class="max-w-full h-auto block"></canvas>
                </div>
            </div>

            <!-- 网格线标注 -->
            <div v-if="state.gridImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">识别的网格线（红色标注）</h3>
                <div class="bg-gray-100 rounded-lg p-4 max-h-[600px] overflow-auto">
                    <canvas ref="gridCanvas" class="max-w-full h-auto block"></canvas>
                </div>
                <p class="text-sm text-gray-600 mt-2">
                    • 粗红线：外框和宫线（3×3分割线）<br>
                    • 细红线：单元格分割线
                </p>
            </div>

            <!-- 单元格可视化 -->
            <div v-if="state.cellsVisualization" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">提取的单元格（9×9 预览）</h3>
                <div class="bg-gray-100 rounded-lg p-4 overflow-auto">
                    <canvas ref="cellsVisualizationCanvas" class="block"></canvas>
                </div>
                <p class="text-sm text-gray-600 mt-2">上图显示提取出的 81 个单元格，用于调试网格检测和单元格提取</p>
            </div>

            <!-- 识别结果 -->
            <div v-if="state.result" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">识别结果</h3>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                    <div class="grid grid-cols-9 gap-1 w-fit">
                        <div v-for="(digit, idx) in state.result" :key="idx"
                            class="w-10 h-10 flex items-center justify-center bg-white border border-gray-300 rounded text-sm font-semibold"
                            :class="{ 'text-gray-400': digit === '0' }">
                            {{ digit === '0' ? '·' : digit }}
                        </div>
                    </div>
                </div>

                <div class="flex gap-3">
                    <button @click="copyResult"
                        class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">
                        复制结果
                    </button>
                    <button @click="downloadResult"
                        class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">
                        下载文本
                    </button>
                </div>
            </div>

            <!-- 错误提示 -->
            <div v-if="state.error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900 mb-6">
                {{ state.error }}
            </div>

            <!-- 加载状态 -->
            <div v-if="state.isLoading" class="text-center py-8">
                <div class="inline-block">
                    <div class="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <p class="text-gray-600 mt-2">正在识别数独...</p>
                </div>
            </div>

            <!-- 重置按钮 -->
            <div v-if="!state.isLoading && (originalImage || state.result || state.error)" class="text-center">
                <button @click="reset"
                    class="bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-300">
                    重新开始
                </button>
            </div>
        </div>

        <!-- 说明 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
            <ul class="text-blue-800 space-y-2 text-sm">
                <li>• 上传清晰的数独截图（推荐 800×800 以上分辨率）</li>
                <li>• 确保数独网格是笔直的，不存在透视变形</li>
                <li>• 识别结果中 · 表示空白单元格，数字 1-9 表示识别到的数字</li>
                <li>• 如果识别效果不佳，可以调整图像对比度后重试</li>
                <li>• 识别使用 Tesseract.js OCR 引擎，首次加载需要下载语言包</li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { useOCR } from '@/composables/useOCR'

const { state, originalImage, recognize, reset: resetOCR } = useOCR()

const fileInput = ref<HTMLInputElement>()
const isDraggingOver = ref(false)
const originalCanvas = ref<HTMLCanvasElement>()
const processedCanvas = ref<HTMLCanvasElement>()
const gridCanvas = ref<HTMLCanvasElement>()
const cellsVisualizationCanvas = ref<HTMLCanvasElement>()
const uploadArea = ref<HTMLDivElement>()

onMounted(() => {
    // 监听全局粘贴事件
    document.addEventListener('paste', handlePaste)

    return () => {
        document.removeEventListener('paste', handlePaste)
    }
})

watch(originalImage, async (newImage) => {
    if (newImage && originalCanvas.value) {
        const ctx = originalCanvas.value.getContext('2d')!
        originalCanvas.value.width = newImage.width
        originalCanvas.value.height = newImage.height
        ctx.drawImage(newImage, 0, 0)
    }
})

watch(
    () => state.processedImage,
    (newImage) => {
        if (newImage && processedCanvas.value) {
            const ctx = processedCanvas.value.getContext('2d')!
            processedCanvas.value.width = newImage.width
            processedCanvas.value.height = newImage.height
            ctx.drawImage(newImage, 0, 0)
        }
    },
)

watch(
    () => state.gridImage,
    (newImage) => {
        if (newImage && gridCanvas.value) {
            const ctx = gridCanvas.value.getContext('2d')!
            gridCanvas.value.width = newImage.width
            gridCanvas.value.height = newImage.height
            ctx.drawImage(newImage, 0, 0)
        }
    },
)

async function handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
        try {
            await recognize(file, { confidenceThreshold: 0.5, debug: true })
            // 确保所有状态更新完成后再刷新 DOM
            await nextTick()
            // 手动刷新所有画布
            drawAllCanvases()
        } catch (err) {
            console.error('识别失败:', err)
        }
    }
}

function drawAllCanvases(): void {
    // 绘制原始图像
    if (originalImage.value && originalCanvas.value) {
        const ctx = originalCanvas.value.getContext('2d')!
        originalCanvas.value.width = originalImage.value.width
        originalCanvas.value.height = originalImage.value.height
        ctx.drawImage(originalImage.value, 0, 0)
    }

    // 绘制网格图像
    if (state.gridImage && gridCanvas.value) {
        const ctx = gridCanvas.value.getContext('2d')!
        gridCanvas.value.width = state.gridImage.width
        gridCanvas.value.height = state.gridImage.height
        ctx.drawImage(state.gridImage, 0, 0)
    }

    // 绘制处理后的图像
    if (state.processedImage && processedCanvas.value) {
        const ctx = processedCanvas.value.getContext('2d')!
        processedCanvas.value.width = state.processedImage.width
        processedCanvas.value.height = state.processedImage.height
        ctx.drawImage(state.processedImage, 0, 0)
    }

    // 绘制单元格可视化
    if (state.cellsVisualization && cellsVisualizationCanvas.value) {
        const ctx = cellsVisualizationCanvas.value.getContext('2d')!
        cellsVisualizationCanvas.value.width = state.cellsVisualization.width
        cellsVisualizationCanvas.value.height = state.cellsVisualization.height
        ctx.drawImage(state.cellsVisualization, 0, 0)
    }
}

async function handleDrop(event: DragEvent): Promise<void> {
    isDraggingOver.value = false
    const file = event.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) {
        try {
            await recognize(file, { confidenceThreshold: 0.5, debug: true })
            await nextTick()
            drawAllCanvases()
        } catch (err) {
            console.error('识别失败:', err)
        }
    }
}

async function handlePaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
                try {
                    await recognize(file, { confidenceThreshold: 0.5, debug: true })
                    await nextTick()
                    drawAllCanvases()
                } catch (err) {
                    console.error('识别失败:', err)
                }
                return
            }
        }
    }
}

async function copyResult(): Promise<void> {
    if (state.result) {
        await navigator.clipboard.writeText(state.result)
        alert('已复制到剪贴板')
    }
}

function downloadResult(): void {
    if (state.result) {
        const element = document.createElement('a')
        element.setAttribute(
            'href',
            'data:text/plain;charset=utf-8,' + encodeURIComponent(state.result),
        )
        element.setAttribute('download', 'sudoku.txt')
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }
}

function reset(): void {
    resetOCR()
    if (fileInput.value) {
        fileInput.value.value = ''
    }
}
</script>
