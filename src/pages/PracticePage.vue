<template>
  <!-- lg:min-h-0：页面高度严格等于可用高度，不被内容（如初始尺寸的盘面）撑高，盘面才能按剩余高度缩放 -->
  <div class="page-container lg:min-h-0">
    <PageHeader :title="feature.title" description="在给定盘面中找出唯一能填的数字，训练唯余判断的准确度与速度">
      <template #actions>
        <Button :variant="isSessionComplete ? 'default' : 'outline'" title="快捷键 R" @click="restart()">
          <RotateCcw />
          {{ isSessionComplete ? '再来一局' : '重新开始' }}
        </Button>
      </template>
    </PageHeader>

    <!-- 舞台：桌面端吃满剩余高度；盘面边长 = min(舞台高, 舞台宽 − 侧栏)，侧栏拉伸到与盘面等高 -->
    <div ref="stageRef" class="lg:min-h-0 lg:flex-1">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[auto_300px] lg:justify-between">
        <!-- 盘面 + 手势层：点按 = 5，滑动 = 九宫方位 -->
        <FlickInput class="justify-self-center lg:self-start" :disabled="inputLocked" @input="onNumberInput"
          @preview="gesturePreview = $event">
          <SudokuBoard :board="board" :given="given" :size="boardSize" :showCandidates="false"
            :focusCell="focusCell" :focusHighlight="focusHighlight" mode="practice" />
        </FlickInput>

        <!-- 侧栏：设置 → 当前题 → 统计 → 反馈 → 键盘（贴底，与盘面底边对齐） -->
        <aside class="flex min-w-0 flex-col gap-5">
          <div class="flex flex-col gap-2.5">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-muted-foreground">题型</span>
              <SegmentedControl v-model="uiMode" :options="TYPE_OPTIONS" aria-label="题型" />
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-muted-foreground">模式</span>
              <SegmentedControl v-model="practiceMode" :options="MODE_OPTIONS" aria-label="练习模式" />
            </div>
          </div>

          <!-- 当前题 -->
          <div class="border-t border-border pt-4">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium text-foreground">{{ modeMeta.label }}</span>
              <span class="tabular-nums text-muted-foreground">第 {{ questionNo }} 题</span>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">{{ modeMeta.hint }}</p>

            <!-- 会话进度：限时 = 剩余时间，冲刺 = 完成题数 -->
            <div v-if="practiceMode !== 'free'" class="mt-3 flex items-center gap-3">
              <div class="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div class="h-full rounded-full transition-all duration-500" :class="practiceMode === 'timed'
                  ? [timeLeft <= 30 ? 'bg-destructive' : 'bg-foreground', pctClass(elapsedPct)]
                  : ['bg-foreground', pctClass((stats.total / sprintTarget) * 100)]" />
              </div>
              <span v-if="practiceMode === 'timed'" class="text-sm font-medium tabular-nums"
                :class="timeLeft <= 30 ? 'text-destructive' : 'text-foreground'">{{ formatTime(timeLeft) }}</span>
              <span v-else class="text-sm font-medium tabular-nums text-foreground">
                {{ stats.total }}<span class="text-muted-foreground"> / {{ sprintTarget }}</span>
              </span>
            </div>
          </div>

          <!-- 统计：一行四格；悬停正确率查看分类明细 -->
          <dl class="grid grid-cols-4 border-t border-border pt-4 text-center">
            <Tooltip>
              <TooltipTrigger as-child>
                <div tabindex="0" class="cursor-default rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <dd class="text-lg font-semibold tabular-nums text-foreground">{{ accuracyPct }}%</dd>
                  <dt class="text-xs text-muted-foreground underline decoration-dotted underline-offset-4">正确率</dt>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <dl class="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5">
                  <template v-for="row in modeRows" :key="row.mode">
                    <dt>{{ row.label }}</dt>
                    <dd class="text-right tabular-nums">{{ row.text }}</dd>
                  </template>
                </dl>
              </TooltipContent>
            </Tooltip>
            <div v-for="cell in statCells" :key="cell.label">
              <dd class="text-lg font-semibold tabular-nums" :class="cell.tone">{{ cell.value }}</dd>
              <dt class="text-xs text-muted-foreground">{{ cell.label }}</dt>
            </div>
          </dl>

          <!-- 最近答题：答对中性灰、答错红色，只让错题跳出来；无数据时占位，侧栏高度不跳 -->
          <div>
            <p class="mb-2 text-xs text-muted-foreground">最近 {{ RECENT_COUNT }} 题</p>
            <div class="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-0.5">
              <span v-for="(item, i) in recentSlots" :key="'recent-' + i" class="h-2 rounded-[2px]" :class="item === null
                ? 'bg-muted'
                : item.correct ? 'bg-muted-foreground/35' : 'bg-destructive'"
                :title="item ? `${item.correct ? '正确' : '错误'} · ${formatMs(item.durationMs)}` : undefined" />
            </div>
          </div>

          <!-- 答题反馈：只用文字与图标着色，不铺色块；mt-auto 把它和键盘一起压到底部 -->
          <div class="mt-auto flex h-5 items-center text-sm" aria-live="polite">
            <span v-if="feedback" class="inline-flex items-center gap-1.5"
              :class="feedback.correct ? 'text-success' : 'text-destructive'">
              <component :is="feedback.correct ? CircleCheck : CircleX" class="size-4" />
              <template v-if="feedback.correct">正确，答案是 {{ feedback.answer }}</template>
              <template v-else>答错了，正确答案是 {{ feedback.answer }}</template>
            </span>
            <span v-else-if="!isRunning" class="text-muted-foreground">本次练习已结束</span>
          </div>

          <!-- 键盘：九宫方位即手势方位，手势进行中 / 按键输入时高亮对应数字 -->
          <div>
            <div class="mb-2 flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
              <span>数字键盘</span>
              <span>盘面上点按 = 5，滑动 = 同方位</span>
            </div>
            <NumberPad :disabled="inputLocked" :active="gesturePreview ?? flashKey" @input="onNumberInput" />
          </div>
        </aside>
      </div>
    </div>

    <!-- 结算窗口 -->
    <Dialog v-model:open="showSettlement">
      <DialogContent class="max-h-full overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div class="flex flex-wrap items-center gap-2">
            <DialogTitle class="text-xl">
              {{ practiceMode === 'timed' ? '时间到' : '冲刺完成' }}
            </DialogTitle>
            <Badge v-if="isNewRecord" class="bg-highlight-container text-highlight-container-foreground">
              <Trophy />
              新纪录
            </Badge>
          </div>
          <DialogDescription>{{ recordText }}</DialogDescription>
        </DialogHeader>

        <dl class="grid grid-cols-3 gap-x-4 gap-y-4 border-y border-border py-4">
          <div v-for="cell in settlementCells" :key="cell.label">
            <dt class="text-xs text-muted-foreground">{{ cell.label }}</dt>
            <dd class="mt-0.5 text-lg font-semibold tabular-nums" :class="cell.tone">{{ cell.value }}</dd>
          </div>
        </dl>

        <!-- 逐题用时：单序列折线，标题即图例；悬停显示该题详情 -->
        <div v-if="stats.history.length > 0">
          <div class="mb-1.5 flex items-baseline justify-between gap-3">
            <span class="text-xs text-muted-foreground">逐题用时</span>
            <span class="text-xs tabular-nums text-muted-foreground" aria-live="polite">
              <template v-if="hovered">
                第 {{ hoveredIdx! + 1 }} 题 · {{ formatMs(hovered.durationMs) }} · {{ hovered.correct ? '正确' : '错误' }}
              </template>
              <template v-else>最慢 {{ formatMs(chart.maxMs) }}</template>
            </span>
          </div>
          <svg :viewBox="`0 0 ${CHART_W} ${CHART_H}`" class="h-24 w-full overflow-visible" role="img"
            :aria-label="`逐题用时折线，共 ${stats.history.length} 题`" @mouseleave="hoveredIdx = null">
            <line :x1="0" :x2="CHART_W" :y1="CHART_H" :y2="CHART_H" class="stroke-border" stroke-width="1"
              vector-effect="non-scaling-stroke" />
            <line v-if="hoveredIdx !== null" :x1="chart.xs[hoveredIdx]" :x2="chart.xs[hoveredIdx]" y1="0"
              :y2="CHART_H" class="stroke-outline" stroke-width="1" stroke-dasharray="3 3"
              vector-effect="non-scaling-stroke" />
            <path :d="chart.path" fill="none" class="stroke-foreground" stroke-width="2" stroke-linejoin="round"
              stroke-linecap="round" vector-effect="non-scaling-stroke" />
            <circle v-if="hoveredIdx !== null" :cx="chart.xs[hoveredIdx]" :cy="chart.ys[hoveredIdx]" r="4"
              class="fill-foreground stroke-card" stroke-width="2" />
            <!-- 命中区：每题一条整高的透明带，比数据点大得多 -->
            <rect v-for="(x, i) in chart.xs" :key="'hit-' + i" :x="x - chart.step / 2" y="0" :width="chart.step"
              :height="CHART_H" fill="transparent" @mouseenter="hoveredIdx = i" />
          </svg>
        </div>

        <!-- 逐题结果：答对用中性灰、答错用红色，只让错题跳出来；图例给出文字说明 -->
        <div v-if="stats.history.length > 0">
          <div class="mb-1.5 flex items-center justify-between gap-3">
            <span class="text-xs text-muted-foreground">逐题结果</span>
            <span class="flex items-center gap-3 text-xs text-muted-foreground">
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-muted-foreground/30" />正确</span>
              <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-destructive" />错误</span>
            </span>
          </div>
          <div class="flex flex-wrap gap-0.5" @mouseleave="hoveredIdx = null">
            <span v-for="(item, i) in stats.history" :key="'res-' + i" class="size-2.5 rounded-[2px] transition-transform"
              :class="[item.correct ? 'bg-muted-foreground/30' : 'bg-destructive', hoveredIdx === i ? 'scale-150' : '']"
              :title="`第 ${i + 1} 题 · ${formatMs(item.durationMs)}`" @mouseenter="hoveredIdx = i" />
          </div>
        </div>

        <DialogFooter class="flex-row gap-3 sm:justify-stretch">
          <Button variant="outline" class="flex-1" @click="copyStats()">
            <Copy />
            复制数据
          </Button>
          <Button class="flex-1" @click="restart()">再来一局</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocalStorage, useMediaQuery } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { CircleCheck, CircleX, Copy, RotateCcw, Trophy } from '@lucide/vue'
