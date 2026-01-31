import * as tf from '@tensorflow/tfjs'
import { loadMnistModel, disposeMnistModel } from './mnistModel'

/**
 * 单格识别（11 分类：0-9 + 无数字）
 */
export async function recognizeDigit(
  canvas: HTMLCanvasElement,
  confidenceThreshold = 0.6,
): Promise<number> {
  const model = await loadMnistModel()

  const input = tf.tidy(() => {
    let t = tf.browser.fromPixels(canvas, 1)
    
    t = t.resizeBilinear([28, 28])
    
    t = t.toFloat()
    t = t.div(255)
    // 不进行反色，保持白色数字 = 高值，黑色背景 = 低值

    return t.reshape([1, 28, 28, 1])
  })

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

  // 调试输出
  console.log('[recognizeDigit] 预测: 类别=', classIdx, '置信度=', maxProb.toFixed(4), '所有概率=', Array.from(probs).map((p: any) => p.toFixed(3)).join(','))

  // 如果低于置信度阈值，返回 0（空白）
  if (maxProb < confidenceThreshold) {
    return 0
  }

  // 类别 10 表示无数字，返回 0
  if (classIdx === 10) {
    return 0
  }

  // 返回 1-9 的数字
  return classIdx
}

/**
 * 将 canvas 缩放到目标尺寸
 */
function resizeCanvasTo(canvas: HTMLCanvasElement, size: number): HTMLCanvasElement {
  const result = document.createElement('canvas')
  result.width = size
  result.height = size
  const ctx = result.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, size, size)
  return result
}

// =====================
// 批量识别 9×9
// =====================
export async function recognizeBoard(
  cells: HTMLCanvasElement[][],
  confidenceThreshold = 0.7,
  isCellEmptyFn?: (canvas: HTMLCanvasElement) => boolean,
): Promise<string> {
  // 只需确保模型加载一次
  await loadMnistModel()

  const result: number[] = []

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = cells[row]![col]!

      if (isCellEmptyFn?.(cell)) {
        result.push(0)
        continue
      }

      // 直接传原始单元格，recognizeDigit 中会用 resizeBilinear 处理
      const digit = await recognizeDigit(cell, confidenceThreshold)
      result.push(digit)
    }
  }

  return result.map(d => (d === 0 ? '0' : d.toString())).join('')
}

// =====================
// 清理（可选）
// =====================
export function cleanup() {
  disposeMnistModel()
}
