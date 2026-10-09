<template>
  <div class="page-container">
    <h1 class="page-title">数独绘图工具</h1>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <!-- 左：工具栏 + 盘面 -->
      <div class="card space-y-4">
        <!-- 绘图模式 -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-gray-700 min-w-20">绘图模式</span>
          <button
            v-for="mode in DRAWING_MODES"
            :key="mode.id"
            class="px-3 py-1 text-sm rounded transition-colors"
            :class="
              currentMode === mode.id
                ? 'bg-accent text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200'
            "
            @click="currentMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>

        <!-- 标记类型 -->
        <div v-if="currentMode === 'marker'" class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-gray-700 min-w-20">标记类型</span>
          <button
            v-for="type in MARKER_TYPES"
            :key="type"
            class="px-3 py-1 text-sm rounded transition-colors"
            :class="
              currentMarkerType === type
                ? 'bg-accent text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200'
            "
            @click="currentMarkerType = type"
          >
            {{ MARKER_TYPE_LABELS[type] }}
          </button>
        </div>

        <!-- 链样式 -->
        <div v-if="currentMode === 'chain'" class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-gray-700 min-w-20">链样式</span>
          <button
            v-for="style in CHAIN_STYLES"
            :key="style.id"
            class="px-3 py-1 text-sm rounded transition-colors"
            :class="
              currentChainStyle === style.id
                ? 'bg-accent text-white'
                : 'bg-gray-100 border border-gray-400 text-gray-700 hover:bg-gray-200'
            "
            @click="currentChainStyle = style.id"
          >
            {{ style.label }}
          </button>
          <label class="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 border border-gray-400 rounded">
            <input v-model="chainArrow" type="checkbox" class="rounded" />
            <span>箭头</span>
          </label>
        </div>

        <!-- 颜色 -->
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm font-medium text-gray-700 min-w-20">颜色</span>
          <button
            v-for="color in DRAWING_COLORS"
            :key="color.value"
            class="w-8 h-8 rounded border-2 transition-all"
            :class="currentColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            @click="currentColor = color.value"
          ></button>
        </div>

        <!-- 候选数选择 -->
        <div v-if="currentMode === 'highlight' || currentMode === 'chain'" class="flex flex-wrap items-center gap-2">
          <label
            class="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 border border-gray-400 rounded"
            :class="currentMode === 'chain' ? 'opacity-60 cursor-not-allowed' : ''"
          >
            <input v-model="selectCandidate" type="checkbox" class="rounded" :disabled="currentMode === 'chain'" />
            <span>选择候选数</span>
            <span v-if="currentMode === 'chain'" class="text-xs text-gray-500">(链必须)</span>
          </label>
          <span v-if="selectCandidate && currentCandidate" class="text-sm text-gray-700">
            已选择 R{{ currentCandidate.row + 1 }}C{{ currentCandidate.col + 1 }} · 候选{{ currentCandidate.candidate }}
          </span>
        </div>

        <!-- 操作 -->
        <div class="flex flex-wrap gap-2">
          <button class="btn" @click="saveAsSvg">保存为图片</button>
          <button
            v-if="currentMode === 'chain' && draftNodes.length > 0"
            class="btn-success"
            :disabled="draftNodes.length < 2"
            @click="finishChain"
          >
            完成链 ({{ draftNodes.length }} 个节点)
          </button>
          <button v-if="currentMode === 'chain' && draftNodes.length > 0" class="btn" @click="draftCancel">
            取消绘制
          </button>
          <button class="btn-danger" :disabled="!hasDrawing" @click="clearDrawing">清空绘图</button>
        </div>

        <div class="flex justify-center">
          <SudokuBoard
            ref="boardRef"
            class="max-w-full h-auto"
            :board="board"
            :given="given"
            :showCandidates="true"
            :candidates="candidates"
            :customHighlights="highlights"
            :markers="markers"
            :chains="renderChains"
            :candidateMarkers="candidateMarkers"
            :selectedChainId="selectedChainId"
            :chainsInteractive="true"
            :selectedCandidate="candidateSelectActive ? currentCandidate : null"
            :mode="candidateSelectActive ? 'candidate' : 'interactive'"
            @cell-click="onCellClick"
            @candidate-click="onCandidateClick"
            @chain-click="onChainClick"
          />
        </div>

        <p v-if="statusMessage" class="text-sm text-gray-600">{{ statusMessage }}</p>

        <ul class="text-xs text-gray-500 space-y-1">
          <li>• <strong>高亮：</strong>点击单元格添加/移除高亮；勾选「选择候选数」后直接点击候选数高亮候选</li>
          <li>• <strong>标记：</strong>点击单元格添加圆圈/叉号/圆点/星号，同格同类型再次点击取消</li>
          <li>• <strong>摒除线：</strong>依次点击起点和终点，起点自动加圆圈</li>
          <li>• <strong>链：</strong>依次点击候选数添加节点，右侧「链视图」可完成、改色、改线型</li>
        </ul>
      </div>

      <!-- 右：链视图面板 -->
      <ChainPanel
        :chains="chains"
        :selectedId="selectedChainId"
        :draftNodes="draftNodes"
        @select="onChainSelect"
        @remove="removeChain"
        @toggle-visible="toggleChainVisible"
        @update="onChainUpdate"
        @remove-node="onChainNodeRemove"
        @finish-draft="finishChain"
        @cancel-draft="draftCancel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import SudokuBoard from '@/components/SudokuBoard.vue';
