/**
 * 数独网格检测与单元格提取
 */

declare const cv: any // OpenCV.js 全局对象（由 useOCR 在首次调用时设置）

interface GridLocation {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 直线检测结果，包含网格位置和误差值
 */
interface DetectionResult {
  grid: GridLocation;
  error: number; // 直线间距的误差值之和
  threshold: string; // 使用的二值化方式
  hLines: number[]; // 水平线坐标
  vLines: number[]; // 垂直线坐标
  hGap: number; // 水平线基本间距
  vGap: number; // 垂直线基本间距
}

/**
 * 计算直线间距的误差值（所有间距与基准间距的偏离之和）
 * 误差越小说明检测质量越好
 */
function calculateLineSpacingError(lines: number[], baseGap: number): number {
  if (lines.length < 2) return Infinity;

  let totalError = 0;
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i]! - lines[i - 1]!;
    // 计算该间距与基准间距的偏离度
    const error = Math.abs(gap - baseGap);
    totalError += error;
  }

  return totalError / (lines.length - 1); // 平均误差
}

/**
 * 计算整体检测误差（水平和垂直方向的误差之和）
 */
function calculateTotalError(
  hLines: number[],
  vLines: number[],
  hGap: number,
  vGap: number
): number {
  const hError = calculateLineSpacingError(hLines, hGap);
  const vError = calculateLineSpacingError(vLines, vGap);
  // 还要考虑宽高比的偏离
  const sizeRatio = Math.max(hGap * 9, vGap * 9) / Math.min(hGap * 9, vGap * 9);
  const ratioError = Math.abs(sizeRatio - 1.0) * 100;

  return hError + vError + ratioError;
}

/**
 * 检测数独网格的最外层边框
 * 在内部处理原始图像（灰度化、二值化、网格检测）
 * 尝试轮廓检测和直线检测，互相佐证
 * 智能误差比较：记录最佳检测结果，继续检测直到误差足够小或尝试完所有版本
 */
