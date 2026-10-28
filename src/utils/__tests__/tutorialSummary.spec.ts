import { describe, expect, it } from 'vitest';
import { findTrail, flattenSummary, parseSummary, pathToSlug, SummaryError } from '@/utils/tutorialSummary';

const SUMMARY = `# Summary

* [前言](README.md)

## 基础技巧

* [唯余法](basic/naked-single.md)
* [宫摒除](basic/box.md)
  * [宫摒除进阶](basic/box-more.md)
    - [更深一层](basic/deep.md)
  * 筹备中的子章节
* 行列摒除

---

- [附录](appendix/README.md)
`;

describe('pathToSlug', () => {
  it.each([
    ['README.md', ''],
    ['basic/box.md', 'basic/box'],
    ['./basic/box.md', 'basic/box'],
    ['appendix/README.md', 'appendix'],
  ])('%s → %s', (path, slug) => {
    expect(pathToSlug(path)).toBe(slug);
  });
});

describe('parseSummary', () => {
  const { sections, links } = parseSummary(SUMMARY);

  it('## 与 --- 划分分组，一级标题不算分组', () => {
    expect(sections.map((s) => s.title)).toEqual([undefined, '基础技巧', undefined]);
    expect(sections[0]!.items.map((n) => n.title)).toEqual(['前言']);
  });

  it('缩进表示嵌套，不带链接的是筹备中条目', () => {
    const box = sections[1]!.items[1]!;
    expect(box.slug).toBe('basic/box');
    expect(box.children.map((n) => n.title)).toEqual(['宫摒除进阶', '筹备中的子章节']);
    expect(box.children[0]!.children[0]!.slug).toBe('basic/deep');
    expect(box.children[1]!.slug).toBeUndefined();
    expect(sections[1]!.items[2]).toEqual({ title: '行列摒除', children: [] });
  });

  it('记录每个链接的行号', () => {
    expect(links.find((l) => l.slug === 'basic/naked-single')?.line).toBe(7);
    expect(links).toHaveLength(6);
  });

  it.each([
    ['重复链接', '* [a](a.md)\n* [b](a.md)', 2],
    ['带锚点', '* [a](a.md#x)', 1],
    ['不是 .md', '* [a](a.html)', 1],
    ['外链', '* [a](https://example.com/a.md)', 1],
    ['无法识别的行', '* [a](a.md)\n随便写的一行', 2],
  ])('%s 时报错并给出行号', (_, text, line) => {
    expect(() => parseSummary(text)).toThrow(SummaryError);
    expect(() => parseSummary(text)).toThrow(`SUMMARY.md:${line}`);
  });
});

describe('目录树查询', () => {
  const { sections } = parseSummary(SUMMARY);

  it('flattenSummary 按阅读顺序展开，跳过筹备中条目', () => {
    expect(flattenSummary(sections).map((n) => n.slug)).toEqual([
      '',
      'basic/naked-single',
      'basic/box',
      'basic/box-more',
      'basic/deep',
      'appendix',
    ]);
  });

  it('findTrail 返回分组与祖先链', () => {
    const trail = findTrail(sections, 'basic/deep')!;
    expect(trail.section.title).toBe('基础技巧');
    expect(trail.nodes.map((n) => n.title)).toEqual(['宫摒除', '宫摒除进阶', '更深一层']);
    expect(findTrail(sections, 'nope')).toBeNull();
  });
});
