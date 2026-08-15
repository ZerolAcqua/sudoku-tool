<template>
    <div class="space-y-6">
        <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">数独识别演示</h2>
            <p class="text-gray-600 mb-6">
                上传清晰的数独图片，系统会自动检测网格并识别数字。支持笔直的网格图像。
            </p>

            <!-- 上传区域 -->
            <div v-if="!uploadedImageSrc" ref="uploadArea"
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

            <!-- 图像裁剪区域 -->
            <div v-if="uploadedImageSrc && !originalImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">裁剪图像</h3>
                <p class="text-gray-600 mb-3 text-sm">拖动边框调整裁剪区域，确保包含完整的数独网格</p>
                <div class="bg-gray-100 rounded-lg p-4">
                    <Cropper
                        ref="cropperRef"
                        :src="uploadedImageSrc"
                        :stencil-props="{
                            aspectRatio: 1
                        }"
                        class="cropper"
                    />
                </div>
                <div class="flex gap-3 mt-4">
                    <button @click="confirmCrop"
                        class="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">
                        确认裁剪并识别
                    </button>
                    <button @click="cancelCrop"
                        class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium hover:bg-gray-300">
                        取消
                    </button>
                </div>
            </div>

            <!-- 原始图像预览 -->
            <div v-if="originalImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">裁剪后的图像</h3>
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

            <!-- 全量检测线可视化 -->
            <div v-if="state.detectedLinesImage" class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">全量检测线（各阈值版本，不同颜色）</h3>
                <div class="bg-gray-100 rounded-lg p-4 max-h-[600px] overflow-auto">
                    <canvas ref="detectedLinesCanvas" class="max-w-full h-auto block"></canvas>
                </div>
                <p class="text-sm text-gray-600 mt-2">每种颜色对应一个二值化阈值版本的检测结果</p>
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
                <h3 class="text-lg font-semibold text-gray-900 mb-3">识别结果（可手动修改）</h3>
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
                    <div class="grid grid-cols-9 gap-1 w-fit">
                        <input v-for="(digit, idx) in editableDigits" :key="idx"
                            class="w-10 h-10 text-center bg-white border border-gray-300 rounded text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
                            :class="{ 'text-gray-400': digit === '0' }"
                            maxlength="1"
                            inputmode="numeric"
                            :value="digit === '0' ? '' : digit"
                            @input="updateDigit(idx, ($event.target as HTMLInputElement).value)" />
                    </div>
                    <p class="text-xs text-gray-500 mt-2">留空表示空格（0）</p>
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

        <!-- 单数字识别测试 -->
        <div class="bg-white shadow rounded-lg p-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-4">单数字识别测试</h2>
            <p class="text-gray-600 mb-4 text-sm">
                上传裁剪好的单个数字图片，查看预处理结果和模型预测。用于调试识别效果。
            </p>

            <div class="flex flex-col sm:flex-row gap-4 mb-4">
                <div class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-2">上传数字图片</label>
                    <div
                        class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        @click="digitFileInput?.click()"
                        @dragover.prevent
                        @drop.prevent="handleDigitDrop"
                    >
                        <input
                            ref="digitFileInput"
                            type="file"
                            accept="image/*"
                            class="hidden"
                            @change="handleDigitFileSelect"
                        />
                        <p v-if="!digitImageSrc" class="text-gray-500 text-sm">点击选择或拖拽图片</p>
                        <img v-else :src="digitImageSrc" class="max-h-32 mx-auto object-contain" />
                    </div>
                </div>

                <div v-if="digitDebugCanvas" class="flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-2">预处理后 (28x28)</label>
                    <div class="border border-gray-300 rounded p-2 inline-block bg-gray-50">
                        <canvas ref="digitDebugCanvasRef" class="block" width="140" height="140"></canvas>
                    </div>
                </div>
            </div>

            <button
                v-if="digitImageSrc"
                @click="recognizeSingleDigit"
                :disabled="digitLoading"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
            >
                {{ digitLoading ? '识别中...' : '识别数字' }}
            </button>

            <div v-if="digitResult" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-2">识别结果</h4>
                <p class="text-2xl font-bold text-blue-600">{{ digitResult.digit }} (0-9)</p>
                <p class="text-sm text-gray-600 mt-1">置信度: {{ (digitResult.confidence * 100).toFixed(1) }}%</p>
                <details class="mt-2">
                    <summary class="text-xs text-gray-500 cursor-pointer">各类别概率</summary>
                    <div class="mt-1 space-y-0.5">
                        <div v-for="(prob, idx) in digitResult.allProbs" :key="idx"
                            class="flex items-center gap-2 text-xs">
                            <span class="w-6 text-right text-gray-500">{{ idx }}</span>
                            <div class="flex-1 bg-gray-200 rounded h-3">
                                <div class="bg-blue-500 rounded h-3" :style="{ width: (prob * 100) + '%' }"></div>
                            </div>
                            <span class="w-12 text-gray-600">{{ (prob * 100).toFixed(1) }}%</span>
                        </div>
                    </div>
                </details>
            </div>
        </div>

        <!-- 说明 -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
            <ul class="text-blue-800 space-y-2 text-sm">
                <li>• 上传清晰的数独截图（暂不支持纸质数独拍照）</li>
                <li>• 识别结果中 · 表示空白单元格，数字 1-9 表示识别到的数字</li>
                <li>• 如果识别效果不佳，可以调整图像对比度后重试</li>
                <li>• 数字识别使用了自训练的卷积神经网络模型</li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import { logger } from '@/utils/logger'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { useOCR } from '@/composables/useOCR'
