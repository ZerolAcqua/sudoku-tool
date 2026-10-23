// 站点功能入口：首页功能卡与各功能页页头共用（标题、描述、图标一处维护）
import type { Component } from 'vue';
import { BookOpen, Grid3x3, PenLine, ScanText } from '@lucide/vue';

export type FeatureKey = 'practice' | 'draw' | 'solver' | 'tutorial';

export interface Feature {
  key: FeatureKey;
  title: string;
  description: string;
  action: string;
  path: string;
  icon: Component;
}

export const FEATURES: Feature[] = [
  {
    key: 'practice',
    title: '唯余练习',
    description: '多种题型、多种难度，专项训练唯余判断能力。',
    action: '开始练习',
    path: '/practice',
    icon: Grid3x3,
  },
  {
    key: 'draw',
    title: '绘图工具',
    description: '标记候选数、链、摒除线等，探索数独的更多解法。',
    action: '进入工具',
    path: '/draw',
    icon: PenLine,
  },
  {
    key: 'solver',
    title: '数独识别',
    description: '上传图片智能识别，快速生成可编辑盘面。',
    action: '开始识别',
    path: '/solver',
    icon: ScanText,
  },
  {
    key: 'tutorial',
    title: '数独教程',
    description: '千题千解，图文详解，掌握解题思路。',
    action: '查看教程',
    path: '/tutorial',
    icon: BookOpen,
  },
];

export const FEATURE_BY_KEY = Object.fromEntries(FEATURES.map((f) => [f.key, f])) as Record<
  FeatureKey,
  Feature
>;