export function detectGrid(canvas: HTMLCanvasElement): GridLocation {
  // console.log('[detectGrid] 开始检测网格，图像尺寸:', canvas.width, 'x', canvas.height)
  // visualizeCanvasInConsole(canvas, '🖼️ 原始图像')

  const src = cv.imread(canvas);
  // console.log('[detectGrid] 读取图像成功，Mat 尺寸:', src.rows, 'x', src.cols, '通道数:', src.channels())

  // 转换为单通道灰度图
  const gray = new cv.Mat();
  if (src.channels() === 4) {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  } else if (src.channels() === 3) {
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
  } else {
    src.copyTo(gray);
  }
  // console.log('[detectGrid] 转换为灰度图，通道数:', gray.channels())
  // visualizeMatInConsole(gray, '🔍 灰度图')

  // 生成多个二值化版本（不同阈值，以适应淡色线条）
  // 阈值从低到高：30, 100, 150, 220, OTSU
  const binaryVersions: Array<{ name: string; mat: any }> = [];

  // 固定阈值版本（较低的阈值可以保留淡色线条）
  for (const threshold of [30, 100, 150, 220]) {
    const bin_normal = new cv.Mat();
    const bin_inv = new cv.Mat();
    cv.threshold(gray, bin_normal, threshold, 255, cv.THRESH_BINARY);
    cv.threshold(gray, bin_inv, threshold, 255, cv.THRESH_BINARY_INV);

    binaryVersions.push(
      { name: `二值化_阈值${threshold}_正常`, mat: bin_normal },
      { name: `二值化_阈值${threshold}_反转`, mat: bin_inv }
    );
  }

  // Otsu自适应阈值版本（最后尝试）
  const binaryOtsuNormal = new cv.Mat();
  const binaryOtsuInv = new cv.Mat();
  cv.threshold(gray, binaryOtsuNormal, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  cv.threshold(gray, binaryOtsuInv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);

  binaryVersions.push(
    { name: '二值化_Otsu_正常', mat: binaryOtsuNormal },
    { name: '二值化_Otsu_反转', mat: binaryOtsuInv }
  );

  // 可视化前两个版本作为示例
  // if (binaryVersions.length >= 2) {
  //   visualizeMatInConsole(binaryVersions[0]!.mat, '⚫ ' + binaryVersions[0]!.name)
  //   visualizeMatInConsole(binaryVersions[binaryVersions.length - 1]!.mat, '⚪ ' + binaryVersions[binaryVersions.length - 1]!.name)
  // }

  // 记录最佳检测结果
  let bestResult: DetectionResult | null = null;
  const errorThreshold = 5.0; // 误差足够小时停止检测

  // 尝试轮廓检测（所有二值化版本）
  // console.log('[detectGrid] ====== 尝试轮廓检测 ======')
  for (const version of binaryVersions) {
    // console.log(`[detectGrid] 轮廓检测（${version.name}）`)
    const rect = detectGridByContours(version.mat, canvas);
    if (rect.width > 0 && rect.height > 0) {
      // console.log(`[detectGrid] 轮廓检测成功（${version.name}）:`, rect)
      // 轮廓方法没有直线信息，无法计算误差，记录为 0
      const result: DetectionResult = {
        grid: rect,
        error: 0,
        threshold: version.name,
        hLines: [],
        vLines: [],
        hGap: 0,
        vGap: 0,
      };
      if (!bestResult || result.error < bestResult.error) {
        bestResult = result;
        // console.log('[detectGrid] ✓ 更新最佳结果（轮廓法，误差=0）')
      }
    }
  }

  // 尝试直线检测（所有二值化版本）
  // console.log('[detectGrid] ====== 尝试直线检测 ======')
  for (let idx = 0; idx < binaryVersions.length; idx++) {
    const version = binaryVersions[idx]!;
    // console.log(`[detectGrid] 直线检测 [${idx + 1}/${binaryVersions.length}]（${version.name}）`)

    // 如果已有最佳结果且误差很小，可以跳过后续检测
    if (bestResult && bestResult.error < errorThreshold) {
      // console.log('[detectGrid] 误差已足够小（' + bestResult.error.toFixed(2) + ' < ' + errorThreshold + '），停止继续检测')
      break;
    }

    // 使用上一次的间距作为约束（如果有的话）
    const result = bestResult
      ? detectGridByHoughLinesWithConstraint(version.mat, canvas, bestResult.hGap, bestResult.vGap)
      : detectGridByHoughLinesWithConstraint(version.mat, canvas, 0, 0);

    if (result) {
      // console.log(`[detectGrid] 直线检测成功（${version.name}）- 误差:`, result.error.toFixed(2))

      // 比较并更新最佳结果
      if (!bestResult || result.error < bestResult.error) {
        bestResult = result;
        // console.log('[detectGrid] ✓ 更新最佳结果 - 误差:', result.error.toFixed(2))
      } else {
        // console.log('[detectGrid] ✗ 误差更大，保留前一个结果 - 前:', bestResult.error.toFixed(2), '现:', result.error.toFixed(2))
      }
    }
  }

  // 选择最终结果
  let finalRect = bestResult?.grid || { x: 0, y: 0, width: 0, height: 0 };
  // if (bestResult) {
  //   console.log('[detectGrid] 最终选择 (' + bestResult.threshold + ') - 误差:', bestResult.error.toFixed(2), '- 边框:', finalRect)
  // }

  // 清理所有二值化版本
  for (const version of binaryVersions) {
    version.mat.delete();
  }
  gray.delete();
  src.delete();

  return finalRect;
}

/**
 * 通过轮廓检测找到网格边框
 */
function detectGridByContours(binary: any, canvas: HTMLCanvasElement): GridLocation {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  // console.log('[detectGridByContours] 找到轮廓数量:', contours.size())

  let maxArea = 0;
  let bestRect = { x: 0, y: 0, width: 0, height: 0 };

  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const rect = cv.boundingRect(contour);
    const area = rect.width * rect.height;
    const aspectRatio = rect.width / rect.height;
    const isNotFullImage = rect.width < canvas.width * 0.98 && rect.height < canvas.height * 0.98;
    const isSquarish = aspectRatio > 0.8 && aspectRatio < 1.2;

    if (
      area > canvas.width * canvas.height * 0.2 &&
      isNotFullImage &&
      isSquarish &&
      area > maxArea
    ) {
      maxArea = area;
      bestRect = rect;
    }
  }

  contours.delete();
  hierarchy.delete();

  return bestRect;
}

