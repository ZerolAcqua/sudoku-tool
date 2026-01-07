// 几何与绘图辅助工具，屏蔽 SVG 细节
import type { Chain, ChainNode, CellPosition } from '@/types/sudoku'

export interface Point { x: number; y: number }

// 单元格中心坐标（基于 cellSize）
export function cellCenter(row: number, col: number, cellSize: number): Point {
  return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 }
}

// 候选数中心坐标：格内 3x3 布局，序号 1-9
export function candidateCenter(row: number, col: number, n: number, cellSize: number): Point {
  // 守护：非法候选号则返回格中心
  if (n < 1 || n > 9) return cellCenter(row, col, cellSize)
  const cx = col * cellSize
  const cy = row * cellSize
  const idx = n - 1
  const subRow = Math.floor(idx / 3) // 0,1,2
  const subCol = idx % 3 // 0,1,2
  const colFrac = subCol === 0 ? 0.17 : subCol === 1 ? 0.5 : 0.83
  const rowFrac = subRow === 0 ? 0.22 : subRow === 1 ? 0.5 : 0.78
  return { x: cx + colFrac * cellSize, y: cy + rowFrac * cellSize }
}

// 把链节点转换为绘制坐标
export function anchorPoint(node: ChainNode, cellSize: number): Point {
  const base = node.candidate != null
    ? candidateCenter(node.row, node.col, node.candidate!, cellSize)
    : cellCenter(node.row, node.col, cellSize)
  if (node.offset) {
    return { x: base.x + node.offset.x, y: base.y + node.offset.y }
  }
  return base
}

// 根据风格返回 dash
export function strokeDashArray(style?: Chain['style']): string | undefined {
  switch (style) {
    case 'dashed': return '10,5'
    case 'dotted': return '2,3'
    default: return undefined
  }
}

// 直线/平滑折线的 path 构建
export function buildPolylinePath(points: Point[], curve: Chain['curve'] = 'straight'): string {
  if (!points.length) return ''
  const start = points[0] as Point
  const rest = points.slice(1)
  const parts: string[] = [`M ${start.x} ${start.y}`]
  if (curve === 'straight') {
    for (const p of rest) parts.push(`L ${p.x} ${p.y}`)
  } else {
    // 简单平滑：使用中点作为二次贝塞尔控制点
    for (let i = 0; i < rest.length; i++) {
      const p = rest[i] as Point
      const prev = (i === 0 ? start : (rest[i - 1] as Point))
      const cx2 = (prev.x + p.x) / 2
      const cy2 = (prev.y + p.y) / 2
      parts.push(`Q ${cx2} ${cy2} ${p.x} ${p.y}`)
    }
  }
  return parts.join(' ')
}

// 末端箭头所需的最后两点
export function tailSegment(points: Point[]): { a: Point; b: Point } | null {
  if (points.length < 2) return null
  const a = points[points.length - 2] as Point
  const b = points[points.length - 1] as Point
  return { a, b }
}

// 两个点之间的直线 path
export function linePath(p1: Point, p2: Point): string {
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
}

