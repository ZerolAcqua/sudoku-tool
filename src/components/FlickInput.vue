<template>
  <!-- 手势输入层（类似手机 flick 输入）：包住任意内容（盘面），在其上
       - 点按 = 5
       - 按住向 8 个方向滑动 = 九宫键盘上对应方位的数字（↖7 ↑8 ↗9 ←4 →6 ↙1 ↓2 ↘3）
       滑动时在按下处弹出九宫罗盘实时提示，抬起才提交。 -->
  <div ref="rootRef" class="relative w-fit touch-none select-none" :class="disabled ? '' : 'cursor-pointer'"
    @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="cancel">
    <slot />

    <!-- 罗盘：用 SVG 绘制（坐标是绘制属性），viewBox 与容器像素一一对应 -->
    <svg v-if="gesture && gesture.visible" class="pointer-events-none absolute inset-0 size-full overflow-visible"
      :viewBox="`0 0 ${gesture.width} ${gesture.height}`" aria-hidden="true">
      <line v-if="gesture.digit !== 5" :x1="gesture.x0" :y1="gesture.y0" :x2="gesture.x" :y2="gesture.y"
        stroke="var(--color-board-focus-ring)" stroke-width="2" stroke-linecap="round" stroke-opacity="0.6" />
      <g :transform="`translate(${compassCenter.x} ${compassCenter.y})`">
        <rect :x="-PITCH * 1.5 - 4" :y="-PITCH * 1.5 - 4" :width="PITCH * 3 + 8" :height="PITCH * 3 + 8" rx="12"
          fill="var(--color-surface)" fill-opacity="0.9" stroke="var(--color-outline-variant)" />
        <g v-for="cell in COMPASS" :key="cell.n">
          <rect :x="cell.dx * PITCH - CELL / 2" :y="cell.dy * PITCH - CELL / 2" :width="CELL" :height="CELL" rx="8"
            :fill="cell.n === gesture.digit ? 'var(--color-board-focus)' : 'var(--color-surface)'"
            :stroke="cell.n === gesture.digit ? 'var(--color-board-focus-ring)' : 'var(--color-outline-variant)'"
            :stroke-width="cell.n === gesture.digit ? 2 : 1" />
          <text :x="cell.dx * PITCH" :y="cell.dy * PITCH" text-anchor="middle" dominant-baseline="central"
            class="font-board" font-size="22"
            :fill="cell.n === gesture.digit ? 'var(--color-given-num)' : 'var(--color-cand)'">{{ cell.n }}</text>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const emit = defineEmits<{
  (e: 'input', n: number): void;
  // 手势进行中的候选数字（null = 无手势），供外部高亮数字键盘
  (e: 'preview', n: number | null): void;
}>();

// 位移小于该值视为点按（5）；超过 SHOW_AFTER 或按住超过 SHOW_DELAY 才显示罗盘，避免快速点按时闪一下
const TAP_RADIUS = 18;
const SHOW_AFTER = 6;
const SHOW_DELAY = 180;

// 罗盘格子尺寸（px）
const CELL = 40;
const PITCH = 46;

// 九宫方位：与数字键盘布局一致，dx/dy 为相对中心的格数
const COMPASS = [7, 8, 9, 4, 5, 6, 1, 2, 3].map((n, i) => ({ n, dx: (i % 3) - 1, dy: Math.floor(i / 3) - 1 }));

// 方向扇区 → 数字：从正右（0°）起逆时针每 45° 一格
const SECTOR_DIGITS = [6, 9, 8, 7, 4, 1, 2, 3];

interface GestureState {
  pointerId: number;
  width: number;
  height: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  digit: number;
  visible: boolean;
}

const rootRef = ref<HTMLElement | null>(null);
const gesture = ref<GestureState | null>(null);
let showTimer: ReturnType<typeof setTimeout> | null = null;

function digitFor(dx: number, dy: number): number {
  if (Math.hypot(dx, dy) < TAP_RADIUS) return 5;
  // 屏幕坐标 y 向下，取反得到数学角度（向上为正）
  const angle = Math.atan2(-dy, dx);
  const sector = (Math.round(angle / (Math.PI / 4)) + 8) % 8;
  return SECTOR_DIGITS[sector]!;
}

// 罗盘中心跟随按下点，但整体保持在容器内
const compassCenter = computed(() => {
  const g = gesture.value;
  if (!g) return { x: 0, y: 0 };
  const half = PITCH * 1.5 + 4;
  const clamp = (v: number, size: number) => Math.min(Math.max(v, half), Math.max(half, size - half));
  return { x: clamp(g.x0, g.width), y: clamp(g.y0, g.height) };
});

function localPoint(e: PointerEvent): { x: number; y: number; width: number; height: number } {
  const rect = rootRef.value!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, width: rect.width, height: rect.height };
}

function clearTimer(): void {
  if (showTimer) clearTimeout(showTimer);
  showTimer = null;
}

function onDown(e: PointerEvent): void {
  if (props.disabled || gesture.value || !rootRef.value) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  rootRef.value.setPointerCapture(e.pointerId);

  const p = localPoint(e);
  gesture.value = { pointerId: e.pointerId, ...p, x0: p.x, y0: p.y, digit: 5, visible: false };
  emit('preview', 5);
  showTimer = setTimeout(() => {
    if (gesture.value) gesture.value.visible = true;
  }, SHOW_DELAY);
}

function onMove(e: PointerEvent): void {
  const g = gesture.value;
  if (!g || e.pointerId !== g.pointerId) return;
  const p = localPoint(e);
  g.x = p.x;
  g.y = p.y;
  const dx = p.x - g.x0;
  const dy = p.y - g.y0;
  if (!g.visible && Math.hypot(dx, dy) > SHOW_AFTER) g.visible = true;
  const digit = digitFor(dx, dy);
  if (digit !== g.digit) {
    g.digit = digit;
    emit('preview', digit);
  }
}

function onUp(e: PointerEvent): void {
  const g = gesture.value;
  if (!g || e.pointerId !== g.pointerId) return;
  const p = localPoint(e);
  const digit = digitFor(p.x - g.x0, p.y - g.y0);
  cancel();
  emit('input', digit);
}

function cancel(): void {
  clearTimer();
  if (!gesture.value) return;
  gesture.value = null;
  emit('preview', null);
}

onBeforeUnmount(clearTimer);
</script>
