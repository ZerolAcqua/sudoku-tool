/**
 * 数独识别（OCR）组合式函数
 */

import { ref, reactive } from 'vue'
import {
  loadImageToCanvas,
  waitForOpenCV,
} from '@/utils/ocr/preprocessor'
import { detectGrid, extractCells, isCellEmpty, drawGridLines, visualizeCells } from '@/utils/ocr/gridDetector'
import { recognizeBoard, cleanup } from '@/utils/ocr/digitRecognizer'

declare const cv: any // OpenCV.js

/**
 * 创建二值化版本的图像（用于单元格提取）
 * 自动检测最优的二值化方向（数字白/黑背景）
 */
function createBinaryImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const src = cv.imread(canvas)
  
  // 转换为灰度图
  const gray = new cv.Mat()
  if (src.channels() === 4) {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
  } else if (src.channels() === 3) {
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY)
  } else {
    src.copyTo(gray)
  }
  
  // 尝试两种二值化方向
  const binaryNormal = new cv.Mat()
  const binaryInv = new cv.Mat()
  cv.threshold(gray, binaryNormal, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU)
  cv.threshold(gray, binaryInv, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU)
  
  // 评估两种方向的质量：计算文本像素密度
  // 假设数字通常占图像的 1-50%，计算接近这个范围的版本评分
  const scoreNormal = evaluateBinaryQuality(binaryNormal)
  const scoreInv = evaluateBinaryQuality(binaryInv)
  
  console.log('[createBinaryImage] 评分 - Normal:', scoreNormal.toFixed(3), ' Inv:', scoreInv.toFixed(3))
  
  // 选择评分更高的版本
  const binary = scoreInv > scoreNormal ? binaryInv : binaryNormal
  
  // 转换回 canvas
  const result = document.createElement('canvas')
  result.width = canvas.width
  result.height = canvas.height
  cv.imshow(result, binary)
  
  // 释放临时 Mat
  src.delete()
  gray.delete()
  binaryNormal.delete()
  binaryInv.delete()
  
  return result
}

/**
 * 评估二值化图像的质量
 * 数字应该占图像的约 5-40%（取决于疏密程度）
 */
function evaluateBinaryQuality(binaryMat: any): number {
  const data = new Uint8Array(binaryMat.data)
  let whitePixels = 0
  
  // 计算白色像素比例
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 255) {
      whitePixels++
    }
  }
  
  const ratio = whitePixels / data.length
  
  // 评分：接近 10-40% 的白色像素为最佳（数字比例）
  // 用高斯函数，中心在 0.25，标准差 0.15
  const optimalRatio = 0.25
  const sigma = 0.15
  const score = Math.exp(-Math.pow(ratio - optimalRatio, 2) / (2 * sigma * sigma))
  
  return score
}

interface OCRState {
  isLoading: boolean
  error: string | null
  result: string | null
  processedImage: HTMLCanvasElement | null
  gridImage: HTMLCanvasElement | null
  cellsVisualization: HTMLCanvasElement | null
  cells: HTMLCanvasElement[][] | null
}

export function useOCR() {
  const state = reactive<OCRState>({
    isLoading: false,
    error: null,
    result: null,
    processedImage: null,
    gridImage: null,
    cellsVisualization: null,
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
      const img = await loadImageToCanvas(imageSource)
      originalImage.value = img
      console.log('[useOCR] 原始图像加载完成:', img.width, 'x', img.height)

      // 2. 网格检测（内部处理灰度化、二值化、轮廓/直线检测）
      const grid = detectGrid(img)
      console.log('[useOCR] 网格检测完成:', grid)
      if (grid.width === 0 || grid.height === 0) {
        throw new Error('未能检测到数独网格，请确保图像清晰且网格完整')
      }

      // 3. 绘制网格线到原图
      state.gridImage = drawGridLines(img, grid)
      console.log('[useOCR] 网格线绘制完成')

      // 3.5. 创建二值化版本用于单元格提取（避免网格线干扰）
      const binaryImg = createBinaryImage(img)
      console.log('[useOCR] 二值化图像创建完成')
      state.processedImage = binaryImg

      // 4. 从二值化图像提取单元格
      const cells = extractCells(binaryImg, grid, 6)
      state.cells = cells
      console.log('[useOCR] 单元格提取完成:', cells.length, 'x', cells[0]?.length)

      // 4.5. 可视化单元格（调试用，无间隔，方便查看白边）
      state.cellsVisualization = visualizeCells(cells, 50, 0)
      console.log('[useOCR] 单元格可视化完成')

      // 5. 识别数字
      let result = await recognizeBoard(cells, options.confidenceThreshold, isCellEmpty)

      // 后处理：再次验证空单元格（双重保险）
      const processedResult: string[] = []
      for (let i = 0; i < 81; i++) {
        const row = Math.floor(i / 9)
        const col = i % 9
        const digit = parseInt(result[i]!)

        if (digit === 0 || isCellEmpty(cells[row]![col]!)) {
          processedResult.push('0')
        } else {
          processedResult.push(digit.toString())
        }
      }

      result = processedResult.join('')
      state.result = result

      console.log('[useOCR] 识别完成，结果:', result)

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
    state.cellsVisualization = null
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
