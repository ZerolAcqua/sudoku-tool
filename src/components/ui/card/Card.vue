<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    data-slot="card"
    :class="
      cn(
        // 不加内边距：由 CardHeader / CardContent 提供（标准组合），
        // 或者调用方自己在 Card 上写 padding（简单卡片）。
        'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
