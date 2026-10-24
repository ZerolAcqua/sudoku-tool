<template>
  <!-- 九宫数字键盘：按小键盘布局（7 8 9 在上），练习页与识别页共用；数字用盘面衬线字体，与盘面呼应。
       同时充当手势输入的图例：active 高亮当前手势 / 按键对应的数字，配色与盘面选中格一致 -->
  <div class="grid select-none grid-cols-3 gap-2">
    <Button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" variant="outline" :disabled="disabled"
      :aria-label="`输入 ${n}`" class="font-board font-normal transition-colors active:scale-95"
      :class="[size === 'sm' ? 'h-11 text-xl' : 'h-12 text-2xl',
        active === n ? 'border-board-focus-ring bg-board-focus hover:bg-board-focus' : '']"
      @click="emit('input', n)">
      {{ n }}
    </Button>
    <!-- 额外按键（如「清除」）占满一整行 -->
    <div v-if="$slots.default" class="col-span-3 flex">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';

withDefaults(defineProps<{ disabled?: boolean; active?: number | null; size?: 'sm' | 'md' }>(), {
  disabled: false,
  active: null,
  size: 'md',
});

const emit = defineEmits<{ (e: 'input', n: number): void }>();

const NUMBER_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3];
</script>
