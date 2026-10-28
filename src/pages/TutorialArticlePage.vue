<!-- 教程文章页：渲染 content/tutorial/ 下对应的 Markdown（构建期编译为组件，按篇懒加载）。
     文档类页面：恢复文本选择（全站默认 select-none）。 -->
<template>
  <div class="page-container select-text">
    <nav class="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="面包屑">
      <RouterLink :to="{ path: '/tutorial', query: meta ? { category: meta.category } : {} }"
        class="hover:text-foreground">{{ feature.title }}</RouterLink>
      <template v-if="category">
        <ChevronRight class="size-3.5" />
        <span>{{ category.label }}</span>
      </template>
    </nav>

    <article v-if="ArticleBody" class="mx-auto w-full max-w-3xl">
      <component :is="ArticleBody" />
    </article>
    <div v-else class="mx-auto w-full max-w-3xl">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">没有找到这篇文章</h1>
      <p class="mt-2 text-sm text-muted-foreground">它可能已被移动或删除。</p>
    </div>

    <!-- 同分类内的上一篇 / 下一篇 -->
    <nav v-if="prev || next" class="mx-auto mt-12 grid w-full max-w-3xl grid-cols-2 gap-4 border-t border-border pt-6 text-sm"
      aria-label="文章导航">
      <RouterLink v-if="prev" :to="`/tutorial/${prev.slug}`" class="group flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">上一篇</span>
        <span class="font-medium text-foreground underline-offset-4 group-hover:underline">{{ prev.title }}</span>
      </RouterLink>
      <span v-else />
      <RouterLink v-if="next" :to="`/tutorial/${next.slug}`" class="group flex flex-col items-end gap-1 text-right">
        <span class="text-xs text-muted-foreground">下一篇</span>
        <span class="font-medium text-foreground underline-offset-4 group-hover:underline">{{ next.title }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { ChevronRight } from '@lucide/vue';
import { articles } from 'virtual:tutorial-index';
import { FEATURE_BY_KEY } from '@/constants/features';
import { TUTORIAL_CATEGORIES } from '@/constants/tutorial';

const feature = FEATURE_BY_KEY.tutorial;

// 每篇文章单独成块，进入时才加载
const loaders = import.meta.glob<Component>('/content/tutorial/**/*.md', { import: 'default' });
const components = new Map(
  Object.entries(loaders).map(([path, load]) => [
    path.replace(/^\/content\/tutorial\//, '').replace(/\.md$/, ''),
    defineAsyncComponent(load),
  ])
);

const route = useRoute();
const slug = computed(() => {
  const p = route.params.slug;
  return Array.isArray(p) ? p.join('/') : (p ?? '');
});

const ArticleBody = computed(() => components.get(slug.value) ?? null);
const meta = computed(() => articles.find((a) => a.slug === slug.value) ?? null);
const category = computed(() => TUTORIAL_CATEGORIES.find((c) => c.id === meta.value?.category) ?? null);

const siblings = computed(() => articles.filter((a) => a.category === meta.value?.category));
const position = computed(() => siblings.value.findIndex((a) => a.slug === slug.value));
const prev = computed(() => (position.value > 0 ? siblings.value[position.value - 1] : undefined));
const next = computed(() => (position.value >= 0 ? siblings.value[position.value + 1] : undefined));
</script>
