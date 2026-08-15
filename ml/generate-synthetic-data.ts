// @deprecated: 2026-08-15
import { createCanvas } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DIGIT_SIZE = 28
const NUM_CLASSES = 11 // 0-9 + 无数字
const SAMPLES_PER_DIGIT = 1000
const TOTAL_SAMPLES = NUM_CLASSES * SAMPLES_PER_DIGIT

/**
 * 使用 Canvas 生成数字字体图片
 */
function generateDigitImage(digit: number, width: number = 28, height: number = 28): Uint8Array {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // 黑色背景
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, width, height)

  // 无数字情况下返回空白图片（黑色背景，加入轻微噪声/网格线）
  if (digit === -1) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    // 随机加入轻微噪声（模拟拍照噪点）
    const noiseProbability = 0.02
    for (let i = 0; i < width * height; i++) {
      if (Math.random() < noiseProbability) {
        const idx = i * 4
        const value = Math.floor(Math.random() * 30) // 低亮度噪声
        data[idx] = value
        data[idx + 1] = value
        data[idx + 2] = value
        data[idx + 3] = 255
      }
    }

    // 随机绘制一条极细网格线（模拟真实网格干扰）
    if (Math.random() < 0.5) {
      ctx.strokeStyle = 'rgba(40, 40, 40, 0.6)'
      ctx.lineWidth = 1
      const horizontal = Math.random() > 0.5
      if (horizontal) {
        const y = Math.floor(Math.random() * height)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      } else {
        const x = Math.floor(Math.random() * width)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
    }

    // 转换为灰度数据后二值化（背景=0，噪声/网格线=255）
    const finalData = ctx.getImageData(0, 0, width, height).data
    const binaryData = new Uint8Array(width * height)
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4
      const r = finalData[idx]
      const g = finalData[idx + 1]
      const b = finalData[idx + 2]
      const gray = (r + g + b) / 3
      // 二值化：较亮的值变成 255（噪声/网格线），黑色背景为 0
      binaryData[i] = gray > 127 ? 255 : 0
    }

    return binaryData
  }

  // 绘制数字（白色数字，黑色背景）
  ctx.fillStyle = 'white'
  
  // 更多字体大小变化（从较小到较大）
  const fontSizes = [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9]
  const fontSize = fontSizes[Math.floor(Math.random() * fontSizes.length)]
  
  // 多样化字体
  const fonts = [
    'Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS',
    'Courier New', 'Courier', 'Lucida Console', 'Monaco',
    'Times New Roman', 'Times', 'Georgia', 'Palatino',
    'Comic Sans MS', 'Impact', 'Century Gothic'
  ]
  const font = fonts[Math.floor(Math.random() * fonts.length)]
  
  // 更多粗细变化：100(细) 300(轻) 400(正常) 600(半粗) 700(粗) 900(超粗)
  const weights = ['100', '300', 'normal', '600', 'bold', '900']
  const weight = weights[Math.floor(Math.random() * weights.length)]
  
  ctx.font = `${weight} ${Math.floor(width * fontSize)}px ${font}`.trim()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // 仅位移和缩放变换，不旋转（app 中数字不会旋转）
  const translateX = (Math.random() - 0.5) * 4  // 增加位移范围
  const translateY = (Math.random() - 0.5) * 4
  const scale = 0.9 + Math.random() * 0.2  // 更大的缩放范围

  ctx.save()
  ctx.translate(width / 2 + translateX, height / 2 + translateY)
  ctx.scale(scale, scale)
  ctx.fillText(digit.toString(), 0, 0)
  ctx.restore()

  // 转换为灰度数据后二值化（白色数字=255，黑色背景=0）
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const binaryData = new Uint8Array(width * height)

  // 随机选择二值化阈值（模拟不同的OCR预处理）
  const thresholds = [100, 115, 127, 140, 155]
  const threshold = thresholds[Math.floor(Math.random() * thresholds.length)]

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const gray = (r + g + b) / 3
    // 使用随机阈值二值化
    binaryData[i] = gray > threshold ? 255 : 0
  }

  return binaryData
}

