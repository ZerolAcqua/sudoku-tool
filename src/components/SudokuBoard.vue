<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 900 900"
    role="grid"
    aria-label="Sudoku board"
    @mousedown.prevent
    class="sudoku-svg"
  >
    <!-- Background -->
    <rect x="0" y="0" width="900" height="900" fill="white" />

    <!-- Cell highlight backgrounds -->
    <g v-if="props.selected">
      <rect :x="0" :y="selectedRow * 100" width="900" height="100" fill="var(--highlight-bg)" opacity="0.08" />
      <rect :x="selectedCol * 100" :y="0" width="100" height="900" fill="var(--highlight-bg)" opacity="0.08" />
      <rect :x="boxX * 300" :y="boxY * 300" width="300" height="300" fill="var(--highlight-bg)" opacity="0.06" />
    </g>

    <!-- Click areas -->
    <g v-for="(row, r) in props.board" :key="'click-row-' + r">
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
        style="cursor: pointer"
      />
    </g>

    <!-- Grid lines -->
    <!-- Thick box lines -->
    <g stroke="black" stroke-width="6" stroke-linecap="square">
      <line v-for="i in 4" :key="'vbox' + i" :x1="(i-1) * 300" y1="0" :x2="(i-1) * 300" y2="900" />
      <line v-for="i in 4" :key="'hbox' + i" x1="0" :y1="(i-1) * 300" x2="900" :y2="(i-1) * 300" />
    </g>
    <!-- Thin cell lines -->
    <g stroke="black" stroke-opacity="0.6" stroke-width="1" stroke-linecap="square">
      <line v-for="i in 10" :key="'vthin' + i" :x1="(i-1) * 100" y1="0" :x2="(i-1) * 100" y2="900" />
      <line v-for="i in 10" :key="'hthin' + i" x1="0" :y1="(i-1) * 100" x2="900" :y2="(i-1) * 100" />
    </g>

    <!-- Selected cell border -->
    <rect
      v-if="props.selected"
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
              pointer-events="none"
            >{{ n }}</text>
          </g>
        </template>
      </template>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  board: { type: Array, required: true },
  given: { type: Array, default: () => Array.from({length:9}, () => Array(9).fill(false)) },
  candidates: { type: Array, default: () => [] },
  size: { type: Number, default: 450 },
  showCandidates: { type: Boolean, default: true },
  selected: { type: Object, default: null },
});

const emit = defineEmits(['cell-click', 'cell-dblclick']);

// Computed properties for selected cell
const selectedRow = computed(() => props.selected?.row ?? null);
const selectedCol = computed(() => props.selected?.col ?? null);
const boxX = computed(() => props.selected ? Math.floor(props.selected.col / 3) : 0);
const boxY = computed(() => props.selected ? Math.floor(props.selected.row / 3) : 0);

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
