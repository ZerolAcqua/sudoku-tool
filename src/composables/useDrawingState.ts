// 数独绘图的共享状态与操作：高亮 / 标记 / 摒除线 / 链
// composable 工厂——每个绘图页面持有独立一份状态，互不干扰
import { computed, ref } from 'vue';
import type {
  CandidateMarker,
  CellHighlight,
  CellMarker,
  CellPosition,
  Chain,
  ChainNode,
  ChainStyle,
  MarkerType,
} from '@/types/sudoku';

// 绘图模式
export type DrawingMode = 'highlight' | 'marker' | 'line' | 'chain';

// 可手动绘制的标记类型（line 由摒除线模式生成，不出现在标记工具栏）
export type DrawMarkerType = Exclude<MarkerType, 'line'>;

export interface DrawingColor {
  name: string;
  value: string;
}

// 绘图颜色单一来源：面板色板与工具栏共用，避免两处硬编码
export const DRAWING_COLORS: DrawingColor[] = [
  { name: '红色', value: '#f44336' },
  { name: '粉色', value: '#e91e63' },
  { name: '紫色', value: '#9c27b0' },
  { name: '蓝色', value: '#2196f3' },
  { name: '青色', value: '#00bcd4' },
  { name: '绿色', value: '#4caf50' },
  { name: '橙色', value: '#ff9800' },
  { name: '棕色', value: '#795548' },
];

export const DRAWING_MODES: Array<{ id: DrawingMode; label: string }> = [
  { id: 'highlight', label: '高亮' },
  { id: 'marker', label: '标记' },
  { id: 'line', label: '摒除线' },
  { id: 'chain', label: '链' },
];

export const MARKER_TYPES: DrawMarkerType[] = ['circle', 'cross', 'dot', 'star'];

export const MARKER_TYPE_LABELS: Record<DrawMarkerType, string> = {
  circle: '圆圈',
  cross: '叉号',
  dot: '圆点',
  star: '星号',
};

export const CHAIN_STYLES: Array<{ id: ChainStyle; label: string }> = [
  { id: 'solid', label: '实线' },
  { id: 'dashed', label: '虚线' },
  { id: 'dotted', label: '点线' },
];

export const CHAIN_STYLE_LABELS: Record<ChainStyle, string> = {
  solid: '实线',
  dashed: '虚线',
  dotted: '点线',
};

export const CHAIN_WIDTHS = [1.5, 2, 2.5, 3, 4];

// 绘制中的草稿链使用固定 id，渲染层与面板据此识别
export const DRAFT_CHAIN_ID = '__draft__';

const MARKER_SIZES: Record<DrawMarkerType, number> = {
  circle: 35,
  cross: 10,
  dot: 10,
  star: 45,
};

let chainSeq = 0;

function nextChainId(): string {
  chainSeq += 1;
  return `chain-${chainSeq}`;
}

function isSameNode(a: ChainNode, b: ChainNode): boolean {
  return a.row === b.row && a.col === b.col && a.candidate === b.candidate;
}

// 去掉相邻的重复节点（同格同候选），链渲染对零长线段无意义
export function normalizeChainNodes(nodes: ChainNode[]): ChainNode[] {
  const result: ChainNode[] = [];
  for (const node of nodes) {
    const last = result[result.length - 1];
    if (last && isSameNode(last, node)) continue;
    result.push({ ...node });
  }
  return result;
}

// 依据盘面已填数字计算候选数，供绘图页初始化
export function computeCandidates(board: number[][]): number[][][] {
  const result: number[][][] = Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => [] as number[])
  );

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if ((board[r]?.[c] ?? 0) > 0) continue;

      const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (let i = 0; i < 9; i++) {
        possible.delete(board[r]?.[i] ?? 0);
        possible.delete(board[i]?.[c] ?? 0);
      }
      const boxRow = Math.floor(r / 3) * 3;
      const boxCol = Math.floor(c / 3) * 3;
      for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
          possible.delete(board[i]?.[j] ?? 0);
        }
      }
      result[r]![c] = Array.from(possible).sort((a, b) => a - b);
    }
  }

  return result;
}

export interface ChainDraftStyle {
  color: string;
  style: ChainStyle;
  strokeWidth?: number;
  arrow?: boolean;
  curve?: 'straight' | 'smooth';
}

