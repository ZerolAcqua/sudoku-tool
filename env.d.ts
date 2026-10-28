/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'opencv.js' {
  const cv: any;
  export default cv;
}

declare module '*.md' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 教程文章目录：plugins/tutorialMarkdown.ts 汇总 content/tutorial/ 下各文章的 frontmatter
declare module 'virtual:tutorial-index' {
  import type { TutorialArticleMeta } from '@/constants/tutorial';
  export const articles: TutorialArticleMeta[];
}
