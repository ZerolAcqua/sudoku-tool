<template>
  <div class="page-container">
    <h1 class="page-title">数独识别</h1>

    <!-- 上传区 -->
    <div v-if="!uploadedImageSrc" class="card">
      <div
        class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors"
        :class="{ 'border-accent bg-blue-50': isDraggingOver }"
        @dragover.prevent="isDraggingOver = true"
        @dragleave.prevent="isDraggingOver = false"
        @drop.prevent="handleDrop"
      >
        <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
        <div class="space-y-3">
          <button class="btn-primary disabled:opacity-50" @click="fileInput?.click()" :disabled="state.isLoading">
            选择图片
          </button>
          <p class="text-gray-500 text-sm">或拖拽图片到此处，或按 Ctrl+V / Cmd+V 粘贴</p>
        </div>
      </div>
      <p class="text-gray-500 text-sm mt-4">请上传清晰、笔直的数独网格图像（暂不支持纸质数独拍照）。</p>
    </div>

    <!-- 裁剪区 -->
    <div v-else-if="!recognized" class="card">
      <h2 class="section-title">裁剪图像</h2>
      <p class="text-gray-600 text-sm mb-4">拖动边框调整裁剪区域，确保包含完整的数独网格。</p>
      <Cropper ref="cropperRef" :src="uploadedImageSrc" :stencil-props="{ aspectRatio: 1 }"
        :default-size="nearSquare ? defaultSize : undefined" :default-position="nearSquare ? defaultPosition : undefined"
        class="cropper" />

      <div class="flex gap-3 mt-4">
        <button class="btn-primary disabled:opacity-50" @click="confirmCrop" :disabled="state.isLoading">
          {{ state.isLoading ? '识别中...' : '确认识别' }}
        </button>
        <button class="btn" @click="cancelCrop">取消</button>
      </div>

      <div v-if="state.isLoading" class="flex items-center gap-3 mt-4 text-gray-600">
        <div class="w-5 h-5 border-2 border-gray-300 border-t-accent rounded-full animate-spin"></div>
        <span>正在识别数独...</span>
      </div>

      <div v-if="state.error" class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-900 mt-4">
        {{ state.error }}
      </div>
    </div>

    <!-- 识别结果 -->
    <div v-else class="space-y-6">
      <!-- 对比：原图 + 识别盘面 -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div class="card">
          <h2 class="section-title">原图</h2>
          <div class="w-full max-w-[540px] mx-auto">
            <canvas ref="originalCanvas" class="w-full h-auto"></canvas>
          </div>
        </div>

        <div class="card">
          <h2 class="section-title">识别结果</h2>
          <div class="w-full max-w-[540px] mx-auto [&_svg]:w-full [&_svg]:h-auto">
            <SudokuBoard :board="board" :given="given" :candidates="[]" :size="540" :showCandidates="false"
              :selected="selected" mode="interactive" @cell-click="onCellClick" />
          </div>
        </div>
      </div>

      <!-- 修改数字 + 导出 -->
      <div class="card">
        <div class="flex flex-col md:flex-row gap-6 md:items-center">
          <div class="flex-1">
            <h2 class="section-title">修改数字</h2>
            <p class="text-sm text-gray-600 mb-4">点击盘面选中格子，用键盘 1-9 修改，0 / Backspace 清除该格。</p>
            <div class="grid grid-cols-3 gap-3 w-fit">
              <button v-for="n in [7, 8, 9, 4, 5, 6, 1, 2, 3]" :key="'numpad-' + n"
                class="border border-gray-300 bg-gray-50 text-gray-900 rounded w-16 h-16 flex items-center justify-center text-xl font-semibold hover:bg-gray-100 disabled:opacity-40"
                :disabled="!selected" @click="inputDigit(n as number)">{{ n }}</button>
              <button
                class="col-span-3 border border-gray-300 bg-gray-50 text-gray-900 rounded h-12 flex items-center justify-center text-sm font-semibold hover:bg-gray-100 disabled:opacity-40"
                :disabled="!selected" @click="clearSelected">清除</button>
            </div>
          </div>

          <div class="w-full md:w-64 flex flex-col gap-3">
            <button class="btn w-full" @click="copyText">{{ copied ? '已复制' : '复制文本' }}</button>
            <button class="btn w-full" @click="downloadText">下载文本</button>
            <button class="btn w-full" @click="reset">重新上传</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
import { logger } from '@/utils/logger'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import SudokuBoard from '@/components/SudokuBoard.vue'
import { useOCR } from '@/composables/useOCR'
import { CONFIDENCE_THRESHOLD } from '@/utils/ocr/constants'

const { state, originalImage, recognize, reset: resetOCR } = useOCR()

const fileInput = ref<HTMLInputElement>()
const uploadedImageSrc = ref<string>('')
const cropperRef = ref<InstanceType<typeof Cropper>>()
const isDraggingOver = ref(false)
const originalCanvas = ref<HTMLCanvasElement>()

const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0))
const emptyMask = (): boolean[][] => Array.from({ length: 9 }, () => Array(9).fill(false))

