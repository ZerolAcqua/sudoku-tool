/**
 * 数独网格检测与单元格提取
 *
 * 前提假设：输入图片为横平竖直的电子数独截图（无透视变形）
 */

import { logger } from '@/utils/logger';
import type { CV } from '@techstark/opencv-js';

declare const cv: CV // OpenCV.js 全局对象（由 preprocessor 在首次调用时设置）

/** 最近一次 detectGrid 的逐版本检测结果（调试用） */
let lastVersionResults: Array<{ name: string; hLines: number[]; vLines: number[] }> = [];

interface GridLocation {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 水平线 y 坐标（已排序，相对原图）；空数组表示无精确数据 */
  hLines: number[];
  /** 垂直线 x 坐标（已排序，相对原图）；空数组表示无精确数据 */
  vLines: number[];
}

/** HoughLinesP 检测到的原始线段 */
interface LineSegment {
  start: number;   // 沿主轴方向的起点（水平线为 min x，垂直线为 min y）
  end: number;     // 沿主轴方向的终点（水平线为 max x，垂直线为 max y）
  position: number; // 垂直主轴方向的位置（水平线为 y，垂直线为 x）
}

// =====================
// 线段处理
// =====================

/**
 * 连接断裂的共线线段
 * 将同一直线上因数字遮挡等原因分离的多个线段连接为一条完整直线
 *
 * @param segments 原始线段（已按 H/V 分类）
 * @param collinearTol 同线判定容差（px），位置差在此范围内的视为同一行/列
 * @param mergeGap 合并容差（px），两段端点间距小于此值时连接
 * @param minLengthRatio 连接后线段的最小长度比例（相对图像尺寸）
 * @param imageSize 图像最小边长
 * @returns 合并后的直线位置数组（水平线返回 y，垂直线返回 x）
 */
function joinBrokenSegments(
  segments: LineSegment[],
  collinearTol: number,
  mergeGap: number,
  minLengthRatio: number,
  imageSize: number,
): number[] {
  if (segments.length === 0) return [];

  // 1. 按 position 分组（同一直线上的线段）
  const sorted = [...segments].sort((a, b) => a.position - b.position);
  const groups: LineSegment[][] = [];
  let currentGroup: LineSegment[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i]!.position - currentGroup[0]!.position) <= collinearTol) {
      currentGroup.push(sorted[i]!);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]!];
    }
  }
  groups.push(currentGroup);

  // 2. 每组内按起点排序，连接有重叠或间距小于 mergeGap 的线段
  const minLength = imageSize * minLengthRatio;
  const result: number[] = [];

  for (const group of groups) {
    group.sort((a, b) => a.start - b.start);

    const merged: LineSegment[] = [{ ...group[0]! }];
    for (let i = 1; i < group.length; i++) {
      const last = merged[merged.length - 1]!;
      const seg = group[i]!;
      if (seg.start <= last.end + mergeGap) {
        // 连接：扩展终点
        last.end = Math.max(last.end, seg.end);
      } else {
        merged.push({ ...seg });
      }
    }

    // 取组内所有线段的平均位置
    const avgPosition = group.reduce((s, g) => s + g.position, 0) / group.length;

    // 只保留足够长的合并线段（贯穿盘面的长直线）
    const longestMerged = merged.reduce((best, m) =>
      (m.end - m.start) > (best.end - best.start) ? m : best
    );
    if (longestMerged.end - longestMerged.start >= minLength) {
      result.push(avgPosition);
    }
  }

  return result;
}

/**
 * 合并位置相近的直线（处理粗线双边缘）
 * 将间距 ≤ threshold 的相邻直线合并为中点
 * 支持链式合并：如果三条线间距都在阈值内，合并为一条
 */
function mergeNearbyLines(positions: number[], threshold: number): number[] {
  if (positions.length <= 1) return positions;

  const sorted = [...positions].sort((a, b) => a - b);
  const result: number[] = [];
  let groupStart = 0;

  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i]! - sorted[i - 1]! > threshold) {
      // 闭合当前组
      const group = sorted.slice(groupStart, i);
      result.push(group.reduce((a, b) => a + b, 0) / group.length);
      groupStart = i;
    }
  }

  return result;
}