import { logger } from '../utils/logger'
import FlickInput from '@/components/FlickInput.vue'
import NumberPad from '@/components/NumberPad.vue'
import PageHeader from '@/components/PageHeader.vue'
import SegmentedControl, { type SegmentedOption } from '@/components/SegmentedControl.vue'
import SudokuBoard from '../components/SudokuBoard.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useBoardSize } from '@/composables/useBoardSize'
import { FEATURE_BY_KEY } from '@/constants/features'
import { usePracticeStore } from '../stores/practice'
import { genByMode, pickRandomMode, type UnitMode, type PracticePuzzle } from '../utils/generator'

const feature = FEATURE_BY_KEY.practice
const stats = usePracticeStore()

type UiMode = UnitMode | 'random'
type PracticeMode = 'timed' | 'sprint' | 'free'

// UI 出题类型与练习模式
const uiMode = ref<UiMode>('random')
const practiceMode = ref<PracticeMode>('free')

const TYPE_OPTIONS: SegmentedOption<UiMode>[] = [
  { value: 'random', label: '随机', title: '随机类型' },
  { value: 'row', label: '行', title: '行唯一数' },
  { value: 'col', label: '列', title: '列唯一数' },
  { value: 'box', label: '宫', title: '宫唯一数' },
  { value: 'general', label: '一般', title: '一般唯余' },
]

