/**
 * 使用 TensorFlow.js 进行数字识别
 * 基于 MNIST 手写数字识别模型
 */

import * as tf from '@tensorflow/tfjs'

let model: tf.LayersModel | null = null

/**
 * 加载预训练的 MNIST 模型
 */
export async function loadDigitModel(): Promise<tf.LayersModel> {
  if (model) {
    return model
  }

  try {
    model = await tf.loadLayersModel(
      'https://tfhub.dev/google/tfjs-models/mnist/5/model.json?tfhub-redirect=true',
    )
    console.log('Digit recognition model loaded successfully')
    return model
  } catch {
    console.warn('Failed to load from tfhub, trying alternative source...')
    model = await tf.loadLayersModel(
      'https://storage.googleapis.com/tfjs-models/savedmodel/mnist/model.json',
    )
    return model
  }
}

/**
 * 预处理单个数字单元格图像
 */
function preprocessCell(canvas: HTMLCanvasElement): tf.Tensor {
  return tf.tidy(() => {
    let tensor = tf.browser.fromPixels(canvas, 1)
    tensor = tf.image.resizeBilinear(tensor, [28, 28])
    tensor = tf.scalar(255).sub(tensor)
    tensor = tensor.div(tf.scalar(255))
    return tensor
  })
}

/**
 * 识别单个数字单元格
 */
export async function recognizeDigit(
  canvas: HTMLCanvasElement,
  confidenceThreshold = 0.5,
): Promise<number> {
  const model_ = await loadDigitModel()

  const preprocessed = tf.tidy(() => {
    return preprocessCell(canvas)
  })

  const input = preprocessed.expandDims(0)
  const prediction = model_.predict(input) as tf.Tensor
  const probabilities = await prediction.data()

  let maxProb = 0
  let digit = 0

  for (let i = 0; i < 10; i++) {
    if (probabilities[i]! > maxProb) {
      maxProb = probabilities[i]!
      digit = i
    }
  }

  if (maxProb < confidenceThreshold) {
    digit = 0
  }

  preprocessed.dispose()
  input.dispose()
  prediction.dispose()

  return digit
}

/**
 * 批量识别 9×9 的数字单元格
 */
export async function recognizeBoard(
  cells: HTMLCanvasElement[][],
  confidenceThreshold = 0.5,
): Promise<string> {
  const model_ = await loadDigitModel()
  const result: number[] = []

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const preprocessed = tf.tidy(() => {
        return preprocessCell(cells[row]![col]!)
      })

      const input = preprocessed.expandDims(0)
      const prediction = model_.predict(input) as tf.Tensor
      const probabilities = await prediction.data()

      let maxProb = 0
      let recognizedDigit = 0

      for (let i = 0; i < 10; i++) {
        if (probabilities[i]! > maxProb) {
          maxProb = probabilities[i]!
          recognizedDigit = i
        }
      }

      if (maxProb < confidenceThreshold) {
        recognizedDigit = 0
      }

      preprocessed.dispose()
      input.dispose()
      prediction.dispose()

      result.push(recognizedDigit)
    }
  }

  return result.map((d) => (d === 0 ? '0' : d.toString())).join('')
}

/**
 * 释放模型占用的内存
 */
export function disposeModel(): void {
  if (model) {
    model.dispose()
    model = null
  }
}