/**
 * 生成并保存合成数据集为 PNG 精灵图
 */
async function generateAndSaveSyntheticDataset() {
  console.log('🚀 开始生成合成数据集...')
  console.log(`   总样本数: ${TOTAL_SAMPLES}`)
  console.log(`   样本大小: ${DIGIT_SIZE}x${DIGIT_SIZE}`)
  console.log(`   输出格式: PNG 精灵图 (水平排列)\n`)

  const dataDir = path.join(__dirname, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // 使用 PNG 库直接创建大型精灵图（避免超大 Canvas）
  const spriteWidth = DIGIT_SIZE * TOTAL_SAMPLES
  const spriteHeight = DIGIT_SIZE
  const png = new PNG({ width: spriteWidth, height: spriteHeight })

  // 生成所有样本
  const labels: number[] = []
  let sampleIdx = 0

  for (let digit = 0; digit <= 10; digit++) {
    const actualDigit = digit === 10 ? -1 : digit
    const digitLabel = actualDigit === -1 ? '(空)' : actualDigit.toString()

    console.log(`生成数字 ${digitLabel}...`)

    for (let sample = 0; sample < SAMPLES_PER_DIGIT; sample++) {
      // 每个样本单独生成（避免超大 Canvas）
      const grayData = generateDigitImage(actualDigit, DIGIT_SIZE, DIGIT_SIZE)

      // 写入精灵图的对应位置
      const xOffset = sampleIdx * DIGIT_SIZE
      for (let y = 0; y < DIGIT_SIZE; y++) {
        for (let x = 0; x < DIGIT_SIZE; x++) {
          const grayValue = grayData[y * DIGIT_SIZE + x]!
          const pixelIdx = (y * spriteWidth + xOffset + x) * 4
          png.data[pixelIdx] = grayValue          // R
          png.data[pixelIdx + 1] = grayValue      // G
          png.data[pixelIdx + 2] = grayValue      // B
          png.data[pixelIdx + 3] = 255            // A
        }
      }

      labels.push(digit)
      sampleIdx++

      if ((sample + 1) % 250 === 0) {
        process.stdout.write(`\r  进度: ${sample + 1}/${SAMPLES_PER_DIGIT}`)
      }
    }
    console.log(`\r  完成: ${SAMPLES_PER_DIGIT}/${SAMPLES_PER_DIGIT} ✅`)
  }

  // 保存 PNG 精灵图
  const imagesPath = path.join(dataDir, 'synthetic_images.png')
  console.log(`\n💾 保存 PNG 精灵图...`)
  return new Promise<void>((resolve, reject) => {
    png.pack()
      .pipe(fs.createWriteStream(imagesPath))
      .on('finish', () => {
        // 保存标签为 one-hot 编码（仿照 MNIST 格式）
        // 每个样本 NUM_CLASSES 个字节，每个类别为 0 或 1
        const onehotLabels = new Uint8Array(TOTAL_SAMPLES * NUM_CLASSES)
        for (let i = 0; i < labels.length; i++) {
          const classIdx = labels[i]!
          onehotLabels[i * NUM_CLASSES + classIdx] = 1
        }

        const labelsPath = path.join(dataDir, 'synthetic_labels_uint8')
        fs.writeFileSync(labelsPath, onehotLabels)

        const fileSize = fs.statSync(imagesPath).size
        console.log(`✅ 保存完成！`)
        console.log(`   PNG 图片: ${imagesPath}`)
        console.log(`   大小: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`)
        console.log(`   标签文件: ${labelsPath}`)
        console.log(`   样本数: ${TOTAL_SAMPLES}`)
        console.log(`   类别数: ${NUM_CLASSES}`)
        console.log(`\n🎉 合成数据集生成完成！`)

        resolve()
      })
      .on('error', reject)
  })
}

// ========================
// 主函数
// ========================

async function main() {
  try {
    await generateAndSaveSyntheticDataset()
    process.exit(0)
  } catch (err) {
    console.error('❌ 生成失败:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
}

main()
