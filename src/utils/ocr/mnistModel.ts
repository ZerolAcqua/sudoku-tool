import * as tf from '@tensorflow/tfjs';
import { logger } from '@/utils/logger';

let model: tf.LayersModel | null = null;
let modelUrlOverride: string | null = null;

/**
 * 覆盖模型加载地址（测试/工具脚本用）。
 * 浏览器默认从 /models/sudoku-digit 加载；Node 测试可传入 file:// 路径。
 */
export function setModelUrl(url: string): void {
  modelUrlOverride = url;
}

function getModelUrl(): string {
  if (modelUrlOverride) {
    return modelUrlOverride;
  }
  // 添加时间戳参数，防止浏览器缓存
  const timestamp = new Date().getTime();
  return `/models/sudoku-digit/model.json?t=${timestamp}`;
}

export async function loadMnistModel() {
  if (!model) {
    try {
      logger.info('[loadMnistModel] 开始加载模型...');
      model = await tf.loadLayersModel(getModelUrl());
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