/**
 * 通过 Hough 直线检测找到网格边框（带间距约束版本）
 * 利用数独的特点：平行垂直的直线，均匀间距（单元格大小的整数倍）
 * 如果提供了上一次的间距约束，先尝试用该约束检测
 */
function detectGridByHoughLinesWithConstraint(
  binary: any,
  canvas: HTMLCanvasElement,
  lastHGap: number = 0,
  lastVGap: number = 0
): DetectionResult | null {
  // 使用 Canny 边缘检测（在二值化图像上）
  const edges = new cv.Mat();
  cv.Canny(binary, edges, 50, 150);

  // Hough 直线检测
  const lines = new cv.Mat();
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, 100, 20);

  // console.log('[detectGridByHoughLines] 原始检测直线数:', lines.rows)

  // 分离水平和垂直线，并按坐标聚类
  const horizontalLines: number[] = []; // y 坐标
  const verticalLines: number[] = []; // x 坐标

  for (let i = 0; i < lines.rows; i++) {
    const x1 = lines.intAt(i, 0);
    const y1 = lines.intAt(i, 1);
    const x2 = lines.intAt(i, 2);
    const y2 = lines.intAt(i, 3);

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const length = Math.sqrt(dx * dx + dy * dy);

    // 足够长的直线才考虑（> 30% 图像尺寸）
    const minLen = Math.min(canvas.width, canvas.height) * 0.3;
    if (length < minLen) continue;

    if (dx < 20) {
      // 垂直线：保存 x 坐标（取中点）
      verticalLines.push((x1 + x2) / 2);
    } else if (dy < 20) {
      // 水平线：保存 y 坐标（取中点）
      horizontalLines.push((y1 + y2) / 2);
    }
  }

  // console.log('[detectGridByHoughLines] 过滤后 - 水平线:', horizontalLines.length, '垂直线:', verticalLines.length)
  if (horizontalLines.length >= 2) {
    const sortedH = [...horizontalLines].sort((a, b) => a - b);
    console.log(
      '[detectGridByHoughLines] 水平线位置 (排序):',
      sortedH
        .map((x) => x.toFixed(1))
        .slice(0, 3)
        .join(', '),
      ' ... ',
      sortedH
        .map((x) => x.toFixed(1))
        .slice(-3)
        .join(', ')
    );
  }
  if (verticalLines.length >= 2) {
    const sortedV = [...verticalLines].sort((a, b) => a - b);
    console.log(
      '[detectGridByHoughLines] 垂直线位置 (排序):',
      sortedV
        .map((x) => x.toFixed(1))
        .slice(0, 3)
        .join(', '),
      ' ... ',
      sortedV
        .map((x) => x.toFixed(1))
        .slice(-3)
        .join(', ')
    );
  }

  if (horizontalLines.length < 2 || verticalLines.length < 2) {
    edges.delete();
    lines.delete();
    return null;
  }

  // 聚类直线（相距很近的直线视为同一条，移除噪声）
  const clusteredH = clusterLines(horizontalLines);
  const clusteredV = clusterLines(verticalLines);

  console.log(
    '[detectGridByHoughLines] 聚类后 - 水平线:',
    clusteredH.length,
    '垂直线:',
    clusteredV.length
  );

  let result: DetectionResult | null = null;

  // 策略 1: 如果有上一次的间距约束，先尝试用那个间距
  if (lastHGap > 0 && lastVGap > 0) {
    console.log(
      '[detectGridByHoughLines] 尝试使用上一次约束间距:',
      lastHGap.toFixed(1),
      'x',
      lastVGap.toFixed(1)
    );

    // 尝试用上一次的间距约束当前检测
    const constrainedH = findOptimalLineSubsetWithGapConstraint(clusteredH, lastHGap);
    const constrainedV = findOptimalLineSubsetWithGapConstraint(clusteredV, lastVGap);

    if (constrainedH && constrainedV) {
      const hGap = lastHGap;
      const vGap = lastVGap;
      const error = calculateTotalError(constrainedH, constrainedV, hGap, vGap);

      console.log('[detectGridByHoughLines] ✓ 用约束间距成功，误差:', error.toFixed(2));
      result = {
        grid: buildRectFromLinesSquare(constrainedH, constrainedV),
        error,
        threshold: '',
        hLines: constrainedH,
        vLines: constrainedV,
        hGap,
        vGap,
      };
    } else {
      console.log('[detectGridByHoughLines] ✗ 约束间距失败，转为自适应检测');
    }
  }

  // 策略 2: 如果策略 1 失败或没有约束，进行自适应检测
  if (!result) {
    console.log('[detectGridByHoughLines] 尝试自适应检测间距');

    // 验证均匀间距并获取基本间距
    const hResult = validateLineSpacingWithGap(clusteredH);
    const vResult = validateLineSpacingWithGap(clusteredV);

    console.log(
      '[detectGridByHoughLines] 水平线检验:',
      hResult ? '✓' : '✗',
      hResult ? '间距=' + hResult.toFixed(1) : ''
    );
    console.log(
      '[detectGridByHoughLines] 垂直线检验:',
      vResult ? '✓' : '✗',
      vResult ? '间距=' + vResult.toFixed(1) : ''
    );

    // 同时验证两个方向都成功且间距相近（数独是正方形）
    if (hResult && vResult) {
      const gapRatio = hResult / vResult;
      const tolerance = 0.15; // ±15% 容差
      const isSquare = Math.abs(gapRatio - 1.0) < tolerance;

      console.log(
        '[detectGridByHoughLines] 间距比例 (H/V):',
        gapRatio.toFixed(3),
        '正方形检验:',
        isSquare ? '✓' : '✗'
      );

      if (isSquare) {
        // 完美情况：两个方向都通过验证，且间距相等
        const error = calculateTotalError(clusteredH, clusteredV, hResult, vResult);
        result = {
          grid: buildRectFromLinesSquare(clusteredH, clusteredV),
          error,
          threshold: '',
          hLines: clusteredH,
          vLines: clusteredV,
          hGap: hResult,
          vGap: vResult,
        };
      } else {
        console.log('[detectGridByHoughLines] 间距比例异常，不符合正方形网格特性');
      }
    } else if (hResult && !vResult) {
      // 水平线通过，垂直线失败，尝试优化垂直线
      console.log('[detectGridByHoughLines] 垂直直线异常，尝试消除干扰');
      const optimizedV = findOptimalLineSubsetWithGapConstraint(clusteredV, hResult);
      if (optimizedV) {
        console.log('[detectGridByHoughLines] 优化后垂直线条通过验证');
        const error = calculateTotalError(clusteredH, optimizedV, hResult, hResult);
        result = {
          grid: buildRectFromLinesSquare(clusteredH, optimizedV),
          error,
          threshold: '',
          hLines: clusteredH,
          vLines: optimizedV,
          hGap: hResult,
          vGap: hResult,
        };
      }
    } else if (!hResult && vResult) {
      // 垂直线通过，水平线失败，尝试优化水平线
      console.log('[detectGridByHoughLines] 水平直线异常，尝试消除干扰');
      const optimizedH = findOptimalLineSubsetWithGapConstraint(clusteredH, vResult);
      if (optimizedH) {
        console.log('[detectGridByHoughLines] 优化后水平线条通过验证');
        const error = calculateTotalError(optimizedH, clusteredV, vResult, vResult);
        result = {
          grid: buildRectFromLinesSquare(optimizedH, clusteredV),
          error,
          threshold: '',
          hLines: optimizedH,
          vLines: clusteredV,
          hGap: vResult,
          vGap: vResult,
        };
      }
    } else {
      // 两个方向都失败了
      console.log('[detectGridByHoughLines] 直线检测失败：两个方向都不符合数独特性');
    }
  }

  edges.delete();
  lines.delete();

  return result;
}

