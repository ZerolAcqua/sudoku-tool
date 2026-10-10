<template>
  <div class="page-container">
    <h1 class="page-title mb-2">数独唯余练习</h1>
    <p class="text-sm text-muted-foreground mb-6">在给定盘面中找出唯一能填的数字，训练唯余判断的准确度与速度</p>

    <!-- 控制条：题型 / 模式 / 会话状态 / 重开 -->
    <Card class="px-4 py-3 sm:px-5">
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-medium tracking-wide text-muted-foreground">题型</span>
            <ToggleGroup v-model="uiMode" type="single" variant="outline" size="sm" class="bg-muted/50 p-0.5">
              <ToggleGroupItem v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value" :title="opt.title"
                class="px-2.5 data-[state=on]:bg-brand data-[state=on]:text-brand-foreground sm:px-3">
                {{ opt.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-medium tracking-wide text-muted-foreground">模式</span>
            <ToggleGroup v-model="practiceMode" type="single" variant="outline" size="sm" class="bg-muted/50 p-0.5">
              <ToggleGroupItem v-for="opt in MODE_OPTIONS" :key="opt.value" :value="opt.value" :title="opt.title"
                class="px-2.5 data-[state=on]:bg-brand data-[state=on]:text-brand-foreground sm:px-3">
                {{ opt.label }}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-4">
          <!-- 会话状态 -->
          <div v-if="practiceMode === 'timed'" class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs text-muted-foreground">剩余时间</div>
              <div class="text-2xl font-bold tabular-nums leading-tight"
                :class="timeLeft <= 30 ? 'text-destructive' : 'text-foreground'">{{ formatTime(timeLeft) }}</div>
            </div>
            <div class="h-2 w-28 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full transition-all duration-500"
                :class="[timeLeft <= 30 ? 'bg-destructive' : 'bg-brand', pctClass(elapsedPct)]" />
            </div>
          </div>
          <div v-else-if="practiceMode === 'sprint'" class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs text-muted-foreground">进度</div>
              <div class="text-2xl font-bold tabular-nums leading-tight text-foreground">
                {{ stats.total }}<span class="text-base font-normal text-muted-foreground">/{{ sprintTarget }}</span>
              </div>
            </div>
            <div class="h-2 w-28 overflow-hidden rounded-full bg-muted">
              <div class="h-full rounded-full bg-brand transition-all duration-300"
                :class="pctClass((stats.total / sprintTarget) * 100)" />
            </div>
          </div>
          <div v-else class="text-right">
            <div class="text-xs text-muted-foreground">已练习</div>
            <div class="text-2xl font-bold tabular-nums leading-tight text-foreground">
              {{ stats.total }}<span class="text-base font-normal text-muted-foreground"> 题</span>
            </div>
          </div>

          <Button :variant="isSessionComplete ? 'default' : 'outline'" title="快捷键 R" @click="restart()">
            <RotateCcw />
            {{ isSessionComplete ? '再来一局' : '重新开始' }}
          </Button>
        </div>
      </div>
    </Card>

    <!-- 盘面 + 侧栏 -->
    <div class="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <!-- 盘面 -->
      <Card class="p-4 sm:p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <Badge class="shrink-0 bg-brand-container text-brand-container-foreground">{{ modeMeta.label }}</Badge>
            <span class="truncate text-sm text-muted-foreground">{{ modeMeta.hint }}</span>
          </div>
          <span class="shrink-0 text-xs text-muted-foreground">第 {{ questionNo }} 题</span>
        </div>

        <div ref="boardWrapRef" class="flex justify-center">
          <SudokuBoard :board="board" :given="given" :size="boardSize" :showCandidates="false" :focusCell="focusCell"
            :focusHighlight="focusHighlight" mode="practice" />
        </div>

        <!-- 答题反馈 -->
        <div class="mt-4 flex h-11 items-center justify-center" aria-live="polite">
          <div v-if="feedback" class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
            :class="feedback.correct
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-red-300 bg-red-50 text-red-700'">
            <component :is="feedback.correct ? CircleCheck : CircleX" class="size-4" />
            <span v-if="feedback.correct">正确！答案就是 {{ feedback.answer }}</span>
            <span v-else>答错了，正确答案是 {{ feedback.answer }}</span>
          </div>
          <div v-else-if="!isRunning" class="text-sm text-muted-foreground">本次练习已结束，点击「再来一局」继续</div>
          <div v-else class="flex items-center gap-1.5 text-sm text-muted-foreground">
            按键盘 1–9 作答
            <Kbd>R</Kbd>
            重新开始
          </div>
        </div>
      </Card>

      <!-- 侧栏：纵向单列，保证统计区有足够宽度 -->
      <div class="flex flex-col gap-6 lg:sticky lg:top-24">
        <!-- 数字键盘 -->
        <Card class="order-1 select-none p-4 lg:order-2">
          <div class="mb-2.5 flex items-center justify-between px-1">
            <span class="text-xs font-medium tracking-wide text-muted-foreground">数字键盘</span>
            <span class="text-[11px] text-muted-foreground">键盘 1–9</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <Button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" variant="outline" :aria-label="`输入 ${n}`"
              :disabled="inputLocked" class="h-14 text-xl font-semibold active:scale-95" @click="onNumberInput(n)">{{ n
              }}</Button>
          </div>
        </Card>

        <!-- 统计 -->
        <Card class="order-2 p-5 lg:order-1">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-medium tracking-wide text-muted-foreground">正确率</span>
            <span class="text-3xl font-bold leading-none tabular-nums text-foreground">{{ accuracyPct }}<span
                class="font-semibold text-muted-foreground">%</span></span>
          </div>
          <Progress :model-value="accuracyPct" class="mt-3 h-1.5" />

          <div class="mt-5 grid grid-cols-3 divide-x divide-border text-center">
            <div>
              <div class="text-lg font-semibold tabular-nums text-foreground">{{ stats.total }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">已做</div>
            </div>
            <div>
              <div class="text-lg font-semibold tabular-nums text-green-600">{{ stats.correct }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">正确</div>
            </div>
            <div>
              <div class="text-lg font-semibold tabular-nums text-destructive">{{ stats.wrong }}</div>
              <div class="mt-0.5 text-xs text-muted-foreground">错误</div>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-2 border-t border-border pt-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">平均用时</span>
              <span class="text-sm font-semibold tabular-nums text-foreground">{{ formatMs(stats.avgMs) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">上题用时</span>
              <span class="text-sm font-semibold tabular-nums text-foreground">
                {{ lastDurationMs === null ? '—' : formatMs(lastDurationMs) }}
              </span>
            </div>
          </div>

          <Separator class="my-4" />

          <div>
            <div class="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground">分类正确率</div>
            <div class="flex flex-col gap-2">
              <div v-for="row in modeRows" :key="row.mode" class="flex items-center gap-2.5">
                <span class="w-8 shrink-0 text-xs text-muted-foreground">{{ row.label }}</span>
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div class="h-full rounded-full bg-brand" :class="pctClass(row.pct)" />
                </div>
                <span class="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{{ row.text }}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>

    <!-- 结算窗口 -->
    <Dialog v-model:open="showSettlement">
      <DialogContent class="max-h-full overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle class="text-2xl">
            {{ practiceMode === 'timed' ? '时间到！' : '冲刺完成！' }}
          </DialogTitle>
          <DialogDescription>本次练习结果</DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border">
          <div class="bg-muted/50 px-4 py-3">
            <div class="text-xl font-bold tabular-nums text-foreground">{{ accuracyPct }}%</div>
            <div class="mt-0.5 text-xs text-muted-foreground">正确率</div>
          </div>
          <div class="bg-muted/50 px-4 py-3">
            <div class="text-xl font-bold tabular-nums text-foreground">{{ formatMs(stats.avgMs) }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">平均用时</div>
          </div>
          <div class="bg-muted/50 px-4 py-3">
            <div class="text-xl font-bold tabular-nums text-green-600">{{ stats.correct }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">正确</div>
          </div>
          <div class="bg-muted/50 px-4 py-3">
            <div class="text-xl font-bold tabular-nums text-destructive">{{ stats.wrong }}</div>
            <div class="mt-0.5 text-xs text-muted-foreground">错误</div>
          </div>
        </div>

        <div class="flex items-center justify-between text-sm">
          <span class="text-muted-foreground">共完成</span>
          <span class="font-semibold tabular-nums text-foreground">{{ stats.total }} 题</span>
        </div>

        <DialogFooter class="flex-row gap-3 sm:justify-stretch">
          <Button variant="outline" class="flex-1" @click="copyStats()">
            <component :is="copied ? Check : Copy" />
            {{ copied ? '已复制！' : '复制数据' }}
          </Button>
          <Button class="flex-1" @click="restart()">再来一局</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, CircleCheck, CircleX, Copy, RotateCcw } from '@lucide/vue'
import { logger } from '../utils/logger'
import SudokuBoard from '../components/SudokuBoard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { usePracticeStore } from '../stores/practice'
import { genByMode, pickRandomMode, type UnitMode, type PracticePuzzle } from '../utils/generator'

const stats = usePracticeStore()

type UiMode = UnitMode | 'random'
type PracticeMode = 'timed' | 'sprint' | 'free'

// UI 出题类型与练习模式
const uiMode = ref<UiMode>('random')
const practiceMode = ref<PracticeMode>('free')

const TYPE_OPTIONS: { value: UiMode, label: string, title: string }[] = [
  { value: 'random', label: '随机', title: '随机类型' },
  { value: 'row', label: '行', title: '行唯一数' },
  { value: 'col', label: '列', title: '列唯一数' },
  { value: 'box', label: '宫', title: '宫唯一数' },
  { value: 'general', label: '一般', title: '一般唯余' },
]

const MODE_OPTIONS: { value: PracticeMode, label: string, title: string }[] = [
  { value: 'free', label: '自由', title: '自由模式：不限时不限题数' },
  { value: 'timed', label: '限时', title: '五分限时：5 分钟内尽可能多答' },
  { value: 'sprint', label: '冲刺', title: '百题冲刺：累计完成 100 题' },
]

// 练习模式相关状态
const timedDuration = 300 // 限时模式：秒数，默认 5 分钟
const timeLeft = ref<number>(timedDuration)
const isRunning = ref<boolean>(false)
const timerInterval = ref<ReturnType<typeof setInterval> | null>(null)
const sprintTarget = 100
const isSessionComplete = ref<boolean>(false)
const showSettlement = ref<boolean>(false)
const copied = ref<boolean>(false)

// 当前题目数据
const board = ref<number[][]>(Array.from({ length: 9 }, () => Array(9).fill(0)))
const given = ref<boolean[][]>(Array.from({ length: 9 }, () => Array(9).fill(false)))
const focusCell = ref<{ row: number, col: number } | null>(null)
const focusHighlight = ref<'row' | 'col' | 'box' | 'all'>('all')
const answer = ref<number>(0)
const currentMode = ref<UnitMode>('row')
const lastDurationMs = ref<number | null>(null)
const questionNo = ref<number>(1)

// 答题反馈：只展示上一题的正误与正确答案，不阻塞输入
const feedback = ref<{ correct: boolean, answer: number } | null>(null)

// 盘面尺寸跟随容器宽度
const boardWrapRef = ref<HTMLElement | null>(null)
const boardSize = ref<number>(560)
let resizeObserver: ResizeObserver | null = null

const NUMBER_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3]

const poolModes: UnitMode[] = ['row', 'col', 'box', 'general']

const MODE_META: Record<UnitMode, { label: string, hint: string }> = {
  row: { label: '行唯余', hint: '这一行里还缺哪个数字？' },
  col: { label: '列唯余', hint: '这一列里还缺哪个数字？' },
  box: { label: '宫唯余', hint: '这个九宫格里还缺哪个数字？' },
  general: { label: '一般唯余', hint: '结合所在行、列、宫，哪个数字只能填在这里？' },
}

const MODE_SHORT: Record<UnitMode, string> = { row: '行', col: '列', box: '宫', general: '一般' }
const MODE_ORDER: UnitMode[] = ['row', 'col', 'box', 'general']

// 进度条宽度用固定类名（Tailwind 需静态可扫描，不使用内联 style）
const PCT_STEPS = [
  'w-0', 'w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]', 'w-[30%]', 'w-[35%]', 'w-[40%]',
  'w-[45%]', 'w-[50%]', 'w-[55%]', 'w-[60%]', 'w-[65%]', 'w-[70%]', 'w-[75%]', 'w-[80%]',
  'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-full',
]
const pctClass = (pct: number) => PCT_STEPS[Math.min(PCT_STEPS.length - 1, Math.max(0, Math.round(pct / 5)))]!

const modeMeta = computed(() => MODE_META[currentMode.value])
const accuracyPct = computed(() => Math.round(stats.accuracy * 100))
const elapsedPct = computed(() => ((timedDuration - timeLeft.value) / timedDuration) * 100)
const inputLocked = computed(() => !isRunning.value || showSettlement.value)

// 行集合只由「题型」决定，且无数据时也占位渲染：整局侧栏高度恒定，数字键盘不会中途位移
const modeRows = computed(() => {
  const modes: UnitMode[] = uiMode.value === 'random' ? MODE_ORDER : [uiMode.value]
  return modes.map((mode) => {
    const items = stats.history.filter((h) => h.mode === mode)
    const correct = items.filter((i) => i.correct).length
    const pct = items.length ? Math.round((correct / items.length) * 100) : 0
    return {
      mode,
      label: MODE_SHORT[mode],
      pct,
      text: items.length ? `${pct}% (${items.length})` : '—',
    }
  })
})

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatMs(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`
}

function startSession() {
  isRunning.value = true
  isSessionComplete.value = false
  stats.resetStats()
  questionNo.value = 0
  feedback.value = null
  lastDurationMs.value = null
  newPuzzle()
  if (practiceMode.value === 'timed') {
    timeLeft.value = timedDuration
    clearTimer()
    timerInterval.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) stopSession()
    }, 1000)
  }
}

function stopSession() {
  isRunning.value = false
  isSessionComplete.value = true
  clearTimer()
  // 限时和冲刺模式完成后弹出结算窗口
  if (practiceMode.value !== 'free') showSettlement.value = true
}

function clearTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
}

function restart() {
  clearTimer()
  showSettlement.value = false
  isSessionComplete.value = false
  timeLeft.value = timedDuration
  startSession()
}

function applyPuzzle(p: PracticePuzzle) {
  board.value = p.board
  given.value = p.given
  focusCell.value = p.focusCell
  focusHighlight.value = p.focusHighlight
  answer.value = p.answer
  currentMode.value = p.mode
  questionNo.value++
  stats.startRound()
}

function newPuzzle() {
  const mode = uiMode.value === 'random' ? pickRandomMode(poolModes) : uiMode.value
  applyPuzzle(genByMode(mode as UnitMode))
}

function onNumberInput(n: number) {
  if (inputLocked.value || !focusCell.value) return
  const { row, col } = focusCell.value
  if (given.value[row]![col]!) return

  const correct = n === answer.value
  lastDurationMs.value = stats.finishRound(currentMode.value, correct)
  // 反馈只是提示，不阻塞输入：答完立刻出下一题
  feedback.value = { correct, answer: answer.value }

  if (practiceMode.value === 'sprint' && stats.total >= sprintTarget) {
    stopSession()
    return
  }
  newPuzzle()
}

async function copyStats() {
  try {
    await navigator.clipboard.writeText(generateStatsText())
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    logger.error('复制失败:', err)
  }
}

function generateStatsText() {
  const sec = (stats.avgMs / 1000).toFixed(3)
  return `正确COR[${stats.correct}]错误INC[${stats.wrong}]总数TOT[${stats.total}]正确率ACC[${Math.round(stats.accuracy * 100)}%]平均T/K[${sec}]`
}

// 键盘输入（焦点在表单控件上时不拦截）
function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const tag = (e.target as HTMLElement | null)?.tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
  if (e.key === 'r' || e.key === 'R') {
    restart()
    return
  }
  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= 9) onNumberInput(n)
}

function updateBoardSize() {
  const el = boardWrapRef.value
  if (!el) return
  const width = el.clientWidth
  if (width > 0) boardSize.value = Math.min(620, Math.max(240, Math.floor(width)))
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startSession()
  updateBoardSize()
  if (typeof ResizeObserver !== 'undefined' && boardWrapRef.value) {
    resizeObserver = new ResizeObserver(updateBoardSize)
    resizeObserver.observe(boardWrapRef.value)
  } else {
    window.addEventListener('resize', updateBoardSize)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateBoardSize)
  resizeObserver?.disconnect()
  clearTimer()
})

watch(uiMode, () => {
  if (isSessionComplete.value) restart()
  else if (isRunning.value) newPuzzle()
})

watch(practiceMode, () => {
  restart()
})
</script>