const MODE_OPTIONS: SegmentedOption<PracticeMode>[] = [
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
// 桌面端（lg）一屏布局：盘面同时受舞台高度限制，并给右侧 300px 侧栏 + 32px 间距让出宽度
const isDesktop = useMediaQuery('(min-width: 1024px)')
const stageRef = ref<HTMLElement | null>(null)
const boardSize = useBoardSize(stageRef, {
  min: 280,
  fitHeight: isDesktop,
  reserveWidth: () => (isDesktop.value ? 300 + 32 : 0),
})

// 数字键盘高亮：手势进行中显示候选数字；点键 / 敲键盘后短暂闪一下所按的数字
const gesturePreview = ref<number | null>(null)
const flashKey = ref<number | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

function flash(n: number) {
  flashKey.value = n
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => (flashKey.value = null), 180)
}

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

// ---------------- 个人纪录 ----------------
// 按「模式 + 题型」分别记录：限时 = 答对题数（越多越好），冲刺 = 总用时（越短越好）
const records = useLocalStorage<Record<string, number>>('sudoku-practice-records', {})
const recordKey = computed(() => `${practiceMode.value}:${uiMode.value}`)
const isNewRecord = ref(false)
const previousRecord = ref<number | null>(null)

function settleRecord() {
  if (practiceMode.value === 'free') return
  const prev = records.value[recordKey.value]
  previousRecord.value = prev ?? null
  const score = practiceMode.value === 'timed' ? stats.correct : stats.totalTimeMs
  const better = prev === undefined || (practiceMode.value === 'timed' ? score > prev : score < prev)
  isNewRecord.value = better && score > 0
  if (isNewRecord.value) records.value = { ...records.value, [recordKey.value]: score }
}

