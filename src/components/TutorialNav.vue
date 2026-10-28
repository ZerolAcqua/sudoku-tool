<!-- 教程目录树（GitBook 式侧栏）：桌面端常驻左侧，移动端放在抽屉里。
     当前文章及其祖先自动展开，其余可手动展开 / 收起；当前文章下列出本篇的二级标题，随滚动高亮。 -->
<template>
  <ul class="flex flex-col gap-0.5">
    <li v-for="(node, i) in nodes" :key="node.slug ?? `${node.title}-${i}`">
      <div class="flex items-center">
        <RouterLink v-if="node.slug !== undefined" :to="routeOf(node.slug)"
          class="min-w-0 flex-1 rounded-md px-3 py-1.5 text-sm transition-colors"
          :class="node.slug === activeSlug
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground'"
          :aria-current="node.slug === activeSlug ? 'page' : undefined">
          {{ node.title }}
        </RouterLink>
        <span v-else class="flex min-w-0 flex-1 items-baseline justify-between gap-2 px-3 py-1.5 text-sm text-muted-foreground/60">
          {{ node.title }}
          <span class="shrink-0 text-xs">筹备中</span>
        </span>
        <button v-if="node.children.length" type="button"
          class="mr-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          :aria-label="isOpen(node) ? `收起「${node.title}」` : `展开「${node.title}」`" :aria-expanded="isOpen(node)"
          @click="toggle(node)">
          <ChevronRight class="size-3.5 transition-transform" :class="isOpen(node) ? 'rotate-90' : ''" />
        </button>
      </div>

      <!-- 本篇的二级标题 -->
      <ul v-if="node.slug === activeSlug && headings.length" class="my-1 ml-3 flex flex-col border-l border-border"
        aria-label="本页目录">
        <li v-for="h in headings" :key="h.id">
          <RouterLink :to="{ path: routeOf(node.slug!), hash: `#${h.id}` }"
            class="-ml-px block border-l py-1 pr-2 pl-3 text-[13px] transition-colors"
            :class="h.id === activeHeading
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'"
            @click="emit('heading-click', h.id)">
            {{ h.text }}
          </RouterLink>
        </li>
      </ul>

      <TutorialNav v-if="node.children.length && isOpen(node)" class="ml-3 border-l border-border pl-1"
        :nodes="node.children" :active-slug="activeSlug" :trail="trail" :headings="headings"
        :active-heading="activeHeading" @heading-click="emit('heading-click', $event)" />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { ChevronRight } from '@lucide/vue';
import type { TutorialNode } from '@/utils/tutorialBook';

export interface TutorialHeading {
  id: string;
  text: string;
}

const props = defineProps<{
  nodes: TutorialNode[];
  activeSlug: string | null;
  // 当前文章的祖先链（含自身），用于自动展开
  trail: TutorialNode[];
  headings: TutorialHeading[];
  activeHeading: string | null;
}>();

const emit = defineEmits<{
  (e: 'heading-click', id: string): void;
}>();

function routeOf(slug: string): string {
  return slug ? `/tutorial/${slug}` : '/tutorial';
}

// 手动展开 / 收起的记录；没有记录时按「是否在当前文章的祖先链上」决定
const manual = ref(new Map<TutorialNode, boolean>());

function isOpen(node: TutorialNode): boolean {
  return manual.value.get(node) ?? props.trail.includes(node);
}

function toggle(node: TutorialNode): void {
  manual.value.set(node, !isOpen(node));
}
</script>
