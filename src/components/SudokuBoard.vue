<template>
  <svg :width="props.size" :height="props.size" viewBox="-10 -10 920 920" role="grid" aria-label="Sudoku board"
    @mousedown.prevent class="sudoku-svg">
    <!-- Background -->
    <rect x="-10" y="-10" width="920" height="920" fill="white" />

    <!-- Cell highlight backgrounds (for user selected) -->
    <g v-if="props.selected && mode === 'interactive'">
      <!-- Draw union of row/col/box related cells once each -->
      <rect v-for="cell in relatedCells" :key="'hl-' + cell.row + '-' + cell.col" :x="cell.col * 100"
        :y="cell.row * 100" width="100" height="100" fill="#E8F4F8" opacity="0.5" pointer-events="none" />
    </g>

    <!-- Focus cell highlight (practice uses same colors as interactive) -->
    <g
      v-if="props.focusCell && focusCol !== null && focusRow !== null && (mode === 'practice' || mode === 'interactive')">
      <!-- Focus cell background -->
      <rect :x="focusCol * 100" :y="focusRow * 100" width="100" height="100" fill="#D6ECFF" opacity="0.85"
        pointer-events="none" />
      <!-- Related cells highlight -->
      <rect v-for="cell in focusRelatedCells" :key="'focus-hl-' + cell.row + '-' + cell.col" :x="cell.col * 100"
        :y="cell.row * 100" width="100" height="100" fill="#E8F4F8" opacity="0.5" pointer-events="none" />
    </g>

    <!-- Candidate emphasis layer (filled circles behind candidates) -->
    <SudokuCandidateHighlights v-if="candidateMarkers.length > 0" :markers="candidateMarkers" :cellSize="100" />

    <!-- Hover highlight for candidate mode -->
    <circle
      v-if="hoveredCandidate && mode === 'candidate'"
      :cx="hoveredCandidate.col * 100 + getCandidateX(hoveredCandidate.candidate)"
      :cy="hoveredCandidate.row * 100 + getCandidateY(hoveredCandidate.candidate)"
      r="14"
      fill="#BBDEFB"
      opacity="0.6"
      pointer-events="none"
    />

    <!-- Selected candidate highlight -->
    <circle
      v-if="selectedCandidate && mode === 'candidate'"
      :cx="selectedCandidate.col * 100 + getCandidateX(selectedCandidate.candidate)"
      :cy="selectedCandidate.row * 100 + getCandidateY(selectedCandidate.candidate)"
      r="14"
      fill="#D6ECFF"
      opacity="0.85"
      pointer-events="none"
    />
    <circle
      v-if="selectedCandidate && mode === 'candidate'"
      :cx="selectedCandidate.col * 100 + getCandidateX(selectedCandidate.candidate)"
      :cy="selectedCandidate.row * 100 + getCandidateY(selectedCandidate.candidate)"
      r="14"
      fill="none"
      stroke="var(--accent)"
      stroke-width="2"
      pointer-events="none"
    />

    <!-- Hover highlight (only in interactive mode, not in practice mode) -->
    <rect v-if="hoveredCell && mode === 'interactive' && !props.focusCell" :x="hoveredCell.col * 100"
      :y="hoveredCell.row * 100" width="100" height="100" fill="#BBDEFB" opacity="0.5" pointer-events="none" />

    <!-- Custom highlights layer -->
    <SudokuHighlight v-if="customHighlights.length > 0" :highlights="customHighlights" :cellSize="100" />

    <!-- Markers layer (circles, crosses, elimination lines, etc.) -->
    <SudokuMarkers v-if="markers.length > 0" :markers="markers" :cellSize="100" />

    <!-- Chains layer -->
    <SudokuChains v-if="chains.length > 0" :chains="chains" :cellSize="100" />

    <!-- Click areas for candidate mode -->
    <g v-if="mode === 'candidate'">
      <template v-for="(row, r) in candidates" :key="'cand-click-row-' + r">
        <template v-for="(cellCands, c) in row" :key="'cand-click-' + r + '-' + c">
          <g v-if="cellCands && cellCands.length > 0">
            <circle
              v-for="n in cellCands"
              :key="'cand-click-' + r + '-' + c + '-' + n"
              :cx="(c as number) * 100 + getCandidateX(n)"
              :cy="(r as number) * 100 + getCandidateY(n)"
              r="20"
              fill="transparent"
              pointer-events="all"
              @click="emit('candidate-click', { row: r as number, col: c as number, candidate: n })"
              @mouseenter="hoveredCandidate = { row: r as number, col: c as number, candidate: n }"
              @mouseleave="hoveredCandidate = null"
              style="cursor: pointer"
            />
          </g>
        </template>
      </template>
    </g>

    <!-- Click areas (interactive and practice modes) -->
    <g v-if="mode !== 'display' && mode !== 'candidate'" v-for="(row, r) in props.board" :key="'click-row-' + r">
      <rect v-for="(_, c) in row" :key="'click-' + r + '-' + c" :x="c * 100" :y="r * 100" width="100" height="100"
        fill="transparent" @click="emit('cell-click', { row: r, col: c })"
        @dblclick="emit('cell-dblclick', { row: r, col: c })"
        @mouseenter="mode === 'interactive' && !props.focusCell ? (hoveredCell = { row: r as number, col: c as number }) : undefined"
        @mouseleave="hoveredCell = null" style="cursor: pointer" />
    </g>

    <!-- Grid lines -->
    <!-- Thin cell lines -->
    <g stroke="black" stroke-opacity="0.8" stroke-width="1" stroke-linecap="square">
      <line v-for="i in 8" :key="'vthin' + i" :x1="i * 100" y1="0" :x2="i * 100" y2="900" />
      <line v-for="i in 8" :key="'hthin' + i" x1="0" :y1="i * 100" x2="900" :y2="i * 100" />
    </g>
    <!-- Thick box lines (inner only) -->
    <g stroke="black" stroke-width="2" stroke-linecap="square">
      <line v-for="i in 2" :key="'vbox' + i" :x1="i * 300" y1="0" :x2="i * 300" y2="900" />
      <line v-for="i in 2" :key="'hbox' + i" x1="0" :y1="i * 300" x2="900" :y2="i * 300" />
    </g>

    <!-- Outer border (below selection borders) -->
    <g stroke="black" stroke-width="4" stroke-linecap="square">
      <line x1="0" y1="0" x2="900" y2="0" />
      <line x1="900" y1="0" x2="900" y2="900" />
      <line x1="900" y1="900" x2="0" y2="900" />
      <line x1="0" y1="900" x2="0" y2="0" />
    </g>

    <!-- Selected cell border -->
    <!-- Selected cell background -->
    <rect v-if="props.selected && selectedCol !== null && selectedRow !== null && mode === 'interactive'"
      :x="selectedCol * 100" :y="selectedRow * 100" width="100" height="100" fill="#D6ECFF" opacity="0.85"
      pointer-events="none" />

    <!-- Selected cell border -->
    <rect v-if="props.selected && selectedCol !== null && selectedRow !== null && mode === 'interactive'"
      :x="selectedCol * 100" :y="selectedRow * 100" width="100" height="100" fill="none" stroke="var(--accent)"
      stroke-width="4" rx="6" pointer-events="none" />

    <!-- Focus cell border (for practice mode) -->
    <rect v-if="props.focusCell && focusCol !== null && focusRow !== null" :x="focusCol * 100" :y="focusRow * 100"
      width="100" height="100" fill="none" stroke="var(--accent)" stroke-width="4" rx="6" pointer-events="none" />

    <!-- Numbers -->
    <g font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="central">
      <g v-for="(row, r) in props.board" :key="'num-row-' + r">
        <text v-for="(value, c) in row" :key="'num-' + r + '-' + c" :x="c * 100 + 50" :y="r * 100 + 50"
          v-show="value > 0" :fill="isGiven(r, c) ? 'black' : 'var(--user-num-color)'" font-size="55" font-weight="500"
          pointer-events="none">{{ value }}</text>
      </g>
    </g>

    <!-- Candidates (if enabled) -->
    <g v-if="showCandidates && candidates.length > 0">
      <template v-for="(row, r) in candidates" :key="'cand-row-' + r">
        <template v-for="(cellCands, c) in row" :key="'cand-' + r + '-' + c">
          <g v-if="cellCands && cellCands.length > 0">
            <text v-for="n in cellCands" :key="'cand-' + r + '-' + c + '-' + n"
              :x="(c as number) * 100 + getCandidateX(n)" :y="(r as number) * 100 + getCandidateY(n)" font-size="22"
              fill="var(--cand-color)" text-anchor="middle" dominant-baseline="central" pointer-events="none">{{ n
              }}</text>
          </g>
        </template>
      </template>
    </g>

    <!-- Outer border moved earlier to render below selection borders -->
  </svg>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CellHighlight, CellMarker, Chain, CandidateMarker } from '@/types/sudoku';
