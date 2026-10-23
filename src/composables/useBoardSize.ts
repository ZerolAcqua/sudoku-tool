// 盘面尺寸跟随容器宽度：SudokuBoard 需要数值 size，这里用 ResizeObserver 把容器宽度换算过去
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue';

export interface BoardSizeOptions {
  min?: number;
  max?: number;
  initial?: number;
}

export function useBoardSize(
  containerRef: Ref<HTMLElement | null>,
  { min = 240, max = 620, initial = 560 }: BoardSizeOptions = {}
) {
  const size = ref(initial);
  let observer: ResizeObserver | null = null;

  function update(): void {
    const width = containerRef.value?.clientWidth ?? 0;
    if (width > 0) size.value = Math.min(max, Math.max(min, Math.floor(width)));
  }

  onMounted(() => {
    update();
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      observer = new ResizeObserver(update);
      observer.observe(containerRef.value);
    } else {
      window.addEventListener('resize', update);
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener('resize', update);
  });

  return size;
}
