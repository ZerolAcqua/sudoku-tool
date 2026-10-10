<template>
  <TooltipProvider>
    <AppNav />

    <main>
      <RouterView />
    </main>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppNav from './components/AppNav.vue'
</script>
