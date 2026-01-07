# 数独盘面组件架构设计

## 当前问题

1. 样式需求多变（高亮类型、颜色、交互方式）
2. 未来需要复杂标记（区域高亮、链关系绘制、圈注等）
3. 教学演示需要更丰富的视觉元素
4. 如何在保持组件简洁的同时支持扩展？

## 推荐方案：**配置化 + 插槽混合架构**

### 核心思路

```
SudokuBoard (基础盘面)
  ├── 配置化属性 (props) - 简单场景
  │   ├── highlightConfig: { type, cells, color }
  │   ├── markersConfig: [{ cell, type, color, text }]
  │   └── chainsConfig: [{ from, to, style }]
  │
  └── 插槽 (slots) - 复杂场景
      ├── <slot name="overlay"> - 自定义叠加层
      ├── <slot name="decorations"> - 装饰元素
      └── <slot name="annotations"> - 注解文本
```

### 1. 短期方案（当前已实现）

**配置化高亮**：通过 `focusHighlight` prop 控制高亮类型
```vue
<SudokuBoard 
  :focusCell="cell"
  focusHighlight="row"  // 'row' | 'col' | 'box' | 'all' | 'none'
/>
```

### 2. 中期方案（推荐实施）

**扩展配置化属性**，支持更多标记类型：

```typescript
// types/sudoku.ts
interface CellHighlight {
  cells: Array<{row: number, col: number}>
  color: string
  opacity?: number
}

interface CellMarker {
  cell: {row: number, col: number}
  type: 'circle' | 'cross' | 'dot' | 'star'
  color: string
  size?: number
}

interface Chain {
  cells: Array<{row: number, col: number}>
  style: 'solid' | 'dashed'
  color: string
  arrow?: boolean
}

// SudokuBoard.vue
defineProps({
  // ... 现有 props
  customHighlights: { type: Array as PropType<CellHighlight[]>, default: () => [] },
  markers: { type: Array as PropType<CellMarker[]>, default: () => [] },
  chains: { type: Array as PropType<Chain[]>, default: () => [] },
})
```

**使用示例**：
```vue
<SudokuBoard 
  :board="board"
  :customHighlights="[
    { cells: [{row: 0, col: 0}, {row: 0, col: 1}], color: '#ffeb3b', opacity: 0.3 }
  ]"
  :markers="[
    { cell: {row: 2, col: 3}, type: 'circle', color: 'red' }
  ]"
  :chains="[
    { cells: [{row: 0, col: 0}, {row: 0, col: 5}], style: 'solid', color: 'blue', arrow: true }
  ]"
/>
```

### 3. 长期方案（未来扩展）

**插槽系统**，用于完全自定义的复杂场景：

```vue
<template>
  <svg :width="size" :height="size" viewBox="-10 -10 920 920">
    <!-- 基础盘面 -->
    <g><!-- 网格、数字等 --></g>
    
    <!-- 插槽：自定义叠加层 -->
    <g class="overlay-layer">
      <slot name="overlay" :cellSize="100" :toSVG="toSVGCoord">
        <!-- 默认高亮 -->
      </slot>
    </g>
    
    <!-- 插槽：装饰元素 -->
    <g class="decoration-layer">
      <slot name="decorations" :cellSize="100" :toSVG="toSVGCoord">
        <!-- 默认标记 -->
      </slot>
    </g>
    
    <!-- 插槽：注解文本 -->
    <g class="annotation-layer">
      <slot name="annotations" :cellSize="100" :toSVG="toSVGCoord" />
    </g>
  </svg>
</template>
```

**使用示例**：
```vue
<SudokuBoard :board="board">
  <template #overlay="{ cellSize, toSVG }">
    <!-- 完全自定义的高亮 -->
    <rect :x="toSVG(0, 0).x" :y="toSVG(0, 0).y" 
          :width="cellSize" :height="cellSize" 
          fill="yellow" opacity="0.5" />
  </template>
  
  <template #decorations="{ toSVG }">
    <!-- 自定义链绘制 -->
    <ChainRenderer :cells="chainCells" :toSVG="toSVG" />
  </template>
</SudokuBoard>
```

### 4. 组件拆分建议

创建专门的子组件处理复杂功能：

```
components/
├── SudokuBoard.vue          # 基础盘面
├── SudokuHighlight.vue      # 高亮层组件
├── SudokuMarkers.vue        # 标记层组件
├── SudokuChains.vue         # 链绘制组件
└── SudokuAnnotations.vue    # 注解层组件
```

每个子组件接收坐标转换函数和配置：
```vue
<!-- SudokuChains.vue -->
<template>
  <g>
    <path v-for="chain in chains" 
          :d="buildChainPath(chain)" 
          :stroke="chain.color" />
  </g>
</template>

<script setup>
defineProps({
  chains: Array,
  cellSize: Number,
  toSVG: Function
})
</script>
```

## 实施路径

### 阶段 1（已完成）✅
- 基础盘面组件
- 简单高亮控制（focusHighlight）

### 阶段 2（建议下一步）
- 添加 `customHighlights` prop
- 添加 `markers` prop 支持基础标记
- 创建独立的标记组件

### 阶段 3（教学功能开发时）
- 实现 `chains` prop
- 创建链绘制组件
- 添加插槽系统

### 阶段 4（高级功能）
- 完整的插槽 API
- 动画支持
- 导出标记数据

## 优势分析

### 配置化方案
✅ 简单场景使用方便
✅ 类型安全
✅ 易于序列化（保存/分享）
❌ 复杂场景受限

### 插槽方案
✅ 完全灵活
✅ 支持任意复杂度
❌ 使用门槛较高
❌ 难以序列化

### 混合方案（推荐）
✅ 简单场景用配置
✅ 复杂场景用插槽
✅ 渐进式学习成本
✅ 保持组件核心简洁

## 示例：教学演示盘面

```vue
<SudokuBoard
  :board="puzzleBoard"
  :given="givenMask"
  :customHighlights="[
    { cells: rowCells, color: '#E8F4F8', opacity: 0.5 },
    { cells: candidateCells, color: '#FFF9C4', opacity: 0.3 }
  ]"
  :markers="[
    { cell: {row: 2, col: 3}, type: 'circle', color: '#f44336' },
    { cell: {row: 2, col: 5}, type: 'cross', color: '#2196f3' }
  ]"
  :chains="[
    { 
      cells: [{row: 0, col: 0}, {row: 0, col: 5}, {row: 5, col: 5}],
      style: 'solid',
      color: '#4caf50',
      arrow: true
    }
  ]"
>
  <template #annotations="{ toSVG }">
    <text :x="toSVG(0, 0).x + 50" :y="toSVG(0, 0).y - 15" 
          class="teaching-note">
      这里是唯余数字
    </text>
  </template>
</SudokuBoard>
```

## 总结

**当前阶段**：使用配置化 prop（如 `focusHighlight`），足够应对练习工具需求

**近期目标**：扩展配置化属性（`customHighlights`, `markers`），满足大部分教学标记需求

**长期规划**：引入插槽系统，支持完全自定义的复杂演示场景

这样的架构既保持了组件的简洁性，又为未来扩展留出了空间。