export function createDrawingState() {
  const highlights = ref<CellHighlight[]>([]);
  const markers = ref<CellMarker[]>([]);
  const chains = ref<Chain[]>([]);
  const candidateMarkers = ref<CandidateMarker[]>([]);

  // 绘制中的草稿链节点；线起点；当前选中的链
  const draftNodes = ref<ChainNode[]>([]);
  const lineStart = ref<CellPosition | null>(null);
  const selectedChainId = ref<string | null>(null);

  // ---------------- 高亮 ----------------

  function toggleCellHighlight(pos: CellPosition, color: string, opacity = 0.5): void {
    const index = highlights.value.findIndex((h) =>
      h.cells.some((cell) => cell.row === pos.row && cell.col === pos.col)
    );
    if (index >= 0) {
      highlights.value.splice(index, 1);
      return;
    }
    highlights.value.push({ cells: [{ ...pos }], color, opacity });
  }

  function toggleCandidateHighlight(
    pos: CellPosition & { candidate: number },
    color: string,
    opacity = 0.6
  ): void {
    const index = candidateMarkers.value.findIndex(
      (m) => m.row === pos.row && m.col === pos.col && m.candidate === pos.candidate
    );
    if (index >= 0) {
      candidateMarkers.value.splice(index, 1);
      return;
    }
    candidateMarkers.value.push({ ...pos, color, opacity });
  }

  // ---------------- 标记 ----------------

  function toggleMarker(pos: CellPosition, type: DrawMarkerType, color: string): void {
    const size = MARKER_SIZES[type];
    const index = markers.value.findIndex(
      (m) => m.cell?.row === pos.row && m.cell?.col === pos.col && m.type === type
    );

    if (index >= 0) {
      const existing = markers.value[index]!;
      const sameStyle = existing.color === color && (existing.size ?? size) === size;
      // 同格同类型同样式：视为取消；样式不同：替换
      if (sameStyle) {
        markers.value.splice(index, 1);
        return;
      }
      markers.value[index] = { cell: { ...pos }, type, color, size, strokeWidth: 3 };
      return;
    }

    markers.value.push({ cell: { ...pos }, type, color, size, strokeWidth: 3 });
  }

  // ---------------- 摒除线 ----------------

  function addLinePoint(pos: CellPosition, color: string, strokeWidth = 3): void {
    if (!lineStart.value) {
      lineStart.value = { ...pos };
      markers.value.push({
        cell: { ...pos },
        type: 'circle',
        color,
        strokeWidth,
        size: MARKER_SIZES.circle,
      });
      return;
    }

    if (lineStart.value.row === pos.row && lineStart.value.col === pos.col) return;

    markers.value.push({
      cells: [{ ...lineStart.value }, { ...pos }],
      type: 'line',
      color,
      strokeWidth,
    });
    lineStart.value = null;
  }

  function cancelLine(): void {
    lineStart.value = null;
  }

  // ---------------- 链 ----------------

  function draftAdd(node: ChainNode): void {
    const last = draftNodes.value[draftNodes.value.length - 1];
    if (last && isSameNode(last, node)) return;
    draftNodes.value.push({ ...node });
  }

  function draftRemoveLast(): void {
    draftNodes.value.pop();
  }

  function draftCancel(): void {
    draftNodes.value = [];
  }

  function addChain(input: Omit<Chain, 'id'> & { id?: string }): string | null {
    const cells = normalizeChainNodes(input.cells);
    if (cells.length < 2) return null;

    const id = input.id ?? nextChainId();
    chains.value.push({ ...input, id, cells });
    return id;
  }

  // 结束草稿链：节点不足 2 个时丢弃
  function draftFinish(style: ChainDraftStyle): string | null {
    const id = addChain({ ...style, cells: draftNodes.value });
    draftNodes.value = [];
    if (id) selectedChainId.value = id;
    return id;
  }

  function updateChain(id: string, patch: Partial<Omit<Chain, 'id'>>): void {
    const chain = chains.value.find((c) => c.id === id);
    if (!chain) return;
    Object.assign(chain, patch);
  }

  function removeChain(id: string): void {
    const index = chains.value.findIndex((c) => c.id === id);
    if (index < 0) return;
    chains.value.splice(index, 1);
    if (selectedChainId.value === id) selectedChainId.value = null;
  }

  function toggleChainVisible(id: string): void {
    const chain = chains.value.find((c) => c.id === id);
    if (!chain) return;
    chain.visible = chain.visible === false;
  }

  function removeChainNode(id: string, index: number): void {
    const chain = chains.value.find((c) => c.id === id);
    if (!chain || index < 0 || index >= chain.cells.length) return;

    chain.cells.splice(index, 1);
    // 节点数变化后逐段颜色无法对齐，直接回退为统一链色
    delete chain.segmentColors;

    if (chain.cells.length < 2) removeChain(id);
  }

  function selectChain(id: string | null): void {
    selectedChainId.value = id;
  }

  function clearChains(): void {
    chains.value = [];
    draftNodes.value = [];
    selectedChainId.value = null;
  }

  function clearAll(): void {
    highlights.value = [];
    markers.value = [];
    candidateMarkers.value = [];
    clearChains();
    lineStart.value = null;
  }

  const visibleChains = computed(() => chains.value.filter((c) => c.visible !== false));
  const hasDrawing = computed(
    () =>
      highlights.value.length > 0 ||
      markers.value.length > 0 ||
      candidateMarkers.value.length > 0 ||
      chains.value.length > 0
  );

  return {
    // 状态
    highlights,
    markers,
    chains,
    candidateMarkers,
    draftNodes,
    lineStart,
    selectedChainId,
    visibleChains,
    hasDrawing,
    // 高亮
    toggleCellHighlight,
    toggleCandidateHighlight,
    // 标记
    toggleMarker,
    // 摒除线
    addLinePoint,
    cancelLine,
    // 链
    draftAdd,
    draftRemoveLast,
    draftCancel,
    draftFinish,
    addChain,
    updateChain,
    removeChain,
    toggleChainVisible,
    removeChainNode,
    selectChain,
    clearChains,
    clearAll,
  };
}

export type DrawingState = ReturnType<typeof createDrawingState>;
