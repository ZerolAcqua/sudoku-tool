# 链接与目录

## 目录

左侧目录来自 `content/tutorial/SUMMARY.md`，写法与 GitBook 相同：

```markdown
# Summary

* [前言](README.md)

## 基础技巧

* [唯余法](basic/naked-single.md)
* [宫摒除](basic/box-hidden-single.md)
  * [子章节](basic/box-more.md)
* 行列摒除
```

- `## 标题` 是目录分组；用 `---` 可以分出没有标题的组。
- 列表项的缩进表示章节嵌套。当前文章所在的章节会自动展开，其余章节可以点右侧的箭头展开。
- 不带链接的列表项是「筹备中」的占位，显示为灰色、不可点击。
- 路径相对于 `content/tutorial/`；`README.md` 代表所在目录本身，根目录的 `README.md` 就是 `/tutorial`。
- 目录的顺序就是「上一篇 / 下一篇」的顺序。

目录里链接的文章不存在时构建会报错；文章写了但没加进目录时，构建会给出提醒。

## 文章之间的链接

链接直接写目标 `.md` 文件的相对路径，构建时会改写为站内跳转：

| 写法 | 效果 |
| --- | --- |
| `[Markdown 基础语法](markdown.md)` | [Markdown 基础语法](markdown.md)（同目录） |
| `[宫摒除](../basic/box-hidden-single.md)` | [宫摒除](../basic/box-hidden-single.md)（上级目录） |
| `[前言](../README.md)` | [前言](../README.md)（目录首页） |

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

以 `/` 开头的路径是站内其他页面，例如 [绘图工具](/draw)、[唯余练习](/practice)。

## 盘面说明里的链接

`sudoku` 代码块里的 `caption` 也可以写链接，规则相同：

```sudoku source
puzzle: ....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...
autoplay: false
frames:
  - caption: 这一步用到了 [唯余法](../basic/naked-single.md)。
    highlight: r6c7
  - caption: 下一步见本页的 [外部链接](#外部链接) 一节。
    place: r6c7=4
```

## 外部链接

以 `http://`、`https://` 等协议开头的是外部链接，会在新标签页打开，例如
[数独文本格式规范](https://sudoku.kazusa.tech/appendix/sudoku-text-format)。
