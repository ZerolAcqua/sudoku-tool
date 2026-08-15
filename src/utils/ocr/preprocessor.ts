/**
 * 图像预处理工具
 * 使用 OpenCV.js 进行图像处理
 */

import cvModule from '@techstark/opencv-js'
import type { CV } from '@techstark/opencv-js'

// @techstark/opencv-js 的默认导出是一个 Promise，await 后才得到真正的 cv 对象。
// 这里惰性初始化，并把结果挂到全局 window.cv，供 gridDetector / useOCR 使用。
let cv: CV | null = null
let cvPromise: Promise<CV> | null = null

/** 确保 OpenCV.js 已就绪，返回全局 cv 对象 */
export function ensureCv(): Promise<CV> {
  const globalCv = (typeof window !== 'undefined' ? (window as any).cv : undefined) as CV | undefined
  if (globalCv?.Mat) {
    return Promise.resolve(globalCv)
  }
  if (!cvPromise) {
    cvPromise = (async () => {
      const raw = cvModule as any
      let resolved: CV
      if (raw instanceof Promise) {
        resolved = (await raw) as CV
      } else if (raw.Mat) {
        resolved = raw as CV
      } else {
        await new Promise<void>((resolve) => {
          raw.onRuntimeInitialized = () => resolve()
        })
        resolved = raw as CV
      }
      cv = resolved
      if (typeof window !== 'undefined') {
        ;(window as any).cv = resolved
      }
      return resolved
    })()
  }
  return cvPromise
}

/**
 * 从图像或 URL 加载图片到 canvas
 */
export async function loadImageToCanvas(source: File | string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = reject;

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(source);
    }
  });
}
