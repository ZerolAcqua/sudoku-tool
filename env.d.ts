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

// 教程书籍（书架 + 每本书的目录）：plugins/tutorialMarkdown.ts 汇总 content/tutorial/<书>/book.yaml
declare module 'virtual:tutorial-books' {
  import type { TutorialBook } from '@/utils/tutorialBook';
  export const books: TutorialBook[];
}
