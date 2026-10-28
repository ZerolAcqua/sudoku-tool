// 教程书籍：解析、校验每本书的 book.yaml（书籍信息 + 章节结构），以及章节树上的查询
// content/tutorial/<书 id>/ 是一本书：book.yaml 描述书与章节，README.md 是首页，其余 .md 是文章。
// book.yaml 示例：
//   title: 千题千解
//   description: 千题千解文档化…
//   order: 1                         # 书架排序，小的在前
//   chapters:                        # 章节顺序即目录顺序，也是「上一篇 / 下一篇」的顺序
//     - README.md                    # 字符串 = 文章路径，标题取文章的一级标题
//     - group: 基础技巧               # 分组（只能在最外层）
//       chapters:
//         - basic/naked-single.md
//         - file: basic/box.md
//           title: 宫摒除             # 可覆盖标题
//           chapters:                # 子章节
//             - basic/box-more.md
//         - title: 行列摒除           # 不写 file：筹备中的占位
// 文章的路由 slug = 相对 content/tutorial/ 的路径去掉 .md（以书 id 开头）；README.md 代表所在目录本身。
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

export interface TutorialBook {
  // 书 id = content/tutorial/ 下的目录名，也是 /tutorial/ 之后的第一段路由
  id: string;
  title: string;
  description?: string;
  order: number;
  sections: TutorialSection[];
}

export class BookError extends Error {
  constructor(
    message: string,
    // 出错字段在 book.yaml 里的位置，如 chapters[1].chapters[0].file
    public readonly path: string
  ) {
    super(path ? `${path}：${message}` : message);
    this.name = 'BookError';
  }
}

// content/tutorial/ 下的相对路径 → 路由 slug
export function pathToSlug(path: string): string {
  const clean = path.replace(/^\.\//, '').replace(/\.md$/i, '');
  if (clean === 'README') return '';
  return clean.replace(/\/README$/, '');
}

// 文章的一级标题（# 标题），用作章节标题的缺省值；跳过 frontmatter 与代码块
export function articleTitle(source: string): string | null {
  let inFence = false;
  for (const line of source.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (m) return m[1]!;
  }
  return null;
}

export interface BookOptions {
  // 读取本书目录下的文章（路径相对本书目录），不存在时返回 null
  readArticle: (path: string) => string | null;
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkKeys(obj: Obj, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new BookError(`未知字段「${key}」，可用字段：${allowed.join('、')}`, path);
    }
  }
}

const BOOK_KEYS = ['title', 'description', 'order', 'chapters'] as const;
const CHAPTER_KEYS = ['file', 'title', 'chapters'] as const;
const GROUP_KEYS = ['group', 'chapters'] as const;

// 校验 book.yaml 的解析结果，展开成书籍信息与章节树；文章不存在、路径或字段写错时抛 BookError
export function parseBook(raw: unknown, id: string, { readArticle }: BookOptions): TutorialBook {
  if (!isObj(raw)) throw new BookError('book.yaml 应为 YAML 对象', '');
  checkKeys(raw, BOOK_KEYS, '');
  if (typeof raw.title !== 'string' || !raw.title.trim()) throw new BookError('缺少书名 title', 'title');
  if (raw.description !== undefined && typeof raw.description !== 'string') {
    throw new BookError('应为字符串', 'description');
  }
  if (raw.order !== undefined && (typeof raw.order !== 'number' || !Number.isFinite(raw.order))) {
    throw new BookError('应为数字', 'order');
  }
  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    throw new BookError('应为非空列表，按阅读顺序列出本书章节', 'chapters');
  }

  const seen = new Map<string, string>();

  function chapter(v: unknown, path: string): TutorialNode {
    if (typeof v !== 'string' && !isObj(v)) throw new BookError('应为文章路径，或 { file, title, chapters } 对象', path);
    const item: Obj = typeof v === 'string' ? { file: v } : v;
    if ('group' in item) throw new BookError('分组 group 只能写在最外层的 chapters 里', path);
    checkKeys(item, CHAPTER_KEYS, path);

    const node: TutorialNode = { title: '', children: [] };
    if (item.title !== undefined && (typeof item.title !== 'string' || !item.title.trim())) {
      throw new BookError('应为非空字符串', `${path}.title`);
    }

    if (item.file !== undefined) {
      const at = typeof v === 'string' ? path : `${path}.file`;
      if (typeof item.file !== 'string') throw new BookError('应为文章路径', at);
      const file = item.file.replace(/^\.\//, '');
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(file)) throw new BookError('只能是本书的文章', at);
      if (file.includes('#')) throw new BookError('不能带 #锚点，请直接写文章路径', at);
      if (!/\.md$/i.test(file)) throw new BookError(`「${file}」应是 .md 文件`, at);
      if (file.startsWith('/') || file.split('/').includes('..')) {
        throw new BookError(`「${file}」应是本书目录下的相对路径`, at);
      }
      const slug = pathToSlug(`${id}/${file}`);
      const dup = seen.get(slug);
      if (dup) throw new BookError(`「${file}」与 ${dup} 重复`, at);
      seen.set(slug, at);

      const source = readArticle(file);
      if (source === null) throw new BookError(`文章「${file}」不存在`, at);
      const title = (item.title as string | undefined) ?? articleTitle(source);
      if (!title) throw new BookError(`文章「${file}」没有一级标题（# 标题），请写明 title`, at);
      node.title = title.trim();
      node.slug = slug;
    } else {
      if (item.title === undefined) throw new BookError('需要 file（文章路径）或 title（筹备中的占位）', path);
      node.title = (item.title as string).trim();
    }

    if (item.chapters !== undefined) {
      if (!Array.isArray(item.chapters) || item.chapters.length === 0) {
        throw new BookError('应为非空列表', `${path}.chapters`);
      }
      node.children = item.chapters.map((c, i) => chapter(c, `${path}.chapters[${i}]`));
    }
    return node;
  }

  // 最外层：分组各成一节；分组之间连续的未分组章节合成一个无标题的节
  const sections: TutorialSection[] = [];
  raw.chapters.forEach((v, i) => {
    const path = `chapters[${i}]`;
    if (isObj(v) && 'group' in v) {
      checkKeys(v, GROUP_KEYS, path);
      if (typeof v.group !== 'string' || !v.group.trim()) throw new BookError('分组名应为非空字符串', `${path}.group`);
      if (!Array.isArray(v.chapters) || v.chapters.length === 0) {
        throw new BookError('分组应包含非空的 chapters 列表', `${path}.chapters`);
      }
      const chapters = v.chapters as unknown[];
      sections.push({ title: v.group.trim(), items: chapters.map((c, k) => chapter(c, `${path}.chapters[${k}]`)) });
      return;
    }
    const last = sections[sections.length - 1];
    const node = chapter(v, path);
    if (last && last.title === undefined) last.items.push(node);
    else sections.push({ items: [node] });
  });

  if (!seen.has(id)) throw new BookError('需要包含本书首页 README.md', 'chapters');

  return {
    id,
    title: raw.title.trim(),
    ...(raw.description ? { description: raw.description as string } : {}),
    order: (raw.order as number | undefined) ?? Number.MAX_SAFE_INTEGER,
    sections,
  };
}

// ---------------- 章节树查询（页面用） ----------------

// 按阅读顺序展开的全部文章（不含筹备中的条目），用于上一篇 / 下一篇
export function flattenBook(sections: TutorialSection[]): Array<TutorialNode & { slug: string }> {
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
