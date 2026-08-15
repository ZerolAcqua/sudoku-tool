/**
 * Node 环境 polyfill：让依赖浏览器 DOM/Canvas 的 OCR 模块能在 tsx 下运行。
 *
 * OpenCV.js 的 imread/imshow 会引用 HTMLImageElement / HTMLCanvasElement /
 * OffscreenCanvas 等浏览器全局对象，tf.browser.fromPixels 依赖 canvas 的
 * getContext('2d').getImageData。这里用 `canvas`（node-canvas）包补齐这些。
 *
 * 需要在第一次调用 cv.imread / tf.browser.fromPixels 之前执行 installDomPolyfill()。
 */

import { createCanvas, Canvas, Image, ImageData } from 'canvas'

let installed = false

export function installDomPolyfill(): void {
  if (installed) return
  const g = globalThis as any

  g.document = {
    createElement(tag: string) {
      if (tag === 'canvas') return createCanvas(0, 0)
      // OCR 流程只用 canvas，其余标签给个空对象兜底
      return { style: {}, setAttribute() {}, appendChild() {}, removeChild() {}, click() {} }
    },
    getElementById() {
      return null
    },
  }
  g.HTMLCanvasElement = Canvas
  g.HTMLImageElement = Image
  g.Image = Image
  g.ImageData = ImageData
  // cv.imread 会做 `img instanceof OffscreenCanvas`，提供一个空类避免 ReferenceError
  g.OffscreenCanvas = class OffscreenCanvas {}

  installed = true
}