const recognized = ref(false)
const board = ref<number[][]>(emptyBoard())
const given = ref<boolean[][]>(emptyMask())
const selected = ref<{ row: number; col: number } | null>(null)
const copied = ref(false)

// 导入图片的原始尺寸（用于判断是否接近正方形，自动铺满裁剪框）
const imageInfo = ref<{ width: number; height: number } | null>(null)

const nearSquare = computed(() => {
  if (!imageInfo.value) return false
  const { width, height } = imageInfo.value
  if (width <= 0 || height <= 0) return false
  return Math.abs(width / height - 1) < 0.05
})

// 接近正方形时，默认裁剪框铺满整张图（受 aspectRatio:1 约束为最大内接正方形）
const defaultSize = ({ imageSize }: { imageSize: { width: number; height: number } }) => {
  const side = Math.min(imageSize.width, imageSize.height)
  return { width: side, height: side }
}

const defaultPosition = ({ imageSize }: { imageSize: { width: number; height: number } }) => {
  const side = Math.min(imageSize.width, imageSize.height)
  return {
    left: (imageSize.width - side) / 2,
    top: (imageSize.height - side) / 2,
  }
}

// --- 上传 ---
function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function loadImageForCrop(file: File): void {
  const reader = new FileReader()
  reader.onload = (e) => {
    const src = e.target?.result as string
    // 先读取图片尺寸，再设置 src，确保近正方形判断在 Cropper 挂载前就绪
    loadImageSize(src)
      .then((size) => {
        imageInfo.value = size
        uploadedImageSrc.value = src
      })
      .catch(() => {
        uploadedImageSrc.value = src
      })
  }
  reader.readAsDataURL(file)
}

function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadImageForCrop(file)
}

async function handleDrop(event: DragEvent): Promise<void> {
  isDraggingOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) loadImageForCrop(file)
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

// --- 裁剪与识别 ---
function cancelCrop(): void {
  uploadedImageSrc.value = ''
  imageInfo.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function confirmCrop(): Promise<void> {
  if (!cropperRef.value) return
  const { canvas } = cropperRef.value.getResult()
  if (!canvas) return

  canvas.toBlob(async (blob) => {
    if (!blob) return
    const croppedFile = new File([blob], 'cropped-image.png', { type: 'image/png' })

    try {
      const result = await recognize(croppedFile, { confidenceThreshold: CONFIDENCE_THRESHOLD, debug: false })
      applyResult(result)
      await nextTick()
      drawOriginal()
    } catch (err) {
      logger.error('识别失败:', err)
    }
  }, 'image/png')
}

function applyResult(result: string): void {
  board.value = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => parseInt(result[r * 9 + c] ?? '0', 10) || 0)
  )
  given.value = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => board.value[r]![c]! > 0)
  )
  selected.value = null
  recognized.value = true
}

// 把识别用的原图按检测到的网格边界再裁一次，外扩以包含完整边框；
// 外扩比例与 SudokuBoard 的 viewBox（-10..910，网格 0..900）留白一致，使两者盘面逐格对齐
function drawOriginal(): void {
  const img = originalImage.value
  const canvasEl = originalCanvas.value
  if (!img || !canvasEl) return
  const ctx = canvasEl.getContext('2d')!
  const g = state.grid
  if (!g || g.width <= 0 || g.height <= 0) {
    canvasEl.width = img.width
    canvasEl.height = img.height
    ctx.drawImage(img, 0, 0)
    return
  }
  const m = Math.round(g.width / 90)
  const sx = Math.max(0, g.x - m)
  const sy = Math.max(0, g.y - m)
  const sw = Math.min(img.width - sx, g.width + 2 * m)
  const sh = Math.min(img.height - sy, g.height + 2 * m)
  canvasEl.width = sw
  canvasEl.height = sh
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
}

// --- 编辑 ---
function onCellClick(pos: { row: number; col: number }): void {
  selected.value = { row: pos.row, col: pos.col }
}

function inputDigit(n: number): void {
  if (!selected.value) return
  const { row, col } = selected.value
  board.value[row]![col]! = n
  given.value[row]![col]! = false
}

function clearSelected(): void {
  if (!selected.value) return
  const { row, col } = selected.value
  board.value[row]![col]! = 0
  given.value[row]![col]! = false
}

function onKeydown(e: KeyboardEvent): void {
  if (!recognized.value) return
  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= 9) {
    inputDigit(n)
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    clearSelected()
  }
}

// --- 导出 ---
function boardToText(): string {
  return board.value.flat().map((v) => (v > 0 ? String(v) : '0')).join('')
}

async function copyText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(boardToText())
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    logger.error('复制失败:', err)
  }
}

function downloadText(): void {
  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(boardToText()))
  element.setAttribute('download', 'sudoku.txt')
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

// --- 重置 ---
function reset(): void {
  resetOCR()
  uploadedImageSrc.value = ''
  imageInfo.value = null
  recognized.value = false
  selected.value = null
  board.value = emptyBoard()
  given.value = emptyMask()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', handlePaste)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.cropper {
  max-height: 600px;
}
</style>
