<template>
  <!-- 分段控件：浅灰槽 + 白色滑块。全站单选切换统一用它，选中态不占用品牌色。
       spacing 非 0：避开 ToggleGroupItem 为「连体按钮」写的 rounded-none / shadow-none 规则 -->
  <ToggleGroup :model-value="modelValue" type="single" variant="segmented" :size="size" :spacing="0.5"
    class="rounded-lg bg-muted p-0.5" :aria-label="ariaLabel" @update:model-value="onUpdate">
    <ToggleGroupItem v-for="opt in options" :key="opt.value" :value="opt.value" :title="opt.title"
      :aria-label="opt.title ?? opt.label" class="gap-1.5 rounded-md px-3">
      <component :is="opt.icon" v-if="opt.icon" />
      {{ opt.label }}
    </ToggleGroupItem>
  </ToggleGroup>
</template>

<script lang="ts">
import type { Component } from 'vue';

export interface SegmentedOption<V extends string = string> {
  value: V;
  label: string;
  title?: string;
  icon?: Component;
}
</script>

<script setup lang="ts" generic="T extends string">
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

withDefaults(
  defineProps<{
    modelValue: T;
    options: SegmentedOption<T>[];
    size?: 'sm' | 'default';
    ariaLabel?: string;
  }>(),
  { size: 'sm', ariaLabel: undefined }
);

const emit = defineEmits<{ (e: 'update:modelValue', value: T): void }>();

// reka 的单选 ToggleGroup 再次点击已选项会取消选中（值变空），这里忽略，保证始终有一项选中
function onUpdate(value: unknown): void {
  if (typeof value === 'string' && value) emit('update:modelValue', value as T);
}
</script>
