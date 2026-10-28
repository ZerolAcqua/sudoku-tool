// 教程 Markdown 构建插件
// - content/tutorial/**/*.md 编译为 Vue 组件（unplugin-vue-markdown）
// - ```sudoku 代码块按 YAML 解析、校验后替换为 <SudokuFigure>
// - 标题自动生成 id（供锚点与页内目录）；文章间的相对链接（a.md、../b/c.md#标题、#标题）改写为 <RouterLink>，
//   并校验目标文章与锚点存在；/draw 这类站内页面路径也走路由；外链在新标签页打开
// - SUMMARY.md（GitBook 写法）汇总成 `virtual:tutorial-summary`，校验其中链接的文章都存在
// 写错时构建报错并给出文件与行号。
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import Markdown from 'unplugin-vue-markdown/vite';
import type { Plugin, PluginOption } from 'vite';
import { parse as parseYaml, YAMLParseError } from 'yaml';
import { FigureSpecError, parseFigureSpec, type FigureSpec } from '../src/utils/sudokuFigure';
import { parseSummary, pathToSlug, SummaryError } from '../src/utils/tutorialSummary';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const SUMMARY_FILE = 'SUMMARY.md';
const ROUTE_BASE = '/tutorial';

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 正文行号要加上 frontmatter 占的行（frontmatter 插件解析前会把它剥掉）
function frontmatterLines(source: string): number {
  const m = source.trimStart().match(FRONTMATTER);
  return m ? m[0].split('\n').length - 1 : 0;
}

// 标题 → 锚点 id：保留中文、字母、数字，空白转 -；同一篇内重复的依次加 -1、-2
export function slugifyHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
}

// markdown 解析器会把链接里的中文等转成 %XX，校验与报错时转回来
function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function listMarkdown(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory()) return listMarkdown(full);
    return e.isFile() && e.name.endsWith('.md') ? [full] : [];
  });
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

interface TutorialEnv {
  id: string;
  // 只收集标题 id（解析链接目标时用），不处理链接，避免互相链接的文章无限递归
  headingsOnly?: boolean;
  headingIds?: Set<string>;
  // 盘面说明经 v-html 插入，里面不能用 <RouterLink>，改输出带 data-router-link 的 <a>，由 SudokuFigure 拦截点击
  plainLinks?: boolean;
}

// markdown-exit 的 Token 结构（只用到这些字段）
interface MdToken {
  type: string;
  tag: string;
  content: string;
  map: [number, number] | null;
  children: MdToken[] | null;
  meta: Record<string, unknown> | null;
  attrGet(name: string): string | null;
  attrSet(name: string, value: string): void;
}

const INDEX_ID = 'virtual:tutorial-summary';
const RESOLVED_INDEX_ID = `\0${INDEX_ID}`;

function tutorialSummary(contentDir: string): Plugin {
  const summaryPath = join(contentDir, SUMMARY_FILE);
  return {
    name: 'tutorial-summary',
    resolveId(id) {
      return id === INDEX_ID ? RESOLVED_INDEX_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_INDEX_ID) return;
      this.addWatchFile(summaryPath);
      if (!existsSync(summaryPath)) throw new Error(`缺少教程目录 ${toPosix(relative(process.cwd(), summaryPath))}`);

      let parsed;
      try {
        parsed = parseSummary(readFileSync(summaryPath, 'utf8'));
      } catch (e) {
        if (e instanceof SummaryError) throw new Error(`教程目录有误（content/tutorial/${e.message}）`);
        throw e;
      }
      for (const link of parsed.links) {
        if (!existsSync(join(contentDir, link.path))) {
          throw new Error(`教程目录有误（content/tutorial/${SUMMARY_FILE}:${link.line}）：文章「${link.path}」不存在`);
        }
      }
      // 没写进目录的文章仍可通过链接访问，但读者从目录里找不到，提醒一下
      const listed = new Set(parsed.links.map((l) => l.slug));
      for (const file of listMarkdown(contentDir)) {
        const rel = toPosix(relative(contentDir, file));
        if (rel !== SUMMARY_FILE && !listed.has(pathToSlug(rel))) {
          this.warn(`content/tutorial/${rel} 没有写进 ${SUMMARY_FILE}`);
        }
      }
      return `export const sections = ${JSON.stringify(parsed.sections)};`;
    },
    // 开发时改目录或增删文章，目录随之刷新
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(contentDir) || !file.endsWith('.md')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_INDEX_ID);
        if (!mod) return;
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.watcher.on('change', (file) => file === summaryPath && refresh(file));
    },
  };
}

