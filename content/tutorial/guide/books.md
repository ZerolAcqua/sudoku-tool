# 书籍与章节

## 目录结构

`content/tutorial/` 下的每个子目录就是一本书，目录名就是网址里的书名：

```text
content/tutorial/
├── qianti-qianjie/          → /tutorial/qianti-qianjie
│   ├── book.yaml            书籍信息与章节结构
│   ├── README.md            本书首页
│   ├── basic/
│   │   └── naked-single.md  → /tutorial/qianti-qianjie/basic/naked-single
│   └── ur/
│       └── ur-type-4.md
└── guide/                   → /tutorial/guide（就是这本书）
    └── …
```

文章的网址就是它在书里的路径去掉 `.md`；`README.md` 代表所在目录本身。
文件夹只用来整理文件，**不影响章节顺序**，顺序完全由 `book.yaml` 决定。
图片等资源放在文章旁边，用相对路径引用即可（见 [Markdown 基础语法](markdown.md#图片)）。

## book.yaml

`book.yaml` 描述这本书：书架上显示的信息，以及左侧目录的章节结构。

```yaml
title: 千题千解                  # 必填
description: 千题千解文档化…      # 书架上的简介
order: 1                         # 书架上的排序，小的在前

chapters:                        # 必填，按阅读顺序列出章节
  - README.md                    # 本书首页，必须列出
  - group: 基础技巧               # 分组
    chapters:
      - basic/naked-single.md
      - file: basic/box-hidden-single.md
        title: 宫摒除             # 覆盖标题
        chapters:                # 子章节
          - basic/box-more.md
      - title: 行列摒除           # 筹备中
```

## 章节

`chapters` 里的每一项是一个章节，有三种写法：

| 写法 | 含义 |
| --- | --- |
| `basic/naked-single.md` | 一篇文章，标题取文章的一级标题 `#` |
| `{ file: …, title: …, chapters: […] }` | 一篇文章，可覆盖标题、带子章节（`title`、`chapters` 都可省略） |
| `{ title: 行列摒除 }` | 还没写的章节：显示为灰色「筹备中」，不可点击，可以先占位 |

- **顺序**：`chapters` 的顺序就是左侧目录的顺序，也是「上一篇 / 下一篇」的顺序（子章节紧跟在父章节之后）。
- **嵌套**：在章节里写 `chapters` 就是它的子章节，可以多层。当前文章所在的章节会自动展开，其余章节可以点右侧的箭头展开。
- **分组**：最外层可以写 `{ group: 分组名, chapters: […] }`，在目录里显示为一个小标题，分组只能在最外层。
- **路径**：相对于本书目录，只能指向本书里的文章，同一篇文章只能出现一次。

章节里的文章不存在、字段写错、首页没列出时，构建会报错并指出出错的位置，例如
`book.yaml：chapters[1].chapters[0]：文章「basic/nope.md」不存在`；
文章写了但没列进 `chapters` 时，构建会给出提醒。书与书之间的跳转写在正文里，见 [链接](links.md)。

## 新建一本书

1. 在 `content/tutorial/` 下新建目录，目录名用小写字母、数字和 `-`，例如 `my-book`。
2. 写 `README.md`（首页）和 `book.yaml`（至少要有 `title` 和包含 `README.md` 的 `chapters`）。
3. 运行 `npm run dev`，书架上就会出现这本书。
