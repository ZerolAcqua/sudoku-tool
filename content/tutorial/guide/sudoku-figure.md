# sudoku 盘面

正文里语言标记为 `sudoku` 的代码块会渲染成盘面。代码块内容是 YAML：`puzzle` 写盘面，其余字段描述要画的东西。
写成 ```` ```sudoku source ```` 时，盘面下方会附上可展开的源码，本页的例子都是这样写的。

坐标与颜色的写法见 [坐标与颜色](sudoku-coordinates.md)，`puzzle` 支持的盘面格式见 [数独文本格式](sudoku-text-formats.md)。

## 静态盘面

只写 `puzzle` 就是一张静态图，`caption` 是图注：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
caption: 一道初盘
```

## 高亮

`highlight` 给格子铺底色，默认黄色。可以只写坐标，也可以写成对象指定颜色和透明度；多处高亮写成列表：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
highlight:
  - b5
  - { cells: r1, color: blue }
  - { cells: r9c9, color: green, opacity: 0.6 }
```

## 标记与摒除线

`markers` 在格子上画圆圈、叉号、圆点或星号，默认红色；`lines` 从一格画线到另一格，常用来表示摒除：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
markers:
  - { type: circle, at: r3c3, color: blue }
  - { type: cross, at: r3c4 r3c5 }
  - { type: dot, at: r1c1 }
  - { type: star, at: r9c1, color: yellow }
lines:
  - { from: r3c3, to: r3c6 }
```

## 候选数

题面带候选数信息（如 Susser 格式里的二次删数、铅笔盘面）时自动显示候选数，也可以用 `showCandidates` 强制开关。
`candidates` 用圆点强调候选数（默认绿色），`eliminate` 标出要删去的候选（默认红色）：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
showCandidates: true
candidates: r3c5(46)
eliminate: r3c4(4)
```

## 链

`chains` 画链。节点之间用 `==` 连接表示强链（实线），`--` 表示弱链（虚线）；
`arrow` 显示箭头，`curve: smooth` 画成弧线，`width` 是线宽：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
showCandidates: true
chains:
  - path: r3c4(4) == r3c5(4) -- r5c5(4)
    arrow: true
  - path: r7c4(6) == r7c6(6)
    color: purple
    curve: smooth
```

## 改动盘面

`place` 填数（如 `r6c7=4`），同行、列、宫里的这个候选会自动删去；`remove` 删去候选（如 `r3c4(4)`）。
填入的数用赭色显示，与提示数区分：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
showCandidates: true
place: r6c7=4
remove: r3c4(4)
```

## 多帧动画

写了 `frames` 时，每一项是一帧，盘面在各帧之间循环播放，用来一步步演示推理：

- 每帧在上一帧的基础上**累加**；写 `reset: true` 清空之前的绘图（已经填的数和删的候选保留）。
- 每帧的 `caption` 是这一步的说明，显示在盘面下方，支持行内 Markdown 与[站内链接](links.md)。
- `interval` 是每帧的默认停留时间（毫秒，默认 2500），单帧可用 `duration` 覆盖；`autoplay: false` 关闭自动播放。
- 手动点上一步 / 下一步会停止自动播放；盘面滚出屏幕、或系统开启了「减少动态效果」时也不会自动播放。

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
interval: 2000
frames:
  - caption: 第一帧：高亮第 5 宫。
    highlight: b5
  - caption: 第二帧：**累加**一个圆圈。
    markers: { type: circle, at: r5c5, color: blue }
  - caption: 第三帧：`reset` 清空，改为高亮第 1 行，停留 4 秒。
    reset: true
    highlight: r1
    duration: 4000
```

## 字段一览

| 字段 | 位置 | 说明 |
| --- | --- | --- |
| `puzzle` | 顶层，必填 | 盘面文本，支持[七种格式](sudoku-text-formats.md) |
| `caption` | 顶层 / 帧 | 顶层是图注，帧里是这一步的说明 |
| `showCandidates` | 顶层 | 是否显示候选数，缺省按题面是否带候选信息 |
| `autoplay` · `interval` | 顶层 | 自动播放与默认停留时间 |
| `frames` | 顶层 | 帧列表；不写时顶层的绘图字段就是唯一一帧 |
| `reset` · `duration` | 帧 | 清空之前的绘图、本帧停留时间 |
| `highlight` | 帧 | 格子底色 |
| `markers` · `lines` | 帧 | 标记、摒除线 |
| `candidates` · `eliminate` | 帧 | 强调 / 标出要删的候选 |
| `chains` | 帧 | 链 |
| `place` · `remove` | 帧 | 填数、删候选 |

字段名写错、坐标写错、颜色不认识时，构建会直接报错并指出文件、行号和字段位置。
