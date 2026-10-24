<template>
  <!-- lg:min-h-0：页面高度严格等于可用高度，不被内容（如初始尺寸的盘面）撑高，盘面才能按剩余高度缩放 -->
  <div class="page-container lg:min-h-0">
    <PageHeader :title="feature.title" description="上传数独图片，自动识别为可编辑盘面，并可导出为文本">
      <!-- 三步指示器：细线圆点 + 文字，当前步用墨色实心 -->
      <ol class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-label="识别步骤">
        <li v-for="(step, i) in STEPS" :key="step" class="flex items-center gap-2"
          :aria-current="i === currentStep ? 'step' : undefined">
          <span class="grid size-5 place-items-center rounded-full text-[11px] font-medium tabular-nums transition-colors"
            :class="i === currentStep
              ? 'bg-foreground text-background'
              : i < currentStep
                ? 'text-foreground ring-1 ring-foreground/40'
                : 'text-muted-foreground ring-1 ring-border'">
            <Check v-if="i < currentStep" class="size-3" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span :class="i === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'">{{ step }}</span>
          <span v-if="i < STEPS.length - 1" class="ml-1 h-px w-6 bg-border" aria-hidden="true" />
        </li>
      </ol>
    </PageHeader>

      <!-- 上传区：只保留一个虚线拖放区，说明文字放在下方，不再框套框 -->
      <div v-if="!uploadedImageSrc" class="mx-auto flex w-full max-w-[560px] flex-col gap-4">
          <div
            class="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center transition-colors"
            :class="isDraggingOver ? 'border-foreground/50 bg-muted' : 'bg-card border-outline/60 hover:bg-muted/40'"
            role="button" tabindex="0"
            @click="openFilePicker" @keydown.enter.prevent="openFilePicker" @keydown.space.prevent="openFilePicker"
            @dragover.prevent="isDraggingOver = true" @dragleave.prevent="isDraggingOver = false"
            @drop.prevent="handleDrop">
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileSelect" />

            <ImagePlus class="mb-3 size-8 text-muted-foreground" :stroke-width="1.5" />
            <p class="text-base font-medium">把数独图片拖到这里</p>
            <p class="text-sm text-muted-foreground">或按 <Kbd>{{ MOD_KEY }}V</Kbd> 粘贴截图</p>

            <Button class="mt-5" :disabled="state.isLoading" @click.stop="openFilePicker">
              <Upload />
              选择图片
            </Button>
          </div>

          <p class="flex gap-2 text-sm text-muted-foreground">
            <Info class="mt-0.5 size-4 shrink-0" />
            请上传清晰、笔直的数独网格图（截图或导出的题目图），暂不支持纸质数独拍照。识别结果可以逐格修正，并导出为 81 位文本。
          </p>
      </div>

      <!-- 裁剪区 -->
      <Card v-else-if="!recognized" class="mx-auto w-full max-w-[560px]">
        <CardContent class="flex flex-col gap-4">
          <div>
            <h2 class="mb-1 text-base font-medium">裁剪图像</h2>
            <p class="text-sm text-muted-foreground">拖动边框调整裁剪范围，确保包含完整的数独网格。</p>
          </div>

          <div class="overflow-hidden rounded-xl bg-inverse-surface">
            <Cropper ref="cropperRef" :src="uploadedImageSrc" :stencil-props="{ aspectRatio: 1 }"
              :default-size="nearSquare ? defaultSize : undefined"
              :default-position="nearSquare ? defaultPosition : undefined" class="cropper" />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <Button :disabled="state.isLoading" @click="confirmCrop">
              <LoaderCircle v-if="state.isLoading" class="animate-spin" />
              {{ state.isLoading ? '识别中…' : '确认识别' }}
            </Button>
            <Button variant="ghost" :disabled="state.isLoading" @click="cancelCrop">重新选择图片</Button>
          </div>

          <Alert v-if="state.error" variant="destructive">
            <CircleAlert />
            <AlertDescription>{{ state.error }}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <!-- 识别结果：左侧对比区吃满剩余高度（方块边长 = 格子宽高较小者，用容器查询 cqmin），右侧修正 + 导出 -->
      <div v-else
        class="grid grid-cols-1 gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)]">
        <section class="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-muted-foreground">
              识别到 <span class="font-medium tabular-nums text-foreground">{{ digitCount }}</span> 个数字
            </p>
            <SegmentedControl v-model="compareMode" :options="COMPARE_OPTIONS" aria-label="对比方式" />
          </div>

          <!-- 对比区：每个格子是 size 容器，内部方块用 100cqmin 取宽高较小者；窄屏退化为正方形格子 -->
          <div class="grid gap-4 lg:min-h-0 lg:flex-1"
            :class="compareMode === 'side' ? 'grid-cols-2' : 'grid-cols-1'">
            <template v-if="compareMode === 'side'">
              <figure class="flex min-w-0 flex-col gap-1.5 lg:min-h-0">
                <figcaption class="text-xs text-muted-foreground">原图（已按网格边界对齐）</figcaption>
                <div class="grid aspect-square place-items-start [container-type:size] lg:aspect-auto lg:min-h-0 lg:flex-1">
                  <canvas ref="originalCanvas" class="size-[100cqmin] rounded-sm object-contain ring-1 ring-border"></canvas>
                </div>
              </figure>
              <figure class="flex min-w-0 flex-col gap-1.5 lg:min-h-0">
                <figcaption class="text-xs text-muted-foreground">识别结果（点选格子修正）</figcaption>
                <div class="grid aspect-square place-items-start [container-type:size] lg:aspect-auto lg:min-h-0 lg:flex-1">
                  <SudokuBoard class="size-[100cqmin]" :board="board" :given="given" :size="440" :showCandidates="false"
                    :selected="selected" mode="interactive" @cell-click="onCellClick" />
                </div>
              </figure>
            </template>

            <!-- 叠加：识别盘面半透明覆盖在原图上，数字错位处即识别有误 -->
            <figure v-else class="flex min-w-0 flex-col gap-1.5 lg:min-h-0">
              <figcaption class="text-xs text-muted-foreground">叠加对比（数字错位处即识别有误）</figcaption>
              <div class="grid aspect-square place-items-start [container-type:size] lg:aspect-auto lg:min-h-0 lg:flex-1">
                <div class="grid size-[100cqmin] *:col-start-1 *:row-start-1">
                  <canvas ref="originalCanvas" class="size-full rounded-sm object-contain"></canvas>
                  <SudokuBoard class="size-full opacity-60" :board="board" :given="given" :size="440"
                    :showCandidates="false" :selected="selected" mode="interactive" @cell-click="onCellClick" />
                </div>
              </div>
            </figure>
          </div>
        </section>

        <!-- 右栏：修正 → 导出，内容放不下时只在栏内滚动 -->
        <aside class="flex min-w-0 flex-col gap-5 lg:min-h-0 lg:overflow-y-auto">
          <div>
            <div class="flex items-baseline justify-between gap-3">
              <h2 class="text-sm font-medium text-foreground">修正数字</h2>
              <span class="text-sm tabular-nums" :class="selected ? 'text-foreground' : 'text-muted-foreground'">
                {{ selected ? `R${selected.row + 1}C${selected.col + 1}` : '未选中' }}
              </span>
            </div>
            <p class="mt-1 mb-3 text-xs text-muted-foreground">
              点选格子（方向键移动），键盘 1–9 输入，0 / Backspace 清除；修正后的数字以赭色显示
            </p>
            <NumberPad size="sm" :disabled="!selected" @input="inputDigit">
              <Button variant="ghost" size="sm" class="flex-1" :disabled="!selected" @click="clearSelected">清除选中</Button>
            </NumberPad>
          </div>

          <div class="border-t border-border pt-4">
            <h2 class="text-sm font-medium text-foreground">导出</h2>
            <!-- 导出文本是要被复制的数据：点一下即整段选中 -->
            <p class="mt-2 cursor-text break-all rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed select-all">{{ boardText }}</p>
            <Button class="mt-3 w-full" @click="openInDraw">
              <PenLine />
              在绘图工具中打开
            </Button>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" @click="copyText">
                <Copy />
                复制文本
              </Button>
              <Button variant="outline" size="sm" @click="downloadText">
                <Download />
                下载 .txt
              </Button>
              <Button variant="ghost" size="sm" @click="backToCrop">
                <Scan />
                重新裁剪
              </Button>
              <Button variant="ghost" size="sm" @click="reset">
                <RotateCcw />
                重新上传
              </Button>
            </div>
          </div>
        </aside>
      </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Check,
  CircleAlert,
  Columns2,
  Copy,
  Download,
  ImagePlus,
  Info,
  Layers,
  LoaderCircle,
  PenLine,
  RotateCcw,
  Scan,
  Upload,
} from '@lucide/vue'
import { logger } from '@/utils/logger'
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import NumberPad from '@/components/NumberPad.vue'
import PageHeader from '@/components/PageHeader.vue'
import SegmentedControl, { type SegmentedOption } from '@/components/SegmentedControl.vue'
import SudokuBoard from '@/components/SudokuBoard.vue'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Kbd } from '@/components/ui/kbd'
import { useOCR } from '@/composables/useOCR'
import { FEATURE_BY_KEY } from '@/constants/features'
import { CONFIDENCE_THRESHOLD } from '@/utils/ocr/constants'
import { toPuzzleText } from '@/utils/puzzleText'