import ChainPanel from '@/components/ChainPanel.vue';
import type { Chain, ChainStyle } from '@/types/sudoku';
import { logger } from '@/utils/logger';
import {
  CHAIN_STYLES,
  DRAFT_CHAIN_ID,
  DRAWING_COLORS,
  DRAWING_MODES,
  MARKER_TYPES,
  MARKER_TYPE_LABELS,
  computeCandidates,
  createDrawingState,
  type DrawMarkerType,
  type DrawingMode,
} from '@/composables/useDrawingState';

interface CandidatePosition {
  row: number;
  col: number;
  candidate: number;
}

// 绘图盘面：固定示例，绘图工具只负责标注
const board: number[][] = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const given: boolean[][] = [
  [true, true, false, false, true, false, false, false, false],
  [true, false, false, true, true, true, false, false, false],
  [false, true, true, false, false, false, false, true, false],
  [true, false, false, false, true, false, false, false, true],
  [true, false, false, true, false, true, false, false, true],
  [true, false, false, false, true, false, false, false, true],
  [false, true, false, false, false, false, true, true, false],
  [false, false, false, true, true, true, false, false, true],
  [false, false, false, false, true, false, false, true, true],
];

const candidates = computed(() => computeCandidates(board));

// 绘图状态集中在 composable 中，链视图面板与盘面共享同一份
const {
  highlights,
  markers,
  chains,
  candidateMarkers,
  draftNodes,
  selectedChainId,
  hasDrawing,
  toggleCellHighlight,
  toggleCandidateHighlight,
  toggleMarker,
  addLinePoint,
  draftAdd,
  draftCancel,
  draftFinish,
  updateChain,
  removeChain,
  toggleChainVisible,
  removeChainNode,
  selectChain,
  clearAll,
} = createDrawingState();

// 工具栏状态
const currentMode = ref<DrawingMode>('highlight');
const currentMarkerType = ref<DrawMarkerType>('circle');
const currentChainStyle = ref<ChainStyle>('solid');
const chainArrow = ref(true);
const currentColor = ref(DRAWING_COLORS[0]!.value);
const selectCandidate = ref(false);
const currentCandidate = ref<CandidatePosition | null>(null);
const statusMessage = ref('');
const boardRef = ref<InstanceType<typeof SudokuBoard> | null>(null);

// 链模式必须选中候选数
watch(currentMode, (mode) => {
  if (mode === 'chain') selectCandidate.value = true;
});

const candidateSelectActive = computed(
  () => selectCandidate.value && (currentMode.value === 'highlight' || currentMode.value === 'chain')
);

// 绘制中的草稿链按当前工具栏设置预览，完成后样式一致
const draftPreview = computed<Chain | null>(() => {
  if (draftNodes.value.length === 0) return null;
  return {
    id: DRAFT_CHAIN_ID,
    cells: draftNodes.value,
    color: currentColor.value,
    style: currentChainStyle.value,
    strokeWidth: 2.5,
    arrow: chainArrow.value,
    curve: 'smooth',
  };
});

const renderChains = computed<Chain[]>(() =>
  draftPreview.value ? [...chains.value, draftPreview.value] : chains.value
);

function onCellClick(pos: { row: number; col: number }): void {
  // 候选数选择态下由候选数点击接管
  if (candidateSelectActive.value) return;

  switch (currentMode.value) {
    case 'highlight':
      toggleCellHighlight(pos, currentColor.value);
      break;
    case 'marker':
      toggleMarker(pos, currentMarkerType.value, currentColor.value);
      break;
    case 'line':
      addLinePoint(pos, currentColor.value);
      break;
    case 'chain':
      draftAdd(currentCandidate.value ? { ...pos, candidate: currentCandidate.value.candidate } : pos);
      break;
  }
}

function onCandidateClick(pos: CandidatePosition): void {
  currentCandidate.value = pos;

  if (currentMode.value === 'highlight') {
    toggleCandidateHighlight(pos, currentColor.value);
  } else if (currentMode.value === 'chain') {
    draftAdd(pos);
  }
}

function finishChain(): void {
  draftFinish({
    color: currentColor.value,
    style: currentChainStyle.value,
    strokeWidth: 2.5,
    arrow: chainArrow.value,
    curve: 'smooth',
  });
  currentCandidate.value = null;
}

// ---------------- 链视图面板联动 ----------------

function onChainSelect(id: string): void {
  selectChain(id);
}

function onChainClick(payload: { id: string }): void {
  if (payload.id === DRAFT_CHAIN_ID) return;
  selectChain(selectedChainId.value === payload.id ? null : payload.id);
}

function onChainUpdate(payload: { id: string; patch: Partial<Omit<Chain, 'id'>> }): void {
  updateChain(payload.id, payload.patch);
}

function onChainNodeRemove(payload: { id: string; index: number }): void {
  removeChainNode(payload.id, payload.index);
}

function clearDrawing(): void {
  clearAll();
  currentCandidate.value = null;
  statusMessage.value = '';
}

function saveAsSvg(): void {
  try {
    const svgElement = boardRef.value?.$el as SVGElement | undefined;
    if (!svgElement) {
      statusMessage.value = '找不到盘面 SVG，导出失败';
      return;
    }

    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute('width', '900');
    clonedSvg.setAttribute('height', '900');

    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clonedSvg)}`;
    const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }));

    const link = document.createElement('a');
    link.href = url;
    link.download = `sudoku-drawing-${new Date().toISOString().slice(0, 10)}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    statusMessage.value = '已导出 SVG 图片';
  } catch (error) {
    logger.error('导出绘图 SVG 失败:', error);
    statusMessage.value = '导出失败，请查看控制台日志';
  }
}
</script>
