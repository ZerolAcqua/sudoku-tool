import * as tf from '@tensorflow/tfjs';
import { logger } from '@/utils/logger';
import { loadMnistModel, disposeMnistModel } from './mnistModel';

/**
 * 预处理：将 canvas 转为模型输入张量，并返回 28x28 的调试 canvas
 */
function preprocessForModel(
  canvas: HTMLCanvasElement,
): { tensor: tf.Tensor4D; debugCanvas: HTMLCanvasElement } {
  const debugCanvas = document.createElement('canvas')
  debugCanvas.width = 28
  debugCanvas.height = 28
  const debugCtx = debugCanvas.getContext('2d')!

  const input = tf.tidy(() => {
    let t = tf.browser.fromPixels(canvas, 1)
    t = t.resizeBilinear([28, 28])
    t = t.toFloat()
    // 二值化处理：阈值 127，保持与训练数据一致
    t = tf.step(t.sub(127.5)).mul(255)
    t = t.div(255)
    return t.reshape([1, 28, 28, 1])
  })

  // 将预处理后的张量绘制到调试 canvas
  const pixels = input.dataSync()
  const imageData = debugCtx.createImageData(28, 28)
  for (let i = 0; i < 28 * 28; i++) {
    const val = Math.round(pixels[i]! * 255)
    imageData.data[i * 4] = val
    imageData.data[i * 4 + 1] = val
    imageData.data[i * 4 + 2] = val
    imageData.data[i * 4 + 3] = 255
  }
  debugCtx.putImageData(imageData, 0, 0)

  return { tensor: input as tf.Tensor4D, debugCanvas }
}

/**
 * 单格识别（10 分类：0-9）
 */
export async function recognizeDigit(
  canvas: HTMLCanvasElement,
  confidenceThreshold = 0.7,
): Promise<number> {
  const model = await loadMnistModel()

  const { tensor: input } = preprocessForModel(canvas)
  const output = model.predict(input) as tf.Tensor
  const probs = await output.data()

  tf.dispose([input, output])

  let maxProb = 0
  let classIdx = 0

  for (let i = 0; i < probs.length; i++) {
    if (probs[i]! > maxProb) {
      maxProb = probs[i]!
      classIdx = i
    }
  }

  logger.debug(
    '[recognizeDigit] 预测=', classIdx,
    '置信度=', maxProb.toFixed(4),
    '概率=', Array.from(probs).map((p) => p.toFixed(3)).join(','),
  )

  if (maxProb < confidenceThreshold) {
    return 0
  }

  return classIdx
}

/**
 * 带调试输出的单格识别：返回预测结果 + 28x28 预处理后的 canvas
 */
export async function recognizeDigitWithDebug(
  canvas: HTMLCanvasElement,
): Promise<{ digit: number; confidence: number; allProbs: number[]; debugCanvas: HTMLCanvasElement }> {
  const model = await loadMnistModel()

  const { tensor: input, debugCanvas } = preprocessForModel(canvas)
  const output = model.predict(input) as tf.Tensor
  const probs = Array.from(await output.data())

  tf.dispose([input, output])

  let maxProb = 0
  let classIdx = 0
  for (let i = 0; i < probs.length; i++) {
    if (probs[i]! > maxProb) {
      maxProb = probs[i]!
      classIdx = i
    }
  }

  return { digit: classIdx, confidence: maxProb, allProbs: probs, debugCanvas }
}

/**
 * 将 canvas 缩放到目标尺寸
 */
function resizeCanvasTo(canvas: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = size;
  result.height = size;
  const ctx = result.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size);
  return result;
}

// =====================
// 批量识别 9×9
// =====================
export async function recognizeBoard(
  cells: HTMLCanvasElement[][],
  confidenceThreshold = 0.7,
  isCellEmptyFn?: (canvas: HTMLCanvasElement) => boolean
): Promise<string> {
  // 只需确保模型加载一次
  await loadMnistModel();

  const result: number[] = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = cells[row]![col]!;

      if (isCellEmptyFn?.(cell)) {
        result.push(0);
        continue;
      }

      // 直接传原始单元格，recognizeDigit 中会用 resizeBilinear 处理
      const digit = await recognizeDigit(cell, confidenceThreshold);
      result.push(digit);
    }
  }

  return result.map((d) => (d === 0 ? '0' : d.toString())).join('');
}

// =====================
// 清理（可选）
// =====================
export function cleanup() {
  disposeMnistModel();
}
