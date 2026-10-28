import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('../pages/PracticePage.vue'),
    },
    {
      path: '/draw',
      name: 'draw',
      component: () => import('../pages/DrawPage.vue'),
    },
    {
      path: '/solver',
      name: 'solver',
      component: () => import('../pages/SolverPage.vue'),
    },
    {
      // 教程书架：列出 content/tutorial/ 下的每本书
      path: '/tutorial',
      name: 'tutorial',
      component: () => import('../pages/TutorialPage.vue'),
    },
    {
      // 书内阅读：/tutorial/<书> 是本书首页，其后是文章在书里的相对路径（可含子目录）
      path: '/tutorial/:book/:slug*',
      name: 'tutorial-book',
      component: () => import('../pages/TutorialBookPage.vue'),
    },
    {
      path: '/demo',
      name: 'demo',
      component: () => import('../pages/DemoPage.vue'),
    },
  ],
});

export default router;
