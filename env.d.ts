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

// 教程目录：plugins/tutorialMarkdown.ts 解析 content/tutorial/SUMMARY.md 生成
declare module 'virtual:tutorial-summary' {
  import type { TutorialSection } from '@/utils/tutorialSummary';
  export const sections: TutorialSection[];
}
