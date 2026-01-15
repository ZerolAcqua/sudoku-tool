/**
 * 图像预处理工具
 * 使用 OpenCV.js 进行图像处理
 */

declare const cv: any // OpenCV.js 全局对象

/**
 * 等待 OpenCV.js 加载完成
 */
export async function waitForOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof cv !== 'undefined' && cv.Mat) {
      resolve()
      return
    }

    const checkInterval = setInterval(() => {
      if (typeof cv !== 'undefined' && cv.Mat) {
        clearInterval(checkInterval)
        resolve()
      }
    }, 100)

    // 30 秒超时
    setTimeout(() => {
      clearInterval(checkInterval)
      reject(new Error('OpenCV.js 加载超时'))
    }, 30000)
  })
}

/**
 * 将图像转换为灰度图
 */
export function toGrayScale(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const src = cv.imread(canvas)
  const dst = new cv.Mat()
  
  // 检查通道数
  if (src.channels() === 4) {
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY)
  } else if (src.channels() === 3) {
    cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY)
  } else {
    src.copyTo(dst)
  }

  const result = document.createElement('canvas')
  cv.imshow(result, dst)

  src.delete()
  dst.delete()

  return result
}

/**
 * Otsu 二值化：自动计算最优阈值
 * 返回两种版本：正常和反转
 */
export function otsuBinarize(canvas: HTMLCanvasElement): { normal: HTMLCanvasElement; inverted: HTMLCanvasElement } {
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  // 正常二值化（背景白色，线条黑色）
  const normal = new cv.Mat()
  cv.threshold(gray, normal, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)

  const normalCanvas = document.createElement('canvas')
  cv.imshow(normalCanvas, normal)

  // 反转二值化（背景黑色，线条白色）
  const inverted = new cv.Mat()
  cv.threshold(gray, inverted, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)

  const invertedCanvas = document.createElement('canvas')
  cv.imshow(invertedCanvas, inverted)

  src.delete()
  gray.delete()
  normal.delete()
  inverted.delete()

  return { normal: normalCanvas, inverted: invertedCanvas }
}

/**
 * 手动阈值二值化（用于识别更细的线条）
 * @param canvas 灰度图
 * @param threshold 阈值（0-255），默认 180，越低识别的线条越多
 */
export function manualBinarize(canvas: HTMLCanvasElement, threshold = 180): HTMLCanvasElement {
  const src = cv.imread(canvas)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  const dst = new cv.Mat()
  // 使用 THRESH_BINARY_INV：低于阈值的（黑色线条）变白色
  cv.threshold(gray, dst, threshold, 255, cv.THRESH_BINARY_INV)

  const result = document.createElement('canvas')
  cv.imshow(result, dst)

  src.delete()
  gray.delete()
  dst.delete()

  return result
}

/**
 * 高斯模糊（可选，用于减少噪声）
 */
export function gaussianBlur(canvas: HTMLCanvasElement, kernelSize = 5): HTMLCanvasElement {
  const src = cv.imread(canvas)
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize))
  cv.GaussianBlur(src, dst, new cv.Size(kernelSize, kernelSize), 0)

  const result = document.createElement('canvas')
  cv.imshow(result, dst)

  src.delete()
  dst.delete()
  kernel.delete()

  return result
}

/**
 * 形态学闭运算（连接断裂的线条）
 */
export function morphologyClose(canvas: HTMLCanvasElement, kernelSize = 3): HTMLCanvasElement {
  const src = cv.imread(canvas)
  const dst = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(kernelSize, kernelSize))
  cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel)

  const result = document.createElement('canvas')
  cv.imshow(result, dst)

  src.delete()
  dst.delete()
  kernel.delete()

  return result
}

/**
 * 调整画布大小
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const src = cv.imread(canvas)
  const dst = new cv.Mat()
  cv.resize(src, dst, new cv.Size(width, height))

  const result = document.createElement('canvas')
  cv.imshow(result, dst)

  src.delete()
  dst.delete()

  return result
}

/**
 * 从图像或 URL 加载图片到 canvas
 */
export async function loadImageToCanvas(
  source: File | string,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }

    img.onerror = reject

    if (typeof source === 'string') {
      img.src = source
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(source)
    }
  })
}