import { recognizeDigitWithDebug } from '@/utils/ocr/digitRecognizer'

const { state, originalImage, recognize, reset: resetOCR } = useOCR()

const fileInput = ref<HTMLInputElement>()
const isDraggingOver = ref(false)
const originalCanvas = ref<HTMLCanvasElement>()
const processedCanvas = ref<HTMLCanvasElement>()
const gridCanvas = ref<HTMLCanvasElement>()
const cellsVisualizationCanvas = ref<HTMLCanvasElement>()
const detectedLinesCanvas = ref<HTMLCanvasElement>()
const uploadArea = ref<HTMLDivElement>()
const editableDigits = ref<string[]>([])

// 图像裁剪相关
const uploadedImageSrc = ref<string>('')
const cropperRef = ref<InstanceType<typeof Cropper>>()

// 单数字识别测试
const digitFileInput = ref<HTMLInputElement>()
const digitImageSrc = ref<string>('')
const digitDebugCanvasRef = ref<HTMLCanvasElement>()
const digitDebugCanvas = ref<HTMLCanvasElement | null>(null)
const digitLoading = ref(false)
const digitResult = ref<{ digit: number; confidence: number; allProbs: number[] } | null>(null)

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
        () => state.result,
        (newResult) => {
                if (!newResult) {
                        editableDigits.value = []
                        return
                }
                editableDigits.value = newResult.split('')
        },
        { immediate: true },
)

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

watch(
    () => state.detectedLinesImage,
    (newImage) => {
        if (newImage && detectedLinesCanvas.value) {
            const ctx = detectedLinesCanvas.value.getContext('2d')!
            detectedLinesCanvas.value.width = newImage.width
            detectedLinesCanvas.value.height = newImage.height
            ctx.drawImage(newImage, 0, 0)
        }
    },
)

async function handleFileSelect(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
        loadImageForCrop(file)
    }
}

function loadImageForCrop(file: File): void {
    const reader = new FileReader()
    reader.onload = (e) => {
        uploadedImageSrc.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
}

async function confirmCrop(): Promise<void> {
    if (!cropperRef.value) return
    
    const { canvas } = cropperRef.value.getResult()
    if (!canvas) return

    // 将裁剪后的 canvas 转换为 Blob 然后转为 File
    canvas.toBlob(async (blob) => {
        if (!blob) return
        
        const croppedFile = new File([blob], 'cropped-image.png', { type: 'image/png' })
        
        try {
            await recognize(croppedFile, { confidenceThreshold: 0.5, debug: true })
            await nextTick()
            drawAllCanvases()
        } catch (err) {
            logger.error('识别失败:', err)
        }
    }, 'image/png')
}

function cancelCrop(): void {
    uploadedImageSrc.value = ''
    if (fileInput.value) {
        fileInput.value.value = ''
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

    // 绘制全量检测线可视化
    if (state.detectedLinesImage && detectedLinesCanvas.value) {
        const ctx = detectedLinesCanvas.value.getContext('2d')!
        detectedLinesCanvas.value.width = state.detectedLinesImage.width
        detectedLinesCanvas.value.height = state.detectedLinesImage.height
        ctx.drawImage(state.detectedLinesImage, 0, 0)
    }
}

function normalizeDigitInput(value: string): string {
    const digits = value.replace(/[^0-9]/g, '')
    if (!digits) return '0'
    const last = digits[digits.length - 1]!
    return last
}

function updateDigit(index: number, value: string): void {
    const normalized = normalizeDigitInput(value)
    if (!editableDigits.value.length) return
    editableDigits.value[index] = normalized
    state.result = editableDigits.value.join('')
}

async function handleDrop(event: DragEvent): Promise<void> {
    isDraggingOver.value = false
    const file = event.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) {
        loadImageForCrop(file)
    }
}

async function handlePaste(event: ClipboardEvent): Promise<void> {
    const items = event.clipboardData?.items
    if (!items) return

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
                loadImageForCrop(file)
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

function handleDigitFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadDigitImage(file)
}

function handleDigitDrop(event: DragEvent): void {
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) loadDigitImage(file)
}

function loadDigitImage(file: File): void {
  digitResult.value = null
  digitDebugCanvas.value = null
  const reader = new FileReader()
  reader.onload = (e) => {
    digitImageSrc.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

async function recognizeSingleDigit(): Promise<void> {
  if (!digitImageSrc.value) return

  digitLoading.value = true
  digitResult.value = null
  digitDebugCanvas.value = null

  try {
    const img = new Image()
    img.src = digitImageSrc.value
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)

    const result = await recognizeDigitWithDebug(canvas)
    digitResult.value = { digit: result.digit, confidence: result.confidence, allProbs: result.allProbs }
    digitDebugCanvas.value = result.debugCanvas

    await nextTick()
    if (digitDebugCanvasRef.value && result.debugCanvas) {
      const ctx = digitDebugCanvasRef.value.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(result.debugCanvas, 0, 0, 140, 140)
    }
  } catch (err) {
    logger.error('识别失败:', err)
  } finally {
    digitLoading.value = false
  }
}

function reset(): void {
    resetOCR()
    uploadedImageSrc.value = ''
    if (fileInput.value) {
        fileInput.value.value = ''
    }
}
</script>

<style scoped>
.cropper {
    max-height: 600px;
}
</style>
