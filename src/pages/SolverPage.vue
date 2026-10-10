<template>
  <div class="page-container">
    <h1 class="page-title mb-2">数独识别</h1>
    <p class="text-sm text-muted-foreground mb-6">上传数独图片，自动识别为可编辑盘面，并可导出为文本</p>

    <!-- 上传区 -->
    <Card v-if="!uploadedImageSrc" class="mx-auto w-full max-w-[560px]">
      <CardContent class="gap-4">
        <div
          class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors"
          :class="isDraggingOver ? 'border-brand bg-blue-50' : 'border-gray-300'" role="button" tabindex="0"
          @click="openFilePicker" @keydown.enter.prevent="openFilePicker" @keydown.space.prevent="openFilePicker"
          @dragover.prevent="isDraggingOver = true" @dragleave.prevent="isDraggingOver = false" @drop.prevent="handleDrop">
          <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

          <ImagePlus class="size-14 text-muted-foreground mb-2" />
          <p class="text-lg font-medium">把数独图片拖到这里</p>
          <p class="text-sm text-muted-foreground">或按 Ctrl+V / Cmd+V 粘贴截图</p>

          <Button class="mt-5" :disabled="state.isLoading" @click.stop="openFilePicker">
            <Upload />
            选择图片
          </Button>
        </div>

        <Alert class="mt-4">
          <Info />
          <AlertDescription>
            请上传清晰、笔直的数独网格图（截图或导出的题目图），暂不支持纸质数独拍照。识别结果可以逐格修正，并导出为 81 位文本。
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    <!-- 裁剪区 -->
    <Card v-else-if="!recognized" class="mx-auto w-full max-w-[560px]">
      <CardContent class="gap-4">
        <div>
          <h2 class="text-lg font-medium mb-1">裁剪图像</h2>
          <p class="text-sm text-muted-foreground">拖动边框调整裁剪范围，确保包含完整的数独网格。</p>
        </div>

        <div class="overflow-hidden rounded-xl bg-gray-900">
          <Cropper ref="cropperRef" :src="uploadedImageSrc" :stencil-props="{ aspectRatio: 1 }"
            :default-size="nearSquare ? defaultSize : undefined"
            :default-position="nearSquare ? defaultPosition : undefined" class="cropper" />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button :disabled="state.isLoading" @click="confirmCrop">
            {{ state.isLoading ? '识别中…' : '确认识别' }}
          </Button>
          <Button variant="ghost" :disabled="state.isLoading" @click="cancelCrop">重新选择图片</Button>
          <span v-if="state.isLoading" class="text-sm text-muted-foreground">正在识别数独…</span>
        </div>

        <Alert v-if="state.error" variant="destructive">
          <CircleAlert />
          <AlertDescription>{{ state.error }}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>

    <!-- 识别结果 -->
    <div v-else class="space-y-6">
      <!-- 对比：原图 + 识别盘面 -->
      <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card class="flex flex-col">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <CardTitle>原图</CardTitle>
              <span class="text-sm text-muted-foreground">已按网格边界对齐</span>
            </div>
          </CardHeader>
          <CardContent class="flex flex-1 items-center justify-center">
            <canvas ref="originalCanvas"
              class="block h-auto max-h-[220px] w-auto max-w-full rounded-lg ring-1 ring-gray-100 sm:max-h-[360px] xl:max-h-[440px]"></canvas>
          </CardContent>
        </Card>

        <Card class="flex flex-col">
          <CardHeader>
            <div class="flex items-center justify-between gap-3">
              <CardTitle>识别结果</CardTitle>
              <Badge variant="secondary">识别到 {{ digitCount }} 个数字</Badge>
            </div>
          </CardHeader>
          <CardContent
            class="flex flex-1 items-center justify-center [&_svg]:h-[220px] [&_svg]:w-auto [&_svg]:max-w-full sm:[&_svg]:h-[360px] xl:[&_svg]:h-[440px]">
            <SudokuBoard :board="board" :given="given" :size="440" :showCandidates="false" :selected="selected"
              mode="interactive" @cell-click="onCellClick" />
          </CardContent>
        </Card>
      </div>

      <!-- 修正 + 导出 -->
      <Card>
        <CardContent class="gap-5">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-medium">修正数字</h2>
              <Badge :variant="selected ? 'default' : 'secondary'">
                {{ selected ? `已选中 R${selected.row + 1}C${selected.col + 1}` : '未选中' }}
              </Badge>
            </div>
            <p class="text-sm text-muted-foreground mt-1.5">
              先在右侧盘面点选格子，再用下方键盘或直接按键盘 1–9 输入，0 / Backspace 清除；修正后的数字显示为蓝色
            </p>
          </div>

          <div class="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
            <!-- 数字键盘 -->
            <div class="grid w-full grid-cols-3 gap-2 select-none">
              <Button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" variant="outline" class="h-14 text-lg"
                :disabled="!selected" :aria-label="`输入 ${n}`" @click="inputDigit(n)">{{ n }}</Button>
              <Button variant="ghost" class="col-span-3" :disabled="!selected" @click="clearSelected">
                清除选中
              </Button>
            </div>

            <!-- 导出 -->
            <div class="min-w-0 flex-1 lg:border-l lg:border-gray-200 lg:pl-8">
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span class="text-xs font-medium text-muted-foreground">导出文本</span>
                <span class="text-sm text-muted-foreground">81 个字符，修正后实时更新</span>
              </div>

              <div class="mt-2.5 break-all rounded-md bg-muted px-4 py-3 font-mono text-xs leading-relaxed">
                {{ boardText }}
              </div>

              <div class="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <Button @click="copyText">
                  <Copy />
                  复制文本
                </Button>
                <Button variant="outline" @click="downloadText">
                  <Download />
                  下载 .txt
                </Button>
                <Button variant="ghost" @click="backToCrop">
                  <Scan />
                  重新裁剪
                </Button>
                <Button variant="ghost" @click="reset">
                  <RotateCcw />
                  重新上传
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 复制反馈（固定底部，短暂出现） -->
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0 translate-y-2">
      <div v-if="copied"
        class="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg"
        role="status" aria-live="polite">
        已复制 81 位文本到剪贴板
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, nextTick } from 'vue'
import {
  CircleAlert,
  Copy,
  Download,
  ImagePlus,
  Info,
  RotateCcw,
  Scan,
  Upload,
} from '@lucide/vue'
import { logger } from '@/utils/logger'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import SudokuBoard from '@/components/SudokuBoard.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

/* 裁剪框外部与容器同色，避免默认纯黑产生割裂感。
   Tailwind v4 的 scoped style 里 @apply 需要 @reference，这里直接用等价 CSS 值。 */
.cropper :deep(.vue-advanced-cropper__background),
.cropper :deep(.vue-advanced-cropper__foreground) {
  background-color: #111827; /* gray-900 */
}
</style>
