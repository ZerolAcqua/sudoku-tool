<template>
  <g class="markers-layer">
    <template v-for="(marker, idx) in markers" :key="'marker-' + idx">
      <!-- 圆圈标记 -->
      <circle
        v-if="marker.type === 'circle' && marker.cell"
        :cx="marker.cell.col * cellSize + cellSize / 2"
        :cy="marker.cell.row * cellSize + cellSize / 2"
        :r="(marker.size ?? 35)"
        fill="none"
        :stroke="marker.color"
        :stroke-width="marker.strokeWidth ?? 2"
        pointer-events="none"
      />

      <!-- 叉号标记 -->
      <g v-if="marker.type === 'cross' && marker.cell">
        <line
          :x1="marker.cell.col * cellSize + 15"
          :y1="marker.cell.row * cellSize + 15"
          :x2="marker.cell.col * cellSize + cellSize - 15"
          :y2="marker.cell.row * cellSize + cellSize - 15"
          :stroke="marker.color"
          :stroke-width="marker.strokeWidth ?? 3"
          stroke-linecap="round"
          pointer-events="none"
        />
        <line
          :x1="marker.cell.col * cellSize + cellSize - 15"
          :y1="marker.cell.row * cellSize + 15"
          :x2="marker.cell.col * cellSize + 15"
          :y2="marker.cell.row * cellSize + cellSize - 15"
          :stroke="marker.color"
          :stroke-width="marker.strokeWidth ?? 3"
          stroke-linecap="round"
          pointer-events="none"
        />
      </g>

      <!-- 点标记 -->
      <circle
        v-if="marker.type === 'dot' && marker.cell"
        :cx="marker.cell.col * cellSize + cellSize / 2"
        :cy="marker.cell.row * cellSize + cellSize / 2"
        :r="(marker.size ?? 8)"
        :fill="marker.color"
        pointer-events="none"
      />

      <!-- 星号标记 -->
      <text
        v-if="marker.type === 'star' && marker.cell"
        :x="marker.cell.col * cellSize + cellSize / 2"
        :y="marker.cell.row * cellSize + cellSize / 2"
        :fill="marker.color"
        :font-size="marker.size ?? 40"
        text-anchor="middle"
        dominant-baseline="central"
        pointer-events="none"
      >★</text>

      <!-- 摒除线（两个单元格之间的线段） -->
      <line
        v-if="marker.type === 'line' && marker.cells && marker.cells.length >= 2"
        :x1="marker.cells[0]!.col * cellSize + cellSize / 2"
        :y1="marker.cells[0]!.row * cellSize + cellSize / 2"
        :x2="marker.cells[1]!.col * cellSize + cellSize / 2"
        :y2="marker.cells[1]!.row * cellSize + cellSize / 2"
        :stroke="marker.color"
        :stroke-width="marker.strokeWidth ?? 2"
        stroke-linecap="round"
        pointer-events="none"
      />
    </template>
  </g>
</template>

<script setup lang="ts">
import type { CellMarker } from '@/types/sudoku';

defineProps<{
  markers: CellMarker[];
  cellSize: number;
}>();
</script>
