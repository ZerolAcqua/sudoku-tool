<template>
  <div class="page-container">
    <h1 class="page-title mb-2">组件展示</h1>
    <p class="text-sm text-muted-foreground mb-8">
      盘面组件与 OCR 流水线的功能预览，用于开发验证，不属于正式功能入口。
    </p>

    <Tabs v-model="activeTab" class="gap-6">
      <TabsList>
        <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id">{{ tab.label }}</TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        <BasicDemo v-if="mounted.has('basic')" />
      </TabsContent>
      <TabsContent value="interactive">
        <InteractiveDemo v-if="mounted.has('interactive')" />
      </TabsContent>
      <TabsContent value="io">
        <IODemo v-if="mounted.has('io')" />
      </TabsContent>
      <TabsContent value="ocr">
        <OCRDemo v-if="mounted.has('ocr')" />
      </TabsContent>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, defineAsyncComponent, onMounted, watch } from 'vue'
import BasicDemo from './demo/BasicDemo.vue'
import InteractiveDemo from './demo/InteractiveDemo.vue'
import IODemo from './demo/IODemo.vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// OCRDemo 体积约 16MB，必须懒加载，勿同步引入
const OCRDemo = defineAsyncComponent(() => import('./demo/OCRDemo.vue'))

const tabs = [
  { id: 'basic', label: '基础展示' },
  { id: 'interactive', label: '交互模式' },
  { id: 'io', label: 'IO 功能' },
  { id: 'ocr', label: '数独识别' },
]

const activeTab = ref('basic')
// 已访问过的标签页保持挂载（盘面状态不丢失），未访问的不渲染以省去重计算
const mounted = ref(new Set<string>(['basic']))

watch(activeTab, (tab) => {
  mounted.value = new Set(mounted.value).add(tab)
  // 保持可分享的 hash 定位（例如 /demo#ocr）
  window.history.replaceState(null, '', tab === 'basic' ? window.location.pathname : `#${tab}`)
})

// 支持通过 hash 直接定位标签页
onMounted(() => {
  const hash = window.location.hash.slice(1)
  if (hash && tabs.some((tab) => tab.id === hash)) {
    activeTab.value = hash
  }
})
</script>
