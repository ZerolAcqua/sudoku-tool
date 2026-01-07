<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="-10 -10 920 920"
    role="grid"
    aria-label="Sudoku board"
    @mousedown.prevent
    class="sudoku-svg"
  >
    <!-- Background -->
    <rect x="-10" y="-10" width="920" height="920" fill="white" />

    <!-- Cell highlight backgrounds (for user selected) -->
    <g v-if="props.selected && props.mode === 'interactive'">
      <!-- Draw union of row/col/box related cells once each -->
      <rect
        v-for="cell in relatedCells"
        :key="'hl-' + cell.row + '-' + cell.col"
        :x="cell.col * 100"
        :y="cell.row * 100"
        width="100"
        height="100"
        fill="#E8F4F8"
        opacity="0.5"
        pointer-events="none"
      />
    </g>

    <!-- Focus cell highlight (practice uses same colors as interactive) -->
    <g v-if="props.focusCell && (props.mode === 'practice' || props.mode === 'interactive')">
      <!-- Focus cell background -->
      <rect
        :x="focusCol * 100"
        :y="focusRow * 100"
        width="100"
        height="100"
        fill="#D6ECFF"
        opacity="0.85"
        pointer-events="none"
      />
      <!-- Related cells highlight -->
      <rect
        v-for="cell in focusRelatedCells"
        :key="'focus-hl-' + cell.row + '-' + cell.col"
        :x="cell.col * 100"
        :y="cell.row * 100"
        width="100"
        height="100"
        fill="#E8F4F8"
        opacity="0.5"
        pointer-events="none"
      />
    </g>

    <!-- Hover highlight (only in interactive mode, not in practice mode) -->
    <rect
      v-if="hoveredCell && props.mode === 'interactive' && !props.focusCell"
      :x="hoveredCell.col * 100"
      :y="hoveredCell.row * 100"
      width="100"
      height="100"
      fill="#BBDEFB"
      opacity="0.5"
      pointer-events="none"
    />

    <!-- Click areas (interactive and practice modes) -->
    <g v-if="props.mode !== 'display'" v-for="(row, r) in props.board" :key="'click-row-' + r">
      <rect
        v-for="(_, c) in row"
        :key="'click-' + r + '-' + c"
        :x="c * 100"
        :y="r * 100"
        width="100"
        height="100"
        fill="transparent"
        @click="emit('cell-click', { row: r, col: c })"
        @dblclick="emit('cell-dblclick', { row: r, col: c })"
        @mouseenter="props.mode === 'interactive' && !props.focusCell ? hoveredCell = { row: r, col: c } : null"
        @mouseleave="hoveredCell = null"
        :style="props.mode !== 'display' ? 'cursor: pointer' : ''"
      />
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
    <rect
      v-if="props.selected && props.mode === 'interactive'"
      :x="selectedCol * 100"
      :y="selectedRow * 100"
      width="100"
      height="100"
      fill="#D6ECFF"
      opacity="0.85"
      pointer-events="none"
    />
    
    <!-- Selected cell border -->
    <rect
      v-if="props.selected && props.mode === 'interactive'"
      :x="selectedCol * 100"
      :y="selectedRow * 100"
      width="100"
      height="100"
      fill="none"
      stroke="var(--accent)"
      stroke-width="4"
      rx="6"
      pointer-events="none"
    />

    <!-- Focus cell border (for practice mode) -->
    <rect
      v-if="props.focusCell"
      :x="focusCol * 100"
      :y="focusRow * 100"
      width="100"
      height="100"
      fill="none"
      stroke="var(--accent)"
      stroke-width="4"
      rx="6"
      pointer-events="none"
    />

    <!-- Numbers -->
    <g font-family="system-ui, sans-serif" text-anchor="middle" dominant-baseline="central">      
      <g v-for="(row, r) in props.board" :key="'num-row-' + r">
        <text
          v-for="(value, c) in row"
          :key="'num-' + r + '-' + c"
          :x="c * 100 + 50"
          :y="r * 100 + 50"
          v-show="value > 0"
          :fill="isGiven(r, c) ? 'black' : 'var(--user-num-color)'"
          font-size="55"
          font-weight="500"
          pointer-events="none"
        >{{ value }}</text>
      </g>
    </g>

    <!-- Candidates (if enabled) -->
    <g v-if="props.showCandidates && props.candidates">
      <template v-for="(row, r) in props.candidates" :key="'cand-row-' + r">
        <template v-for="(cellCands, c) in row" :key="'cand-' + r + '-' + c">
          <g v-if="cellCands && cellCands.length > 0">
            <text
              v-for="n in cellCands"
              :key="'cand-' + r + '-' + c + '-' + n"
              :x="c * 100 + getCandidateX(n)"
              :y="r * 100 + getCandidateY(n)"
              font-size="22"
              fill="var(--cand-color)"
              text-anchor="middle"
              dominant-baseline="central"
              pointer-events="none"
            >{{ n }}</text>
          </g>
        </template>
      </template>
    </g>

    <!-- Outer border moved earlier to render below selection borders -->
  </svg>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  board: { type: Array, required: true },
  given: { type: Array, default: () => Array.from({length:9}, () => Array(9).fill(false)) },
  candidates: { type: Array, default: () => [] },
  size: { type: Number, default: 450 },
  showCandidates: { type: Boolean, default: true },
  selected: { type: Object, default: null }, // 用户点击选中的格子
  focusCell: { type: Object, default: null }, // 程序预设的目标格（如唤余练习）
  focusHighlight: { type: String, default: 'all' }, // 'row' | 'col' | 'box' | 'all' | 'none'
  // 交互模式：'display' 纯展示无交互 | 'interactive' 可交互（hover + click） | 'practice' 练习模式（无hover，显示focusCell）
  mode: { type: String, default: 'interactive' },
});

const emit = defineEmits(['cell-click', 'cell-dblclick']);

const hoveredCell = ref(null);

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
  const set = new Set();

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

  return Array.from(set).map(key => {
    const [r, c] = key.split('-').map(Number);
    return { row: r, col: c };
  });
});

// Union of related cells for focusCell (same logic as selected), used in practice mode
const focusRelatedCells = computed(() => {
  if (!props.focusCell || props.focusHighlight === 'none') return [];
  const sr = focusRow.value;
  const sc = focusCol.value;
  const set = new Set();

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

  return Array.from(set).map(key => {
    const [r, c] = key.split('-').map(Number);
    return { row: r, col: c };
  });
});

// Computed properties for focus cell (practice mode)
const focusRow = computed(() => props.focusCell?.row ?? null);
const focusCol = computed(() => props.focusCell?.col ?? null);
const focusBoxX = computed(() => props.focusCell ? Math.floor(props.focusCell.col / 3) : 0);
const focusBoxY = computed(() => props.focusCell ? Math.floor(props.focusCell.row / 3) : 0);

// Helper functions
const isGiven = (r, c) => props.given[r]?.[c] || false;

const getCandidateX = (n) => {
  const positions = [17, 50, 83, 17, 50, 83, 17, 50, 83];
  return positions[n - 1];
};

const getCandidateY = (n) => {
  const positions = [20, 20, 20, 50, 50, 50, 80, 80, 80];
  return positions[n - 1];
};
</script>

<style scoped>
:root {
  --accent: #007acc;
  --highlight-bg: #007acc;
  --user-num-color: #0b5;
  --cand-color: #444;
}

/* ensure SVG scales smoothly in layout */
.sudoku-svg {
  display: block;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
</style>
