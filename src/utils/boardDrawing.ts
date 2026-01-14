// 几何与绘图辅助工具，屏蔽 SVG 细节
import type { Chain, ChainNode, CellPosition } from '@/types/sudoku';

export interface Point {
  x: number;
  y: number;
}

// 单元格中心坐标（基于 cellSize）
export function cellCenter(row: number, col: number, cellSize: number): Point {
  return { x: col * cellSize + cellSize / 2, y: row * cellSize + cellSize / 2 };
}

// 候选数中心坐标：格内 3x3 布局，序号 1-9
export function candidateCenter(row: number, col: number, n: number, cellSize: number): Point {
  // 守护：非法候选号则返回格中心
  if (n < 1 || n > 9) return cellCenter(row, col, cellSize);
  const cx = col * cellSize;
  const cy = row * cellSize;
  const idx = n - 1;
  const subRow = Math.floor(idx / 3); // 0,1,2
  const subCol = idx % 3; // 0,1,2
  const colFrac = subCol === 0 ? 0.17 : subCol === 1 ? 0.5 : 0.83;
  const rowFrac = subRow === 0 ? 0.22 : subRow === 1 ? 0.5 : 0.78;
  return { x: cx + colFrac * cellSize, y: cy + rowFrac * cellSize };
}

// 把链节点转换为绘制坐标
export function anchorPoint(node: ChainNode, cellSize: number): Point {
  const base =
    node.candidate != null
      ? candidateCenter(node.row, node.col, node.candidate!, cellSize)
      : cellCenter(node.row, node.col, cellSize);
  if (node.offset) {
    return { x: base.x + node.offset.x, y: base.y + node.offset.y };
  }
  return base;
}

// 根据风格返回 dash
export function strokeDashArray(style?: Chain['style']): string | undefined {
  switch (style) {
    case 'dashed':
      return '10,5';
    case 'dotted':
      return '2,3';
    default:
      return undefined;
  }
}

// 直线/平滑折线的 path 构建
export function buildPolylinePath(points: Point[], curve: Chain['curve'] = 'straight'): string {
  if (!points.length) return '';
  const start = points[0] as Point;
  const rest = points.slice(1);
  const parts: string[] = [`M ${start.x} ${start.y}`];
  if (curve === 'straight') {
    for (const p of rest) parts.push(`L ${p.x} ${p.y}`);
  } else {
    // 简单平滑：使用中点作为二次贝塞尔控制点
    for (let i = 0; i < rest.length; i++) {
      const p = rest[i] as Point;
      const prev = i === 0 ? start : (rest[i - 1] as Point);
      const cx2 = (prev.x + p.x) / 2;
      const cy2 = (prev.y + p.y) / 2;
      parts.push(`Q ${cx2} ${cy2} ${p.x} ${p.y}`);
    }
  }
  return parts.join(' ');
}

// 末端箭头所需的最后两点
export function tailSegment(points: Point[]): { a: Point; b: Point } | null {
  if (points.length < 2) return null;
  const a = points[points.length - 2] as Point;
  const b = points[points.length - 1] as Point;
  return { a, b };
}

// 两个点之间的直线 path
export function linePath(p1: Point, p2: Point): string {
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
}

// 两个点之间的圆弧 path（曲率由 arcHeight 控制——弦到弧的距离）
// 返回缩短版本（预留 offset 空间给候选数），以及实际终点和切线方向
export function arcPath(
  p1: Point,
  p2: Point,
  arcHeight: number = 30,
  offsetEnd: number = 12,
  offsetStart: number = 12
): {
  path: string;
  endPoint: Point;
  direction: Point; // 末端切线方向（单位向量）
} {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const chordLen = Math.sqrt(dx * dx + dy * dy);

  if (chordLen === 0) {
    return { path: linePath(p1, p1), endPoint: p1, direction: { x: 1, y: 0 } };
  }

  // 首先计算完整弧线的控制点（基于原始端点）
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  const normalCW = { x: dy / chordLen, y: -dx / chordLen };
  const normalCCW = { x: -dy / chordLen, y: dx / chordLen };
  const normal = arcHeight >= 0 ? normalCW : normalCCW;
  const h = Math.abs(arcHeight);
  const ctrl = { x: mid.x + normal.x * 2 * h, y: mid.y + normal.y * 2 * h };

  // 计算终点处的切线方向（二次贝塞尔在 t=1 处的切线是 P2 - 控制点）
  const tx_end = p2.x - ctrl.x;
  const ty_end = p2.y - ctrl.y;
  const tlen_end = Math.sqrt(tx_end * tx_end + ty_end * ty_end);
  const tangent_end =
    tlen_end > 0 ? { x: tx_end / tlen_end, y: ty_end / tlen_end } : { x: 1, y: 0 };

  // 沿切线方向倒回 offsetEnd 得到新的终点
  const p2_short = {
    x: p2.x - tangent_end.x * offsetEnd,
    y: p2.y - tangent_end.y * offsetEnd,
  };

  // 计算起点处的切线方向（二次贝塞尔在 t=0 处的切线是 控制点 - P1）
  const tx_start = ctrl.x - p1.x;
  const ty_start = ctrl.y - p1.y;
  const tlen_start = Math.sqrt(tx_start * tx_start + ty_start * ty_start);
  const tangent_start =
    tlen_start > 0 ? { x: tx_start / tlen_start, y: ty_start / tlen_start } : { x: 1, y: 0 };

  // 沿切线方向前进 offsetStart 得到新的起点
  const p1_short = {
    x: p1.x + tangent_start.x * offsetStart,
    y: p1.y + tangent_start.y * offsetStart,
  };

  // 使用原控制点和新的端点生成路径（保持弧线形状）
  const path = `M ${p1_short.x} ${p1_short.y} Q ${ctrl.x} ${ctrl.y} ${p2_short.x} ${p2_short.y}`;

  return {
    path,
    endPoint: p2_short,
    direction: tangent_end,
  };
}

// 计算 V 形箭头的两条短线（从点 p 沿 direction 反向）
export function arrowHeadLines(
  from: Point,
  to: Point,
  size: number = 8
): { line1: [Point, Point]; line2: [Point, Point] } {
  // 方向向量
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { line1: [to, to], line2: [to, to] };

  // 单位方向向量
  const ux = dx / len;
  const uy = dy / len;

  // 垂直向量
  const px = -uy;
  const py = ux;

  // 箭头顶点在终点
  const tip = to;
  // 两条短线从顶点向后
  const base1 = { x: to.x - ux * size - px * size * 0.5, y: to.y - uy * size - py * size * 0.5 };
  const base2 = { x: to.x - ux * size + px * size * 0.5, y: to.y - uy * size + py * size * 0.5 };

  return {
    line1: [tip, base1],
    line2: [tip, base2],
  };
}
