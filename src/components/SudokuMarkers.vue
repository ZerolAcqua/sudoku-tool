<template>
  <g class="markers-layer">
    <template v-for="(marker, idx) in markers" :key="'marker-' + idx">
      <!-- 圆圈标记 -->
      <circle
        v-if="marker.type === 'circle' && marker.cell"
        :cx="center(marker).x"
        :cy="center(marker).y"
        :r="(marker.size ?? 35)"
        fill="none"
        :stroke="marker.color"
        :stroke-width="marker.strokeWidth ?? 2"
        pointer-events="none"
      />

      <!-- 叉号标记 -->
      <g v-if="marker.type === 'cross' && marker.cell">
        <line
          :x1="center(marker).x - (cellSize/2 - 15)"
          :y1="center(marker).y - (cellSize/2 - 15)"
          :x2="center(marker).x + (cellSize/2 - 15)"
          :y2="center(marker).y + (cellSize/2 - 15)"
          :stroke="marker.color"
          :stroke-width="marker.strokeWidth ?? 3"
          stroke-linecap="round"
          pointer-events="none"
        />
        <line
          :x1="center(marker).x + (cellSize/2 - 15)"
          :y1="center(marker).y - (cellSize/2 - 15)"
          :x2="center(marker).x - (cellSize/2 - 15)"
          :y2="center(marker).y + (cellSize/2 - 15)"
          :stroke="marker.color"
          :stroke-width="marker.strokeWidth ?? 3"
          stroke-linecap="round"
          pointer-events="none"
        />
      </g>

      <!-- 点标记 -->
      <circle
        v-if="marker.type === 'dot' && marker.cell"
        :cx="center(marker).x"
        :cy="center(marker).y"
        :r="(marker.size ?? 8)"
        :fill="marker.color"
        pointer-events="none"
      />

      <!-- 星号标记 -->
      <text
        v-if="marker.type === 'star' && marker.cell"
        :x="center(marker).x"
        :y="center(marker).y"
        :fill="marker.color"
        :font-size="marker.size ?? 40"
        text-anchor="middle"
        dominant-baseline="central"
        pointer-events="none"
      >★</text>

      <!-- 摒除线（两个单元格之间的线段） -->
      <line
        v-if="marker.type === 'line' && marker.cells && marker.cells.length >= 2"
        :x1="getLineStart(marker).x"
        :y1="getLineStart(marker).y"
        :x2="posCenter(marker.cells[1]!).x"
        :y2="posCenter(marker.cells[1]!).y"
        :stroke="marker.color"
        :stroke-width="marker.strokeWidth ?? 2"
        stroke-linecap="round"
        pointer-events="none"
      />
    </template>
  </g>
</template>

<script setup lang="ts">
import type { CellMarker } from '@/types/sudoku'
import { cellCenter as cellCenterUtil } from '@/utils/boardDrawing'

const props = defineProps<{
  markers: CellMarker[]
  cellSize: number
}>()

// 统一获取标记中心（后续可拓展候选级标记）
function center(marker: CellMarker) {
  if (!marker.cell) return { x: 0, y: 0 }
  return cellCenterUtil(marker.cell.row, marker.cell.col, props.cellSize)
}

function posCenter(pos: { row: number; col: number }) {
  return cellCenterUtil(pos.row, pos.col, props.cellSize)
}

// 计算摒除线的起点（从圆圈边缘开始，而不是圆心）
function getLineStart(marker: CellMarker) {
  if (!marker.cells || marker.cells.length < 2) {
    return { x: 0, y: 0 }
  }
  
  const start = posCenter(marker.cells[0]!)
  const end = posCenter(marker.cells[1]!)
  
  // 查找起点单元格是否有对应的圆圈标记
  const circleMarker = props.markers.find(m => 
    m.type === 'circle' && 
    m.cell && 
    m.cell.row === marker.cells![0]!.row && 
    m.cell.col === marker.cells![0]!.col
  )
  
  // 如果没有圆圈标记，从中心开始
  if (!circleMarker) {
    return start
  }
  
  // 计算从起点到终点的方向向量
  const dx = end.x - start.x
  const dy = end.y - start.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  if (distance === 0) {
    return start
  }
  
  // 归一化方向向量
  const dirX = dx / distance
  const dirY = dy / distance
  
  // 圆圈半径
  const radius = circleMarker.size ?? 35
  
  // 从圆心沿方向偏移半径距离
  return {
    x: start.x + dirX * radius,
    y: start.y + dirY * radius
  }
}
</script>
