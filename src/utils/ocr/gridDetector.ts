/**
 * 数独网格检测与单元格提取
 *
 * 前提假设：输入图片为横平竖直的电子数独截图（无透视变形）
 */

declare const cv: any // OpenCV.js 全局对象（由 preprocessor 在首次调用时设置）

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

/** 检测结果 */
interface DetectionResult {
  grid: GridLocation;
  score: number;
  hLines: number[];
  vLines: number[];
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
// 参考网格修正
// =====================

/**
 * 用等分参考网格修正检测线位置，保证产出恰好 expectedCount 条线。
 *
 * 处理逻辑（对每个参考位置）：
 *   - 0 条检测线分配到该位置 → 用参考位置填补
 *   - 1 条检测线 → 直接用（精确吸附）
 *   - 2+ 条检测线 → 取中点（粗线双边缘合并）
 *
 * @param detectedLines 原始检测线位置（已排序）
 * @param expectedCount 期望的线条数（数独 = 10）
 * @returns 恰好 expectedCount 个修正后的线位置
 */
function refineLinePositions(
  detectedLines: number[],
  expectedCount: number,
): number[] {
  if (detectedLines.length === 0) return [];

  const sorted = [...detectedLines].sort((a, b) => a - b);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  // 生成等分参考网格
  const ref: number[] = [];
  const step = (last - first) / (expectedCount - 1);
  for (let i = 0; i < expectedCount; i++) {
    ref.push(first + i * step);
  }

  // 将每条检测线分配到最近的参考位置
  const assignments: number[][] = ref.map(() => []);
  const halfCell = step / 2;

  for (const line of sorted) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < ref.length; i++) {
      const dist = Math.abs(line - ref[i]!);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    // 仅在半个单元格间距内才分配，超出则视为噪声丢弃
    if (bestDist <= halfCell) {
      assignments[bestIdx]!.push(line);
    }
  }

  // 构建修正后的位置
  const refined: number[] = [];
  for (let i = 0; i < expectedCount; i++) {
    const assigned = assignments[i]!;
    if (assigned.length === 0) {
      refined.push(ref[i]!);
      console.log(
        `[refineLinePositions] ref[${i}]=${ref[i]!.toFixed(1)} ← 0条检测线，填补`,
      );
    } else if (assigned.length === 1) {
      refined.push(assigned[0]!);
      console.log(
        `[refineLinePositions] ref[${i}]=${ref[i]!.toFixed(1)} ← 1条: ${assigned[0]!.toFixed(1)}`,
      );
    } else {
      const mid = assigned.reduce((a, b) => a + b, 0) / assigned.length;
      refined.push(mid);
      console.log(
        `[refineLinePositions] ref[${i}]=${ref[i]!.toFixed(1)} ← ${assigned.length}条合并: ` +
        assigned.map(v => v.toFixed(1)).join(', ') + ` → 中点 ${mid.toFixed(1)}`,
      );
    }
  }

  return refined;
}

// =====================
// 评分
// =====================

/** 计算相邻间距数组 */
function getGaps(sortedLines: number[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < sortedLines.length; i++) {
    gaps.push(sortedLines[i]! - sortedLines[i - 1]!);
  }
  return gaps;
}

/**
 * 对检测结果评分
 * 评分维度：
 *   1. 线条数量偏离度（期望各 10 条）
 *   2. 间距方差（maxGap/minGap，超过 1.1 倍扣分）
 *   3. H/V 平均间距比（偏离 1.0 扣分）
 * 分数越低越好，0 分 = 完美
 */
