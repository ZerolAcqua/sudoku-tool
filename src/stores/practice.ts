import { defineStore } from 'pinia';
import type { UnitMode } from '../utils/generator';

interface RecordItem {
  mode: UnitMode;
  durationMs: number;
  correct: boolean;
}

export const usePracticeStore = defineStore('practice', {
  state: () => ({
    total: 0,
    correct: 0,
    wrong: 0,
    totalTimeMs: 0,
    currentStartTs: 0 as number | null,
    history: [] as RecordItem[],
  }),
  getters: {
    accuracy(state) {
      return state.total ? +(state.correct / state.total).toFixed(3) : 0;
    },
    avgMs(state) {
      return state.total ? Math.round(state.totalTimeMs / state.total) : 0;
    },
  },
  actions: {
    startRound() {
      this.currentStartTs = performance.now();
    },
    finishRound(mode: UnitMode, correct: boolean) {
      const now = performance.now();
      const dur = this.currentStartTs ? now - this.currentStartTs : 0;
      this.total += 1;
      if (correct) this.correct += 1;
      else this.wrong += 1;
      this.totalTimeMs += dur;
      this.history.push({ mode, durationMs: dur, correct });
      this.currentStartTs = null;
      return dur;
    },
    resetStats() {
      this.total = 0;
      this.correct = 0;
      this.wrong = 0;
      this.totalTimeMs = 0;
      this.currentStartTs = null;
      this.history = [];
    },
  },
});