/**
 * 找到直线的最优子集合（去除干扰直线）
 */
function findOptimalLineSubset(lines: number[]): number[] | null {
  const expectedCount = 10;

  // 尝试不同的子集合策略
  const strategies = [
    // 从开头移除 1, 2, 3 条
    { start: 1, end: lines.length },
    { start: 2, end: lines.length },
    { start: 3, end: lines.length },
    // 从结尾移除 1, 2, 3 条
    { start: 0, end: lines.length - 1 },
    { start: 0, end: lines.length - 2 },
    { start: 0, end: lines.length - 3 },
    // 从两端各移除
    { start: 1, end: lines.length - 1 },
    { start: 1, end: lines.length - 2 },
    { start: 2, end: lines.length - 1 },
  ];

  for (const strategy of strategies) {
    const subset = lines.slice(strategy.start, strategy.end);
    if (subset.length === expectedCount && validateLineSpacingWithGap(subset)) {
      console.log(
        '[findOptimalLineSubset] 找到最优子集：移除[',
        strategy.start,
        ':',
        lines.length - strategy.end,
        ']'
      );
      return subset;
    }
  }

  return null;
}

/**
 * 找到最优子集合，同时满足间距约束
 * 用于一个方向通过验证，另一方向需要优化的情况
 */
function findOptimalLineSubsetWithGapConstraint(
  lines: number[],
  targetGap: number
): number[] | null {
  const expectedCount = 10;
  const tolerance = targetGap * 0.15; // ±15% 容差

  // 尝试不同的子集合策略
  const strategies = [
    { start: 1, end: lines.length },
    { start: 2, end: lines.length },
    { start: 3, end: lines.length },
    { start: 0, end: lines.length - 1 },
    { start: 0, end: lines.length - 2 },
    { start: 0, end: lines.length - 3 },
    { start: 1, end: lines.length - 1 },
    { start: 1, end: lines.length - 2 },
    { start: 2, end: lines.length - 1 },
  ];

  for (const strategy of strategies) {
    const subset = lines.slice(strategy.start, strategy.end);
    if (subset.length === expectedCount) {
      const gap = validateLineSpacingWithGap(subset);
      if (gap && Math.abs(gap - targetGap) < tolerance) {
        console.log(
          '[findOptimalLineSubsetWithGapConstraint] 找到匹配间距的子集，间距:',
          gap.toFixed(1)
        );
        return subset;
      }
    }
  }

  return null;
}