// 两个点之间的圆弧 path（曲率由 arcHeight 控制——弦到弧的距离）
// 返回缩短版本（预留 offset 空间给候选数），以及实际终点和切线方向
export function arcPath(p1: Point, p2: Point, arcHeight: number = 30, offsetEnd: number = 12, offsetStart: number = 12): {
  path: string
  endPoint: Point
  direction: Point // 末端切线方向（单位向量）
} {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const chordLen = Math.sqrt(dx * dx + dy * dy)

  if (chordLen === 0) {
    return { path: linePath(p1, p1), endPoint: p1, direction: { x: 1, y: 0 } }
  }

  // 缩短距离：从 p2 向 p1 方向倒回 offsetEnd 像素
  const ratioEnd = offsetEnd / chordLen
  const p2_short = {
    x: p2.x - dx * ratioEnd,
    y: p2.y - dy * ratioEnd,
  }

  // 计算弧线（从 p1 到 p2_short）
  const dx_short = p2_short.x - p1.x
  const dy_short = p2_short.y - p1.y
  const shortChordLen = Math.sqrt(dx_short * dx_short + dy_short * dy_short)

  if (shortChordLen === 0) {
    return { path: linePath(p1, p1), endPoint: p1, direction: { x: 1, y: 0 } }
  }

  // 先用未缩短的起点 p1 和缩短后的终点 p2_short 估算控制点，得到起始切线方向
  const mid1 = { x: (p1.x + p2_short.x) / 2, y: (p1.y + p2_short.y) / 2 }
  const normalCW1 = { x: dy_short / shortChordLen, y: -dx_short / shortChordLen }
  const normalCCW1 = { x: -dy_short / shortChordLen, y: dx_short / shortChordLen }
  const normal1 = arcHeight >= 0 ? normalCW1 : normalCCW1
  const h = Math.abs(arcHeight)
  const ctrl1 = { x: mid1.x + normal1.x * 2 * h, y: mid1.y + normal1.y * 2 * h }

  // 起点沿初始切线方向缩短 offsetStart
  const sx = ctrl1.x - p1.x
  const sy = ctrl1.y - p1.y
  const slen = Math.sqrt(sx * sx + sy * sy)
  const ratioStart = slen > 0 ? offsetStart / slen : 0
  const p1_short = {
    x: p1.x + sx * ratioStart,
    y: p1.y + sy * ratioStart,
  }

  // 基于缩短后的两端点重新计算控制点与路径
  const dx2 = p2_short.x - p1_short.x
  const dy2 = p2_short.y - p1_short.y
  const chordLen2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
  if (chordLen2 === 0) {
    return { path: linePath(p1_short, p1_short), endPoint: p1_short, direction: { x: 1, y: 0 } }
  }
  const mid2 = { x: (p1_short.x + p2_short.x) / 2, y: (p1_short.y + p2_short.y) / 2 }
  const normalCW2 = { x: dy2 / chordLen2, y: -dx2 / chordLen2 }
  const normalCCW2 = { x: -dy2 / chordLen2, y: dx2 / chordLen2 }
  const normal2 = arcHeight >= 0 ? normalCW2 : normalCCW2
  const ctrl2 = { x: mid2.x + normal2.x * 2 * h, y: mid2.y + normal2.y * 2 * h }

  // 路径：二次贝塞尔曲线
  const path = `M ${p1_short.x} ${p1_short.y} Q ${ctrl2.x} ${ctrl2.y} ${p2_short.x} ${p2_short.y}`

  // 末端切线方向：二次贝塞尔在终点的切线方向与 (P2 - 控制点) 同向
  const tx = p2_short.x - ctrl2.x
  const ty = p2_short.y - ctrl2.y
  const tlen = Math.sqrt(tx * tx + ty * ty)
  const tangent = tlen > 0 ? { x: tx / tlen, y: ty / tlen } : { x: 1, y: 0 }

  return {
    path,
    endPoint: p2_short,
    direction: tangent,
  }
}

// 计算 V 形箭头的两条短线（从点 p 沿 direction 反向）
export function arrowHeadLines(from: Point, to: Point, size: number = 8): { line1: [Point, Point]; line2: [Point, Point] } {
  // 方向向量
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { line1: [to, to], line2: [to, to] }
  
  // 单位方向向量
  const ux = dx / len
  const uy = dy / len
  
  // 垂直向量
  const px = -uy
  const py = ux
  
  // 箭头顶点在终点
  const tip = to
  // 两条短线从顶点向后
  const base1 = { x: to.x - ux * size - px * size * 0.5, y: to.y - uy * size - py * size * 0.5 }
  const base2 = { x: to.x - ux * size + px * size * 0.5, y: to.y - uy * size + py * size * 0.5 }
  
  return {
    line1: [tip, base1],
    line2: [tip, base2],
  }
}


