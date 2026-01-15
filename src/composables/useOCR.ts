/**
 * 数独识别（OCR）组合式函数
 */

import { ref, reactive } from 'vue'
import {
  loadImageToCanvas,
  waitForOpenCV,
} from '@/utils/ocr/preprocessor'
import { detectGrid, extractCells, isCellEmpty, drawGridLines } from '@/utils/ocr/gridDetector'
import { recognizeBoard, disposeModel } from '@/utils/ocr/digitRecognizer'

interface OCRState {
  isLoading: boolean
  error: string | null
  result: string | null
  processedImage: HTMLCanvasElement | null
  gridImage: HTMLCanvasElement | null
  cells: HTMLCanvasElement[][] | null
}

export function useOCR() {
  const state = reactive<OCRState>({
    isLoading: false,
    error: null,
    result: null,
    processedImage: null,
    gridImage: null,
    cells: null,
  })

  const originalImage = ref<HTMLCanvasElement | null>(null)

  /**
   * 识别图像中的数独
   */
  async function recognize(
    imageSource: File | string,
    options = { confidenceThreshold: 0.5, debug: false },
  ): Promise<string> {
    state.isLoading = true
    state.error = null
    state.result = null

    try {
      // 0. 等待 OpenCV 加载
      await waitForOpenCV()

      // 1. 加载原始图像
      originalImage.value = await loadImageToCanvas(imageSource)

      // 2. 网格检测（内部处理灰度化、二值化、轮廓/直线检测）
      const grid = detectGrid(originalImage.value)
      if (grid.width === 0 || grid.height === 0) {
        throw new Error('未能检测到数独网格，请确保图像清晰且网格完整')
      }

      // 3. 绘制网格线到原图
      state.gridImage = drawGridLines(originalImage.value, grid)

      // 4. 提取单元格
      const cells = extractCells(originalImage.value, grid)
      state.cells = cells

      // 5. 识别数字
      // let result = await recognizeBoard(cells, options.confidenceThreshold)

      // // 处理空单元格
      // const processedResult: string[] = []
      // for (let i = 0; i < 81; i++) {
      //   const row = Math.floor(i / 9)
      //   const col = i % 9
      //   const digit = parseInt(result[i]!)

      //   if (digit === 0 || isCellEmpty(cells[row]![col]!)) {
      //     processedResult.push('0')
      //   } else {
      //     processedResult.push(digit.toString())
      //   }
      // }

      // result = processedResult.join('')
      // state.result = result

      // 临时测试结果
      const result = '0'.repeat(81)
      state.result = result

      if (options.debug) {
        console.log('OCR Result:', result)
        console.log('Grid Location:', grid)
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '识别失败，请重试'
      state.error = errorMessage
      console.error('OCR Error:', err)
      throw err
    } finally {
      state.isLoading = false
      disposeModel()
    }
  }

  /**
   * 重置状态
   */
  function reset(): void {
    state.isLoading = false
    state.error = null
    state.result = null
    state.processedImage = null
    state.gridImage = null
    state.cells = null
    originalImage.value = null
  }

  return {
    state,
    originalImage,
    recognize,
    reset,
  }
}