/**
 * 验证直线间距并返回基本间距（返回 null 表示验证失败，数字表示基本间距）
 */
function validateLineSpacingWithGap(lines: number[]): number | null {
  const expectedCount = 10;

  // 情况1：直线数量接近正常（8-12条）
  if (lines.length >= expectedCount - 1 && lines.length <= expectedCount + 2) {
    return validateLineSpacingDetails(lines);
  }

  // 情况2：直线数量过多（11-15条）
  if (lines.length > expectedCount + 2 && lines.length <= 15) {
    console.log(`[validateLineSpacingWithGap] 检测到 ${lines.length} 条直线，尝试消除干扰`);
    return tryRemoveInterferingLinesWithGap(lines);
  }

  console.log(`[validateLineSpacingWithGap] 直线数量过多或过少: ${lines.length}`);
  return null;
}

/**
 * 验证间距详情，返回基本间距
 */
function validateLineSpacingDetails(lines: number[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    gaps.push(lines[i]! - lines[i - 1]!);
  }

  // 找到最常见的间距（基本间距）
  const baseGap = findBasicGap(gaps);
  if (baseGap <= 0) {
    console.log('[validateLineSpacingDetails] 无法找到基本间距');
    return null;
  }

  console.log(
    '[validateLineSpacingDetails] 基本间距:',
    baseGap.toFixed(1),
    '检测线条数:',
    lines.length
  );

  // 检验所有间距是否为基本间距的倍数（允许 ±20% 误差）
  const tolerance = baseGap * 0.2;
  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i]!;
    const remainder = gap % baseGap;
    const isValidMultiple = remainder < tolerance || baseGap - remainder < tolerance;

    if (!isValidMultiple) {
      console.log(
        `[validateLineSpacingDetails] 间距 ${i} 异常: ${gap.toFixed(1)} (基本: ${baseGap.toFixed(1)})`
      );
      return null;
    }
  }

  console.log('[validateLineSpacingDetails] 间距检验通过');
  return baseGap;
}

/**
 * 尝试移除干扰直线，找到最符合数独特性的子集合，返回基本间距
 */
