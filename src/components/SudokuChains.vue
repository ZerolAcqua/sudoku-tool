<template>
  <g class="chains-layer">
    <!-- 每条链拆成多个线段，每段连接两个相邻节点，末端都有V形箭头 -->
    <template v-for="(chainSegment, idx) in renderSegments" :key="'seg-' + idx">
      <!-- 主线段 -->
      <path
        :d="chainSegment.path"
        fill="none"
        :stroke="chainSegment.color"
        :stroke-width="chainSegment.strokeWidth"
        :stroke-dasharray="chainSegment.dash"
        stroke-linecap="round"
        stroke-linejoin="round"
        pointer-events="none"
      />
      
      <!-- V形箭头（两根短线） -->
      <template v-if="chainSegment.hasArrow">
        <line
          :x1="chainSegment.arrowTip.x"
          :y1="chainSegment.arrowTip.y"
          :x2="chainSegment.arrowBase1.x"
          :y2="chainSegment.arrowBase1.y"
          :stroke="chainSegment.color"
          :stroke-width="chainSegment.strokeWidth"
          stroke-linecap="round"
          pointer-events="none"
        />
        <line
          :x1="chainSegment.arrowTip.x"
          :y1="chainSegment.arrowTip.y"
          :x2="chainSegment.arrowBase2.x"
          :y2="chainSegment.arrowBase2.y"
          :stroke="chainSegment.color"
          :stroke-width="chainSegment.strokeWidth"
          stroke-linecap="round"
          pointer-events="none"
        />
      </template>
    </template>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Chain } from '@/types/sudoku'
import { anchorPoint, linePath, arcPath, strokeDashArray, arrowHeadLines } from '@/utils/boardDrawing'

const props = defineProps<{ chains: Chain[]; cellSize: number }>()

// 展开所有链的线段，每段连接相邻两个节点
const renderSegments = computed(() => {
  const segments: Array<{
    path: string
    color: string
    strokeWidth: number
    dash: string
    hasArrow: boolean
    arrowTip: { x: number; y: number }
    arrowBase1: { x: number; y: number }
    arrowBase2: { x: number; y: number }
  }> = []

  props.chains.forEach((chain) => {
    if (chain.cells.length < 2) return

    const points = chain.cells.map(n => anchorPoint(n, props.cellSize))
    const dash = strokeDashArray(chain.style) || ''
    const curve = chain.curve ?? 'straight'

    // 为相邻节点对生成线段
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!
      const p2 = points[i + 1]!
      const node1 = chain.cells[i]!
      const node2 = chain.cells[i + 1]!
      
      // 检查是否在同一个单元格的同一个候选数上，如果是则跳过这条线段
      const sameCell = node1.row === node2.row && node1.col === node2.col
      const sameCand = node1.candidate !== undefined && 
                       node2.candidate !== undefined && 
                       node1.candidate === node2.candidate
      if (sameCell && sameCand) {
        continue // 忽略同一单元格同一候选数之间的线段
      }
      
      const hasArrow = chain.arrow === true // 每条线都有箭头

      // 检查是否在同一单元格内的不同候选数（需要减小预留空间）
      const sameCellDiffCandidate = sameCell && 
                                    node1.candidate !== undefined && 
                                    node2.candidate !== undefined

      // 选择直线或圆弧
      let path: string
        let endPoint: { x: number; y: number } = p2
        let direction: { x: number; y: number } = { x: 1, y: 0 }

      if (curve === 'straight') {
        // 为直线两端预留空间（同格内候选数使用更小的预留）
        const pad = sameCellDiffCandidate ? 2 : props.cellSize * 0.15
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > 0) {
          const ux = dx / len
          const uy = dy / len
          const p1s = { x: p1.x + ux * pad, y: p1.y + uy * pad }
          const p2s = { x: p2.x - ux * pad, y: p2.y - uy * pad }
          path = linePath(p1s, p2s)
          endPoint = p2s
          direction = { x: ux, y: uy }
        } else {
          path = linePath(p1, p2)
          endPoint = p2
          direction = { x: 1, y: 0 }
        }
      } else {
        // smooth: 用圆弧，两端都预留空间（同格内候选数使用更小的预留和弧度）
        if (sameCellDiffCandidate) {
          const arcInfo = arcPath(p1, p2, props.cellSize * 0.1, 2, 2)
          path = arcInfo.path
          endPoint = arcInfo.endPoint
          direction = arcInfo.direction
        } else {
          const arcInfo = arcPath(p1, p2, props.cellSize * 0.35, props.cellSize * 0.15, props.cellSize * 0.15)
          path = arcInfo.path
          endPoint = arcInfo.endPoint
          direction = arcInfo.direction
        }
      }

      // V形箭头
      let arrowTip = { x: 0, y: 0 }
      let arrowBase1 = { x: 0, y: 0 }
      let arrowBase2 = { x: 0, y: 0 }
      if (hasArrow) {
        // 用末端点和切线方向构造虚拟的起点，然后计算V形
        const arrowSize = 6
        const virtualFrom = {
          x: endPoint.x - direction.x * arrowSize,
          y: endPoint.y - direction.y * arrowSize,
        }
        const arrows = arrowHeadLines(virtualFrom, endPoint, arrowSize)
        arrowTip = endPoint
        arrowBase1 = arrows.line1[1]
        arrowBase2 = arrows.line2[1]
      }

      segments.push({
        path,
        color: chain.color,
        strokeWidth: chain.strokeWidth ?? 3,
        dash,
        hasArrow,
        arrowTip,
        arrowBase1,
        arrowBase2,
      })
    }
  })

  return segments
})
</script>


