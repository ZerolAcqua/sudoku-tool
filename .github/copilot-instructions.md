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
  - 行、列、宫唯余练习
  - 复杂唯余练习
  - 热力图统计错误率（按数字和区域类型）
  - 反应时长分析，平均速度与瞬时速度曲线
  - 统一的按键和键盘输入（数字键1-9，方向键导航）

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

## 其他要求

- 不要经常生成 Readme.md 等文档

