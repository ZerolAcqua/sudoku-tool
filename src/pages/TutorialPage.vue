<!-- 文档类页面：恢复文本选择（全站默认 select-none，见 style.css） -->
<template>
  <div class="page-container select-text">
    <PageHeader :title="feature.title" description="千题千解文档化，图文详解，掌握解题思路" />

    <div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <!-- 侧栏：分类导航（选中态与顶部导航一致） -->
        <nav class="flex flex-row gap-1 overflow-x-auto lg:sticky lg:top-20 lg:flex-col lg:self-start lg:overflow-visible"
          aria-label="技巧分类">
          <span class="hidden px-3 pb-1 text-xs text-muted-foreground lg:block">技巧分类</span>
          <button v-for="cat in TUTORIAL_CATEGORIES" :key="cat.id" type="button"
            class="flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-1.5 text-left text-sm transition-colors"
            :class="activeId === cat.id
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:text-foreground'"
            :aria-current="activeId === cat.id ? 'true' : undefined" @click="activeId = cat.id">
            {{ cat.label }}
            <span class="hidden text-xs tabular-nums opacity-70 lg:inline">{{ articlesOf(cat.id).length }}</span>
          </button>
        </nav>

        <!-- 内容区：文章卡（与首页功能卡同一样式），数据来自 content/tutorial/ 下各文章的 frontmatter -->
        <section>
          <div class="mb-4">
            <h2 class="text-base font-medium text-foreground">{{ active.label }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">{{ active.description }}</p>
          </div>

          <div v-if="activeArticles.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <RouterLink v-for="article in activeArticles" :key="article.slug" :to="`/tutorial/${article.slug}`"
              class="group">
              <Card class="h-full gap-3 transition-colors group-hover:border-foreground/30">
                <CardHeader>
                  <CardTitle class="text-base font-medium">{{ article.title }}</CardTitle>
                  <CardDescription v-if="article.description">{{ article.description }}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span class="inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 group-hover:underline">
                    阅读
                    <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </RouterLink>
          </div>
          <p v-else class="text-sm text-muted-foreground">本分类的文章筹备中。</p>

          <p class="mt-6 text-sm text-muted-foreground">
            也可以先用
            <RouterLink to="/draw" class="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">绘图工具</RouterLink>
            自己标注思路。
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowRight } from '@lucide/vue'
import { articles } from 'virtual:tutorial-index'
import PageHeader from '@/components/PageHeader.vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FEATURE_BY_KEY } from '@/constants/features'
import { TUTORIAL_CATEGORIES } from '@/constants/tutorial'

const feature = FEATURE_BY_KEY.tutorial

function articlesOf(categoryId: string) {
  return articles.filter((a) => a.category === categoryId)
}

// 当前分类记在 ?category= 上：从文章页返回时回到原分类
const route = useRoute()
const router = useRouter()
const activeId = computed({
  get: () => {
    const q = route.query.category
    return TUTORIAL_CATEGORIES.some((c) => c.id === q) ? (q as string) : TUTORIAL_CATEGORIES[0]!.id
  },
  set: (id: string) => {
    router.replace({ query: { ...route.query, category: id } })
  },
})
const active = computed(() => TUTORIAL_CATEGORIES.find((c) => c.id === activeId.value) ?? TUTORIAL_CATEGORIES[0]!)
const activeArticles = computed(() => articlesOf(activeId.value))
</script>