const feature = FEATURE_BY_KEY.solver
const router = useRouter()
const { state, originalImage, recognize, reset: resetOCR } = useOCR()

const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'
const STEPS = ['上传图片', '裁剪网格', '校对导出']
const COMPARE_OPTIONS: SegmentedOption<'side' | 'overlay'>[] = [
  { value: 'side', label: '并排', icon: Columns2 },
  { value: 'overlay', label: '叠加', icon: Layers },
]

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
const compareMode = ref<'side' | 'overlay'>('side')

const currentStep = computed(() => (!uploadedImageSrc.value ? 0 : !recognized.value ? 1 : 2))
const digitCount = computed(() => board.value.flat().filter((v) => v > 0).length)

// 两种对比布局各有一块画布，切换后新画布是空的，需要重画
watch(compareMode, async () => {
  await nextTick()
  drawOriginal()
})

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

const ARROW_DELTA: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function onKeydown(e: KeyboardEvent): void {
  if (!recognized.value) return
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

  const delta = ARROW_DELTA[e.key]
  if (delta) {
    e.preventDefault()
    // 未选中时从左上角开始；越界时在行 / 列内循环
    const { row, col } = selected.value ?? { row: 0, col: 0 }
    selected.value = selected.value
      ? { row: (row + delta[0] + 9) % 9, col: (col + delta[1] + 9) % 9 }
      : { row, col }
    return
  }

  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= 9) {
    inputDigit(n)
  } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault()
    clearSelected()
  }
}

// --- 导出 ---
const boardText = computed(() => toPuzzleText(board.value))

async function copyText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(boardText.value)
    toast.success('已复制 81 位文本到剪贴板')
  } catch (err) {
    logger.error('复制失败:', err)
    toast.error('复制失败，请检查浏览器剪贴板权限')
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

function openInDraw(): void {
  router.push({ path: '/draw', query: { puzzle: boardText.value } })
}

// --- 重置 ---
function reset(): void {
  resetOCR()
  uploadedImageSrc.value = ''
  imageInfo.value = null
  recognized.value = false
  selected.value = null
  compareMode.value = 'side'
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
/* 一屏布局：裁剪框高度随视口收缩（扣掉导航、页头、标题与按钮行），最少保留 240px */
.cropper {
  max-height: max(240px, min(520px, calc(100dvh - 420px)));
}

/* 裁剪框外部与容器同色（inverse-surface），避免默认纯黑产生割裂感 */
.cropper :deep(.vue-advanced-cropper__background),
.cropper :deep(.vue-advanced-cropper__foreground) {
  background-color: var(--color-inverse-surface);
}
</style>
