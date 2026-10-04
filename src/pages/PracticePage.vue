<template>
  <div class="page-container">
    <h1 class="page-title mb-2">数独唯余练习</h1>
    <p class="text-sm text-gray-500 mb-6">在给定盘面中找出唯一能填的数字，训练唯余判断的准确度与速度</p>

    <!-- 控制条：题型 / 模式 / 会话状态 / 重开 -->
    <div class="card flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-4 py-3 sm:px-5">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-medium tracking-wide text-gray-400">题型</span>
          <div class="inline-flex rounded-lg bg-gray-100 p-1">
            <button v-for="opt in TYPE_OPTIONS" :key="opt.value" type="button" :title="opt.title"
              class="rounded-md px-2.5 py-1 text-sm transition-colors sm:px-3"
              :class="uiMode === opt.value
                ? 'bg-white font-semibold text-accent shadow-sm'
                : 'text-gray-500 hover:text-gray-900'"
              @click="uiMode = opt.value">{{ opt.label }}</button>
          </div>
        </div>
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-medium tracking-wide text-gray-400">模式</span>
          <div class="inline-flex rounded-lg bg-gray-100 p-1">
            <button v-for="opt in MODE_OPTIONS" :key="opt.value" type="button" :title="opt.title"
              class="rounded-md px-2.5 py-1 text-sm transition-colors sm:px-3"
              :class="practiceMode === opt.value
                ? 'bg-white font-semibold text-accent shadow-sm'
                : 'text-gray-500 hover:text-gray-900'"
              @click="practiceMode = opt.value">{{ opt.label }}</button>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-4">
        <!-- 会话状态 -->
        <div v-if="practiceMode === 'timed'" class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs text-gray-500">剩余时间</div>
            <div class="text-2xl font-bold tabular-nums leading-tight"
              :class="timeLeft <= 30 ? 'text-red-600' : 'text-gray-900'">{{ formatTime(timeLeft) }}</div>
          </div>
          <div class="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
            <div class="h-full rounded-full transition-all duration-500"
              :class="[timeLeft <= 30 ? 'bg-red-500' : 'bg-accent', pctClass(elapsedPct)]" />
          </div>
        </div>
        <div v-else-if="practiceMode === 'sprint'" class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs text-gray-500">进度</div>
            <div class="text-2xl font-bold tabular-nums leading-tight text-gray-900">
              {{ stats.total }}<span class="text-base font-normal text-gray-400">/{{ sprintTarget }}</span>
            </div>
          </div>
          <div class="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
            <div class="h-full rounded-full bg-accent transition-all duration-300"
              :class="pctClass((stats.total / sprintTarget) * 100)" />
          </div>
        </div>
        <div v-else class="text-right">
          <div class="text-xs text-gray-500">已练习</div>
          <div class="text-2xl font-bold tabular-nums leading-tight text-gray-900">
            {{ stats.total }}<span class="text-base font-normal text-gray-400"> 题</span>
          </div>
        </div>

        <button :class="isSessionComplete ? 'btn-primary' : 'btn'" title="快捷键 R" @click="restart()">
          {{ isSessionComplete ? '再来一局' : '重新开始' }}
        </button>
      </div>
    </div>

    <!-- 盘面 + 侧栏 -->
    <div class="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <!-- 盘面 -->
      <div class="card p-4 sm:p-6">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="inline-flex flex-shrink-0 items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-accent">
              {{ modeMeta.label }}
            </span>
            <span class="truncate text-sm text-gray-600">{{ modeMeta.hint }}</span>
          </div>
          <span class="flex-shrink-0 text-xs text-gray-400">第 {{ questionNo }} 题</span>
        </div>

        <div ref="boardWrapRef" class="flex justify-center">
          <SudokuBoard :board="board" :given="given" :size="boardSize" :showCandidates="false"
            :focusCell="focusCell" :focusHighlight="focusHighlight" mode="practice" />
        </div>

        <!-- 答题反馈 -->
        <div class="mt-4 flex h-11 items-center justify-center" aria-live="polite">
          <div v-if="feedback"
            class="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"
            :class="feedback.correct
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-red-300 bg-red-50 text-red-700'">
            <span>{{ feedback.correct ? '✓' : '✗' }}</span>
            <span v-if="feedback.correct">正确！答案就是 {{ feedback.answer }}</span>
            <span v-else>答错了，正确答案是 {{ feedback.answer }}</span>
          </div>
          <div v-else-if="!isRunning" class="text-sm text-gray-500">本次练习已结束，点击「再来一局」继续</div>
          <div v-else class="text-sm text-gray-400">按键盘 1–9 作答，R 重新开始</div>
        </div>
      </div>

      <!-- 侧栏 -->
      <div class="flex flex-col gap-6 lg:sticky lg:top-6">
        <!-- 统计 -->
        <div class="card order-2 p-5 lg:order-1">
          <div class="flex items-baseline justify-between">
            <span class="text-xs font-medium tracking-wide text-gray-400">正确率</span>
            <span class="text-3xl font-bold leading-none tabular-nums text-gray-900">{{ accuracyPct }}<span
                class="font-semibold text-gray-300">%</span></span>
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div class="h-full rounded-full bg-accent transition-all duration-300" :class="pctClass(accuracyPct)" />
          </div>

          <div class="mt-5 grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div>
              <div class="text-lg font-semibold tabular-nums text-gray-900">{{ stats.total }}</div>
              <div class="mt-0.5 text-xs text-gray-400">已做</div>
            </div>
            <div>
              <div class="text-lg font-semibold tabular-nums text-green-600">{{ stats.correct }}</div>
              <div class="mt-0.5 text-xs text-gray-400">正确</div>
            </div>
            <div>
              <div class="text-lg font-semibold tabular-nums text-red-600">{{ stats.wrong }}</div>
              <div class="mt-0.5 text-xs text-gray-400">错误</div>
            </div>
          </div>

          <div class="mt-5 space-y-2 border-t border-gray-100 pt-4">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">平均用时</span>
              <span class="text-sm font-semibold tabular-nums text-gray-900">{{ formatMs(stats.avgMs) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">上题用时</span>
              <span class="text-sm font-semibold tabular-nums text-gray-900">
                {{ lastDurationMs === null ? '—' : formatMs(lastDurationMs) }}
              </span>
            </div>
          </div>

          <div class="mt-4 border-t border-gray-100 pt-4">
            <div class="mb-2.5 text-xs font-medium tracking-wide text-gray-400">分类正确率</div>
            <div class="space-y-2">
              <div v-for="row in modeRows" :key="row.mode" class="flex items-center gap-2.5">
                <span class="w-8 flex-shrink-0 text-xs text-gray-500">{{ row.label }}</span>
                <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div class="h-full rounded-full bg-accent" :class="pctClass(row.pct)" />
                </div>
                <span class="w-16 flex-shrink-0 text-right text-xs tabular-nums text-gray-500">{{ row.text }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 数字键盘 -->
        <div class="card order-1 select-none p-4 lg:order-2">
          <div class="mb-2.5 flex items-center justify-between px-1">
            <span class="text-xs font-medium tracking-wide text-gray-400">数字键盘</span>
            <span class="text-[11px] text-gray-400">键盘 1–9</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" type="button" :aria-label="`输入 ${n}`"
              :disabled="inputLocked"
              class="h-14 rounded-xl border border-gray-200 bg-white text-xl font-semibold text-gray-900 shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              @click="onNumberInput(n)">{{ n }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 结算窗口 -->
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in" leave-to-class="opacity-0">
      <div v-if="showSettlement" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showSettlement = false">
        <div class="card max-h-full w-full max-w-md overflow-y-auto p-6">
          <h2 class="text-2xl font-bold text-gray-900">
            {{ practiceMode === 'timed' ? '时间到！' : '冲刺完成！' }}
          </h2>
          <p class="mt-1 text-sm text-gray-500">本次练习结果</p>

          <div class="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-gray-100">
            <div class="bg-gray-50 px-4 py-3">
              <div class="text-xl font-bold tabular-nums text-gray-900">{{ accuracyPct }}%</div>
              <div class="mt-0.5 text-xs text-gray-500">正确率</div>
            </div>
            <div class="bg-gray-50 px-4 py-3">
              <div class="text-xl font-bold tabular-nums text-gray-900">{{ formatMs(stats.avgMs) }}</div>
              <div class="mt-0.5 text-xs text-gray-500">平均用时</div>
            </div>
            <div class="bg-gray-50 px-4 py-3">
              <div class="text-xl font-bold tabular-nums text-green-600">{{ stats.correct }}</div>
              <div class="mt-0.5 text-xs text-gray-500">正确</div>
            </div>
            <div class="bg-gray-50 px-4 py-3">
              <div class="text-xl font-bold tabular-nums text-red-600">{{ stats.wrong }}</div>
              <div class="mt-0.5 text-xs text-gray-500">错误</div>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between text-sm">
            <span class="text-gray-500">共完成</span>
            <span class="font-semibold tabular-nums text-gray-900">{{ stats.total }} 题</span>
          </div>

          <div class="mt-6 flex gap-3">
            <button class="btn flex-1" :class="copied ? 'border-green-400 bg-green-100 text-green-700' : ''"
              @click="copyStats()">{{ copied ? '已复制！' : '复制数据' }}</button>
            <button class="btn-primary flex-1" @click="restart()">再来一局</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { logger } from '../utils/logger'
import SudokuBoard from '../components/SudokuBoard.vue'
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
