// 数独基础类型
export type SudokuGrid = number[][];
export type CandidatesGrid = number[][][];
export type GivenMask = boolean[][];

// 单元格坐标
export interface CellPosition {
  row: number;
  col: number;
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

// 链样式
export type ChainStyle = 'solid' | 'dashed' | 'dotted';

// 链配置
export interface Chain {
  cells: CellPosition[];
  style?: ChainStyle;
  color: string;
  strokeWidth?: number;
  arrow?: boolean; // 是否显示箭头
}

// 坐标转换函数类型
export type CoordTransform = (row: number, col: number) => { x: number; y: number };