import SudokuHighlight from './SudokuHighlight.vue';
import SudokuMarkers from './SudokuMarkers.vue';
import SudokuChains from './SudokuChains.vue';
import SudokuCandidateHighlights from './SudokuCandidateHighlights.vue';

interface CandidatePosition {
  row: number;
  col: number;
  candidate: number;
}

const props = withDefaults(defineProps<{
  board: number[][];
  given?: boolean[][];
  candidates?: number[][][];
  size?: number;
  showCandidates?: boolean;
  selected?: { row: number; col: number } | null;
  selectedCandidate?: CandidatePosition | null;
  focusCell?: { row: number; col: number } | null;
  focusHighlight?: 'row' | 'col' | 'box' | 'all' | 'none';
  mode?: 'display' | 'interactive' | 'practice' | 'candidate';
  customHighlights?: CellHighlight[];
  markers?: CellMarker[];
  chains?: Chain[];
  candidateMarkers?: CandidateMarker[];
}>(), {
  given: () => Array.from({ length: 9 }, () => Array(9).fill(false)),
  candidates: () => [],
  size: 450,
  showCandidates: true,
  mode: 'interactive',
  focusHighlight: 'all',
  customHighlights: () => [],
  markers: () => [],
  chains: () => [],
  candidateMarkers: () => []
});

