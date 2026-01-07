# 丘卡的数独小站 - Vue 项目说明

## 项目概述

一个功能完善的数独工具网站，提供数独识别、解算、练习和绘图功能。

## 技术栈

- Vue 3 + Vite
- TypeScript
- SVG
- TailwindCSS（计划）
- Pinia（计划）
- TensorFlow.js / ONNX Runtime Web（数独识别，计划）


## 项目结构

```
src/
├── main.ts                 # 入口文件
├── App.vue                 # 根组件
├── components/             # UI 组件
│   ├── SudokuBoard.vue    # 数独盘面（已实现）
│   ├── SudokuInput.vue    # 输入控制（待实现）
│   └── StatisticsChart.vue # 统计图表（待实现）
├── composables/            # 组合式函数（待创建）
│   ├── useSudokuSolver.ts # 解算逻辑
│   ├── useSudokuOCR.ts    # 识别逻辑
│   └── useStatistics.ts   # 统计数据
├── stores/                 # Pinia 状态管理（待创建）
│   └── sudoku.ts
├── types/                  # TypeScript 类型定义（待创建）
│   └── sudoku.ts
├── utils/                  # 工具函数（待创建）
│   ├── validator.ts       # 数独验证
│   ├── generator.ts       # 数独生成
│   └── solver.ts          # 解算器
└── assets/                 # 静态资源
```


## 下一步开发计划

- 数独解算器
  - 实现逻辑解法和回溯法
- 唯余练习工具
  - 参考 sudokufans.org.cn/tools/finder.php
  - 行、列、宫唯一数练习
  - 一般唯余练习
  - 热力图统计错误率（按数字和区域类型）（跳过）
  - 反应时长分析，平均速度与瞬时速度曲线（跳过）

- 绘图功能增强
  - 参考 Sudoku Studio
  - 区分已知数和填入数样式
  - 绘制演示图（标记候选数、圈注等）
  - 链绘制（重点）：点击单元格连接，单元格放大视图，链条编辑器
  - 支持绘图数据导出为 JSON

- 数独识别
  - 纯前端实现（TensorFlow.js / ONNX Runtime Web）
  - 目标检测与图像纠正
  - 数字 OCR 识别

- 千题千解文档化（交互式电子书）
  - 类似 GitBook 的电子书系统，左侧目录导航 + 右侧内容
  - Markdown 解析渲染（markdown-it），自定义插入 `sudoku` 块语法
  - 嵌入式可玩数独：点击即可互动
  - 题解步骤可视化
  - 参考库：markdown-it, markdown-it-container


## 网站风格要求

- 整体为简约风格
- 避免高饱和度鲜艳色彩
- icon 使用要克制，避免堆砌
- 各页面风格保持一致

## 配色方案

### 基础色彩
- **主色调**：`#007acc` (蓝色，用于强调和链接)
- **背景色**：`#ffffff` (白色)
- **卡片背景**：`#f9fafb` (极浅灰)
- **边框色**：`#e5e7eb` (浅灰)

### 文字颜色
- **标题文字**：`#111827` (深灰，gray-900)
- **正文文字**：`#374151` (中深灰，gray-700)
- **次要文字**：`#6b7280` (中灰，gray-500)
- **禁用文字**：`#9ca3af` (浅灰，gray-400)

### 按钮样式
- **默认按钮**：
  - 背景：`#f3f4f6` (gray-100)
  - 文字：`#374151` (gray-700)
  - 边框：`#9ca3af` (gray-400)
  - 悬停：`#e5e7eb` (gray-200)
- **主要操作按钮**（慎用）：
  - 背景：`#007acc`
  - 文字：`#ffffff`
  - 悬停：`#0066b3`

### 数独盘面配色
- **已知数字**：`#000000` (黑色)
- **填入数字**：`#00bb55` (绿色)
- **候选数字**：`#444444` (深灰)
- **选中单元格背景**：`#D6ECFF` (浅蓝)
- **关联单元格背景**：`#E8F4F8` (极浅蓝)
- **悬停单元格背景**：`#BBDEFB` (中浅蓝)
- **选中边框**：`#007acc` (主色调蓝)

### 使用原则
- 统一使用 TailwindCSS 预设颜色 (gray 系列)
- 避免使用高饱和色彩 (red, yellow, green, purple 等)
- 按钮保持统一样式，不用颜色区分功能
- 交互反馈使用透明度和灰度变化

## 其他要求

- 不要经常生成 Readme.md 等文档

