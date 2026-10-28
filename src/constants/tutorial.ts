// 教程：分类定义与文章元信息
// 文章本身是 content/tutorial/ 下的 Markdown，frontmatter 写 title / category / order / description；
// 构建插件（plugins/tutorialMarkdown.ts）汇总成 `virtual:tutorial-index`，并校验 category 必须是下列 id 之一。
// 本文件不依赖 `@` 别名：构建插件在 Node 侧引用它。

export interface TutorialCategory {
  id: string;
  label: string;
  description: string;
}

export const TUTORIAL_CATEGORIES: TutorialCategory[] = [
  { id: 'basic', label: '基础技巧', description: '从唯余、摒除开始，建立最基本的排除思路。' },
  { id: 'advanced', label: '进阶技巧', description: '候选数层面的区块、数组与鱼结构。' },
  { id: 'chain', label: '链', description: '强弱链交替推理，是高阶解题的核心。' },
  { id: 'ur', label: '唯一矩形', description: '利用唯一解性质避免致命结构。' },
  { id: 'classic', label: '经典题型', description: '精选题目的完整解题过程。' },
];

export interface TutorialArticleMeta {
  // content/tutorial/ 下的相对路径（不含 .md），也是 /tutorial/ 之后的路由
  slug: string;
  title: string;
  category: string;
  order: number;
  description?: string;
}
