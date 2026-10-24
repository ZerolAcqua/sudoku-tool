<template>
  <!-- 外层只为容纳抽屉 / 弹窗；同样撑满 main 并锁定高度（lg:min-h-0），盘面才能按剩余高度缩放 -->
  <div class="flex flex-1 flex-col lg:min-h-0">
    <div class="page-container lg:min-h-0">
      <PageHeader :title="feature.title" description="在盘面上标注高亮、标记、摒除线与链，导出为图片分享解题思路">
        <template #actions>
          <Button variant="ghost" aria-label="导入题目" @click="openImport">
            <FileInput />
            <span class="hidden sm:inline">导入题目</span>
          </Button>

          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="撤销" :disabled="!canUndo" @click="undo">
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>撤销 <Kbd>{{ MOD_KEY }}Z</Kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" aria-label="重做" :disabled="!canRedo" @click="redo">
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>重做 <Kbd>{{ MOD_KEY }}⇧Z</Kbd></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="ghost" size="icon" class="hover:text-destructive" aria-label="清空绘图"
                :disabled="!hasDrawing" @click="clearDrawing">
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>清空绘图</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button class="ml-1">
                <Download />
                导出
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @select="exportPng">
                <ImageDown />
                下载 PNG
              </DropdownMenuItem>
              <DropdownMenuItem @select="exportSvg">
                <FileCode />
                下载 SVG
              </DropdownMenuItem>
              <DropdownMenuItem @select="copyImage">
                <Copy />
                复制图片
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </template>
      </PageHeader>

      <!-- 盘面贴左、链面板贴右：与页头标题、操作按钮的边缘对齐 -->
      <!-- 一屏布局：网格吃满剩余高度（单行 minmax(0,1fr)），左列工具条 + 盘面，盘面再吃掉左列剩余高度 -->
      <div class="grid items-start gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,600px)_minmax(0,18rem)] lg:grid-rows-[minmax(0,1fr)] lg:justify-between lg:gap-10">
        <!-- 左列：工具条与盘面同宽，左右边缘对齐 -->
        <section class="flex w-full min-w-0 flex-col lg:h-full lg:min-h-0">
          <!-- 第一行：常驻的模式与颜色 -->
          <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
            <SegmentedControl v-model="currentMode" :options="MODE_OPTIONS" aria-label="绘图模式" />
            <ColorSwatches v-model="currentColor" />
            <!-- 移动端：链视图收进抽屉 -->
            <Button v-if="!isDesktop" variant="outline" size="sm" class="ml-auto" @click="chainSheetOpen = true">
              <Waypoints />
              链 ({{ chains.length }})
            </Button>
          </div>

          <!-- 第二行：只显示当前模式的选项；固定最小高度，切换模式时盘面不跳 -->
          <div class="mt-3 flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <template v-if="currentMode === 'highlight'">
              <label class="flex items-center gap-2 text-foreground">
                <Switch v-model="selectCandidate" />
                选择候选数
              </label>
              <span class="text-muted-foreground">开启后点击候选数单独高亮</span>
            </template>

            <template v-else-if="currentMode === 'marker'">
              <span class="text-muted-foreground">标记类型</span>
              <SegmentedControl v-model="currentMarkerType" :options="MARKER_OPTIONS" aria-label="标记类型" />
            </template>

            <template v-else-if="currentMode === 'line'">
              <span v-if="lineStart" class="text-foreground">
                起点 R{{ lineStart.row + 1 }}C{{ lineStart.col + 1 }}
                <span class="text-muted-foreground"> · 点击终点完成，Esc 取消</span>
              </span>
              <span v-else class="text-muted-foreground">点击起点单元格开始一条摒除线</span>
            </template>

            <template v-else>
              <span class="text-muted-foreground">线型</span>
              <SegmentedControl v-model="currentChainStyle" :options="CHAIN_STYLE_OPTIONS" aria-label="链线型" />
              <label class="flex items-center gap-2 text-foreground">
                <Switch v-model="chainArrow" />
                箭头
              </label>
              <div v-if="draftNodes.length > 0" class="ml-auto flex items-center gap-1">
                <Button size="sm" variant="ghost" @click="draftCancel">取消</Button>
                <Button size="sm" :disabled="draftNodes.length < 2" @click="finishChain">
                  <Check />
                  完成链 ({{ draftNodes.length }})
                </Button>
              </div>
            </template>
          </div>

          <!-- 盘面：纸上的白页，不再套卡片 -->
          <div ref="boardWrapRef" class="mt-4 flex lg:min-h-0 lg:flex-1">
            <SudokuBoard ref="boardRef" :size="boardSize" :board="board" :given="given" :showCandidates="true"
              :candidates="candidates" :customHighlights="highlights" :markers="markers" :chains="renderChains"
              :candidateMarkers="candidateMarkers" :selectedChainId="selectedChainId" :chainsInteractive="true"
              :selectedCandidate="candidateSelectActive ? currentCandidate : null"
              :mode="candidateSelectActive ? 'candidate' : 'interactive'" @cell-click="onCellClick"
              @candidate-click="onCandidateClick" @chain-click="onChainClick" />
          </div>

          <!-- 状态栏：当前模式的操作提示 -->
          <p class="mt-3 text-sm text-muted-foreground">{{ MODE_HINTS[currentMode] }}</p>
        </section>

        <!-- 右列：链视图面板（桌面） -->
        <!-- 链很多时只在面板内部滚动，不撑出整页滚动条 -->
        <aside v-if="isDesktop" class="lg:max-h-full lg:overflow-y-auto">
          <ChainPanel v-bind="chainPanelProps" v-on="chainPanelListeners" />
        </aside>
      </div>
    </div>

    <!-- 链视图面板（移动端抽屉） -->
    <Sheet v-if="!isDesktop" v-model:open="chainSheetOpen">
      <SheetContent side="right" class="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader class="sr-only">
          <SheetTitle>链视图</SheetTitle>
          <SheetDescription>查看与编辑已绘制的链</SheetDescription>
        </SheetHeader>
        <ChainPanel class="border-0 shadow-none" v-bind="chainPanelProps" v-on="chainPanelListeners" />
      </SheetContent>
    </Sheet>

    <!-- 导入题目 -->
    <Dialog v-model:open="importOpen">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导入题目</DialogTitle>
          <DialogDescription>粘贴 81 位盘面文本，空格用 0 或 . 表示。导入会清空当前绘图。</DialogDescription>
        </DialogHeader>
        <textarea v-model="importText" rows="4" spellcheck="false" placeholder="530070000600195000…"
          class="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm break-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          :aria-invalid="importError ? true : undefined" @keydown.enter.exact.prevent="confirmImport" />
        <p v-if="importError" class="text-sm text-destructive">{{ importError }}</p>
        <DialogFooter>
          <Button variant="outline" @click="importOpen = false">取消</Button>
          <Button @click="confirmImport">导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useMediaQuery } from '@vueuse/core';
