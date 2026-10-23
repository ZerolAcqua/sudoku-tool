<template>
  <div class="page-container">
    <PageHeader :title="feature.title" description="千题千解文档化，图文详解，掌握解题思路" />

    <div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <!-- 侧栏：分类导航（选中态与顶部导航一致） -->
        <nav class="flex flex-row gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start lg:overflow-visible"
          aria-label="技巧分类">
          <span class="hidden px-3 pb-1 text-xs text-muted-foreground lg:block">技巧分类</span>
          <button v-for="cat in CATEGORIES" :key="cat.id" type="button"
            class="flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm transition-colors"
            :class="activeId === cat.id
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            :aria-current="activeId === cat.id ? 'true' : undefined" @click="activeId = cat.id">
            {{ cat.label }}
            <span class="hidden text-xs tabular-nums opacity-70 lg:inline">{{ cat.topics.length }}</span>
          </button>
        </nav>

        <!-- 内容区：技巧卡（与首页功能卡同一样式）；题解数据尚未接入 -->
        <section>
          <div class="mb-4">
            <h2 class="text-base font-medium text-foreground">{{ active.label }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{{ active.description }}</p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <component :is="topic.link ? RouterLink : 'div'" v-for="topic in active.topics" :key="topic.title"
              :to="topic.link" class="group">
              <Card class="h-full gap-3 transition-colors"
                :class="topic.link ? 'group-hover:border-foreground/30' : ''">
                <CardHeader>
                  <div class="flex items-baseline justify-between gap-3">
                    <CardTitle class="text-base font-medium">{{ topic.title }}</CardTitle>
                    <span v-if="!topic.link" class="shrink-0 text-xs text-muted-foreground">筹备中</span>
                  </div>
                  <CardDescription>{{ topic.description }}</CardDescription>
                </CardHeader>
                <CardContent v-if="topic.link">
                  <span class="inline-flex items-center gap-1 text-sm text-brand">
                    {{ topic.action }}
                    <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </component>
          </div>

          <p class="mt-6 text-sm text-muted-foreground">
            每篇题解将包含盘面演示、推理步骤与关键技巧说明。在此之前，可以先用
            <RouterLink to="/draw" class="font-medium text-brand hover:underline">绘图工具</RouterLink>
            自己标注思路。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import PageHeader from '@/components/PageHeader.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FEATURE_BY_KEY } from '@/constants/features'

const feature = FEATURE_BY_KEY.tutorial

interface Topic {
  title: string
  description: string
  link?: string
  action?: string
}

interface Category {
  id: string
  label: string
  description: string
  topics: Topic[]
}

// 技巧分类骨架：题解数据后续接入，已有对应工具的条目直接链接过去
const CATEGORIES: Category[] = [
  {
    id: 'basic',
    label: '基础技巧',
    description: '从唯余、摒除开始，建立最基本的排除思路。',
    topics: [
      { title: '唯余法', description: '某格只剩一个可能的数字。', link: '/practice', action: '去专项练习' },
      { title: '宫摒除', description: '利用行列排除，锁定宫内唯一位置。' },
      { title: '行列摒除', description: '在行或列中找出数字的唯一落点。' },
    ],
  },
  {
    id: 'advanced',
    label: '进阶技巧',
    description: '候选数层面的区块、数组与鱼结构。',
    topics: [
      { title: '区块摒除', description: '候选数集中在宫内一行 / 一列时的排除。' },
      { title: '显性 / 隐性数组', description: 'n 格 n 数的组合排除。' },
      { title: 'X-Wing', description: '两行两列构成的矩形鱼结构。' },
    ],
  },
  {
    id: 'chain',
    label: '链',
    description: '强弱链交替推理，是高阶解题的核心。',
    topics: [
      { title: '双强链', description: '两条强链经弱链连接形成的推理。' },
      { title: 'XY-Chain', description: '由双值格串成的链。' },
      { title: 'AIC', description: '交替推理链的通用形式。' },
    ],
  },
  {
    id: 'ur',
    label: '唯一矩形',
    description: '利用唯一解性质避免致命结构。',
    topics: [
      { title: 'UR Type 1', description: '矩形三角为双值格时的排除。' },
      { title: 'UR Type 2', description: '矩形两角带有相同额外候选数。' },
    ],
  },
  {
    id: 'classic',
    label: '经典题型',
    description: '精选题目的完整解题过程。',
    topics: [{ title: '题解合集', description: '按难度整理的完整题解。' }],
  },
]

const activeId = ref(CATEGORIES[0]!.id)
const active = computed(() => CATEGORIES.find((c) => c.id === activeId.value) ?? CATEGORIES[0]!)
</script>
