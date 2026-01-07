// 数独基础类型
export type SudokuGrid = number[][];
export type CandidatesGrid = number[][][];
export type GivenMask = boolean[][];

// 单元格坐标
export interface CellPosition {
  row: number;
  col: number;
}

// 链节点（支持候选级坐标与偏移）
export interface ChainNode extends CellPosition {
  candidate?: number; // 1-9，对应格内候选数位置
  offset?: { x: number; y: number }; // 像素级偏移，用于微调
}

// 自定义高亮配置
export interface CellHighlight {
  cells: CellPosition[];
  color: string;
  opacity?: number;
}

// 标记类型（摒除线等）
export type MarkerType = 'circle' | 'cross' | 'dot' | 'star' | 'line';

// 单元格标记配置
export interface CellMarker {
  cell?: CellPosition; // 单个单元格标记
  cells?: CellPosition[]; // 多个单元格（用于线段）
  type: MarkerType;
  color: string;
  size?: number;
  strokeWidth?: number;
}

// 候选数强调标记：在候选数字位置绘制实心圆
export interface CandidateMarker extends CellPosition {
  candidate: number; // 1-9
  color: string; // 填充颜色
  size?: number; // 半径（像素），默认基于 cellSize 比例
  opacity?: number; // 透明度，默认 0.85
}

// 链样式
export type ChainStyle = 'solid' | 'dashed' | 'dotted';

// 链配置
export interface Chain {
  cells: ChainNode[];
  style?: ChainStyle;
  color: string;
  strokeWidth?: number;
  arrow?: boolean; // 是否显示箭头
  curve?: 'straight' | 'smooth'; // 直线或平滑曲线
}

// 坐标转换函数类型
export type CoordTransform = (row: number, col: number) => { x: number; y: number };