// =====================
// 线条数量修正
// =====================

/**
 * 将检测线数量修正为恰好 expectedCount 条。
 *
 * 合并：优先合并间距 < cellSize*0.4 的线（重复检测），仍不够再合并最近邻。
 * 插入：用总跨度/格数估算预期格宽，每个间隙插 round(gap/cellSize)-1 条，均匀分布。
 */
function refineLinePositions(
  detectedLines: number[],
  expectedCount: number,
): number[] {
  const lines = [...detectedLines].sort((a, b) => a - b);
  if (lines.length === 0) return [];
  if (lines.length === expectedCount) return lines;

  const first = lines[0]!;
  const last = lines[lines.length - 1]!;
  const totalSpan = last - first;
  const cellSize = totalSpan / (expectedCount - 1);

  logger.debug(
    `[refineLinePositions] 输入: ${lines.length}条 → 目标: ${expectedCount}条, ` +
    `跨度=${totalSpan.toFixed(0)}, 预期格宽=${cellSize.toFixed(1)}, ` +
    `位置: ${lines.map(v => v.toFixed(1)).join(', ')}`,
  );

  // --- 多了：合并重复检测 ---
  while (lines.length > expectedCount) {
    // 优先合并明显是重复的线对（间距远小于格宽）
    let bestIdx = 0;
    let bestGap = Infinity;
    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i]! - lines[i - 1]!;
      // 重复线权重：间距越小越好，但格宽 40% 以下的优先
      const weight = gap < cellSize * 0.4 ? gap / 1000 : gap;
      if (weight < bestGap) { bestGap = weight; bestIdx = i; }
    }
    const a = lines[bestIdx - 1]!;
    const b = lines[bestIdx]!;
    const mid = (a + b) / 2;
    logger.debug(
      `[refineLinePositions] 合并: ${a.toFixed(1)}+${b.toFixed(1)} → ${mid.toFixed(1)} (间距=${(b-a).toFixed(1)})`,
    );
    lines.splice(bestIdx - 1, 2, mid);
  }

  // --- 少了：按预期格宽在间隙中均匀插入 ---
  while (lines.length < expectedCount) {
    let bestIdx = 0;
    let bestNeed = 0;
    let bestGap = 0;

    for (let i = 1; i < lines.length; i++) {
      const gap = lines[i]! - lines[i - 1]!;
      const need = Math.round(gap / cellSize) - 1;
      if (need > bestNeed) {
        bestNeed = need;
        bestGap = gap;
        bestIdx = i;
      }
    }

    if (bestNeed <= 0) {
      // 所有间隙都只需要 0-1 条线，在最大间隙插 1 条兜底
      for (let i = 1; i < lines.length; i++) {
        const gap = lines[i]! - lines[i - 1]!;
        if (gap > bestGap) { bestGap = gap; bestIdx = i; }
      }
      bestNeed = 1;
    }

    const toInsert = Math.min(bestNeed, expectedCount - lines.length);
    const a = lines[bestIdx - 1]!;
    const b = lines[bestIdx]!;

    logger.debug(
      `[refineLinePositions] 间隙 ${a.toFixed(1)}–${b.toFixed(1)} (${bestGap.toFixed(1)}px, ` +
      `${(bestGap/cellSize).toFixed(2)}格), 插入${toInsert}条`,
    );

    for (let k = 1; k <= toInsert; k++) {
      lines.splice(bestIdx - 1 + k, 0, a + (k * bestGap) / (toInsert + 1));
    }
  }

  logger.debug(
    `[refineLinePositions] 输出: ${lines.length}条, ` +
    `位置: ${lines.map(v => v.toFixed(1)).join(', ')}`,
  );

  return lines;
}

// =====================
// 构建网格矩形
// =====================

/**
 * 从检测到的线条构建网格矩形（强制正方形，居中裁剪）
 */
