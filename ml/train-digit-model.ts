import * as tf from '@tensorflow/tfjs-node'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { PNG } from 'pngjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ========================
// 数据集加载
// ========================

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

    // 加载标签（二进制文件，10 类 one-hot）
    console.log('加载标签...')
    const labelsBuffer = fs.readFileSync(labelsPath)
    const datasetLabels = new Uint8Array(labelsBuffer)
    console.log(`- 标签加载完成: ${datasetLabels.length} 个`)

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

    console.log(`- 图像加载完成: ${img.width}x${img.height}`)

    // 提取像素数据（直接从 PNG 数据）
    const pixelData = img.data
    const datasetBytesView = new Float32Array(NUM_DATASET_ELEMENTS * IMAGE_SIZE)

    // PNG 数据是 RGBA 格式，将其转换为灰度值
    for (let j = 0; j < IMAGE_SIZE * NUM_DATASET_ELEMENTS; j++) {
      // 只读取红色通道（灰度图），并归一化到 [0, 1]
      datasetBytesView[j] = pixelData[j * 4] / 255
    }

    console.log(`- 图像数据提取完成: ${NUM_DATASET_ELEMENTS} 个样本`)

    // 获取训练集数据
    const trainImages = datasetBytesView.slice(0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS)
    const trainLabels = datasetLabels.slice(0, NUM_TRAIN_ELEMENTS * NUM_CLASSES)

    console.log(`- MNIST 数据准备完成: ${NUM_TRAIN_ELEMENTS} 个训练样本`)

    // 转换为张量
    const imagesTensor = tf.tensor4d(trainImages, [NUM_TRAIN_ELEMENTS, 28, 28, 1])
    const labelsTensor = tf.tensor2d(trainLabels, [NUM_TRAIN_ELEMENTS, NUM_CLASSES], 'float32')

    return { images: imagesTensor, labels: labelsTensor }
  } catch (err) {
    console.warn('- MNIST 数据加载失败:', err instanceof Error ? err.message : err)
    console.log('请确保 mnist_images.png 和 mnist_labels_uint8 在 ml/data 目录中')
    // 返回空张量
    return {
      images: tf.tensor4d([], [0, 28, 28, 1]),
      labels: tf.tensor2d([], [0, 10])
    }
  }
}

/**
 * 加载 TMNIST CSV 数据集
 * TMNIST (Typeface MNIST): 不同字体的数字图片，CSV 格式
 * Kaggle: https://www.kaggle.com/datasets/nimishmagre/tmnist-typeface-mnist
 *
 * CSV 格式:
 *   names,labels,1,2,3,...,784
 *   每行: 字体名,数字(0-9),像素1,像素2,...,像素784
 *
 * 将 CSV 文件放到 ml/data/ 目录，文件名为 tmnist.csv
 */