function scoreLineSet(hLines: number[], vLines: number[]): number {
  // 维度1：数量偏离
  const hCountPenalty = Math.abs(hLines.length - 10) * 10;
  const vCountPenalty = Math.abs(vLines.length - 10) * 10;

  // 维度2：间距方差
  const sortedH = [...hLines].sort((a, b) => a - b);
  const sortedV = [...vLines].sort((a, b) => a - b);
  const hGaps = getGaps(sortedH);
  const vGaps = getGaps(sortedV);

  let hSpacingPenalty = 0;
  let vSpacingPenalty = 0;
  if (hGaps.length >= 2) {
    const hRatio = Math.max(...hGaps) / Math.min(...hGaps);
    hSpacingPenalty = Math.max(0, (hRatio - 1.1) * 100);
  } else if (hGaps.length === 0 && hLines.length >= 2) {
    hSpacingPenalty = 999; // 线条重合，严重惩罚
  }

  if (vGaps.length >= 2) {
    const vRatio = Math.max(...vGaps) / Math.min(...vGaps);
    vSpacingPenalty = Math.max(0, (vRatio - 1.1) * 100);
  } else if (vGaps.length === 0 && vLines.length >= 2) {
    vSpacingPenalty = 999;
  }

  // 维度3：H/V 基本间距比（正方形验证）
  let hvPenalty = 0;
  if (hGaps.length > 0 && vGaps.length > 0) {
    const hAvg = hGaps.reduce((a, b) => a + b, 0) / hGaps.length;
    const vAvg = vGaps.reduce((a, b) => a + b, 0) / vGaps.length;
    if (hAvg > 0 && vAvg > 0) {
      const hvRatio = Math.max(hAvg, vAvg) / Math.min(hAvg, vAvg);
      hvPenalty = Math.max(0, (hvRatio - 1.1) * 50);
    }
  }

  return hCountPenalty + vCountPenalty + hSpacingPenalty + vSpacingPenalty + hvPenalty;
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

  for (const threshold of [30, 100, 150, 220]) {
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
  let bestResult: DetectionResult | null = null;

  for (const version of binaryVersions) {
    // 已找到完美结果则提前退出
    if (bestResult && bestResult.score === 0) break;

    // Canny 边缘检测
    const edges = new cv.Mat();
    cv.Canny(version.mat, edges, 50, 150);

    // HoughLinesP 直线检测
    const lines = new cv.Mat();
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, 100, 20);
    edges.delete();

    // 提取并分类线段
    const hSegments: LineSegment[] = [];
    const vSegments: LineSegment[] = [];
    const minLen = imgSize * 0.3; // 最小线段长度：图像尺寸的 30%

    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.intAt(i, 0);
      const y1 = lines.intAt(i, 1);
      const x2 = lines.intAt(i, 2);
      const y2 = lines.intAt(i, 3);

      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length < minLen) continue;

      if (dx < 10) {
        // 垂直线段
        vSegments.push({
          start: Math.min(y1, y2),
          end: Math.max(y1, y2),
          position: (x1 + x2) / 2,
        });
      } else if (dy < 10) {
        // 水平线段
        hSegments.push({
          start: Math.min(x1, x2),
          end: Math.max(x1, x2),
          position: (y1 + y2) / 2,
        });
      }
    }
    lines.delete();

    if (hSegments.length < 2 || vSegments.length < 2) continue;

    // 断裂线段连接：将同一行/列上的分离线段合并
    let hPositions = joinBrokenSegments(hSegments, /* collinearTol */ 5, /* mergeGap */ 30, /* minLengthRatio */ 0.5, imgSize);
    let vPositions = joinBrokenSegments(vSegments, /* collinearTol */ 5, /* mergeGap */ 30, /* minLengthRatio */ 0.5, imgSize);

    // 粗线双边缘合并：将宽度产生的双线合并为中点
    hPositions = mergeNearbyLines(hPositions, 8);
    vPositions = mergeNearbyLines(vPositions, 8);

    // 最少线条数检查
    if (hPositions.length < 5 || vPositions.length < 5) continue;

    // 评分
    const score = scoreLineSet(hPositions, vPositions);

    console.log(
      `[detectGrid] ${version.name}: ` +
      `H=${hPositions.length} V=${vPositions.length} score=${score.toFixed(1)}`,
    );

    if (!bestResult || score < bestResult.score) {
      bestResult = {
        grid: buildRectFromLines(hPositions, vPositions),
        score,
        hLines: hPositions,
        vLines: vPositions,
      };
      console.log(`[detectGrid] ✓ new best: score=${score.toFixed(1)}`);
    }
  }

  // 清理
  for (const version of binaryVersions) {
    version.mat.delete();
  }
  gray.delete();
  src.delete();

  let finalGrid: GridLocation;

  if (bestResult) {
    console.log(
      '[detectGrid] refine 前 - H(' + bestResult.hLines.length + '条):',
      [...bestResult.hLines].sort((a, b) => a - b).map(v => v.toFixed(1)).join(', '),
    );
    console.log(
      '[detectGrid] refine 前 - V(' + bestResult.vLines.length + '条):',
      [...bestResult.vLines].sort((a, b) => a - b).map(v => v.toFixed(1)).join(', '),
    );

    const refinedH = refineLinePositions(bestResult.hLines, 10);
    const refinedV = refineLinePositions(bestResult.vLines, 10);

    console.log(
      '[detectGrid] refine 后 - H(' + refinedH.length + '条):',
      refinedH.map(v => v.toFixed(1)).join(', '),
    );
    console.log(
      '[detectGrid] refine 后 - V(' + refinedV.length + '条):',
      refinedV.map(v => v.toFixed(1)).join(', '),
    );

    finalGrid = {
      ...buildRectFromLines(refinedH, refinedV),
      hLines: refinedH,
      vLines: refinedV,
    };
    console.log('[detectGrid] 最终结果: score=' + bestResult.score.toFixed(1), finalGrid);
  } else {
    finalGrid = { x: 0, y: 0, width: 0, height: 0, hLines: [], vLines: [] };
    console.log('[detectGrid] 未能检测到网格');
  }

  return finalGrid;
}

// =====================
// 单元格提取
// =====================

/**
 * 把 canvas 边界的白色填充为黑色
 * 通过洪水填充从四角和四边中点出发，将连通的白色区域变黑
 * 用于消除单元格边缘的网格线白边残留
 */
function fillBorderWhiteWithBlack(cellCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = cellCanvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
  const data = imageData.data;
  const width = cellCanvas.width;
  const height = cellCanvas.height;

  // 判断像素是否为白色
  const isWhitePixel = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx = (y * width + x) * 4;
    return data[idx] === 255 && data[idx + 1] === 255 && data[idx + 2] === 255;
  };

  // 洪水填充标记边界白色区域
  const borderWhite = new Uint8Array(width * height);
  const floodFill = (startX: number, startY: number) => {
    const queue: Array<[number, number]> = [[startX, startY]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (!isWhitePixel(x, y)) continue;

      visited.add(key);
      borderWhite[y * width + x] = 1;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx !== 0 || dy !== 0) {
            queue.push([x + dx, y + dy]);
          }
        }
      }
    }
  };

  // 从四角 + 四边中点开始洪水填充
  const startPoints: Array<[number, number]> = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
  ];
  for (const [x, y] of startPoints) {
    floodFill(x, y);
  }

  // 将边界白色填充为黑色
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (borderWhite[y * width + x] === 1) {
        const idx = (y * width + x) * 4;
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
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
  console.log(
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
 * 统计黑色像素占比，低于阈值则判定为空
 */
export function isCellEmpty(canvas: HTMLCanvasElement, emptyThreshold = 0.05): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let blackPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! < 128) {
      blackPixels++;
    }
  }

  const ratio = blackPixels / (data.length / 4);
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
  console.log(
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
