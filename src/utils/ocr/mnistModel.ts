import * as tf from '@tensorflow/tfjs';
import { logger } from '@/utils/logger';

let model: tf.LayersModel | null = null;

export async function loadMnistModel() {
  if (!model) {
    try {
      logger.info('[loadMnistModel] 开始加载模型...');
      // 添加时间戳参数，防止浏览器缓存
      const timestamp = new Date().getTime();
      model = await tf.loadLayersModel(`/models/sudoku-digit/model.json?t=${timestamp}`);
      logger.info('[loadMnistModel] 模型加载成功');
      logger.debug('[loadMnistModel] 模型输入形状:', model.inputs[0]?.shape);
      logger.debug('[loadMnistModel] 模型输出形状:', model.outputs[0]?.shape);
    } catch (error) {
      logger.error('[loadMnistModel] 模型加载失败:', error);
      throw error;
    }
  }
  return model;
}

export function disposeMnistModel() {
  if (model) {
    model.dispose();
    model = null;
  }
}
