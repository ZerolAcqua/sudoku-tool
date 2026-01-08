<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <div class="max-w-7xl mx-auto w-full py-8 px-4 sm:px-6 lg:px-8 flex-1">
      <h1 class="text-3xl font-bold text-gray-900 mb-6">数独唯余练习</h1>

      <!-- 盘面 + 右侧栏（模式+统计+小键盘） -->
      <div class="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 h-[550px]">
        <div class="bg-white shadow rounded-lg flex items-center justify-center p-4">
          <SudokuBoard :board="board" :given="given" :candidates="[]" :size="600" :showCandidates="false"
            :focusCell="focusCell" :focusHighlight="focusHighlight" mode="practice" @cell-click="onCellClick" />
        </div>

        <!-- 右侧栏：统计 + 小键盘 -->
        <div class="flex flex-col gap-4">
          <!-- 统计 -->
          <div class="bg-white shadow rounded-lg p-4 flex-1 overflow-y-auto select-none">
            <!-- 模式设置 -->
            <div class="mb-4 pb-4 border-b border-gray-200 space-y-2">
              <div class="flex items-center gap-2">
                <select v-model="uiMode" class="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 hover:border-gray-300">
                  <option value="row">行唯一数</option>
                  <option value="col">列唯一数</option>
                  <option value="box">宫唯一数</option>
                  <option value="general">一般唯余</option>
                  <option value="random">随机类型</option>
                </select>
                <select v-model="practiceMode" class="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700 hover:border-gray-300">
                  <option value="timed">五分限时</option>
                  <option value="sprint">百题冲刺</option>
                  <option value="free">自由模式</option>
                </select>
              </div>
            </div>

            <div class="space-y-3">
              <!-- 进度或时间 -->
              <div v-if="practiceMode === 'timed'" class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="text-xs text-gray-600 mb-1">剩余时间</div>
                <div class="text-2xl font-bold text-gray-900" :class="isSessionComplete ? 'text-red-600' : ''">
                  {{ formatTime(timeLeft) }}
                </div>
              </div>
              <div v-else-if="practiceMode === 'sprint'" class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="text-xs text-gray-600 mb-1">进度</div>
                <div class="text-2xl font-bold text-gray-900">
                  {{ stats.total }} / {{ sprintTarget }}
                </div>
              </div>
              <div v-else class="bg-gray-50 rounded-lg p-3 border border-gray-200 min-h-[68px] flex flex-col justify-center">
                <div class="text-xs text-gray-600 mb-1">自由模式</div>
                <div class="text-2xl text-gray-900">自由练习</div>
              </div>


              <!-- 关键指标卡片 -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div class="text-xs text-gray-600 mb-1">正确率</div>
                  <div class="text-2xl font-bold text-gray-900">{{ Math.round(stats.accuracy * 100) }}%</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div class="text-xs text-gray-600 mb-1">平均用时</div>
                  <div class="text-2xl font-bold text-gray-900">{{ formatMs(stats.avgMs) }}</div>
                </div>
              </div>

              <!-- 详细数据 -->
              <div class="bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm">
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div class="text-xs text-gray-600 mb-1">已做</div>
                    <div class="font-semibold text-gray-900 text-base">{{ stats.total }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-600 mb-1">正确</div>
                    <div class="font-semibold text-gray-900 text-base">{{ stats.correct }}</div>
                  </div>
                  <div>
                    <div class="text-xs text-gray-600 mb-1">错误</div>
                    <div class="font-semibold text-gray-900 text-base">{{ stats.wrong }}</div>
                  </div>
                </div>
              </div>

              <!-- 本题用时 -->
              <div v-if="lastDurationMs !== null" class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div class="text-xs text-gray-600 mb-1">本题用时</div>
                <div class="text-xl font-bold text-gray-900">{{ formatMs(lastDurationMs) }}</div>
              </div>
            </div>
            
            <div class="mt-4 flex gap-3">
              <button v-if="!isRunning"
                class="flex-1 bg-gray-100 text-gray-700 border border-gray-400 rounded px-4 py-2 hover:bg-gray-200 font-medium text-sm"
                @click="startSession()">开始</button>
              <button class="flex-1 bg-gray-100 text-gray-700 border border-gray-400 rounded px-4 py-2 hover:bg-gray-200 font-medium text-sm"
                @click="reset()">重置</button>
            </div>
          </div>

          <!-- 小键盘 -->
          <div class="bg-white shadow rounded-lg p-4 flex-shrink-0 select-none flex items-center gap-4">
            <!-- 左侧说明 -->
            <div class="w-56 border-r border-gray-200 pr-4 flex-shrink-0 flex flex-col items-center justify-center">
              <div class="text-sm font-semibold text-gray-900 mb-3">关于唯余</div>
              <div class="space-y-2 text-xs text-gray-600 mb-4">
                <div>点击按钮或按键盘快速输入</div>
                <div>找出选中单元格的唯一数</div>
              </div>
              
              <div class="text-sm font-semibold text-gray-900 mb-3">模式说明</div>
              <div class="space-y-2 text-xs text-gray-600 mb-4">
                <div><span class="font-medium">限时</span>：5 分钟内答题</div>
                <div><span class="font-medium">冲刺</span>：完成 100 题</div>
                <div><span class="font-medium">自由</span>：随时练习</div>
              </div>
            </div>
            
            <!-- 右侧数字键盘 -->
            <div class="flex-1 flex items-center justify-center">
              <div class="grid grid-cols-3 gap-3 w-fit">
                <button v-for="n in [7, 8, 9, 4, 5, 6, 1, 2, 3]" :key="'numpad-' + n"
                  class="border border-gray-300 bg-gray-50 text-gray-900 rounded w-16 h-16 flex items-center justify-center text-xl font-semibold hover:bg-gray-100"
                  @click="onNumberInput(n as number)">{{ n }}</button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 结算窗口 -->
      <div v-if="showSettlement" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white shadow rounded-lg p-6 max-w-md w-full mx-4">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">{{ practiceMode === 'timed' ? '时间到！' : '冲刺完成！' }}</h2>
          <div class="text-gray-700 space-y-2 mb-6">
            <div class="text-lg">已做：{{ stats.total }} 题</div>
            <div class="text-lg">正确：{{ stats.correct }} 题，错误：{{ stats.wrong }} 题</div>
            <div class="text-lg">正确率：{{ Math.round(stats.accuracy * 100) }}%</div>
            <div class="text-lg">平均用时：{{ getAvgMs() }}</div>
          </div>
          <div class="flex justify-between gap-3">
            <button 
              :class="[
                'flex-1 rounded px-4 py-2 text-sm transition-colors',
                copied 
                  ? 'bg-green-100 text-green-700 border border-green-400' 
                  : 'bg-gray-100 text-gray-700 border border-gray-400 hover:bg-gray-200'
              ]"
              @click="copyStats()">{{ copied ? '已复制！' : '复制数据' }}</button>
            <button class="flex-1 bg-gray-100 text-gray-700 border border-gray-400 rounded px-4 py-2 hover:bg-gray-200"
              @click="showSettlement = false">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, computed, watch } from 'vue'