const emit = defineEmits(['cell-click', 'cell-dblclick', 'candidate-click']);

const hoveredCell = ref<{ row: number; col: number } | null>(null);
const hoveredCandidate = ref<CandidatePosition | null>(null);

// Computed properties for selected cell
const selectedRow = computed(() => props.selected?.row ?? null);
const selectedCol = computed(() => props.selected?.col ?? null);
const boxX = computed(() => props.selected ? Math.floor(props.selected.col / 3) : 0);
const boxY = computed(() => props.selected ? Math.floor(props.selected.row / 3) : 0);

// Union of related cells (same row, column, or box) excluding the selected cell
const relatedCells = computed(() => {
  if (!props.selected || props.mode !== 'interactive') return [];
  const sr = selectedRow.value;
  const sc = selectedCol.value;
  if (sr === null || sc === null) return [];
  const set = new Set<string>();

  // Row
  for (let c = 0; c < 9; c++) {
    if (c === sc) continue;
    set.add(`${sr}-${c}`);
  }

  // Column
  for (let r = 0; r < 9; r++) {
    if (r === sr) continue;
    set.add(`${r}-${sc}`);
  }

  // Box
  const br = Math.floor(sr / 3) * 3;
  const bc = Math.floor(sc / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (r === sr && c === sc) continue;
      set.add(`${r}-${c}`);
    }
  }

  return Array.from(set).map((key: string) => {
    const [r, c] = key.split('-').map(Number);
    return { row: r!, col: c! };
  });
});

// Union of related cells for focusCell (same logic as selected), used in practice mode
const focusRelatedCells = computed(() => {
  if (!props.focusCell || props.focusHighlight === 'none') return [];
  const sr = focusRow.value;
  const sc = focusCol.value;
  if (sr === null || sc === null) return [];
  const set = new Set<string>();

  // Row
  if (props.focusHighlight === 'row' || props.focusHighlight === 'all') {
    for (let c = 0; c < 9; c++) {
      if (c === sc) continue;
      set.add(`${sr}-${c}`);
    }
  }

  // Column
  if (props.focusHighlight === 'col' || props.focusHighlight === 'all') {
    for (let r = 0; r < 9; r++) {
      if (r === sr) continue;
      set.add(`${r}-${sc}`);
    }
  }

  // Box
  if (props.focusHighlight === 'box' || props.focusHighlight === 'all') {
    const br = Math.floor(sr / 3) * 3;
    const bc = Math.floor(sc / 3) * 3;
    for (let r = br; r < br + 3; r++) {
      for (let c = bc; c < bc + 3; c++) {
        if (r === sr && c === sc) continue;
        set.add(`${r}-${c}`);
      }
    }
  }

  return Array.from(set).map((key: string) => {
    const [r, c] = key.split('-').map(Number);
    return { row: r!, col: c! };
  });
});

// Computed properties for focus cell (practice mode)
const focusRow = computed(() => props.focusCell?.row ?? null);
const focusCol = computed(() => props.focusCell?.col ?? null);
const focusBoxX = computed(() => props.focusCell ? Math.floor(props.focusCell.col / 3) : 0);
const focusBoxY = computed(() => props.focusCell ? Math.floor(props.focusCell.row / 3) : 0);

// Helper functions
const isGiven = (r: number, c: number) => props.given[r]?.[c] || false;

const getCandidateX = (n: number) => {
  const positions = [17, 50, 83, 17, 50, 83, 17, 50, 83];
  return positions[n - 1] ?? 50;
};

const getCandidateY = (n: number) => {
  const positions = [20, 20, 20, 50, 50, 50, 80, 80, 80];
  return positions[n - 1] ?? 50;
};
</script>

<style scoped>
/* ensure SVG scales smoothly in layout */
.sudoku-svg {

  --accent: #007acc;
  --highlight-bg: #007acc;
  --user-num-color: #0066cc;
  --given-num-color: #000000;
  --cand-color: #1b1b1b;

  display: block;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
</style>
