<!-- 页头：直接落在纸面内容流里（放在 .page-container 内），不做色带、不加图标块 -->
<template>
  <header class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="description" class="mt-1.5 max-w-2xl text-sm text-muted-foreground">{{ description }}</p>
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>

    <!-- 页头下方的附加行（如步骤指示器） -->
    <div v-if="$slots.default" class="basis-full">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>
