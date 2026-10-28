// 绘图颜色单一来源：绘图页色板、工具栏与教程盘面（YAML 里按 key 引用）共用。
// 八色明度与饱和度相近（同一档「step 9」），叠在白盘面上不刺眼；黄色是数独标注最常用的高亮色
// 盘面绘制色是数据驱动的，允许高饱和（见 AGENTS.md）
export interface DrawingColor {
  key: string;
  name: string;
  value: string;
}

export const DRAWING_COLORS: DrawingColor[] = [
  { key: 'red', name: '红色', value: '#e5484d' },
  { key: 'orange', name: '橙色', value: '#f76b15' },
  { key: 'yellow', name: '黄色', value: '#e5a50a' },
  { key: 'green', name: '绿色', value: '#30a46c' },
  { key: 'teal', name: '青色', value: '#12a594' },
  { key: 'blue', name: '蓝色', value: '#3e63dd' },
  { key: 'purple', name: '紫色', value: '#8e4ec6' },
  { key: 'pink', name: '粉色', value: '#d6409f' },
];