function tryRemoveInterferingLinesWithGap(lines: number[]): number | null {
  const expectedCount = 10;
  const linesToRemove = lines.length - expectedCount;

  // 尝试策略：移除开头、结尾、中间的直线
  const strategies: Array<{ start: number; count: number; name: string }> = [];

  // 从开头移除
  for (let i = 1; i <= Math.min(linesToRemove, 3); i++) {
    strategies.push({ start: 0, count: i, name: `移除前${i}条直线` });
  }

  // 从结尾移除
  for (let i = 1; i <= Math.min(linesToRemove, 3); i++) {
    strategies.push({ start: lines.length - i, count: i, name: `移除后${i}条直线` });
  }

  // 从两端各移除一些
  if (linesToRemove >= 2) {
    strategies.push({ start: 0, count: 1, name: `移除前1条+后1条` });
    strategies.push({ start: lines.length - 1, count: 1, name: `移除后1条（已上移）` });
  }

  console.log('[tryRemoveInterferingLinesWithGap] 尝试', strategies.length, '种移除策略');

  // 尝试每种策略
  for (const strategy of strategies) {
    const subset = lines.filter((_, idx) => {
      if (strategy.start === 0 && strategy.count > 0) {
        return idx >= strategy.count;
      }
      if (strategy.start > 0) {
        return idx < lines.length - strategy.count;
      }
      return true;
    });

    if (subset.length === expectedCount) {
      const gap = validateLineSpacingDetails(subset);
      if (gap) {
        console.log(
          '[tryRemoveInterferingLinesWithGap] 策略:',
          strategy.name,
          '成功！间距:',
          gap.toFixed(1)
        );
        return gap;
      }
    }
  }

  console.log('[tryRemoveInterferingLinesWithGap] 所有策略都失败');
  return null;
}

/**
 * 从水平和垂直直线构建矩形边框（强制正方形）
 */
function buildRectFromLinesSquare(
  horizontalLines: number[],
  verticalLines: number[]
): GridLocation {
  // 排序线条
  const sortedH = [...horizontalLines].sort((a, b) => a - b);
  const sortedV = [...verticalLines].sort((a, b) => a - b);

  // 计算线条之间的间距（单元格宽度/高度）
  const hGaps = [];
  for (let i = 1; i < sortedH.length; i++) {
    hGaps.push(sortedH[i]! - sortedH[i - 1]!);
  }
  const vGaps = [];
  for (let i = 1; i < sortedV.length; i++) {
    vGaps.push(sortedV[i]! - sortedV[i - 1]!);
  }

  // 计算平均间距
  const avgHGap = hGaps.reduce((a, b) => a + b, 0) / hGaps.length;
  const avgVGap = vGaps.reduce((a, b) => a + b, 0) / vGaps.length;

  console.log(
    '[buildRectFromLinesSquare] 平均间距: H=',
    avgHGap.toFixed(1),
    ' V=',
    avgVGap.toFixed(1)
  );

  // 使用排序后的第一条和最后一条线条作为边界
  const top = sortedH[0]!;
  const bottom = sortedH[sortedH.length - 1]!;
  const left = sortedV[0]!;
  const right = sortedV[sortedV.length - 1]!;

  const rawWidth = right - left;
  const rawHeight = bottom - top;

  // 强制正方形：使用较小的维度
  const sideLength = Math.min(rawWidth, rawHeight);

  // 如果宽高差异很大，记录警告
  const sizeRatio = Math.max(rawWidth, rawHeight) / sideLength;
  if (sizeRatio > 1.1) {
    console.log(
      '[buildRectFromLinesSquare] ⚠️ 尺寸不均匀，宽/高比:',
      (rawWidth / rawHeight).toFixed(3),
      '将强制调整为正方形'
    );
  }

  const rect = {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(sideLength),
    height: Math.round(sideLength),
  };

  console.log(
    '[buildRectFromLinesSquare] 原始尺寸:',
    rawWidth.toFixed(1),
    'x',
    rawHeight.toFixed(1),
    '→ 正方形:',
    sideLength.toFixed(1),
    'x',
    sideLength.toFixed(1)
  );
  console.log(
    '[buildRectFromLinesSquare] 最终边框:',
    rect,
    '线条数: ' + horizontalLines.length + 'x' + verticalLines.length
  );
  return rect;
}

/**
 * 从水平和垂直直线构建矩形边框
 */
function buildRectFromLines(horizontalLines: number[], verticalLines: number[]): GridLocation {
  const top = Math.min(...horizontalLines);
  const bottom = Math.max(...horizontalLines);
  const left = Math.min(...verticalLines);
  const right = Math.max(...verticalLines);

  const rect = {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };

  console.log(
    '[buildRectFromLines] 直线检测成功 - 边框:',
    rect,
    '线条数: ' + horizontalLines.length + 'x' + verticalLines.length
  );
  return rect;
}

