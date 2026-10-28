<!-- 教程书内阅读（GitBook 式）：左侧本书目录常驻，右侧是文章正文；/tutorial/<书> 是本书首页（README.md）。
     文章是 content/tutorial/<书>/ 下的 Markdown，构建期编译为组件、按篇懒加载；目录来自本书 book.yaml 的 chapters。
     桌面端一屏：目录与正文各自滚动；窄屏目录收进抽屉，整页在 main 内滚动。
     文档类页面：恢复文本选择（全站默认 select-none）。 -->
<template>
  <div class="page-container select-text lg:min-h-0 lg:pb-0">
    <DefineToc>
      <RouterLink to="/tutorial"
        class="mb-3 inline-flex items-center gap-1 px-3 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft class="size-3.5" />
        {{ feature.title }}
      </RouterLink>
      <RouterLink v-if="book" :to="routeOf(book.id)" class="mb-3 block px-3 text-sm font-semibold text-foreground">
        {{ book.title }}
      </RouterLink>
      <div v-for="(section, i) in book?.sections ?? []" :key="section.title ?? i" class="mb-4">
        <div v-if="section.title" class="px-3 pb-1 text-xs text-muted-foreground">{{ section.title }}</div>
        <TutorialNav :nodes="section.items" :active-slug="current ? slug : null" :trail="trail?.nodes ?? []"
          :headings="headings" :active-heading="activeHeading" @heading-click="scrollToHeading" />
      </div>
    </DefineToc>

    <!-- 窄屏：目录按钮 -->
    <div class="mb-4 lg:hidden">
      <Sheet v-model:open="navOpen">
        <SheetTrigger as-child>
          <Button variant="outline" size="sm">
            <PanelLeft />
            目录
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-80 gap-0 overflow-y-auto">
          <SheetHeader>
            <SheetTitle class="sr-only">教程目录</SheetTitle>
            <SheetDescription class="sr-only">选择要阅读的文章</SheetDescription>
          </SheetHeader>
          <nav class="px-2 pb-6" aria-label="教程目录">
            <ReuseToc />
          </nav>
        </SheetContent>
      </Sheet>
    </div>

    <div class="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-10">
      <nav class="hidden overflow-y-auto pr-1 pb-8 lg:block" aria-label="教程目录">
        <ReuseToc />
      </nav>

      <div class="min-w-0 lg:overflow-y-auto lg:pb-8">
        <div class="mx-auto w-full max-w-3xl">
          <nav v-if="breadcrumb.length > 1" class="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
            aria-label="面包屑">
            <template v-for="(item, i) in breadcrumb" :key="i">
              <ChevronRight v-if="i > 0" class="size-3" />
              <RouterLink v-if="item.slug !== undefined && i < breadcrumb.length - 1" :to="routeOf(item.slug)"
                class="hover:text-foreground">{{ item.title }}</RouterLink>
              <span v-else>{{ item.title }}</span>
            </template>
          </nav>

          <article v-if="body" ref="articleRef">
            <component :is="body" />
          </article>
          <div v-else-if="missing">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ book ? '没有找到这篇文章' : '没有找到这本书' }}</h1>
            <p class="mt-2 text-sm text-muted-foreground">
              它可能已被移动或删除，可以{{ book ? '从目录里重新选择，或' : '' }}回到
              <RouterLink :to="book ? routeOf(book.id) : '/tutorial'"
                class="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">
                {{ book ? '本书首页' : '教程书架' }}</RouterLink>。
            </p>
          </div>

          <!-- 按目录顺序的上一篇 / 下一篇 -->
          <nav v-if="body && (prev || next)" class="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm"
            aria-label="上一篇 / 下一篇">
            <RouterLink v-if="prev" :to="routeOf(prev.slug)" class="group flex flex-col gap-1">
              <span class="text-xs text-muted-foreground">上一篇</span>
              <span class="font-medium text-foreground underline-offset-4 group-hover:underline">{{ prev.title }}</span>
            </RouterLink>
            <span v-else />
            <RouterLink v-if="next" :to="routeOf(next.slug)" class="group flex flex-col items-end gap-1 text-right">
              <span class="text-xs text-muted-foreground">下一篇</span>
              <span class="font-medium text-foreground underline-offset-4 group-hover:underline">{{ next.title }}</span>
            </RouterLink>
          </nav>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Component } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { createReusableTemplate } from '@vueuse/core';
import { ChevronLeft, ChevronRight, PanelLeft } from '@lucide/vue';
import { books } from 'virtual:tutorial-books';
import TutorialNav, { type TutorialHeading } from '@/components/TutorialNav.vue';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { FEATURE_BY_KEY } from '@/constants/features';
import { findTrail, flattenBook, pathToSlug } from '@/utils/tutorialBook';

