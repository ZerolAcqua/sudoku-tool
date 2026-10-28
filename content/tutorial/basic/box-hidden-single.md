# 宫摒除

**宫摒除**是最基础的技巧：选定一个数字和一个宫，用同行、同列已有的这个数字把宫内的格子逐一排除，
如果最后只剩一个格子，这个数字就只能填在那里。

## 例题

下面以第 2 宫的数字 3 为例。

```sudoku
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
caption: 第 2 宫的 3 只能填在 r1c6
frames:
  - caption: 观察第 2 宫（b2），它还没有数字 3。
    highlight: b2
  - caption: r3c3 的 3 排除了第 3 行。
    markers: { type: circle, at: r3c3, color: blue }
    lines: { from: r3c3, to: r3c6 }
  - caption: r9c5 和 r6c4 的 3 分别排除了第 5 列和第 4 列。
    markers: { type: circle, at: r9c5 r6c4, color: blue }
    lines:
      - { from: r9c5, to: r1c5 }
      - { from: r6c4, to: r1c4 }
  - caption: 宫内只剩 **r1c6**（r2c6 已有数字 2），填入 3。
    highlight: { cells: r1c6, color: green, opacity: 0.45 }
    place: r1c6=3
```

## 小结

同样的思路可以对任意一个宫、任意一个数字反复使用。它和 [唯余法](naked-single.md) 是最常用的两种出数方法；
到了候选数阶段，类似的思路会发展为 [唯一矩形](../ur/ur-type-4.md) 等更复杂的技巧。

> 你好！

```
fdsafasf

fdsafasdf

fdsafdasf

dfdsa
```