export function tutorialMarkdown(contentDir: string): PluginOption[] {
  const slugOfFile = (file: string) => pathToSlug(toPosix(relative(contentDir, file)));
  const routeOf = (slug: string, hash?: string) =>
    (slug ? `${ROUTE_BASE}/${slug}` : ROUTE_BASE) + (hash ? `#${hash}` : '');

  return [
    Markdown({
      include: [/\.md$/],
      exclude: [new RegExp(`${SUMMARY_FILE}$`)],
      wrapperClasses: 'tutorial-prose',
      markdownSetup(md) {
        // 某篇文章的全部标题 id（读文件现解析，开发时目标文章改了标题也能及时发现）
        const headingIdsOf = (file: string): Set<string> => {
          const env: TutorialEnv = { id: file, headingsOnly: true };
          md.parse(readFileSync(file, 'utf8'), env);
          return env.headingIds ?? new Set();
        };

        md.core.ruler.push('tutorial_headings_links', (state) => {
          const env = state.env as TutorialEnv;
          const tokens = state.tokens as MdToken[];
          // 行内渲染（盘面说明）沿用所在文章已收集的标题 id，供 #锚点 校验
          const ids = state.inlineMode ? (env.headingIds ?? new Set<string>()) : new Set<string>();
          env.headingIds = ids;

          tokens.forEach((token, i) => {
            if (token.type !== 'heading_open') return;
            const inline = tokens[i + 1];
            const text = (inline?.children ?? [])
              .filter((c) => c.type === 'text' || c.type === 'code_inline')
              .map((c) => c.content)
              .join('');
            const base = slugifyHeading(text);
            let id = base;
            for (let n = 1; ids.has(id); n++) id = `${base}-${n}`;
            ids.add(id);
            token.attrSet('id', id);
          });
          if (env.headingsOnly) return;

          const source = readFileSync(env.id, 'utf8');
          const where = (token: MdToken) =>
            `${toPosix(relative(process.cwd(), env.id))}:${frontmatterLines(source) + (token.map?.[0] ?? 0) + 1}`;

          for (const block of tokens) {
            if (block.type !== 'inline' || !block.children) continue;
            for (const token of block.children) {
              // 图片相对路径补成 ./ 开头：Vue 编译模板时只把 ./、../ 开头的 src 当作需要打包的资源
              if (token.type === 'image') {
                const src = token.attrGet('src') ?? '';
                if (!/^(?:[a-z][a-z0-9+.-]*:|\/|\.{1,2}\/|@\/)/i.test(src)) token.attrSet('src', `./${src}`);
                continue;
              }
              if (token.type !== 'link_open') continue;
              const href = token.attrGet('href') ?? '';
              if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) {
                token.attrSet('target', '_blank');
                token.attrSet('rel', 'noopener noreferrer');
                continue;
              }
              // 以 / 开头的是站内其他页面（如 /draw），直接交给路由
              if (href.startsWith('/')) {
                token.meta = { ...token.meta, routerTo: href };
                continue;
              }
              const [path = '', rawHash] = href.split('#');
              const hash = rawHash === undefined ? undefined : safeDecode(rawHash);
              const fail = (msg: string) => {
                throw new Error(`链接「${safeDecode(href)}」有误（${where(block)}）：${msg}`);
              };

              let slug: string;
              let targetIds: Set<string>;
              if (path === '') {
                slug = slugOfFile(env.id);
                targetIds = ids;
              } else {
                if (!/\.md$/i.test(path)) fail('文章之间的链接应指向 .md 文件');
                const target = resolve(dirname(env.id), safeDecode(path));
                if (!target.startsWith(contentDir + sep)) fail('只能链接 content/tutorial/ 下的文章');
                if (!existsSync(target)) fail(`文章 ${toPosix(relative(contentDir, target))} 不存在`);
                slug = slugOfFile(target);
                targetIds = target === env.id ? ids : headingIdsOf(target);
              }
              if (hash !== undefined && !targetIds.has(hash)) {
                const known = [...targetIds].slice(0, 8).join('、');
                fail(`目标文章里没有标题锚点「#${hash}」${known ? `（现有：${known}…）` : ''}`);
              }
              token.meta = { ...token.meta, routerTo: routeOf(slug, hash) };
            }
          }
        });

        // link_close 需要知道配对的 link_open 是否被改写成了 RouterLink：按嵌套层级在同一行内配对
        md.core.ruler.push('tutorial_link_close', (state) => {
          for (const block of state.tokens as MdToken[]) {
            const stack: MdToken[] = [];
            for (const token of block.children ?? []) {
              if (token.type === 'link_open') stack.push(token);
              else if (token.type === 'link_close') {
                const open = stack.pop();
                if (open?.meta?.routerTo) token.meta = { ...token.meta, routerLink: true };
              }
            }
          }
        });

        const renderToken = md.renderer.renderToken.bind(md.renderer);
        md.renderer.rules.link_open = (tokens, idx, options, env) => {
          const token = tokens[idx] as unknown as MdToken;
          const to = token.meta?.routerTo as string | undefined;
          if (!to) return renderToken(tokens, idx, options);
          const title = token.attrGet('title');
          const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
          if ((env as TutorialEnv).plainLinks) return `<a href="${escapeAttr(to)}" data-router-link${titleAttr}>`;
          return `<RouterLink to="${escapeAttr(to)}"${titleAttr}>`;
        };
        md.renderer.rules.link_close = (tokens, idx, options, env) => {
          const token = tokens[idx] as unknown as MdToken;
          if (!token.meta?.routerLink) return renderToken(tokens, idx, options);
          return (env as TutorialEnv).plainLinks ? '</a>' : '</RouterLink>';
        };

        const fallback = md.renderer.rules.fence!;
        md.renderer.rules.fence = (tokens, idx, options, env, self) => {
          const token = tokens[idx]!;
          // ```sudoku source：盘面下方附上可展开的 YAML 源码（写作指南里用）
          const [lang, ...flags] = token.info.trim().split(/\s+/);
          if (lang !== 'sudoku') return fallback(tokens, idx, options, env, self);

          const id = (env as TutorialEnv).id;
          // 代码块内容从 ``` 的下一行开始
          const firstLine = frontmatterLines(readFileSync(id, 'utf8')) + (token.map?.[0] ?? 0) + 2;
          const where = (line?: number) => `${toPosix(relative(process.cwd(), id))}:${line ?? firstLine - 1}`;

          let spec: FigureSpec;
          try {
            spec = parseFigureSpec(parseYaml(token.content));
          } catch (e) {
            if (e instanceof YAMLParseError) {
              throw new Error(`sudoku 代码块 YAML 语法错误（${where(firstLine + (e.linePos?.[0].line ?? 1) - 1)}）：${e.message}`);
            }
            if (e instanceof FigureSpecError) throw new Error(`sudoku 代码块有误（${where()}）：${e.message}`);
            throw e;
          }

          // 图注与每帧说明支持行内 Markdown，构建期渲染成 HTML
          const inlineEnv: TutorialEnv = { ...(env as TutorialEnv), plainLinks: true };
          if (spec.caption) spec.caption = md.renderInline(spec.caption, inlineEnv);
          for (const frame of spec.frames) {
            if (frame.caption) frame.caption = md.renderInline(frame.caption, inlineEnv);
          }
          const figure = `<SudokuFigure :spec="${escapeAttr(JSON.stringify(spec))}" />\n`;
          if (!flags.includes('source')) return figure;
          return `${figure}<details class="sudoku-source"><summary>查看源码</summary><pre><code>${md.utils.escapeHtml(token.content)}</code></pre></details>\n`;
        };
      },
      transforms: {
        after(html) {
          if (!html.includes('<SudokuFigure')) return html;
          return `${html}\n<script setup>\nimport SudokuFigure from '@/components/SudokuFigure.vue';\n</script>`;
        },
      },
    }),
    tutorialSummary(contentDir),
  ];
}
