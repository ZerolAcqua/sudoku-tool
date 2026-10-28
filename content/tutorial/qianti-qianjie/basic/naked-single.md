# 唯余法

**唯余法**（Naked Single）：观察一个空格，把它所在的行、列、宫里已经出现的数字都排除掉，
如果只剩下一个数字，这一格就只能填它。

## 思路

一个格子同时属于一行、一列、一宫。这三个区域里出现过的数字，这一格都不能再填。
九个数字排除掉八个，剩下的一个就是答案。

## 例题

以 r6c7 为例：

```sudoku
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
caption: r6c7 只剩 4
frames:
  - caption: 观察 **r6c7**。
    highlight: { cells: r6c7, color: green, opacity: 0.45 }
  - caption: 同一行已有 3、5、6、7、9。
    highlight: { cells: r6, opacity: 0.2 }
    markers: { type: circle, at: r6c1 r6c4 r6c5 r6c6 r6c9, color: blue }
  - caption: 同一列已有 1、8。
    reset: true
    highlight:
      - { cells: r6c7, color: green, opacity: 0.45 }
      - { cells: c7, opacity: 0.2 }
    markers: { type: circle, at: r3c7 r7c7, color: blue }
  - caption: 同一宫已有 2、6、9。
    reset: true
    highlight:
      - { cells: r6c7, color: green, opacity: 0.45 }
      - { cells: b6, opacity: 0.2 }
    markers: { type: circle, at: r4c8 r5c9 r6c9, color: blue }
  - caption: 1–9 里只剩 **4** 没有出现，r6c7 填 4。
    reset: true
    highlight: { cells: r6c7, color: green, opacity: 0.45 }
    place: r6c7=4
```

## 小结

- 唯余法看的是**一个格子**能填哪些数，[宫摒除](box-hidden-single.md)看的是**一个数字**能填在哪些格子，两者互为补充。
- 在候选数盘面上，唯余就是「某格只剩一个候选」，一眼就能看出来。
- 可以去 [唯余练习](/practice) 专项训练。