import { toast } from 'vue-sonner';
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode,
  FileInput,
  ImageDown,
  Redo2,
  Trash2,
  Undo2,
  Waypoints,
} from '@lucide/vue';
import ChainPanel from '@/components/ChainPanel.vue';
import ColorSwatches from '@/components/ColorSwatches.vue';
import PageHeader from '@/components/PageHeader.vue';
import SegmentedControl, { type SegmentedOption } from '@/components/SegmentedControl.vue';
import SudokuBoard from '@/components/SudokuBoard.vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBoardSize } from '@/composables/useBoardSize';
import { FEATURE_BY_KEY } from '@/constants/features';
import type { Chain, ChainStyle } from '@/types/sudoku';
import { copyPngToClipboard, downloadBlob, toPngBlob, toSvgString } from '@/utils/exportBoard';
import { logger } from '@/utils/logger';
import { parsePuzzleText } from '@/utils/puzzleText';
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

const feature = FEATURE_BY_KEY.draw;
const route = useRoute();

const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const MODE_KEYS: Record<DrawingMode, string> = { highlight: 'H', marker: 'M', line: 'L', chain: 'C' };

// 快捷键不再常驻显示在按钮上，放进悬停提示
const MODE_OPTIONS: SegmentedOption<DrawingMode>[] = DRAWING_MODES.map((m) => ({
  value: m.id,
  label: m.label,
  title: `${m.label}（${MODE_KEYS[m.id]}）`,
}));
const MARKER_OPTIONS: SegmentedOption<DrawMarkerType>[] = MARKER_TYPES.map((t) => ({
  value: t,
  label: MARKER_TYPE_LABELS[t],
}));
const CHAIN_STYLE_OPTIONS: SegmentedOption<ChainStyle>[] = CHAIN_STYLES.map((c) => ({ value: c.id, label: c.label }));

const MODE_HINTS: Record<DrawingMode, string> = {
  highlight: '点击单元格添加 / 移除高亮',
  marker: '点击单元格添加标记，同格同类型同颜色再次点击取消',
  line: '依次点击起点和终点画摒除线，起点自动加圆圈',
  chain: '依次点击候选数添加节点，Enter 完成，Esc 取消',
};