function buildRectFromLines(horizontalLines: number[], verticalLines: number[]): GridLocation {
  const sortedH = [...horizontalLines].sort((a, b) => a - b);
  const sortedV = [...verticalLines].sort((a, b) => a - b);

  const top = sortedH[0]!;
  const bottom = sortedH[sortedH.length - 1]!;
  const left = sortedV[0]!;
  const right = sortedV[sortedV.length - 1]!;

  const rawWidth = right - left;
  const rawHeight = bottom - top;
  const sideLength = Math.min(rawWidth, rawHeight);

  // 正方形居中
  const offsetX = (rawWidth - sideLength) / 2;
  const offsetY = (rawHeight - sideLength) / 2;

  return {
    x: Math.round(left + offsetX),
    y: Math.round(top + offsetY),
    width: Math.round(sideLength),
    height: Math.round(sideLength),
    hLines: [],
    vLines: [],
  };
}

// =====================
// 主入口
// =====================

/**
 * 检测数独网格的最外层边框
 * 使用多阈值二值化 + Hough 直线检测
 * 对不同二值化版本分别检测，选择评分最优的结果
 */
export function detectGrid(canvas: HTMLCanvasElement): GridLocation {
  const src = cv.imread(canvas);

  // 转换为单通道灰度图
  const gray = new cv.Mat();
  if (src.channels() === 4) {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  } else if (src.channels() === 3) {
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
  } else {
    src.copyTo(gray);
  }

  // 生成多个二值化版本（不同阈值，以适应不同颜色/粗细的线条）
  const binaryVersions: Array<{ name: string; mat: any }> = [];

  for (const threshold of [15, 30, 100, 150, 220]) {
    const binNormal = new cv.Mat();
    const binInv = new cv.Mat();
    cv.threshold(gray, binNormal, threshold, 255, cv.THRESH_BINARY);
    cv.threshold(gray, binInv, threshold, 255, cv.THRESH_BINARY_INV);
    binaryVersions.push(
      { name: `thresh_${threshold}_normal`, mat: binNormal },
      { name: `thresh_${threshold}_inv`, mat: binInv },
    );
  }

  // Otsu 自适应阈值
  const binOtsuNormal = new cv.Mat();
  const binOtsuInv = new cv.Mat();
  cv.threshold(gray, binOtsuNormal, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  cv.threshold(gray, binOtsuInv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
  binaryVersions.push(
    { name: 'otsu_normal', mat: binOtsuNormal },
    { name: 'otsu_inv', mat: binOtsuInv },
  );

  const imgSize = Math.min(canvas.width, canvas.height);
  const allHPositions: number[] = [];
  const allVPositions: number[] = [];
  lastVersionResults = [];

  for (const version of binaryVersions) {

    // Canny 边缘检测
    const edges = new cv.Mat();
    cv.Canny(version.mat, edges, 50, 150);

    const hSegments: LineSegment[] = [];
    const vSegments: LineSegment[] = [];
    const minLen = imgSize * 0.3;

    // 从 HoughLinesP 结果中提取线段
    // OpenCV 5.0 的 HoughLinesP 返回 rows=1、cols=N 的 CV_32SC4 Mat，
    // 数据存于 data32S 平坦 Int32Array 中，按 [x1,y1,x2,y2, ...] 分组。
    const extractSegments = (linesMat: any) => {
      const data = linesMat.data32S as Int32Array;
      for (let i = 0; i < data.length; i += 4) {
        const x1 = data[i]!;
        const y1 = data[i + 1]!;
        const x2 = data[i + 2]!;
        const y2 = data[i + 3]!;
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < minLen) continue;
        if (dx < 10) {
          vSegments.push({ start: Math.min(y1, y2), end: Math.max(y1, y2), position: (x1 + x2) / 2 });
        } else if (dy < 10) {
          hSegments.push({ start: Math.min(x1, x2), end: Math.max(x1, x2), position: (y1 + y2) / 2 });
        }
      }
    };

    // Pass 1: 标准参数
    const lines1 = new cv.Mat();
    cv.HoughLinesP(edges, lines1, 1, Math.PI / 180, 100, 100, 20);
    extractSegments(lines1);
    lines1.delete();

    // Pass 2: 宽松参数，检测低对比度线条
    const lines2 = new cv.Mat();
    cv.HoughLinesP(edges, lines2, 1, Math.PI / 180, 50, Math.round(imgSize * 0.2), 30);
    extractSegments(lines2);
    lines2.delete();

    edges.delete();

    if (hSegments.length < 2 || vSegments.length < 2) continue;

    // 断裂线段连接
    const hPositions = joinBrokenSegments(hSegments, 5, 30, 0.5, imgSize);
    const vPositions = joinBrokenSegments(vSegments, 5, 30, 0.5, imgSize);

    if (hPositions.length === 0 || vPositions.length === 0) continue;

    logger.debug(
      `[detectGrid] ${version.name}: H=${hPositions.length} V=${vPositions.length}`,
    );

    lastVersionResults.push({ name: version.name, hLines: hPositions, vLines: vPositions });
    allHPositions.push(...hPositions);
    allVPositions.push(...vPositions);
  }

  // 清理
  for (const version of binaryVersions) {
    version.mat.delete();
  }
  gray.delete();
  src.delete();

  logger.debug(
    '[detectGrid] 全量汇总 — H: ' + allHPositions.length + '条, V: ' + allVPositions.length + '条',
  );

  let finalGrid: GridLocation;

  if (allHPositions.length >= 2 && allVPositions.length >= 2) {
    // 全量合并：跨阈值版本的同一物理线位置可能有 10-15px 偏差
    // 用自适应阈值（图像尺寸的 2%），确保合且不误合相邻网格线
    const mergeThreshold = Math.max(10, Math.round(imgSize * 0.02));
    logger.debug(`[detectGrid] 合并阈值: ${mergeThreshold}px (imgSize=${imgSize})`);
    const mergedH = mergeNearbyLines(allHPositions, mergeThreshold);
    const mergedV = mergeNearbyLines(allVPositions, mergeThreshold);

    logger.debug(
      '[detectGrid] 合并后 — H: ' + mergedH.length + '条, V: ' + mergedV.length + '条',
    );

    // 参考网格修正 → 精确 10 条
    logger.debug('[detectGrid] === refine H ===');
    const refinedH = refineLinePositions(mergedH, 10);
    logger.debug('[detectGrid] === refine V ===');
    const refinedV = refineLinePositions(mergedV, 10);

    logger.debug(
      '[detectGrid] refine 后 H(10条):',
      refinedH.map(v => v.toFixed(1)).join(', '),
    );
    logger.debug(
      '[detectGrid] refine 后 V(10条):',
      refinedV.map(v => v.toFixed(1)).join(', '),
    );

    finalGrid = {
      ...buildRectFromLines(refinedH, refinedV),
      hLines: refinedH,
      vLines: refinedV,
    };
    logger.debug('[detectGrid] 最终结果:', finalGrid);
  } else {
    finalGrid = { x: 0, y: 0, width: 0, height: 0, hLines: [], vLines: [] };
    logger.debug('[detectGrid] 未能检测到足够线条');
  }

  return finalGrid;
}

// =====================
// 单元格提取
// =====================

/**
 * 把 canvas 四边的白边/网格线残留强制涂黑
 * 直接覆写固定宽度的边框区域，比洪水填充更彻底：
 * 无论白色像素是否与边界连通，都能被清除
 */
function fillBorderWhiteWithBlack(cellCanvas: HTMLCanvasElement, margin = 3): HTMLCanvasElement {
  const ctx = cellCanvas.getContext('2d')!;
  const w = cellCanvas.width;
  const h = cellCanvas.height;

  ctx.fillStyle = '#000000';
  // 上边
  ctx.fillRect(0, 0, w, margin);
  // 下边
  ctx.fillRect(0, h - margin, w, margin);
  // 左边
  ctx.fillRect(0, 0, margin, h);
  // 右边
  ctx.fillRect(w - margin, 0, margin, h);

  return cellCanvas;
}

/**
 * 从图像中提取 9×9 单元格
 * @param edgeMargin 从单元格边缘内缩的像素数，用于去掉网格线
 */
export function extractCells(
  canvas: HTMLCanvasElement,
  grid: GridLocation,
  edgeMargin: number = 2,
): HTMLCanvasElement[][] {
  // 精确模式：使用检测到的每条线位置定位单元格
  const useExact = grid.hLines.length === 10 && grid.vLines.length === 10;
  logger.debug(
    `[extractCells] 模式: ${useExact ? '精确线吸附' : '等分回退'}` +
    ` (H=${grid.hLines.length} V=${grid.vLines.length})`,
  );

  const cells: HTMLCanvasElement[][] = [];

  for (let row = 0; row < 9; row++) {
    cells[row] = [];
    for (let col = 0; col < 9; col++) {
      let sourceX: number, sourceY: number;
      let cellW: number, cellH: number;

      if (useExact) {
        const left = grid.vLines[col]!;
        const right = grid.vLines[col + 1]!;
        const top = grid.hLines[row]!;
        const bottom = grid.hLines[row + 1]!;
        sourceX = left + edgeMargin;
        sourceY = top + edgeMargin;
        cellW = right - left - 2 * edgeMargin;
        cellH = bottom - top - 2 * edgeMargin;
      } else {
        // 回退：等分模式
        const cellWidth = Math.round(grid.width / 9);
        const cellHeight = Math.round(grid.height / 9);
        sourceX = grid.x + col * cellWidth + edgeMargin;
        sourceY = grid.y + row * cellHeight + edgeMargin;
        cellW = cellWidth - 2 * edgeMargin;
        cellH = cellHeight - 2 * edgeMargin;
      }

      const contentWidth = Math.round(Math.max(1, cellW));
      const contentHeight = Math.round(Math.max(1, cellH));

      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = contentWidth;
      cellCanvas.height = contentHeight;
      const cellCtx = cellCanvas.getContext('2d', { willReadFrequently: true })!;

      cellCtx.drawImage(
        canvas,
        sourceX, sourceY, contentWidth, contentHeight,
        0, 0, contentWidth, contentHeight,
      );

      const processed = fillBorderWhiteWithBlack(cellCanvas);
      cells[row]![col] = processed;
    }
  }

  return cells;
}

/**
 * 检测单元格是否为空
 *
 * 单元格来自二值化图（数字为白色、背景为黑色）。角落上标注的候选数是小数字，
 * 直接统计会误判为已填入数字。先做形态学开运算（先腐蚀再膨胀）：细小的候选数
 * 笔画会被腐蚀掉，大数字的主笔画则保留。之后再统计白色（数字）像素占比，低于
 * 阈值判定为空。
 *
 * @param morphKernelSize 开运算结构元素边长，默认按单元格尺寸自适应；候选数笔画
 *   较粗时可调大
 */
export function isCellEmpty(
  canvas: HTMLCanvasElement,
  emptyThreshold = 0.05,
  morphKernelSize?: number,
): boolean {
  const src = cv.imread(canvas);

  const gray = new cv.Mat();
  if (src.channels() === 4) {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  } else if (src.channels() === 3) {
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
  } else {
    src.copyTo(gray);
  }

  // 二值化：数字（白色）保留为前景
  const bin = new cv.Mat();
  cv.threshold(gray, bin, 128, 255, cv.THRESH_BINARY);

  // 形态学开运算：先腐蚀后膨胀，去除细小的候选数笔画
  const cellSize = Math.min(canvas.width, canvas.height);
  const kernelSize = morphKernelSize ?? Math.max(3, Math.round(cellSize * 0.05));
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize));
  const opened = new cv.Mat();
  cv.morphologyEx(bin, opened, cv.MORPH_OPEN, kernel);

  const inkPixels = cv.countNonZero(opened);
  const ratio = inkPixels / (canvas.width * canvas.height);

  src.delete();
  gray.delete();
  bin.delete();
  opened.delete();
  kernel.delete();

  return ratio < emptyThreshold;
}

