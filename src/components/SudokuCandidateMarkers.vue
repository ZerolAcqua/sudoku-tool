<template>
  <g class="candidate-markers-layer">
    <template v-for="(m, idx) in markers" :key="'cand-marker-' + idx">
      <circle
        :cx="center(m).x"
        :cy="center(m).y"
        :r="radius(m)"
        :fill="m.color"
        :opacity="m.opacity ?? 0.85"
        pointer-events="none"
      />
    </template>
  </g>
</template>

<script setup lang="ts">
import type { CandidateMarker } from '@/types/sudoku'
import { candidateCenter } from '@/utils/boardDrawing'

const props = defineProps<{
  markers: CandidateMarker[]
  cellSize: number
}>()

function center(m: CandidateMarker) {
  return candidateCenter(m.row, m.col, m.candidate, props.cellSize)
}

function radius(m: CandidateMarker) {
  // 默认半径约为 cellSize 的 0.13，使得能覆盖候选数字但不溢出格
  return m.size ?? Math.round(props.cellSize * 0.13)
}
</script>
