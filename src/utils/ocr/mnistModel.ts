import * as tf from '@tensorflow/tfjs'

let model: tf.LayersModel | null = null

export async function loadMnistModel() {
  if (!model) {
    try {
      console.log('[loadMnistModel] 开始加载模型...')
      // 添加时间戳参数，防止浏览器缓存
      const timestamp = new Date().getTime()
      model = await tf.loadLayersModel(`/models/sudoku-digit/model.json?t=${timestamp}`)
      console.log('[loadMnistModel] 模型加载成功')
      console.log('[loadMnistModel] 模型输入形状:', model.inputs[0]?.shape)
      console.log('[loadMnistModel] 模型输出形状:', model.outputs[0]?.shape)
    } catch (error) {
      console.error('[loadMnistModel] 模型加载失败:', error)
      throw error
    }
  }
  return model
}

export function disposeMnistModel() {
  if (model) {
    model.dispose()
    model = null
  }
}