// =====================
// 可视化（调试用）
// =====================

/**
 * 在原图上绘制识别到的网格线
 */
export function drawGridLines(
  originalCanvas: HTMLCanvasElement,
  grid: GridLocation,
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = originalCanvas.width;
  result.height = originalCanvas.height;
  const ctx = result.getContext('2d')!;

  ctx.drawImage(originalCanvas, 0, 0);

  const useExact = grid.hLines.length === 10 && grid.vLines.length === 10;
  logger.debug(
    `[drawGridLines] 模式: ${useExact ? '精确线吸附' : '等分回退'}` +
    ` (H=${grid.hLines.length} V=${grid.vLines.length})`,
  );

  // 获取各线条位置（精确模式下直接使用检测位置）
  const getHLine = (i: number) => useExact ? grid.hLines[i]! : grid.y + i * (grid.height / 9);
  const getVLine = (i: number) => useExact ? grid.vLines[i]! : grid.x + i * (grid.width / 9);

  const top = getHLine(0);
  const bottom = getHLine(9);
  const left = getVLine(0);
  const right = getVLine(9);
  const gridW = right - left;
  const gridH = bottom - top;

  // 外框
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(left, top, gridW, gridH);

  // 宫线（粗线，每 3 格一条：索引 0, 3, 6, 9，其中 0 和 9 已被外框覆盖）
  ctx.lineWidth = 2;
  for (let i = 3; i <= 6; i += 3) {
    const x = getVLine(i);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    const y = getHLine(i);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  // 普通格线（细线，非宫线位置）
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
  for (let i = 1; i < 9; i++) {
    if (i % 3 === 0) continue; // 宫线已画

    const x = getVLine(i);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    const y = getHLine(i);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  return result;
}

/**
 * 可视化 9×9 单元格（用于调试）
 */
export function visualizeCells(
  cells: HTMLCanvasElement[][],
  cellDisplaySize: number = 40,
  gap: number = 0,
): HTMLCanvasElement {
  const canvasSize = 9 * cellDisplaySize + 8 * gap;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * (cellDisplaySize + gap);
      const y = row * (cellDisplaySize + gap);
      ctx.drawImage(cells[row]![col]!, x, y, cellDisplaySize, cellDisplaySize);
    }
  }

  return canvas;
}

