# 坐标与颜色

## 坐标写法

坐标沿用数独书里通用的 `r行c列` 写法，行列都从 1 开始：

| 写法 | 含义 |
| --- | --- |
| `r4c5` | 第 4 行第 5 列的一格 |
| `r4c46` | r4c4 与 r4c6 两格（行列可以各写多个数字，取所有组合） |
| `r12c3` | r1c3 与 r2c3 |
| `r1` · `c5` · `b5` | 整行、整列、整宫（宫从左上到右下编号 1–9） |
| `r4c46(17)` | 这两格里的候选数 1 和 7 |

多个坐标用空格或逗号分隔，例如 `r1c1 r9c9` 或 `b1, b9`。

需要候选数的地方（`candidates`、`eliminate`、`remove`）必须写括号；只要格子的地方（`highlight`、`markers`）不能写括号；
链的节点是单个格，最多带一个候选数，如 `r4c5(7)`。

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
caption: 黄色 b5，蓝色 r1，绿色 c9，红色 r79c12
highlight:
  - b5
  - { cells: r1, color: blue }
  - { cells: c9, color: green }
  - { cells: r79c12, color: red }
```

## 颜色

颜色与[绘图工具](/draw)的色板一致，用英文名引用；也可以直接写 `#rrggbb`，但为了全书风格统一，尽量用色板颜色：

```sudoku source
puzzle: .................................................................................
caption: red · orange · yellow · green · teal · blue · purple · pink
highlight:
  - { cells: r5c1, color: red, opacity: 0.6 }
  - { cells: r5c2, color: orange, opacity: 0.6 }
  - { cells: r5c3, color: yellow, opacity: 0.6 }
  - { cells: r5c4, color: green, opacity: 0.6 }
  - { cells: r5c5, color: teal, opacity: 0.6 }
  - { cells: r5c6, color: blue, opacity: 0.6 }
  - { cells: r5c7, color: purple, opacity: 0.6 }
  - { cells: r5c8, color: pink, opacity: 0.6 }
  - { cells: r5c9, color: "#888888", opacity: 0.6 }
```

各字段的默认颜色：高亮黄色、候选强调绿色、删数红色、标记与摒除线红色、链蓝色。