/**
 * 聚类相似的直线位置
 * 相距 < 15px 的直线视为同一条
 */
function clusterLines(lines: number[]): number[] {
  if (lines.length === 0) return [];

  lines.sort((a, b) => a - b);
  const clusters: number[] = [lines[0]!];

  for (let i = 1; i < lines.length; i++) {
    const dist = lines[i]! - clusters[clusters.length - 1]!;
    if (dist < 15) {
      // 合并到前一个聚类：取平均值
      clusters[clusters.length - 1] = (clusters[clusters.length - 1]! + lines[i]!) / 2;
    } else {
      // 新的聚类
      clusters.push(lines[i]!);
    }
  }

  return clusters;
}

/**
 * 找到最常见的间距（基本间距）
 * 用频率统计方法，考虑 ±20% 的浮动范围
 */
function findBasicGap(gaps: number[]): number {
  if (gaps.length === 0) return -1;

  // 先排序找出中位数作为初始估计
  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;

  // 统计在 median ±30% 范围内的间距频率
  const tolerance = median * 0.3;
  const candidates = gaps.filter((g) => Math.abs(g - median) < tolerance);

  if (candidates.length === 0) return -1;

  // 返回候选间距的平均值
  const avgGap = candidates.reduce((a, b) => a + b, 0) / candidates.length;
  return avgGap;
}

/**
 * 在原图上绘制识别到的网格线
 * @param originalCanvas 原始图像
 * @param grid 识别到的网格位置
 * @returns 标注了网格线的新 canvas
 */
export function drawGridLines(
  originalCanvas: HTMLCanvasElement,
  grid: GridLocation
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = originalCanvas.width;
  result.height = originalCanvas.height;
  const ctx = result.getContext('2d')!;

  // 绘制原图
  ctx.drawImage(originalCanvas, 0, 0);

  // 设置绘制样式
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)'; // 红色半透明
  ctx.lineWidth = 2;

  const cellWidth = grid.width / 9;
  const cellHeight = grid.height / 9;

  // 绘制外框（粗线）
  ctx.lineWidth = 3;
  ctx.strokeRect(grid.x, grid.y, grid.width, grid.height);

  // 绘制宫线（粗线，每3格一条）
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    // 垂直宫线
    const x = grid.x + i * 3 * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, grid.y);
    ctx.lineTo(x, grid.y + grid.height);
    ctx.stroke();

    // 水平宫线
    const y = grid.y + i * 3 * cellHeight;
    ctx.beginPath();
    ctx.moveTo(grid.x, y);
    ctx.lineTo(grid.x + grid.width, y);
    ctx.stroke();
  }

  // 绘制普通格线（细线）
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // 红色更透明
  for (let i = 1; i < 9; i++) {
    if (i % 3 === 0) continue; // 跳过宫线位置

    // 垂直线
    const x = grid.x + i * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, grid.y);
    ctx.lineTo(x, grid.y + grid.height);
    ctx.stroke();

    // 水平线
    const y = grid.y + i * cellHeight;
    ctx.beginPath();
    ctx.moveTo(grid.x, y);
    ctx.lineTo(grid.x + grid.width, y);
    ctx.stroke();
  }

  return result;
}

/** * 可视化 9×9 单元格（用于调试）
 */
export function visualizeCells(
  cells: HTMLCanvasElement[][],
  cellDisplaySize: number = 40,
  gap: number = 0
): HTMLCanvasElement {
  const canvasSize = 9 * cellDisplaySize + 8 * gap;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d')!;

  // 红色背景，任何白色都会明显显示
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const x = col * (cellDisplaySize + gap);
      const y = row * (cellDisplaySize + gap);

      // 绘制单元格
      ctx.drawImage(cells[row]![col]!, x, y, cellDisplaySize, cellDisplaySize);
    }
  }

  return canvas;
}

/**
 * 把 canvas 边界的白色填充为黑色
 */
