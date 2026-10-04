<template>
  <div class="page-container">
    <h1 class="page-title mb-2">数独识别</h1>
    <p class="text-sm text-gray-500 mb-6">上传数独图片，自动识别为可编辑盘面，并可导出为文本</p>

    <!-- 上传区 -->
    <div v-if="!uploadedImageSrc" class="card">
      <div class="mx-auto w-full max-w-[560px]">
        <div
          class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors"
          :class="isDraggingOver ? 'border-accent bg-blue-50' : 'border-gray-200 bg-gray-50'" role="button"
          tabindex="0" @click="openFilePicker" @keydown.enter.prevent="openFilePicker"
          @keydown.space.prevent="openFilePicker" @dragover.prevent="isDraggingOver = true"
          @dragleave.prevent="isDraggingOver = false" @drop.prevent="handleDrop">
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

          <svg class="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
          </svg>

          <p class="mt-4 text-sm font-medium text-gray-900">把数独图片拖到这里</p>
          <p class="mt-1 text-xs text-gray-500">或按 Ctrl+V / Cmd+V 粘贴截图</p>

          <button class="btn-primary mt-5 disabled:opacity-50" :disabled="state.isLoading"
            @click.stop="openFilePicker">选择图片</button>
        </div>

        <div class="mt-4 flex items-start gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3">
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p class="text-xs leading-relaxed text-gray-500">
            请上传清晰、笔直的数独网格图（截图或导出的题目图），暂不支持纸质数独拍照。
            识别结果可以逐格修正，并导出为 81 位文本。
          </p>
        </div>
      </div>
    </div>

    <!-- 裁剪区 -->
    <div v-else-if="!recognized" class="card">
      <div class="mx-auto w-full max-w-[560px]">
        <div class="mb-4">
          <h2 class="section-title mb-1">裁剪图像</h2>
          <p class="text-sm text-gray-500">拖动边框调整裁剪范围，确保包含完整的数独网格。</p>
        </div>

        <div class="overflow-hidden rounded-xl bg-gray-900">
          <Cropper ref="cropperRef" :src="uploadedImageSrc" :stencil-props="{ aspectRatio: 1 }"
            :default-size="nearSquare ? defaultSize : undefined"
            :default-position="nearSquare ? defaultPosition : undefined" class="cropper" />
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button class="btn-primary px-5" @click="confirmCrop" :disabled="state.isLoading">
            {{ state.isLoading ? '识别中…' : '确认识别' }}
          </button>
          <button class="btn px-5" :disabled="state.isLoading" @click="cancelCrop">重新选择图片</button>

          <div v-if="state.isLoading" class="flex items-center gap-2 text-sm text-gray-500">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-accent"></div>
            <span>正在识别数独…</span>
          </div>
        </div>

        <div v-if="state.error"
          class="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p class="text-sm leading-relaxed text-red-700">{{ state.error }}</p>
        </div>
      </div>
    </div>

    <!-- 识别结果 -->
    <div v-else class="space-y-6">
      <!-- 对比：原图 + 识别盘面 -->
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div class="card flex flex-col">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="section-title mb-0">原图</h2>
            <span class="text-xs text-gray-400">已按网格边界对齐</span>
          </div>
          <div class="flex flex-1 items-center justify-center">
            <canvas ref="originalCanvas"
              class="block h-auto max-h-[220px] w-auto max-w-full rounded-lg ring-1 ring-gray-100 sm:max-h-[360px] xl:max-h-[440px]"></canvas>
          </div>
        </div>

        <div class="card flex flex-col">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="section-title mb-0">识别结果</h2>
            <span class="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
              识别到 {{ digitCount }} 个数字
            </span>
          </div>
          <div
            class="flex flex-1 items-center justify-center [&_svg]:h-[220px] [&_svg]:w-auto [&_svg]:max-w-full sm:[&_svg]:h-[360px] xl:[&_svg]:h-[440px]">
            <SudokuBoard :board="board" :given="given" :size="440" :showCandidates="false" :selected="selected"
              mode="interactive" @cell-click="onCellClick" />
          </div>
        </div>
      </div>

      <!-- 修正 + 导出 -->
      <div class="card">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-base font-semibold text-gray-900">修正数字</h2>
          <span class="rounded-full px-2.5 py-0.5 text-xs"
            :class="selected ? 'bg-blue-50 text-accent' : 'bg-gray-100 text-gray-500'">
            {{ selected ? `已选中 R${selected.row + 1}C${selected.col + 1}` : '未选中' }}
          </span>
        </div>
        <p class="mt-1.5 text-xs text-gray-500">
          先在右侧盘面点选格子，再用下方键盘或直接按键盘 1–9 输入，0 / Backspace 清除；修正后的数字显示为蓝色
        </p>

        <div class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <!-- 数字键盘：3×3，键位尺寸与唯余练习页一致 -->
          <div class="grid w-full grid-cols-3 gap-2 select-none">
            <button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" type="button" :aria-label="`输入 ${n}`"
              :disabled="!selected"
              class="h-14 rounded-xl border border-gray-200 bg-white text-xl font-semibold text-gray-900 shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              @click="inputDigit(n)">{{ n }}</button>
            <button type="button" :disabled="!selected"
              class="col-span-3 h-10 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 shadow-sm transition-all hover:border-accent hover:text-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              @click="clearSelected">清除选中</button>
          </div>

          <!-- 导出 -->
          <div class="min-w-0 flex-1 lg:border-l lg:border-gray-100 lg:pl-8">
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span class="text-xs font-medium tracking-wide text-gray-400">导出文本</span>
              <span class="text-xs text-gray-400">81 个字符，修正后实时更新</span>
            </div>

            <div
              class="mt-2.5 break-all rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3 font-mono text-xs leading-relaxed text-gray-600">
              {{ boardText }}
            </div>

            <div class="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <button class="btn-primary" @click="copyText">{{ copied ? '已复制！' : '复制文本' }}</button>
              <button class="btn" @click="downloadText">下载 .txt</button>
              <button class="btn" @click="backToCrop">重新裁剪</button>
              <button class="btn" @click="reset">重新上传</button>
            </div>
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

const NUMBER_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3]

const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0))
const emptyMask = (): boolean[][] => Array.from({ length: 9 }, () => Array(9).fill(false))

const recognized = ref(false)
const board = ref<number[][]>(emptyBoard())
const given = ref<boolean[][]>(emptyMask())
const selected = ref<{ row: number; col: number } | null>(null)
const copied = ref(false)

const digitCount = computed(() => board.value.flat().filter((v) => v > 0).length)

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
function openFilePicker(): void {
  if (state.isLoading) return
  fileInput.value?.click()
}

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

// 回到裁剪步骤，保留已上传的图片，无需重新选择文件
function backToCrop(): void {
  recognized.value = false
  selected.value = null
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
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= 9) {
    inputDigit(n)
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault()
    clearSelected()
  }
}

// --- 导出 ---
const boardText = computed(() => board.value.flat().map((v) => (v > 0 ? String(v) : '0')).join(''))

async function copyText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(boardText.value)
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
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(boardText.value))
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
  max-height: 520px;
}

/* 裁剪框外部与容器同色，避免默认纯黑产生割裂感 */
.cropper :deep(.vue-advanced-cropper__background),
.cropper :deep(.vue-advanced-cropper__foreground) {
  @apply bg-gray-900;
}
</style>