async function loadTMNISTDataset(): Promise<{
  images: tf.Tensor4D
  labels: tf.Tensor2D
}> {
  const NUM_CLASSES = 10
  const IMAGE_SIZE = 28 * 28

  // 按优先级查找 TMNIST CSV 文件
  const candidateFiles = ['TMNIST_Data.csv', 'tmnist.csv']
  let csvPath = ''
  for (const f of candidateFiles) {
    const p = path.join(__dirname, 'data', f)
    if (fs.existsSync(p)) {
      csvPath = p
      break
    }
  }
  if (!csvPath) {
    console.warn('- TMNIST CSV 未找到')
    console.log('   请从 Kaggle 下载 TMNIST 数据:')
    console.log('   https://www.kaggle.com/datasets/nimishmagre/tmnist-typeface-mnist')
    console.log('   将解压后的 CSV 文件放到 ml/data/ 目录')
    return {
      images: tf.tensor4d([], [0, 28, 28, 1]),
      labels: tf.tensor2d([], [0, NUM_CLASSES]),
    }
  }

  console.log('加载 TMNIST CSV 数据集...')

  // 读取 CSV 文件
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = csvContent.trim().split('\n')

  // 跳过标题行
  const dataLines = lines.slice(1)
  const numSamples = dataLines.length

  console.log(`  总行数(含标题): ${lines.length}, 样本数: ${numSamples}`)

  const imagesArray = new Float32Array(numSamples * IMAGE_SIZE)
  const labelsArray = new Float32Array(numSamples * NUM_CLASSES) // 11 类 one-hot

  let validSamples = 0
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    if (!line || line.trim() === '') continue

    const parts = line.split(',')
    if (parts.length < 786) continue // names(1) + labels(1) + pixels(784) = 786

    // parts[0] = font name, parts[1] = digit label, parts[2..785] = pixels
    const digit = parseInt(parts[1], 10)
    if (isNaN(digit) || digit < 0 || digit > 9) continue

    // 读取像素值 (columns 2-785)
    for (let p = 0; p < IMAGE_SIZE; p++) {
      const pixelVal = parseInt(parts[2 + p], 10)
      // TMNIST 与 MNIST 一样是黑底白字，直接归一化即可
      imagesArray[validSamples * IMAGE_SIZE + p] = (isNaN(pixelVal) ? 0 : pixelVal) / 255
    }

    // One-hot 编码: 10 类
    labelsArray[validSamples * NUM_CLASSES + digit] = 1

    validSamples++

    if ((validSamples) % 50000 === 0) {
      console.log(`  已处理: ${validSamples} 个样本...`)
    }
  }

  console.log(`- TMNIST 加载完成: ${validSamples} 个有效样本`)

  const imagesTensor = tf.tensor4d(imagesArray.slice(0, validSamples * IMAGE_SIZE), [validSamples, 28, 28, 1])
  const labelsTensor = tf.tensor2d(labelsArray.slice(0, validSamples * NUM_CLASSES), [validSamples, NUM_CLASSES])

  return { images: imagesTensor, labels: labelsTensor }
}

// ========================
// 数据增强：二值化
// ========================

/** 二值化阈值列表：模拟不同 OCR 预处理强度 */
const BINARIZATION_THRESHOLDS = [0.3, 0.45, 0.6, 0.8]

/**
 * 对图像张量应用二值化阈值
 * pixel ≥ threshold → 1.0, pixel < threshold → 0.0
 */
function binarizeTensor(images: tf.Tensor4D, threshold: number): tf.Tensor4D {
  return tf.where(
    images.greaterEqual(tf.scalar(threshold)),
    tf.onesLike(images),
    tf.zerosLike(images),
  ) as tf.Tensor4D
}

/**
 * 使用多个二值化阈值扩充数据集
 * 原始数据 + 每个阈值一份二值化副本
 */
function augmentWithBinarization(
  images: tf.Tensor4D,
  labels: tf.Tensor2D,
  thresholds: number[],
): { images: tf.Tensor4D; labels: tf.Tensor2D } {
  const augmentedImages: tf.Tensor4D[] = [images]
  const augmentedLabels: tf.Tensor2D[] = [labels]

  for (const t of thresholds) {
    console.log(`  二值化阈值 ${t.toFixed(2)} ...`)
    const binarized = binarizeTensor(images, t)
    augmentedImages.push(binarized)
    augmentedLabels.push(labels)
  }

  return {
    images: tf.concat(augmentedImages, 0) as tf.Tensor4D,
    labels: tf.concat(augmentedLabels, 0) as tf.Tensor2D,
  }
}

/**
 * 合并 MNIST + TMNIST 数据集，随机打乱并分割训练/测试集
 */
