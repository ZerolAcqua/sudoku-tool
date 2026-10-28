---
title: UR Type 4
category: ur
order: 4
description: 矩形一侧被某数强链锁定时的排除。
---

# 唯一矩形 类型 4

标准数独只有唯一解。如果四个格子在两行、两列、两个宫内都只能填同样两个数，
它们就能互换而产生第二个解——这种「致命结构」不可能出现，可以据此排除候选。

```sudoku
puzzle: ....8+3......5.2.....3..+71...5+9....2.8..+29...66+2+1375+4+89+915.2.83+7....5.......739...:882 883 484 684 486 686 188 189
caption: 唯一矩形类型 4：r4c46 删去 1
frames:
  - caption: r8c4、r8c6 都只剩 1、8 两个候选。
    highlight: r8c46
    candidates: r8c46(18)
  - caption: r4c4、r4c6 也都含 1、8。四格在两行、两列、两个宫内，构成矩形。
    highlight: r4c46
    candidates: { at: r4c46(18), color: yellow }
  - caption: 第 4 行的 8 只能在 r4c4 或 r4c6，二者间是**强链**：至少有一个是 8。
    chains: { path: r4c4(8) == r4c6(8), curve: smooth }
  - caption: 若 r4c4 或 r4c6 再填 1，四格就只剩 1、8，形成致命结构。因此两格都不能是 1。
    eliminate: r4c46(1)
  - caption: 删去 r4c46 的候选 1。
    remove: r4c46(1)
```
