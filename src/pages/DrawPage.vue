<template>
  <div class="page-container">
    <h1 class="page-title">数独绘图工具</h1>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <!-- 左列：工具栏 / 画布 / 说明，纵向堆叠 -->
      <div class="flex flex-col gap-6">
        <!-- 工具栏 -->
        <Card class="gap-3 p-6">
        <!-- 标签列定宽 + 控件列，形成规整的对齐；不用 flex-wrap 混排以免换行后错位 -->
        <div class="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
          <!-- 绘图模式 -->
          <span class="text-sm font-medium text-muted-foreground">绘图模式</span>
          <ToggleGroup v-model="currentMode" type="single" variant="outline" size="sm"
            class="w-fit bg-muted/50 p-0.5">
            <ToggleGroupItem v-for="mode in DRAWING_MODES" :key="mode.id" :value="mode.id"
              class="px-3 data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
              {{ mode.label }}
            </ToggleGroupItem>
          </ToggleGroup>

          <!-- 颜色 -->
          <span class="text-sm font-medium text-muted-foreground">颜色</span>
          <div class="flex flex-wrap items-center gap-2">
            <button v-for="color in DRAWING_COLORS" :key="color.value" type="button"
              class="size-7 rounded-md border-2 transition-transform"
              :class="currentColor === color.value ? 'border-foreground scale-110' : 'border-border'"
              :style="{ backgroundColor: color.value }" :title="color.name"
              @click="currentColor = color.value" />
            <span v-if="selectCandidate && currentCandidate" class="text-xs text-muted-foreground">
              R{{ currentCandidate.row + 1 }}C{{ currentCandidate.col + 1 }} · 候选{{ currentCandidate.candidate }}
            </span>
          </div>

          <!-- 标记类型（仅标记模式可交互） -->
          <span class="text-sm font-medium text-muted-foreground transition-opacity"
            :class="currentMode === 'marker' ? '' : 'opacity-40'">标记类型</span>
          <ToggleGroup v-model="currentMarkerType" type="single" variant="outline" size="sm"
            class="w-fit bg-muted/50 p-0.5 transition-opacity"
            :class="currentMode === 'marker' ? '' : 'pointer-events-none opacity-40'">
            <ToggleGroupItem v-for="type in MARKER_TYPES" :key="type" :value="type"
              class="px-3 data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
              {{ MARKER_TYPE_LABELS[type] }}
            </ToggleGroupItem>
          </ToggleGroup>

          <!-- 链样式（仅链模式可交互） -->
          <span class="text-sm font-medium text-muted-foreground transition-opacity"
            :class="currentMode === 'chain' ? '' : 'opacity-40'">链样式</span>
          <div class="flex flex-wrap items-center gap-3 transition-opacity"
            :class="currentMode === 'chain' ? '' : 'pointer-events-none opacity-40'">
            <ToggleGroup v-model="currentChainStyle" type="single" variant="outline" size="sm"
              class="w-fit bg-muted/50 p-0.5">
              <ToggleGroupItem v-for="style in CHAIN_STYLES" :key="style.id" :value="style.id"
                class="px-3 data-[state=on]:bg-brand data-[state=on]:text-brand-foreground">
                {{ style.label }}
              </ToggleGroupItem>
            </ToggleGroup>
            <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Switch v-model="chainArrow" />
              箭头
            </label>
          </div>

          <!-- 候选数选择（高亮 / 链模式可用，链模式强制开启） -->
          <span class="text-sm font-medium text-muted-foreground transition-opacity"
            :class="currentMode === 'highlight' || currentMode === 'chain' ? '' : 'opacity-40'">候选数</span>
          <div class="flex flex-wrap items-center gap-2 transition-opacity"
            :class="currentMode === 'highlight' || currentMode === 'chain' ? '' : 'pointer-events-none opacity-40'">
            <label class="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Switch v-model="selectCandidate" :disabled="currentMode === 'chain'" />
              选择候选数
            </label>
            <span v-if="currentMode === 'chain'" class="text-xs text-muted-foreground">（链必须）</span>
          </div>
        </div>

        <!-- 操作 -->
        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" @click="saveAsSvg">
            <Download />
            保存为图片
          </Button>
          <template v-if="currentMode === 'chain' && draftNodes.length > 0">
            <Button class="bg-green-600 text-white hover:bg-green-700" :disabled="draftNodes.length < 2"
              @click="finishChain">
              <Check />
              完成链 ({{ draftNodes.length }} 个节点)
            </Button>
            <Button variant="ghost" @click="draftCancel">取消绘制</Button>
          </template>
          <Button variant="destructive" class="ml-auto" :disabled="!hasDrawing" @click="clearDrawing">
            <Trash2 />
            清空绘图
          </Button>
        </div>
      </Card>

        <!-- 画布独立成卡：工具栏与盘面互不挤压，盘面也不再被困在工具条容器里 -->
        <Card class="p-4 sm:p-6">
          <div class="flex justify-center">
            <SudokuBoard ref="boardRef" class="h-auto max-w-full" :board="board" :given="given" :showCandidates="true"
              :candidates="candidates" :customHighlights="highlights" :markers="markers" :chains="renderChains"
              :candidateMarkers="candidateMarkers" :selectedChainId="selectedChainId" :chainsInteractive="true"
              :selectedCandidate="candidateSelectActive ? currentCandidate : null"
              :mode="candidateSelectActive ? 'candidate' : 'interactive'" @cell-click="onCellClick"
              @candidate-click="onCandidateClick" @chain-click="onChainClick" />
          </div>

          <p v-if="statusMessage" class="mt-3 text-center text-sm text-muted-foreground">{{ statusMessage }}</p>
        </Card>

        <!-- 操作说明 -->
        <Alert>
          <Info />
          <AlertDescription>
            <ul class="flex flex-col gap-1">
              <li><strong>高亮：</strong>点击单元格添加/移除高亮；开启「选择候选数」后直接点击候选数高亮候选</li>
              <li><strong>标记：</strong>点击单元格添加圆圈/叉号/圆点/星号，同格同类型再次点击取消</li>
              <li><strong>摒除线：</strong>依次点击起点和终点，起点自动加圆圈</li>
              <li><strong>链：</strong>依次点击候选数添加节点，右侧「链视图」可完成、改色、改线型</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      <!-- 右列：链视图面板 -->
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
import { Check, Download, Info, Trash2 } from '@lucide/vue';
import SudokuBoard from '@/components/SudokuBoard.vue';
import ChainPanel from '@/components/ChainPanel.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
