# 写作指南

这本书说明如何为本站编写教程。站内的每本书都是 `content/tutorial/` 下的一个目录，每篇文章是一个 Markdown 文件，
构建时编译成网页；盘面用 `sudoku` 代码块描述，可以逐帧播放推理过程。

## 从哪里开始

1. [书籍与章节](books.md)：新建一本书、编排章节。
2. [Markdown 基础语法](markdown.md)：正文的写法与显示效果。
3. [sudoku 盘面](sudoku-figure.md)：画盘面、做动画，配合 [坐标与颜色](sudoku-coordinates.md) 和 [数独文本格式](sudoku-text-formats.md) 查阅。
4. [链接](links.md)：文章之间、书与书之间的跳转。

## 写错了会怎样

链接指向的文章或标题不存在、盘面的字段或坐标写错、`book.yaml` 章节里的文章不存在，**构建都会直接失败**，
并给出出错的文件与行号。所以只要 `npm run build` 能通过，页面上就不会有坏链接或画不出来的盘面。

开发时运行 `npm run dev`，改动 Markdown 后页面会自动刷新。
