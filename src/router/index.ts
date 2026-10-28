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
      path: '/tutorial',
      name: 'tutorial',
      component: () => import('../pages/TutorialPage.vue'),
    },
    {
      // 文章路由 = content/tutorial/ 下的相对路径，可含子目录
      path: '/tutorial/:slug+',
      name: 'tutorial-article',
      component: () => import('../pages/TutorialArticlePage.vue'),
    },
    {
      path: '/demo',
      name: 'demo',
      component: () => import('../pages/DemoPage.vue'),
    },
  ],
});

export default router;
