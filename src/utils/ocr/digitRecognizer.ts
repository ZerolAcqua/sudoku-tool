/**
 * 使用 Tesseract.js 进行数字识别
 * OCR 识别数独数字
 */

import { createWorker } from 'tesseract.js'

let worker: Awaited<ReturnType<typeof createWorker>> | null = null

/**
 * 初始化 Tesseract OCR Worker
 */
async function initWorker() {
  if (worker) {
    return worker
  }

  console.log('[Tesseract] 初始化 OCR Worker...')
  worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`[Tesseract] 识别进度: ${Math.round(m.progress * 100)}%`)
      }
    },
  })

  // 配置 Tesseract 仅识别数字
  await worker.setParameters({
    tessedit_char_whitelist: '123456789', // 只识别 1-9
    tessedit_pageseg_mode: '10' as any, // PSM_SINGLE_CHAR - 单字符模式
  })

  console.log('[Tesseract] OCR Worker 初始化完成')
  return worker
}

/**
 * 预处理单个数字单元格图像（增强对比度）
 */
function preprocessCell(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const preprocessed = document.createElement('canvas')
  preprocessed.width = canvas.width
  preprocessed.height = canvas.height
  
  const ctx = preprocessed.getContext('2d')!
  ctx.drawImage(canvas, 0, 0)
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  
  // 增强对比度：转为纯黑白
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i]! + data[i + 1]! + data[i + 2]!) / 3
    const value = avg > 127 ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = value
  }
  
  ctx.putImageData(imageData, 0, 0)
  return preprocessed
}

/**
 * 识别单个数字单元格
 */
export async function recognizeDigit(
  canvas: HTMLCanvasElement,
  confidenceThreshold = 0.6,
): Promise<number> {
  const worker_ = await initWorker()
  const preprocessed = preprocessCell(canvas)

  try {
    const {
      data: { text, confidence },
    } = await worker_.recognize(preprocessed)

    const cleaned = text.trim()
    const digit = parseInt(cleaned, 10)

    // 验证结果
    if (
      !isNaN(digit) &&
      digit >= 1 &&
      digit <= 9 &&
      confidence >= confidenceThreshold * 100
    ) {
      console.log(`[Tesseract] 识别: ${digit} (置信度: ${confidence.toFixed(1)}%)`)
      return digit
    }

    // 低置信度或无效数字，返回 0（空白）
    console.log(`[Tesseract] 无效/低置信度: "${cleaned}" (${confidence.toFixed(1)}%)`)
    return 0
  } catch (err) {
    console.error('[Tesseract] 识别失败:', err)
    return 0
  }
}

/**
 * 批量识别 9×9 的数字单元格
 */
export async function recognizeBoard(
  cells: HTMLCanvasElement[][],
  confidenceThreshold = 0.6,
  isCellEmptyFn?: (canvas: HTMLCanvasElement) => boolean
): Promise<string> {
  await initWorker()
  const result: number[] = []

  console.log('[Tesseract] 开始批量识别 81 个单元格...')

  let recognizedCount = 0
  let emptyCount = 0

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = cells[row]![col]!
      
      // 先检查单元格是否为空
      if (isCellEmptyFn && isCellEmptyFn(cell)) {
        result.push(0)
        emptyCount++
        console.log(`[Tesseract] 单元格 [${row},${col}]: 空白`)
        continue
      }

      // 有内容才识别
      const digit = await recognizeDigit(cell, confidenceThreshold)
      result.push(digit)
      
      if (digit > 0) {
        recognizedCount++
        console.log(`[Tesseract] 单元格 [${row},${col}]: ${digit}`)
      } else {
        emptyCount++
        console.log(`[Tesseract] 单元格 [${row},${col}]: 识别失败或空白`)
      }
    }
  }

  console.log(`[Tesseract] 批量识别完成 - 识别出 ${recognizedCount} 个数字，${emptyCount} 个空白`)
  return result.map((d) => (d === 0 ? '0' : d.toString())).join('')
}

/**
 * 清理资源
 */
export async function cleanup() {
  if (worker) {
    await worker.terminate()
    worker = null
    console.log('[Tesseract] Worker 已终止')
  }
}

