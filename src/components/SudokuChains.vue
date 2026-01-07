<template>
  <g class="chains-layer">
    <template v-for="(chain, idx) in chains" :key="'chain-' + idx">
      <!-- 绘制链条路径 -->
      <path
        :d="buildChainPath(chain)"
        fill="none"
        :stroke="chain.color"
        :stroke-width="chain.strokeWidth ?? 3"
        :stroke-dasharray="getStrokeDashArray(chain.style)"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />

      <!-- 绘制箭头 -->
      <g v-if="chain.arrow && chain.cells.length >= 2">
        <defs>
          <marker
            :id="'arrowhead-' + idx"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path
              d="M0,0 L0,6 L9,3 z"
              :fill="chain.color"
            />
          </marker>
        </defs>
        
        <!-- 箭头线段（从倒数第二个点到最后一个点） -->
        <line
          v-if="chain.cells.length >= 2 && chain.cells[chain.cells.length - 2] && chain.cells[chain.cells.length - 1]"
          :x1="chain.cells[chain.cells.length - 2]!.col * cellSize + cellSize / 2"
          :y1="chain.cells[chain.cells.length - 2]!.row * cellSize + cellSize / 2"
          :x2="chain.cells[chain.cells.length - 1]!.col * cellSize + cellSize / 2"
          :y2="chain.cells[chain.cells.length - 1]!.row * cellSize + cellSize / 2"
          :stroke="chain.color"
          :stroke-width="chain.strokeWidth ?? 3"
          :stroke-dasharray="getStrokeDashArray(chain.style)"
          stroke-linecap="round"
          :marker-end="'url(#arrowhead-' + idx + ')'"
          pointer-events="none"
        />
      </g>
    </template>
  </g>
</template>

<script setup lang="ts">
import type { Chain } from '@/types/sudoku';

const props = defineProps<{
  chains: Chain[];
  cellSize: number;
}>();

// 构建链条路径
const buildChainPath = (chain: Chain): string => {
  if (chain.cells.length < 2) return '';
  
  const pathParts: string[] = [];
  
  // 起点
  const start = chain.cells[0];
  if (!start) return '';
  pathParts.push(`M ${start.col * props.cellSize + props.cellSize / 2} ${start.row * props.cellSize + props.cellSize / 2}`);
  
  // 中间点和终点（如果有箭头，路径到倒数第二个点）
  const endIndex = chain.arrow ? chain.cells.length - 1 : chain.cells.length;
  for (let i = 1; i < endIndex; i++) {
    const cell = chain.cells[i];
    if (!cell) continue;
    pathParts.push(`L ${cell.col * props.cellSize + props.cellSize / 2} ${cell.row * props.cellSize + props.cellSize / 2}`);
  }
  
  return pathParts.join(' ');
};

// 获取虚线样式
const getStrokeDashArray = (style?: string): string => {
  switch (style) {
    case 'dashed':
      return '10,5';
    case 'dotted':
      return '2,3';
    default:
      return '';
  }
};
</script>