import SudokuBoard from '../components/SudokuBoard.vue'
import { usePracticeStore } from '../stores/practice'
import { genByMode, pickRandomMode, type UnitMode, type PracticePuzzle } from '../utils/generator'

const stats = usePracticeStore()

// UI 出题类型与练习模式
const uiMode = ref<UnitMode | 'random'>('random')
const practiceMode = ref<'timed' | 'sprint' | 'free'>('free')

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
const candidates = ref<number[][][]>(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[])))
const focusCell = ref<{ row: number, col: number } | null>(null)
const focusHighlight = ref<'row' | 'col' | 'box' | 'all'>('all')
const answer = ref<number>(0)
const currentMode = ref<UnitMode>('row')
const lastDurationMs = ref<number | null>(null)

const poolModes = computed<UnitMode[]>(() => ['row', 'col', 'box', 'general'])

const sprintRemaining = computed(() => Math.max(0, sprintTarget - stats.total))

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const startSession = () => {
  isRunning.value = true
  isSessionComplete.value = false
  stats.resetStats()
  newPuzzle()
  if (practiceMode.value === 'timed') {
    timeLeft.value = timedDuration
    if (timerInterval.value) clearInterval(timerInterval.value)
    timerInterval.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        stopSession()
      }
    }, 1000)
  }
}

const stopSession = () => {
  isRunning.value = false
  isSessionComplete.value = true
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  // 限时和冲刺模式完成后弹出结算窗口
  if (practiceMode.value !== 'free') {
    showSettlement.value = true
  }
}

const checkSessionCompletion = () => {
  if (!isRunning.value) return
  if (practiceMode.value === 'sprint' && stats.total >= sprintTarget) {
    stopSession()
  }
}

function applyPuzzle(p: PracticePuzzle) {
  board.value = p.board
  given.value = p.given
  candidates.value = p.candidates
  focusCell.value = p.focusCell
  focusHighlight.value = p.focusHighlight
  answer.value = p.answer
  currentMode.value = p.mode
  lastDurationMs.value = null
  stats.startRound()
}

function newPuzzle() {
  const mode = uiMode.value === 'random' ? pickRandomMode(poolModes.value) : uiMode.value
  const puzzle = genByMode(mode as UnitMode)
  applyPuzzle(puzzle)
}

function onCellClick(pos: { row: number, col: number }) {
  // 仅允许点击目标格
  if (!focusCell.value) return
  if (pos.row !== focusCell.value.row || pos.col !== focusCell.value.col) return
}

function onNumberInput(n: number) {
  if (!focusCell.value || !isRunning.value) return
  const { row, col } = focusCell.value
  // 只接受目标格输入
  if (given.value[row]![col]!) return
  const correct = n === answer.value

  if (correct) {
    board.value[row]![col]! = n
  }
  const dur = stats.finishRound(currentMode.value, correct)
  lastDurationMs.value = dur

  newPuzzle()
  checkSessionCompletion()
}

function formatMs(ms: number) {
  const sec = ms / 1000
  return `${sec.toFixed(3)}s`
}

function getAvgMs() {
  const sec = stats.avgMs / 1000
  return `${sec.toFixed(3)}s`
}

function generateStatsText() {
  const sec = (stats.avgMs / 1000).toFixed(3)
  return `正确COR[${stats.correct}]错误INC[${stats.wrong}]总数TOT[${stats.total}]正确率ACC[${Math.round(stats.accuracy * 100)}%]平均T/K[${sec}]`
}

async function copyStats() {
  try {
    const text = generateStatsText()
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 键盘输入
function onKeydown(e: KeyboardEvent) {
  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= 9) {
    onNumberInput(n)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  startSession()
})

watch(uiMode, () => {
  if (isRunning.value) newPuzzle()
})

watch(practiceMode, () => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  isRunning.value = false
  timeLeft.value = timedDuration
  isSessionComplete.value = false
  showSettlement.value = false
  stats.resetStats()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

function reset() {
  stats.resetStats()
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }
  isRunning.value = false
  isSessionComplete.value = false
  showSettlement.value = false
  timeLeft.value = timedDuration
}
</script>
