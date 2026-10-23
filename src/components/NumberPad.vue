<template>
  <!-- 九宫数字键盘：按小键盘布局（7 8 9 在上），练习页与识别页共用；数字用盘面衬线字体，与盘面呼应 -->
  <div class="grid select-none grid-cols-3 gap-2">
    <Button v-for="n in NUMBER_KEYS" :key="'numpad-' + n" variant="outline" :disabled="disabled"
      :aria-label="`输入 ${n}`" class="h-14 font-board text-2xl font-normal active:scale-95"
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

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });

const emit = defineEmits<{ (e: 'input', n: number): void }>();

const NUMBER_KEYS = [7, 8, 9, 4, 5, 6, 1, 2, 3];
</script>