async function createCombinedDataset(): Promise<{
  trainImages: tf.Tensor4D
  trainLabels: tf.Tensor2D
  testImages: tf.Tensor4D
  testLabels: tf.Tensor2D
}> {
  const NUM_CLASSES = 10
  console.log('\n======== 加载数据集 ========\n')

  // 1. 加载 MNIST 数据集
  console.log('[1/2] MNIST 数据集')
  const mnistData = await loadMNISTDataset()
  console.log(`  MNIST: ${mnistData.images.shape[0]} 个样本`)

  // 2. 加载 TMNIST 数据集
  console.log('\n[2/2] TMNIST 数据集')
  const tmnistData = await loadTMNISTDataset()
  console.log(`  TMNIST: ${tmnistData.images.shape[0]} 个样本`)

  // 合并数据集
  console.log('\n======== 合并数据集 ========')
  const imageTensors: tf.Tensor4D[] = []
  const labelTensors: tf.Tensor2D[] = []

  if (mnistData.images.shape[0] > 0) {
    imageTensors.push(mnistData.images)
    labelTensors.push(mnistData.labels)
  }

  if (tmnistData.images.shape[0] > 0) {
    imageTensors.push(tmnistData.images)
    labelTensors.push(tmnistData.labels)
  }

  if (imageTensors.length === 0) {
    throw new Error('没有可用的数据集！请确保 MNIST 或 TMNIST 数据在 ml/data/ 目录中')
  }

  // 沿第 0 维拼接
  let allImages = tf.concat(imageTensors, 0) as tf.Tensor4D
  let allLabels = tf.concat(labelTensors, 0) as tf.Tensor2D

  let totalSamples = allImages.shape[0]
  console.log(`合并后总样本数: ${totalSamples}`)

  // 拼接后立即释放中间张量
  imageTensors.forEach(t => { if (t !== allImages) t.dispose() })
  labelTensors.forEach(t => { if (t !== allLabels) t.dispose() })

  // 二值化数据增强：用多个阈值二值化以模拟不同 OCR 预处理
  console.log('\n======== 二值化增强 ========')
  const augmented = augmentWithBinarization(allImages, allLabels, BINARIZATION_THRESHOLDS)
  allImages.dispose()
  allLabels.dispose()
  allImages = augmented.images
  allLabels = augmented.labels
  totalSamples = allImages.shape[0]
  console.log(`增强后总样本数: ${totalSamples} (${BINARIZATION_THRESHOLDS.length + 1}x)`)

  // 统计各类别分布
  const labelArgMax = allLabels.argMax(1).dataSync()
  const classCount: Record<number, number> = {}
  for (let i = 0; i < labelArgMax.length; i++) {
    const c = labelArgMax[i]
    classCount[c] = (classCount[c] || 0) + 1
  }
  console.log('类别分布:')
  for (let c = 0; c < NUM_CLASSES; c++) {
    console.log(`  数字 ${c}: ${classCount[c] || 0} 个样本`)
  }

  // 打乱数据
  console.log('\n打乱数据...')
  const indices = tf.util.createShuffledIndices(totalSamples)
  const indicesTensor = tf.tensor1d(Array.from(indices), 'int32')
  allImages = tf.gather(allImages, indicesTensor, 0) as tf.Tensor4D
  allLabels = tf.gather(allLabels, indicesTensor, 0) as tf.Tensor2D
  indicesTensor.dispose()

  // 分割为训练集和测试集 (80/20)
  const trainSize = Math.floor(totalSamples * 0.8)
  const trainImages = allImages.slice([0, 0, 0, 0], [trainSize, 28, 28, 1]) as tf.Tensor4D
  const trainLabels = allLabels.slice([0, 0], [trainSize, NUM_CLASSES]) as tf.Tensor2D
  const testImages = allImages.slice([trainSize, 0, 0, 0], [-1, 28, 28, 1]) as tf.Tensor4D
  const testLabels = allLabels.slice([trainSize, 0], [-1, NUM_CLASSES]) as tf.Tensor2D

  console.log(`训练集: ${trainImages.shape[0]} 个样本`)
  console.log(`测试集: ${testImages.shape[0]} 个样本`)
  console.log('================================\n')

  return { trainImages, trainLabels, testImages, testLabels }
}

// ========================
// 构建和训练模型
// ========================