// =====================
// 调试：全量检测线可视化
// =====================

/** 获取最近一次 detectGrid 的逐版本检测结果 */
export function getLastVersionResults(): Array<{ name: string; hLines: number[]; vLines: number[] }> {
  return lastVersionResults;
}

/** 调色板：给不同版本分配不同颜色 */
const PALETTE = [
  '#ff4444', '#44ff44', '#4488ff', '#ffff44',
  '#44ffff', '#ff44ff', '#ff8844', '#ffffff',
  '#ff8888', '#88ff88', '#8888ff', '#88ffff',
];

/**
 * 在纯黑背景上绘制所有阈值版本检测到的直线
 * 同一版本的水平线和垂直线使用相同颜色
 * @param imageWidth 原图宽度
 * @param imageHeight 原图高度
 */
export function drawAllDetectedLines(
  imageWidth: number,
  imageHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth;
  canvas.height = imageHeight;
  const ctx = canvas.getContext('2d')!;

  // 黑色背景
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, imageWidth, imageHeight);

  for (let vi = 0; vi < lastVersionResults.length; vi++) {
    const vr = lastVersionResults[vi]!;
    const color = PALETTE[vi % PALETTE.length]!;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    // 水平线
    for (const y of vr.hLines) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(imageWidth, y);
      ctx.stroke();
    }

    // 垂直线
    for (const x of vr.vLines) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, imageHeight);
      ctx.stroke();
    }
  }

  return canvas;
}