function fillBorderWhiteWithBlack(cellCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = cellCanvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
  const data = imageData.data;
  const width = cellCanvas.width;
  const height = cellCanvas.height;

  // 调试：分析像素值分布（只在前 100 个像素）
  const samplePixels = [];
  for (let i = 0; i < Math.min(400, data.length); i += 4) {
    samplePixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      a: data[i + 3],
    });
  }
  const uniqueValues = new Set(samplePixels.map((p) => `${p.r},${p.g},${p.b},${p.a}`));
  console.log(
    `[fillBorderWhiteWithBlack] 画布 ${width}x${height}, 像素值样本:`,
    Array.from(uniqueValues).slice(0, 5)
  );

  // 创建标记数组，用于标记边界白色连通区域
  const borderWhite = new Uint8Array(width * height);

  /**
   * 判断像素是否为白色（二值化图片应该是 255,255,255）
   */
  const isWhitePixel = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    const idx = (y * width + x) * 4;
    const r = data[idx]!;
    const g = data[idx + 1]!;
    const b = data[idx + 2]!;
    const a = data[idx + 3]!;
    // 二值化图片中白色就是 255
    return r === 255 && g === 255 && b === 255;
  };

  /**
   * 洪水填充标记边界白色区域（8 方向）
   */
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

      // 8 方向检查（包括对角线）
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx !== 0 || dy !== 0) {
            queue.push([x + dx, y + dy]);
          }
        }
      }
    }
  };

  // 从四个角点和四边中点开始洪水填充
  const startPoints: Array<[number, number]> = [
    // 四个角点
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    // 四边中点
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  for (const [x, y] of startPoints) {
    floodFill(x, y);
  }

  // 统计边界白色像素数（调试用）
  let borderWhiteCount = 0;
  for (let i = 0; i < borderWhite.length; i++) {
    if (borderWhite[i] === 1) borderWhiteCount++;
  }
  console.log(`[fillBorderWhiteWithBlack] 边界白色: ${borderWhiteCount} 像素`);

  // 将所有边界白色像素填充为黑色
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (borderWhite[y * width + x] === 1) {
        const idx = (y * width + x) * 4;
        data[idx] = 0; // R
        data[idx + 1] = 0; // G
        data[idx + 2] = 0; // B
        data[idx + 3] = 255; // A
      }
    }
  }

  // 将修改后的数据写回 canvas
  ctx.putImageData(imageData, 0, 0);
  console.log(`[fillBorderWhiteWithBlack] 白边填充完成`);

  return cellCanvas;
}

/**
 * 从图像中提取 9×9 单元格
 * @param edgeMargin 从单元格边缘内缩的像素数，用于去掉网格线
 */
export function extractCells(
  canvas: HTMLCanvasElement,
  grid: GridLocation,
  edgeMargin: number = 2
): HTMLCanvasElement[][] {
  const cellWidth = Math.round(grid.width / 9);
  const cellHeight = Math.round(grid.height / 9);

  // 内缩后的实际尺寸
  const contentWidth = cellWidth - 2 * edgeMargin;
  const contentHeight = cellHeight - 2 * edgeMargin;

  const cells: HTMLCanvasElement[][] = [];

  for (let row = 0; row < 9; row++) {
    cells[row] = [];
    for (let col = 0; col < 9; col++) {
      // 创建 canvas，只保存有效内容尺寸，不留白边
      const cellCanvas = document.createElement('canvas');
      cellCanvas.width = contentWidth;
      cellCanvas.height = contentHeight;
      const cellCtx = cellCanvas.getContext('2d')!;

      // 从原图裁剪单元格区域（已内缩以去掉网格线）
      const sourceX = grid.x + col * cellWidth + edgeMargin;
      const sourceY = grid.y + row * cellHeight + edgeMargin;

      // 直接填充整个 canvas，不留白边
      cellCtx.drawImage(
        canvas,
        sourceX,
        sourceY,
        contentWidth,
        contentHeight,
        0,
        0,
        contentWidth,
        contentHeight
      );

      // 去掉外部白色边界
      const processed = fillBorderWhiteWithBlack(cellCanvas);
      cells[row]![col] = processed;
    }
  }

  return cells;
}

/**
 * 检测单元格是否为空
 */
export function isCellEmpty(canvas: HTMLCanvasElement, emptyThreshold = 0.05): boolean {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let blackPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i]!;
    if (gray < 128) {
      blackPixels++;
    }
  }

  const ratio = blackPixels / (data.length / 4);
  return ratio < emptyThreshold;
}
