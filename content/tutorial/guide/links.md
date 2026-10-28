# 链接

## 文章之间的链接

链接直接写目标 `.md` 文件的相对路径，构建时会改写为站内跳转。
其他书的文章也一样，从当前文件出发数 `../` 即可：

| 写法 | 效果 |
| --- | --- |
| `[Markdown 基础语法](markdown.md)` | [Markdown 基础语法](markdown.md)（同目录） |
| `[简介](README.md)` | [简介](README.md)（本书首页） |
| `[宫摒除](../qianti-qianjie/basic/box-hidden-single.md)` | [宫摒除](../qianti-qianjie/basic/box-hidden-single.md)（另一本书） |
| `[千题千解](../qianti-qianjie/README.md)` | [千题千解](../qianti-qianjie/README.md)（另一本书的首页） |

这样写的好处是：在编辑器或 GitHub 上预览 Markdown 时，链接同样能点开。

## 锚点

每个标题都会自动生成锚点：标题文字去掉标点，空白换成 `-`，英文转小写。例如「多帧动画」的锚点是 `#多帧动画`，
「Excel 表格」是 `#excel-表格`。

| 写法 | 效果 |
| --- | --- |
| `[多帧动画](sudoku-figure.md#多帧动画)` | [多帧动画](sudoku-figure.md#多帧动画)（其他文章的某一节） |
| `[Excel 表格](sudoku-text-formats.md#excel-表格)` | [Excel 表格](sudoku-text-formats.md#excel-表格) |
| `[外部链接](#外部链接)` | [外部链接](#外部链接)（本页的某一节） |

目标文章不存在、或者目标里没有这个锚点时，构建会报错并列出目标文章现有的锚点，写错了能马上发现。

## 站内其他页面

以 `/` 开头的路径是站内其他页面，例如 [绘图工具](/draw)、[唯余练习](/practice)、[教程书架](/tutorial)。

## 盘面说明里的链接

`sudoku` 代码块里的 `caption` 也可以写链接，规则相同：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
autoplay: false
frames:
  - caption: 这一步用到了 [唯余法](../qianti-qianjie/basic/naked-single.md)。
    highlight: r6c7
  - caption: 下一步见本页的 [外部链接](#外部链接) 一节。
    place: r6c7=4
```

## 外部链接

以 `http://`、`https://` 等协议开头的是外部链接，会在新标签页打开，例如
[数独文本格式规范](https://sudoku.kazusa.tech/appendix/sudoku-text-format)。