const feature = FEATURE_BY_KEY.tutorial;
const [DefineToc, ReuseToc] = createReusableTemplate();

// slug 以书 id 开头，书的首页 slug 就是书 id
function routeOf(slug: string): string {
  return `/tutorial/${slug}`;
}

// 每篇文章单独成块，进入时才加载
const loaders = new Map(
  Object.entries(
    import.meta.glob<Component>('/content/tutorial/*/**/*.md', { import: 'default' })
  ).map(([path, load]) => [pathToSlug(path.replace(/^\/content\/tutorial\//, '')), load])
);

const route = useRoute();
const book = computed(() => books.find((b) => b.id === route.params.book) ?? null);
// 完整 slug = 书 id + 书内路径
const slug = computed(() => {
  const p = route.params.slug;
  const rest = Array.isArray(p) ? p.join('/') : (p ?? '');
  return rest ? `${route.params.book}/${rest}` : String(route.params.book);
});

const articles = computed(() => (book.value ? flattenBook(book.value.sections) : []));
const trail = computed(() => (book.value ? findTrail(book.value.sections, slug.value) : null));
const current = computed(() => trail.value?.nodes[trail.value.nodes.length - 1] ?? null);
const position = computed(() => articles.value.findIndex((a) => a.slug === slug.value));
const prev = computed(() => (position.value > 0 ? articles.value[position.value - 1] : undefined));
const next = computed(() => (position.value >= 0 ? articles.value[position.value + 1] : undefined));

// 面包屑：书名 › 分组 › 祖先 › 当前文章；本书首页不显示
const breadcrumb = computed(() => {
  if (!book.value || !trail.value || slug.value === book.value.id) return [];
  const { section, nodes } = trail.value;
  return [
    { title: book.value.title, slug: book.value.id },
    ...(section.title ? [{ title: section.title, slug: undefined }] : []),
    ...nodes,
  ];
});

// ---------------- 加载文章 ----------------

const body = shallowRef<Component | null>(null);
const missing = ref(false);
const articleRef = ref<HTMLElement | null>(null);
const headings = ref<TutorialHeading[]>([]);
const activeHeading = ref<string | null>(null);
let loadSeq = 0;

watch(
  slug,
  async (s) => {
    // 文章属于别的书（或书不存在）时同样视为找不到
    const load = book.value ? loaders.get(s) : undefined;
    const seq = ++loadSeq;
    if (!load) {
      body.value = null;
      missing.value = true;
      headings.value = [];
      return;
    }
    const component = await load();
    // 加载期间又切到了别的文章
    if (seq !== loadSeq) return;
    body.value = component;
    missing.value = false;
    await nextTick();
    collectHeadings();
    if (route.hash) scrollToHash();
    else scrollContainer()?.scrollTo({ top: 0 });
  },
  { immediate: true }
);

watch(
  () => route.hash,
  () => scrollToHash()
);

// 切换文章后收起窄屏目录
const navOpen = ref(false);
watch(() => route.fullPath, () => (navOpen.value = false));

// ---------------- 页内标题与滚动 ----------------

function collectHeadings(): void {
  const els = articleRef.value?.querySelectorAll<HTMLElement>('h2[id]') ?? [];
  headings.value = Array.from(els, (el) => ({ id: el.id, text: el.textContent?.trim() ?? '' }));
  updateActiveHeading();
}

// 正文所在的滚动容器：桌面端是正文列，窄屏是 main
function scrollContainer(): HTMLElement | null {
  let el = articleRef.value?.parentElement ?? null;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return null;
}

function decodeHash(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return hash.replace(/^#/, '');
  }
}

function scrollToHeading(id: string): void {
  const el = articleRef.value?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  activeHeading.value = id;
}

// 盘面尺寸在挂载后才按容器宽度定下来，等两帧再滚，避免目标位置被撑开后跑偏
function scrollToHash(): void {
  const id = decodeHash(route.hash);
  if (!id) return;
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToHeading(id)));
}

// 当前标题 = 最后一个滚过正文顶部附近的二级标题
function updateActiveHeading(): void {
  const els = articleRef.value?.querySelectorAll<HTMLElement>('h2[id]');
  if (!els?.length) {
    activeHeading.value = null;
    return;
  }
  const top = (scrollContainer()?.getBoundingClientRect().top ?? 0) + 96;
  let active: string | null = null;
  for (const el of els) {
    if (el.getBoundingClientRect().top <= top) active = el.id;
    else break;
  }
  activeHeading.value = active;
}

let frame = 0;
function onScroll(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(updateActiveHeading);
}

// scroll 不冒泡：在 document 上用捕获阶段监听，正文列与 main 的滚动都能收到
onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }));
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll, { capture: true });
  cancelAnimationFrame(frame);
});
</script>
