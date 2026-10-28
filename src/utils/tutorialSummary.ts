// 教程目录：解析 content/tutorial/SUMMARY.md（GitBook 写法），以及目录树上的查询
// SUMMARY.md 示例：
//   # Summary
//   * [前言](README.md)
//
//   ## 基础技巧            ← 分组标题（也可以用 --- 分出无标题的组）
//   * [宫摒除](basic/box.md)
//     * [子章节](basic/box-more.md)   ← 缩进表示嵌套
//   * 行列摒除              ← 不带链接：筹备中的条目，只占位不可点
// 文章的路由 slug = 相对 content/tutorial/ 的路径去掉 .md；README.md 代表所在目录本身（根目录的 README 即 /tutorial）。
// 本文件不依赖 `@` 别名：构建插件在 Node 侧引用它。

export interface TutorialNode {
  title: string;
  // 缺省表示筹备中
  slug?: string;
  children: TutorialNode[];
}

export interface TutorialSection {
  title?: string;
  items: TutorialNode[];
}

export interface SummaryLink {
  // SUMMARY.md 里写的原始路径（相对 content/tutorial/）
  path: string;
  slug: string;
  line: number;
}

export class SummaryError extends Error {
  constructor(
    message: string,
    public readonly line: number
  ) {
    super(`SUMMARY.md:${line}：${message}`);
    this.name = 'SummaryError';
  }
}

// content/tutorial/ 下的相对路径 → 路由 slug
export function pathToSlug(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/\.md$/i, '');
  if (clean === 'README') return '';
  return clean.replace(/\/README$/, '');
}

const ITEM = /^(\s*)[*+-]\s+(.*)$/;
const LINK = /^\[(.+)\]\(([^)\s]+)\)$/;

export function parseSummary(text: string): { sections: TutorialSection[]; links: SummaryLink[] } {
  const sections: TutorialSection[] = [{ items: [] }];
  const links: SummaryLink[] = [];
  // 当前分组内的缩进栈：每层记录缩进量与该层的子列表
  let stack: Array<{ indent: number; list: TutorialNode[] }> = [{ indent: -1, list: sections[0]!.items }];

  const startSection = (title?: string) => {
    const section: TutorialSection = title ? { title, items: [] } : { items: [] };
    sections.push(section);
    stack = [{ indent: -1, list: section.items }];
  };

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === '') return;
    const heading = raw.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      // 一级标题是整个目录的标题（如 # Summary），不分组
      if (heading[1]!.length > 1) startSection(heading[2]!);
      return;
    }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(raw)) {
      startSection();
      return;
    }
    const item = raw.match(ITEM);
    if (!item) throw new SummaryError(`无法识别的行「${raw.trim()}」，应为列表项、## 分组标题或 ---`, line);

    const indent = item[1]!.replace(/\t/g, '  ').length;
    const content = item[2]!.trim();
    const link = content.match(LINK);
    const node: TutorialNode = { title: link ? link[1]!.trim() : content, children: [] };
    if (link) {
      const path = link[2]!.replace(/^\.\//, '');
      if (/^[a-z]+:|^\/\//i.test(path)) throw new SummaryError('目录里只能链接本教程的文章', line);
      if (path.includes('#')) throw new SummaryError('目录条目不能带 #锚点，请直接链接文章', line);
      if (!/\.md$/i.test(path)) throw new SummaryError(`「${path}」应链接到 .md 文件`, line);
      const slug = pathToSlug(path);
      if (links.some((l) => l.slug === slug)) throw new SummaryError(`「${path}」在目录里出现了不止一次`, line);
      node.slug = slug;
      links.push({ path, slug, line });
    }

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) stack.pop();
    const parent = stack[stack.length - 1]!;
    parent.list.push(node);
    stack.push({ indent, list: node.children });
  });

  return { sections: sections.filter((s) => s.items.length > 0 || s.title), links };
}

// ---------------- 目录树查询（页面用） ----------------

// 按阅读顺序展开的全部文章（不含筹备中的条目），用于上一篇 / 下一篇
export function flattenSummary(sections: TutorialSection[]): Array<TutorialNode & { slug: string }> {
  const result: Array<TutorialNode & { slug: string }> = [];
  const walk = (nodes: TutorialNode[]) => {
    for (const node of nodes) {
      if (node.slug !== undefined) result.push(node as TutorialNode & { slug: string });
      walk(node.children);
    }
  };
  sections.forEach((s) => walk(s.items));
  return result;
}

// 从分组到目标文章的路径：[分组, 祖先…, 文章]；找不到时返回 null
export function findTrail(
  sections: TutorialSection[],
  slug: string
): { section: TutorialSection; nodes: TutorialNode[] } | null {
  const walk = (nodes: TutorialNode[], trail: TutorialNode[]): TutorialNode[] | null => {
    for (const node of nodes) {
      const next = [...trail, node];
      if (node.slug === slug) return next;
      const found = walk(node.children, next);
      if (found) return found;
    }
    return null;
  };
  for (const section of sections) {
    const nodes = walk(section.items, []);
    if (nodes) return { section, nodes };
  }
  return null;
}
