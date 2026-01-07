<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Hero Section -->
    <div class="bg-white">
      <div class="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
        <div class="text-center">
          <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            丘卡的数独小站
          </h1>
          <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            关于数独学习和练习的多功能工具小站
          </p>
        </div>
      </div>
    </div>

    <!-- Features -->
    <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <router-link
          v-for="feature in features"
          :key="feature.path"
          :to="feature.path"
          class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
        >
          <div class="px-4 py-5 sm:p-6">
            <div class="text-center">
              <h3 class="text-lg font-medium text-gray-900">{{ feature.title }}</h3>
              <p class="mt-2 text-sm text-gray-500">{{ feature.description }}</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    title: '唯余练习',
    description: '提高行、列、宫唯余判断能力',
    path: '/practice',
  },
  {
    title: '绘图工具',
    description: '制作数独题目和题解演示图',
    path: '/draw',
  },
  {
    title: '识别求解',
    description: '从图片识别数独并自动求解',
    path: '/solver',
  },
  {
    title: '数独教程',
    description: '千题千解，详细图文题解',
    path: '/tutorial',
  },
]
</script>
