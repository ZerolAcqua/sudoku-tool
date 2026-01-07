import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

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
      path: '/demo',
      name: 'demo',
      component: () => import('../pages/DemoPage.vue'),
    },
  ],
})

export default router
