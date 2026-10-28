<!-- 教程盘面：由 ```sudoku 代码块生成（见 utils/sudokuFigure.ts）。
     多帧时在帧之间循环播放，用来演示推理步骤；滚出视口或系统开启「减少动态效果」时不自动播放。 -->
<template>
  <figure class="sudoku-figure my-6 flex flex-col items-center gap-3" @click="onLinkClick">
    <!-- aspect-square 先占住盘面高度：盘面边长要等挂载后按容器宽度算出，不占位的话下方内容会跳动 -->
    <div ref="boardWrapRef" class="aspect-square w-full max-w-[440px]">
      <SudokuBoard v-if="frame" mode="display" :size="boardSize" :board="frame.board" :given="frame.given"
        :candidates="frame.candidates" :show-candidates="figure.showCandidates" :custom-highlights="frame.highlights"
        :candidate-markers="frame.candidateMarkers" :markers="frame.markers" :chains="frame.chains" />
    </div>

    <div v-if="frames.length > 1" class="flex items-center gap-1" role="group" aria-label="播放控制">
      <Button variant="ghost" size="icon-sm" aria-label="上一步" @click="step(-1)">
        <ChevronLeft />
      </Button>
      <Button variant="ghost" size="icon-sm" :aria-label="playing ? '暂停' : '播放'" @click="playing = !playing">
        <Pause v-if="playing" />
        <Play v-else />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="下一步" @click="step(1)">
        <ChevronRight />
      </Button>
      <div class="ml-2 flex items-center gap-1.5">
        <button v-for="(_, i) in frames" :key="i" type="button" :aria-label="`第 ${i + 1} 步`"
          :aria-current="i === index ? 'step' : undefined" class="size-2 rounded-full transition-colors"
          :class="i === index ? 'bg-foreground' : 'bg-border hover:bg-muted-foreground'" @click="jump(i)" />
      </div>
      <span class="ml-2 text-xs tabular-nums text-muted-foreground">{{ index + 1 }} / {{ frames.length }}</span>
    </div>

    <!-- 各帧说明叠在同一格里，按最长的一条占高度，切帧时版面不跳动；
         说明是构建期从本仓库 Markdown 渲染出的 HTML -->
    <div v-if="hasFrameCaptions" class="grid w-full max-w-[440px] text-sm" aria-live="polite">
      <p v-for="(f, i) in frames" :key="i" class="[grid-area:1/1]" :class="i === index ? '' : 'invisible'"
        :aria-hidden="i === index ? undefined : 'true'" v-html="f.caption ?? ''" />
    </div>

    <figcaption v-if="figure.caption" class="text-xs text-muted-foreground" v-html="figure.caption" />
  </figure>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { routerKey } from 'vue-router';
import { useIntersectionObserver, usePreferredReducedMotion } from '@vueuse/core';
import { ChevronLeft, ChevronRight, Pause, Play } from '@lucide/vue';
import SudokuBoard from '@/components/SudokuBoard.vue';
import { Button } from '@/components/ui/button';
import { useBoardSize } from '@/composables/useBoardSize';
import { resolveFigure, type FigureSpec } from '@/utils/sudokuFigure';

const props = defineProps<{
  spec: FigureSpec;
}>();

const figure = computed(() => resolveFigure(props.spec));

// 说明里的站内链接是 v-html 插入的普通 <a data-router-link>，点击时交给路由，不整页刷新
const router = inject(routerKey, null);

function onLinkClick(event: MouseEvent): void {
  const link = (event.target as Element | null)?.closest?.('a[data-router-link]');
  if (!link || !router || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  router.push(link.getAttribute('href')!);
}
const frames = computed(() => figure.value.frames);
const hasFrameCaptions = computed(() => frames.value.some((f) => f.caption));

const index = ref(0);
const frame = computed(() => frames.value[index.value] ?? frames.value[0]);

const boardWrapRef = ref<HTMLElement | null>(null);
const boardSize = useBoardSize(boardWrapRef, { min: 200, max: 440, initial: 360 });

// ---------------- 播放 ----------------

const reducedMotion = usePreferredReducedMotion();
const playing = ref(figure.value.autoplay && reducedMotion.value !== 'reduce');
const visible = ref(false);

useIntersectionObserver(boardWrapRef, ([entry]) => {
  visible.value = entry?.isIntersecting ?? false;
});

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(): void {
  if (timer) clearTimeout(timer);
  timer = null;
}

function go(i: number): void {
  const n = frames.value.length;
  index.value = ((i % n) + n) % n;
}

// 手动切帧即停止自动播放，避免刚看到的一步被立刻翻走
function jump(i: number): void {
  playing.value = false;
  go(i);
}

function step(delta: number): void {
  jump(index.value + delta);
}

watch(
  [playing, visible, index, frames],
  () => {
    clearTimer();
    if (!playing.value || !visible.value || frames.value.length < 2) return;
    timer = setTimeout(() => go(index.value + 1), frame.value?.duration);
  },
  { immediate: true }
);

watch(frames, () => {
  if (index.value >= frames.value.length) index.value = 0;
});

onBeforeUnmount(clearTimer);
</script>
