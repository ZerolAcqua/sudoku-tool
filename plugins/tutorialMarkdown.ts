// 教程 Markdown 构建插件
// - content/tutorial/**/*.md 编译为 Vue 组件（unplugin-vue-markdown）
// - ```sudoku 代码块按 YAML 解析、校验后替换为 <SudokuFigure>；写错时构建报错并给出文件与行号
// - 汇总各文章 frontmatter 生成 `virtual:tutorial-index`，目录页不必加载文章正文
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import Markdown from 'unplugin-vue-markdown/vite';
import type { Plugin, PluginOption } from 'vite';
import { parse as parseYaml, YAMLParseError } from 'yaml';
import { FigureSpecError, parseFigureSpec, type FigureSpec } from '../src/utils/sudokuFigure';
import { TUTORIAL_CATEGORIES, type TutorialArticleMeta } from '../src/constants/tutorial';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function escapeAttr(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 正文行号要加上 frontmatter 占的行（frontmatter 插件解析前会把它剥掉）
function frontmatterLines(id: string): number {
  const m = readFileSync(id, 'utf8').trimStart().match(FRONTMATTER);
  return m ? m[0].split('\n').length - 1 : 0;
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

function readMeta(file: string, root: string): TutorialArticleMeta {
  const slug = relative(root, file).split(sep).join('/').replace(/\.md$/, '');
  const m = readFileSync(file, 'utf8').trimStart().match(FRONTMATTER);
  const data = (m ? parseYaml(m[1]!) : null) ?? {};
  const where = `${relative(process.cwd(), file)} 的 frontmatter`;
  if (typeof data.title !== 'string') throw new Error(`${where}缺少 title`);
  if (!TUTORIAL_CATEGORIES.some((c) => c.id === data.category)) {
    throw new Error(`${where}的 category 应为 ${TUTORIAL_CATEGORIES.map((c) => c.id).join(' / ')}`);
  }
  return {
    slug,
    title: data.title,
    category: data.category,
    order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
    ...(typeof data.description === 'string' ? { description: data.description } : {}),
  };
}

const INDEX_ID = 'virtual:tutorial-index';
const RESOLVED_INDEX_ID = `\0${INDEX_ID}`;

function tutorialIndex(contentDir: string): Plugin {
  return {
    name: 'tutorial-index',
    resolveId(id) {
      return id === INDEX_ID ? RESOLVED_INDEX_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_INDEX_ID) return;
      const files = listMarkdown(contentDir);
      files.forEach((f) => this.addWatchFile(f));
      const articles = files
        .map((f) => readMeta(f, contentDir))
        .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
      return `export const articles = ${JSON.stringify(articles)};`;
    },
    // 开发时新增 / 删除文章或改动 frontmatter，目录随之刷新
    configureServer(server) {
      const refresh = (file: string) => {
        if (!file.startsWith(contentDir) || !file.endsWith('.md')) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_INDEX_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on('add', refresh);
      server.watcher.on('unlink', refresh);
      server.watcher.on('change', refresh);
    },
  };
}

export function tutorialMarkdown(contentDir: string): PluginOption[] {
  return [
    Markdown({
      include: [/\.md$/],
      wrapperClasses: 'tutorial-prose',
      markdownSetup(md) {
        const fallback = md.renderer.rules.fence!;
        md.renderer.rules.fence = (tokens, idx, options, env, self) => {
          const token = tokens[idx]!;
          if (token.info.trim() !== 'sudoku') return fallback(tokens, idx, options, env, self);

          const id = (env as { id: string }).id;
          // 代码块内容从 ``` 的下一行开始
          const firstLine = frontmatterLines(id) + (token.map?.[0] ?? 0) + 2;
          const where = (line?: number) => `${relative(process.cwd(), id)}:${line ?? firstLine - 1}`;

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
          if (spec.caption) spec.caption = md.renderInline(spec.caption, env);
          for (const frame of spec.frames) {
            if (frame.caption) frame.caption = md.renderInline(frame.caption, env);
          }
          return `<SudokuFigure :spec="${escapeAttr(JSON.stringify(spec))}" />\n`;
        };
      },
      transforms: {
        after(html) {
          if (!html.includes('<SudokuFigure')) return html;
          return `${html}\n<script setup>\nimport SudokuFigure from '@/components/SudokuFigure.vue';\n</script>`;
        },
      },
    }),
    tutorialIndex(contentDir),
  ];
}
