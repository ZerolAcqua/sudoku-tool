<template>
  <g class="highlight-layer">
    <template v-for="(highlight, idx) in highlights" :key="'highlight-' + idx">
      <rect
        v-for="(cell, cellIdx) in highlight.cells"
        :key="'highlight-' + idx + '-' + cellIdx"
        :x="cell.col * cellSize"
        :y="cell.row * cellSize"
        :width="cellSize"
        :height="cellSize"
        :fill="highlight.color"
        :opacity="highlight.opacity ?? 0.3"
        pointer-events="none"
      />
    </template>
  </g>
</template>

<script setup lang="ts">
import type { CellHighlight } from '@/types/sudoku';

defineProps<{
  highlights: CellHighlight[];
  cellSize: number;
}>();
</script>
