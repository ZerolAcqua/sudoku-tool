<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">功能测试 Demo</h1>

    <!-- Tab Navigation -->
    <div class="bg-white shadow rounded-lg mb-8">
      <div class="border-b border-gray-200">
        <nav class="flex -mb-px">
          <button v-for="tab in tabs" :key="tab.id" @click="handleTabChange(tab.id)" :class="[
            'px-6 py-4 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]">
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    <BasicDemo v-show="activeTab === 'basic'" />

    <InteractiveDemo v-show="activeTab === 'interactive'" />

    <DrawingDemo v-show="activeTab === 'drawing'" />

    <IODemo v-show="activeTab === 'full'" />

    <OCRDemo v-show="activeTab === 'ocr'" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import BasicDemo from './demo/BasicDemo.vue'
import InteractiveDemo from './demo/InteractiveDemo.vue'
import DrawingDemo from './demo/DrawingDemo.vue'
import IODemo from './demo/IODemo.vue'
import OCRDemo from './demo/OCRDemo.vue'

// Tab state
const activeTab = ref('basic')
const tabs = [
  { id: 'basic', label: '基础展示' },
  { id: 'interactive', label: '交互模式' },
  { id: 'drawing', label: '绘图功能' },
  { id: 'full', label: 'IO 功能' },
  { id: 'ocr', label: '数独识别' }
]

// Handle hash-based navigation
const handleHashNavigation = () => {
  const hash = window.location.hash.slice(1) // Remove '#'
  if (hash && tabs.some(tab => tab.id === hash)) {
    activeTab.value = hash
  }
}

// Update hash when tab changes
const handleTabChange = (tabId: string) => {
  activeTab.value = tabId
  window.location.hash = tabId
}

onMounted(() => {
  handleHashNavigation()
})

// Listen to hash changes (e.g., browser back/forward buttons)
window.addEventListener('hashchange', handleHashNavigation)
</script>