// 默认示例盘面；可通过「导入题目」或 ?puzzle=<81位> 替换
const DEFAULT_BOARD: number[][] = [
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

const board = ref<number[][]>(DEFAULT_BOARD);
// 绘图盘面上的数字都视为题目给定数
const given = computed(() => board.value.map((row) => row.map((v) => v > 0)));
const candidates = computed(() => computeCandidates(board.value));

// 绘图状态集中在 composable 中，链视图面板与盘面共享同一份
const {
  highlights,
  markers,
  chains,
  candidateMarkers,
  draftNodes,
  lineStart,
  selectedChainId,
  hasDrawing,
  toggleCellHighlight,
  toggleCandidateHighlight,
  toggleMarker,
  addLinePoint,
  cancelLine,
  draftAdd,
  draftCancel,
  draftFinish,
  updateChain,
  removeChain,
  toggleChainVisible,
  removeChainNode,
  selectChain,
  clearAll,
  reset,
  undo,
  redo,
  canUndo,
  canRedo,
} = createDrawingState();

// 工具栏状态
const currentMode = ref<DrawingMode>('highlight');
const currentMarkerType = ref<DrawMarkerType>('circle');
const currentChainStyle = ref<ChainStyle>('solid');
const chainArrow = ref(true);
const currentColor = ref(DRAWING_COLORS[0]!.value);
const selectCandidate = ref(false);
const currentCandidate = ref<CandidatePosition | null>(null);
const boardRef = ref<InstanceType<typeof SudokuBoard> | null>(null);

const isDesktop = useMediaQuery('(min-width: 1024px)');
const boardWrapRef = ref<HTMLElement | null>(null);
const boardSize = useBoardSize(boardWrapRef, { max: 600, min: 280, fitHeight: () => isDesktop.value });

const chainSheetOpen = ref(false);

// 链模式必须选中候选数；离开摒除线模式时丢弃未完成的起点
watch(currentMode, (mode, prev) => {
  if (mode === 'chain') selectCandidate.value = true;
  if (prev === 'line') cancelLine();
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

function onChainClick(payload: { id: string }): void {
  if (payload.id === DRAFT_CHAIN_ID) return;
  selectChain(selectedChainId.value === payload.id ? null : payload.id);
}

// 桌面右栏与移动端抽屉渲染同一份面板
const chainPanelProps = computed(() => ({
  chains: chains.value,
  selectedId: selectedChainId.value,
  draftNodes: draftNodes.value,
}));

const chainPanelListeners = {
  select: (id: string) => selectChain(id),
  remove: removeChain,
  'toggle-visible': toggleChainVisible,
  update: (payload: { id: string; patch: Partial<Omit<Chain, 'id'>> }) => updateChain(payload.id, payload.patch),
  'remove-node': (payload: { id: string; index: number }) => removeChainNode(payload.id, payload.index),
  'finish-draft': finishChain,
  'cancel-draft': draftCancel,
};

function clearDrawing(): void {
  clearAll();
  currentCandidate.value = null;
}

// ---------------- 导入题目 ----------------

const importOpen = ref(false);
const importText = ref('');
const importError = ref('');

function openImport(): void {
  importText.value = '';
  importError.value = '';
  importOpen.value = true;
}

function loadPuzzle(next: number[][]): void {
  board.value = next;
  reset();
  currentCandidate.value = null;
}

function confirmImport(): void {
  const parsed = parsePuzzleText(importText.value);
  if (!parsed) {
    importError.value = '需要恰好 81 位数字（0 或 . 表示空格）';
    return;
  }
  loadPuzzle(parsed);
  importOpen.value = false;
  toast.success('已导入题目');
}

// ---------------- 导出 ----------------

function boardSvg(): SVGElement | null {
  return (boardRef.value?.$el as SVGElement | undefined) ?? null;
}

const exportName = () => `sudoku-drawing-${new Date().toISOString().slice(0, 10)}`;

function exportSvg(): void {
  const svg = boardSvg();
  if (!svg) return;
  downloadBlob(new Blob([toSvgString(svg)], { type: 'image/svg+xml' }), `${exportName()}.svg`);
  toast.success('已导出 SVG');
}

async function exportPng(): Promise<void> {
  const svg = boardSvg();
  if (!svg) return;
  try {
    downloadBlob(await toPngBlob(svg), `${exportName()}.png`);
    toast.success('已导出 PNG');
  } catch (error) {
    logger.error('导出 PNG 失败:', error);
    toast.error('导出失败，请查看控制台日志');
  }
}

async function copyImage(): Promise<void> {
  const svg = boardSvg();
  if (!svg) return;
  try {
    await copyPngToClipboard(svg);
    toast.success('已复制图片到剪贴板');
  } catch (error) {
    logger.error('复制图片失败:', error);
    toast.error('复制失败，浏览器可能不支持写入图片');
  }
}

// ---------------- 快捷键 ----------------

const KEY_TO_MODE: Record<string, DrawingMode> = { h: 'highlight', m: 'marker', l: 'line', c: 'chain' };

function onKeydown(e: KeyboardEvent): void {
  if (importOpen.value) return;
  const tag = (e.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

  const key = e.key.toLowerCase();
  if (e.metaKey || e.ctrlKey) {
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (key === 'y') {
      e.preventDefault();
      redo();
    }
    return;
  }
  if (e.altKey) return;

  const mode = KEY_TO_MODE[key];
  if (mode) {
    currentMode.value = mode;
  } else if (e.key === 'Enter' && draftNodes.value.length >= 2) {
    finishChain();
  } else if (e.key === 'Escape') {
    draftCancel();
    cancelLine();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  // 识别页「在绘图工具中打开」会带上 ?puzzle=<81位>
  const fromQuery = typeof route.query.puzzle === 'string' ? parsePuzzleText(route.query.puzzle) : null;
  if (fromQuery) loadPuzzle(fromQuery);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>
