<!-- 教程书架：列出 content/tutorial/ 下的每本书（book.yaml），点开进入书内阅读（TutorialBookPage）。 -->
<template>
  <div class="page-container">
    <PageHeader :title="feature.title" :description="feature.description" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink v-for="book in books" :key="book.id" :to="`/tutorial/${book.id}`" class="group">
        <Card class="h-full gap-2 p-5 transition-colors group-hover:border-foreground/30">
          <h2 class="text-base font-medium text-foreground">{{ book.title }}</h2>
          <p v-if="book.description" class="text-sm text-muted-foreground">{{ book.description }}</p>
          <span class="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-foreground underline-offset-4 group-hover:underline">
            开始阅读
            <ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Card>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ArrowRight } from '@lucide/vue';
import { books } from 'virtual:tutorial-books';
import PageHeader from '@/components/PageHeader.vue';
import { Card } from '@/components/ui/card';
import { FEATURE_BY_KEY } from '@/constants/features';

const feature = FEATURE_BY_KEY.tutorial;
</script>
