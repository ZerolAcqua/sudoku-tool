<template>
  <!-- 绘图色板：圆形色块，选中用外圈描边表示（不缩放、不加粗边，避免布局跳动） -->
  <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="颜色">
    <button v-for="color in DRAWING_COLORS" :key="color.value" type="button"
      class="grid place-items-center rounded-full ring-offset-2 ring-offset-card transition-shadow"
      :class="[sizeClass, modelValue === color.value ? 'ring-2 ring-foreground/70' : 'hover:ring-2 hover:ring-border']"
      :title="color.name" :aria-label="color.name" :aria-pressed="modelValue === color.value"
      @click.stop="emit('update:modelValue', color.value)">
      <span class="size-full rounded-full" :style="{ backgroundColor: color.value }" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DRAWING_COLORS } from '@/composables/useDrawingState';

const props = withDefaults(defineProps<{ modelValue?: string; size?: 'sm' | 'md' }>(), {
  modelValue: undefined,
  size: 'md',
});

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const sizeClass = computed(() => (props.size === 'sm' ? 'size-5' : 'size-6'));
</script>