function buildModel(): tf.LayersModel {
  return tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [28, 28, 1],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.0005 }),
      }),
      tf.layers.batchNormalization(),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.dropout({ rate: 0.3 }),

      tf.layers.conv2d({
        filters: 64,
        kernelSize: 3,
        activation: 'relu',
        padding: 'same',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.0005 }),
      }),
      tf.layers.batchNormalization(),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.dropout({ rate: 0.3 }),

      tf.layers.flatten(),
      tf.layers.dense({
        units: 128,
        activation: 'relu',
        kernelRegularizer: tf.regularizers.l2({ l2: 0.0005 }),
      }),
      tf.layers.batchNormalization(),
      tf.layers.dropout({ rate: 0.5 }),
      tf.layers.dense({
        units: 10, // 10 个分类：0-9
        activation: 'softmax',
      }),
    ],
  })
}

function getLatestCheckpoint(dir: string): { modelPath: string; epoch: number } | null {
  if (!fs.existsSync(dir)) {
    return null
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let maxEpoch = -1
  let maxDir = ''

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }
    const match = entry.name.match(/^checkpoint-epoch-(\d+)$/)
    if (!match) {
      continue
    }
    const epoch = Number(match[1])
    if (Number.isFinite(epoch) && epoch > maxEpoch) {
      maxEpoch = epoch
      maxDir = entry.name
    }
  }

  if (maxEpoch < 0) {
    return null
  }

  const modelPath = path.join(dir, maxDir, 'model.json')
  if (!fs.existsSync(modelPath)) {
    return null
  }

  return { modelPath, epoch: maxEpoch }
}

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

  // 创建数据集（合并 MNIST + TMNIST + 合成数据）
  const { trainImages, trainLabels, testImages, testLabels } = await createCombinedDataset()

  const TOTAL_EPOCHS = 30
  const CHECKPOINT_INTERVAL = 1 // 每个 epoch 保存一次检查点

  // 续训：如果存在最新检查点则加载
  const latestCheckpoint = getLatestCheckpoint(checkpointDir)
  let model: tf.LayersModel
  let initialEpoch = 0

  if (latestCheckpoint) {
    console.log(`发现检查点: ${latestCheckpoint.modelPath} (epoch ${latestCheckpoint.epoch})`)
    model = await tf.loadLayersModel('file://' + latestCheckpoint.modelPath)
    initialEpoch = latestCheckpoint.epoch
  } else {
    model = buildModel()
  }

  model.compile({
    optimizer: tf.train.adam(0.001), // 恢复学习率
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })

  console.log('模型结构:')
  model.summary()
  console.log('\n')

  // 训练模型
  if (initialEpoch >= TOTAL_EPOCHS) {
    console.log(`检查点已达到目标轮次 (${initialEpoch}/${TOTAL_EPOCHS})，跳过训练。`)
  } else {
    await model.fit(trainImages, trainLabels, {
      batchSize: 128,
      epochs: TOTAL_EPOCHS,
      initialEpoch,
      validationData: [testImages, testLabels],
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(
            `Epoch ${epoch + 1}/${TOTAL_EPOCHS} - loss: ${logs?.loss?.toFixed(4)}, ` +
              `accuracy: ${logs?.acc?.toFixed(4)}, ` +
              `val_loss: ${logs?.val_loss?.toFixed(4)}, ` +
              `val_accuracy: ${logs?.val_acc?.toFixed(4)}`
          )

          // 保存检查点
          if ((epoch + 1) % CHECKPOINT_INTERVAL === 0) {
            const checkpointPath = 'file://' + path.join(checkpointDir, `checkpoint-epoch-${epoch + 1}`)
            console.log(`- 保存检查点: ${checkpointPath}`)
            await model.save(checkpointPath)
          }
        },
      },
    })
  }

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
    console.log('训练成功完成')
    process.exit(0)
  })
  .catch(err => {
    console.error('训练过程中出错:')
    console.error(err)
    if (err.stack) {
      console.error(err.stack)
    }
    process.exit(1)
  })