const recordText = computed(() => {
  const prev = previousRecord.value
  if (prev === null) return '首次完成该模式，已记为个人最佳'
  const prevText = practiceMode.value === 'timed' ? `${prev} 题` : formatMs(prev)
  return isNewRecord.value ? `刷新个人最佳（此前 ${prevText}）` : `个人最佳 ${prevText}`
})

// 侧栏统计列表（答对 / 答错两色并列，单独渲染）
// 最近答题条：固定 20 格，从左到右由旧到新，不足补空位
const RECENT_COUNT = 20
const recentSlots = computed(() => {
  const recent = stats.history.slice(-RECENT_COUNT)
  return [...recent, ...Array(RECENT_COUNT - recent.length).fill(null)] as (typeof recent[number] | null)[]
})

// 侧栏统计（正确率单独渲染，带分类明细浮层）
const statCells = computed(() => [
  { label: '平均用时', value: stats.total ? formatMs(stats.avgMs) : '—', tone: 'text-foreground' },
  {
    label: '连击',
    value: stats.streak,
    tone: stats.streak >= 5 ? 'text-highlight-strong' : 'text-foreground',
  },
  { label: '答错', value: stats.wrong, tone: stats.wrong ? 'text-destructive' : 'text-foreground' },
])

const settlementCells = computed(() => [
  { label: '正确率', value: `${accuracyPct.value}%`, tone: 'text-foreground' },
  { label: '共完成', value: `${stats.total} 题`, tone: 'text-foreground' },
  { label: '平均用时', value: formatMs(stats.avgMs), tone: 'text-foreground' },
  { label: '正确', value: stats.correct, tone: 'text-success' },
  { label: '错误', value: stats.wrong, tone: 'text-destructive' },
  { label: '最佳连击', value: stats.bestStreak, tone: 'text-foreground' },
])

// ---------------- 逐题用时折线 ----------------
const CHART_W = 400
const CHART_H = 100
const hoveredIdx = ref<number | null>(null)
const hovered = computed(() => (hoveredIdx.value === null ? null : stats.history[hoveredIdx.value] ?? null))

const chart = computed(() => {
  const items = stats.history
  const maxMs = Math.max(1, ...items.map((i) => i.durationMs))
  const step = items.length > 1 ? CHART_W / (items.length - 1) : CHART_W
  const xs = items.map((_, i) => (items.length > 1 ? i * step : CHART_W / 2))
  // 顶部留 8% 余量，最慢的一题不贴边
  const ys = items.map((i) => CHART_H - (i.durationMs / maxMs) * CHART_H * 0.92)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i]!.toFixed(1)}`).join(' ')
  return { xs, ys, path, step, maxMs }
})

// ---------------- 会话流程 ----------------
function startSession() {
  isRunning.value = true
  isSessionComplete.value = false
  isNewRecord.value = false
  hoveredIdx.value = null
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
  // 限时和冲刺模式完成后结算纪录并弹出结算窗口
  if (practiceMode.value !== 'free') {
    settleRecord()
    showSettlement.value = true
  }
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
  flash(n)
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
    toast.success('已复制练习数据')
  } catch (err) {
    logger.error('复制失败:', err)
    toast.error('复制失败，请检查浏览器剪贴板权限')
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

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startSession()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (flashTimer) clearTimeout(flashTimer)
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
