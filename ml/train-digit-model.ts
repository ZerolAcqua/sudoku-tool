import * as tf from '@tensorflow/tfjs-node'
import { createCanvas } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ========================
// 工具函数：生成数字字体图片
// ========================

/**
 * 使用 Canvas 生成数字字体图片
 * @param digit 数字 0-9 或 -1 (代表无数字)
 * @param width 图片宽度
 * @param height 图片高度
 * @returns Uint8Array 灰度图片数据
 */
function generateDigitImage(digit: number, width: number = 28, height: number = 28): Uint8Array {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // 白色背景
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, width, height)

  // 无数字情况下返回空白图片
  if (digit === -1) {
    // 返回全 255（白色）的灰度图
    return new Uint8Array(width * height).fill(255)
  }

  // 绘制数字
  ctx.fillStyle = 'black'
  ctx.font = `bold ${Math.floor(width * 0.7)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(digit.toString(), width / 2, height / 2)

  // 转换为灰度数据
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const grayData = new Uint8Array(width * height)

  for (let i = 0; i < width * height; i++) {
    // 从 RGBA 转换为灰度 (R + G + B) / 3，然后反转使得黑色为高值
    const idx = i * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const gray = (r + g + b) / 3
    grayData[i] = 255 - gray // 反转使得黑色背景为高值
  }

  return grayData
}

/**
 * 批量生成数字字体数据集
 * @param samplesPerDigit 每个数字生成的样本数
 * @returns { images: Uint8Array, labels: Uint8Array }
 */
function generateSyntheticDataset(samplesPerDigit: number = 100): { images: Uint8Array; labels: number[] } {
  const imageSize = 28
  const numClasses = 11 // 0-9 + 无数字
  const totalSamples = samplesPerDigit * numClasses
  const images = new Uint8Array(totalSamples * imageSize * imageSize)
  const labels: number[] = [] // 改为普通数组

  console.log(`生成合成数据集: ${samplesPerDigit} 样本 x ${numClasses} 类...`)

  let idx = 0
  for (let digit = 0; digit <= 10; digit++) {
    const actualDigit = digit === 10 ? -1 : digit // 最后一类是无数字

    for (let sample = 0; sample < samplesPerDigit; sample++) {
      const digitImage = generateDigitImage(actualDigit, imageSize, imageSize)

      // 添加轻微的旋转和缩放变化
      let processedImage = digitImage
      if (actualDigit !== -1 && Math.random() > 0.5) {
        // 对数字应用轻微变形
        processedImage = applyTransformation(digitImage, imageSize)
      }

      images.set(processedImage, idx * imageSize * imageSize)
      labels.push(digit)
      idx++
    }

    if ((digit + 1) % 5 === 0) {
      process.stdout.write(`\r已生成: ${digit + 1}/${numClasses} 类`)
    }
  }
  console.log('\n合成数据集生成完成!')

  return { images, labels }
}

/**
 * 应用轻微的几何变换
 */
function applyTransformation(imageData: Uint8Array, size: number): Uint8Array {
  // 简单实现：轻微缩放和位移
  const transformed = new Uint8Array(size * size)
  const scale = 0.9 + Math.random() * 0.2
  const offsetX = Math.floor((Math.random() - 0.5) * 2)
  const offsetY = Math.floor((Math.random() - 0.5) * 2)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const srcX = Math.floor((x - offsetX) / scale + size / 2 - size / (2 * scale))
      const srcY = Math.floor((y - offsetY) / scale + size / 2 - size / (2 * scale))

      if (srcX >= 0 && srcX < size && srcY >= 0 && srcY < size) {
        transformed[y * size + x] = imageData[srcY * size + srcX]
      } else {
        transformed[y * size + x] = 255 // 背景
      }
    }
  }

  return transformed
}

/**
 * 加载 MNIST 数据集
 * 使用本地下载的数据文件
 */
async function loadMNISTDataset(): Promise<{
  images: tf.Tensor4D
  labels: tf.Tensor2D
}> {
  console.log('加载本地 MNIST 数据集...')

  try {
    const IMAGE_SIZE = 784 // 28 * 28
    const NUM_CLASSES = 10
    const NUM_DATASET_ELEMENTS = 65000
    const TRAIN_TEST_RATIO = 5 / 6
    const NUM_TRAIN_ELEMENTS = Math.floor(TRAIN_TEST_RATIO * NUM_DATASET_ELEMENTS)

    const dataDir = path.join(__dirname, 'data')
    const imagesPath = path.join(dataDir, 'mnist_images.png')
    const labelsPath = path.join(dataDir, 'mnist_labels_uint8')

    // 加载标签（二进制文件）
    console.log('加载标签...')
    const labelsBuffer = fs.readFileSync(labelsPath)
    const datasetLabels = new Uint8Array(labelsBuffer)
    console.log(`✅ 标签加载完成: ${datasetLabels.length} 个`)

    // 加载 PNG 图像
    console.log('加载 MNIST 图像...')
    const imgBuffer = fs.readFileSync(imagesPath)
    
    // 使用 pngjs 解析 PNG 文件
    const png = PNG.sync.read(imgBuffer)
    const img = {
      width: png.width,
      height: png.height,
      data: png.data
    }

    console.log(`✅ 图像加载完成: ${img.width}x${img.height}`)

    // 提取像素数据（直接从 PNG 数据）
    const pixelData = img.data
    const datasetBytesView = new Float32Array(NUM_DATASET_ELEMENTS * IMAGE_SIZE)

    // PNG 数据是 RGBA 格式，将其转换为灰度值
    for (let j = 0; j < IMAGE_SIZE * NUM_DATASET_ELEMENTS; j++) {
      // 只读取红色通道（灰度图），并归一化到 [0, 1]
      datasetBytesView[j] = pixelData[j * 4] / 255
    }

    console.log(`✅ 图像数据提取完成: ${NUM_DATASET_ELEMENTS} 个样本`)

    // 获取训练集数据
    const NUM_TRAIN_LABELS = NUM_TRAIN_ELEMENTS * NUM_CLASSES
    const trainImages = datasetBytesView.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS)
    const trainLabels = datasetLabels.slice(0, NUM_TRAIN_LABELS)

    console.log(`✅ MNIST 数据准备完成: ${NUM_TRAIN_ELEMENTS} 个训练样本`)

    // 转换为张量
    const imagesTensor = tf.tensor4d(trainImages, [NUM_TRAIN_ELEMENTS, 28, 28, 1])
    const labelsTensor = tf.tensor2d(trainLabels, [NUM_TRAIN_ELEMENTS, NUM_CLASSES])

    return { images: imagesTensor, labels: labelsTensor }
  } catch (err) {
    console.warn('⚠️  MNIST 数据加载失败:', err instanceof Error ? err.message : err)
    console.log('请确保 mnist_images.png 和 mnist_labels_uint8 在 ml/data 目录中')
    // 返回空张量
    return {
      images: tf.tensor4d([], [0, 28, 28, 1]),
      labels: tf.tensor2d([], [0, 10])
    }
  }
}

/**
 * 只使用 MNIST 数据集
 */
async function createMNISTDataset(): Promise<{
  trainImages: tf.Tensor4D
  trainLabels: tf.Tensor2D
  testImages: tf.Tensor4D
  testLabels: tf.Tensor2D
}> {
  console.log('加载 MNIST 数据集...')
  const mnistData = await loadMNISTDataset()

  if (mnistData.images.shape[0] === 0) {
    throw new Error('MNIST 数据加载失败')
  }

  // 转换为标准格式 (samples, 28, 28, 1)
  let allImages = mnistData.images as tf.Tensor4D
  let allLabels = mnistData.labels as tf.Tensor2D

  console.log(`加载完成: ${allImages.shape[0]} 个样本`)

  // 打乱数据
  const indices = tf.util.createShuffledIndices(allImages.shape[0])
  const indicesTensor = tf.tensor1d(Array.from(indices), 'int32')
  allImages = tf.gather(allImages, indicesTensor, 0) as tf.Tensor4D
  allLabels = tf.gather(allLabels, indicesTensor, 0) as tf.Tensor2D
  indicesTensor.dispose()

  // 分割为训练集和测试集 (80/20)
  const trainSize = Math.floor(allImages.shape[0] * 0.8)
  const trainImages = allImages.slice([0, 0, 0, 0], [trainSize, 28, 28, 1]) as tf.Tensor4D
  const trainLabels = allLabels.slice([0, 0], [trainSize, 10]) as tf.Tensor2D
  const testImages = allImages.slice([trainSize, 0, 0, 0], [-1, 28, 28, 1]) as tf.Tensor4D
  const testLabels = allLabels.slice([trainSize, 0], [-1, 10]) as tf.Tensor2D

  console.log(`训练集: ${trainImages.shape[0]} 个样本`)
  console.log(`测试集: ${testImages.shape[0]} 个样本`)

  return { trainImages, trainLabels, testImages, testLabels }
}

// ========================
// 构建和训练模型
// ========================

async function trainDigitModel() {
  console.log('开始训练数字识别模型...\n')
  console.log('TensorFlow.js 版本:', tf.version)
  console.log('工作目录:', __dirname)
  console.log('')

  // 创建输出目录
  const modelsDir = path.join(__dirname, '../public/models')
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true })
    console.log(`创建目录: ${modelsDir}`)
  }

  // 创建中间模型检查点目录
  const checkpointDir = path.join(__dirname, 'models')
  if (!fs.existsSync(checkpointDir)) {
    fs.mkdirSync(checkpointDir, { recursive: true })
    console.log(`创建检查点目录: ${checkpointDir}`)
  }

  // 创建数据集
  const { trainImages, trainLabels, testImages, testLabels } = await createMNISTDataset()

  // 构建模型
  const model = tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [28, 28, 1],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same',
      }),
      tf.layers.batchNormalization(),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.dropout({ rate: 0.25 }),

      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same',
      }),
      tf.layers.batchNormalization(),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.dropout({ rate: 0.25 }),

      tf.layers.flatten(),
      tf.layers.dense({
        units: 128,
        activation: 'relu',
      }),
      tf.layers.batchNormalization(),
      tf.layers.dropout({ rate: 0.5 }),
      tf.layers.dense({
        units: 10, // 10 个分类：0-9
        activation: 'softmax',
      }),
    ],
  })

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })

  console.log('模型结构:')
  model.summary()
  console.log('\n')

  // 训练模型
  const CHECKPOINT_INTERVAL = 1 // 每 1 个 epoch 保存一次检查点
  const history = await model.fit(trainImages, trainLabels, {
    batchSize: 128,
    epochs: 10,
    validationData: [testImages, testLabels],
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        console.log(
          `Epoch ${epoch + 1}/10 - loss: ${logs?.loss?.toFixed(4)}, ` +
            `accuracy: ${logs?.acc?.toFixed(4)}, ` +
            `val_loss: ${logs?.val_loss?.toFixed(4)}, ` +
            `val_accuracy: ${logs?.val_acc?.toFixed(4)}`
        )

        // 保存检查点
        if ((epoch + 1) % CHECKPOINT_INTERVAL === 0) {
          const checkpointPath = 'file://' + path.join(checkpointDir, `checkpoint-epoch-${epoch + 1}`)
          console.log(`💾 保存检查点: ${checkpointPath}`)
          await model.save(checkpointPath)
        }
      },
    },
  })

  // 评估模型
  const evalResult = model.evaluate(testImages, testLabels) as tf.Scalar[]
  console.log(`\n最终测试损失: ${evalResult[0].dataSync()[0].toFixed(4)}`)
  console.log(`最终测试准确率: ${evalResult[1].dataSync()[0].toFixed(4)}`)

  // 保存模型
  const modelPath = 'file://' + path.join(__dirname, '../public/models/sudoku-digit')
  console.log(`\n保存模型到: ${modelPath}`)
  await model.save(modelPath)

  console.log('训练完成！')

  // 清理资源
  model.dispose()
  trainImages.dispose()
  trainLabels.dispose()
  testImages.dispose()
  testLabels.dispose()
}

// 运行训练
trainDigitModel()
  .then(() => {
    console.log('✅ 训练成功完成')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ 训练过程中出错:')
    console.error(err)
    if (err.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  })
