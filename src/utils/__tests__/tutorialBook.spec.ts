import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { articleTitle, BookError, findTrail, flattenBook, parseBook, pathToSlug } from '@/utils/tutorialBook';

// 假的书目录：路径 → 文章内容
const FILES: Record<string, string> = {
  'README.md': '# 前言\n\n正文',
  'basic/naked-single.md': '---\ntitle: x\n---\n\n```text\n# 不是标题\n```\n\n# 唯余法\n',
  'basic/box.md': '# 宫摒除\n',
  'basic/box-more.md': '# 宫摒除进阶\n',
  'basic/deep.md': '# 更深一层\n',
  'no-heading.md': '正文没有一级标题',
};
const readArticle = (path: string) => FILES[path] ?? null;

const BOOK = `
title: 千题千解
description: 简介
order: 1
chapters:
  - README.md
  - group: 基础技巧
    chapters:
      - basic/naked-single.md
      - file: basic/box.md
        title: 宫摒除（改名）
        chapters:
          - file: basic/box-more.md
            chapters:
              - basic/deep.md
          - title: 筹备中的子章节
      - title: 行列摒除
`;

const book = (yaml: string) => parseBook(parse(yaml), 'qtqj', { readArticle });

describe('pathToSlug', () => {
  it.each([
    ['README.md', ''],
    ['qtqj/README.md', 'qtqj'],
    ['qtqj/basic/box.md', 'qtqj/basic/box'],
    ['./basic/box.md', 'basic/box'],
  ])('%s → %s', (path, slug) => {
    expect(pathToSlug(path)).toBe(slug);
  });
});

describe('articleTitle', () => {
  it('取第一个一级标题，跳过 frontmatter 与代码块', () => {
    expect(articleTitle(FILES['basic/naked-single.md']!)).toBe('唯余法');
    expect(articleTitle('## 二级\n')).toBeNull();
  });
});

describe('parseBook', () => {
  const { title, description, order, sections } = book(BOOK);

  it('书籍信息', () => {
    expect({ title, description, order }).toEqual({ title: '千题千解', description: '简介', order: 1 });
  });

  it('未分组的章节合成无标题的节，group 各成一节', () => {
    expect(sections.map((s) => s.title)).toEqual([undefined, '基础技巧']);
    expect(sections[0]!.items).toEqual([{ title: '前言', slug: 'qtqj', children: [] }]);
  });

  it('标题缺省取文章一级标题，可用 title 覆盖；不写 file 是筹备中', () => {
    const [naked, box, rowCol] = sections[1]!.items;
    expect(naked).toMatchObject({ title: '唯余法', slug: 'qtqj/basic/naked-single' });
    expect(box!.title).toBe('宫摒除（改名）');
    expect(rowCol).toEqual({ title: '行列摒除', children: [] });
  });

  it('chapters 嵌套表示子章节', () => {
    const box = sections[1]!.items[1]!;
    expect(box.children.map((n) => n.title)).toEqual(['宫摒除进阶', '筹备中的子章节']);
    expect(box.children[0]!.children[0]!.slug).toBe('qtqj/basic/deep');
  });

  it('order 缺省排在最后', () => {
    expect(book('title: t\nchapters: [README.md]').order).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([
    ['缺少 title', 'chapters: [README.md]', 'title'],
    ['未知字段', 'title: t\nchapter: [README.md]', '未知字段「chapter」'],
    ['缺少 chapters', 'title: t', 'chapters'],
    ['没有首页', 'title: t\nchapters: [basic/box.md]', 'README.md'],
    ['文章不存在', 'title: t\nchapters: [README.md, nope.md]', 'chapters[1]：文章「nope.md」不存在'],
    ['重复', 'title: t\nchapters: [README.md, basic/box.md, basic/box.md]', 'chapters[2]：「basic/box.md」与 chapters[1] 重复'],
    ['跳出本书目录', 'title: t\nchapters: [README.md, ../other/a.md]', '本书目录下的相对路径'],
    ['不是 .md', 'title: t\nchapters: [README.md, a.html]', '.md'],
    ['带锚点', 'title: t\nchapters: [README.md, "basic/box.md#x"]', '锚点'],
    ['文章没有一级标题', 'title: t\nchapters: [README.md, no-heading.md]', '没有一级标题'],
    ['占位没有标题', 'title: t\nchapters: [README.md, { chapters: [basic/box.md] }]', '需要 file'],
    [
      '分组嵌套',
      'title: t\nchapters:\n  - README.md\n  - group: g\n    chapters:\n      - group: h\n        chapters: [basic/box.md]',
      'chapters[1].chapters[0]：分组 group 只能写在最外层',
    ],
  ])('%s 时报错并指出位置', (_, yaml, message) => {
    expect(() => book(yaml)).toThrow(BookError);
    expect(() => book(yaml)).toThrow(message);
  });
});

describe('章节树查询', () => {
  const { sections } = book(BOOK);

  it('flattenBook 按阅读顺序展开，跳过筹备中条目', () => {
    expect(flattenBook(sections).map((n) => n.slug)).toEqual([
      'qtqj',
      'qtqj/basic/naked-single',
      'qtqj/basic/box',
      'qtqj/basic/box-more',
      'qtqj/basic/deep',
    ]);
  });

  it('findTrail 返回分组与祖先链', () => {
    const trail = findTrail(sections, 'qtqj/basic/deep')!;
    expect(trail.section.title).toBe('基础技巧');
    expect(trail.nodes.map((n) => n.title)).toEqual(['宫摒除（改名）', '宫摒除进阶', '更深一层']);
    expect(findTrail(sections, 'nope')).toBeNull();
  });
});
