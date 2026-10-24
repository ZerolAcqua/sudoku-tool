// 盘面尺寸跟随容器：SudokuBoard 需要数值 size，这里用 ResizeObserver 把容器尺寸换算过去
// - 默认只看宽度（窄屏纵向排列、允许滚动）
// - fitHeight 时同时受容器高度限制，用于「一屏布局」：盘面边长 = min(可用宽, 可用高)
// - reserveWidth 用于容器里还并排放着侧栏的情况：从容器宽度里扣掉侧栏 + 间距
import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue';

export interface BoardSizeOptions {
  min?: number;
  max?: number;
  initial?: number;
  fitHeight?: MaybeRefOrGetter<boolean>;
  reserveWidth?: MaybeRefOrGetter<number>;
}

export function useBoardSize(
  containerRef: Ref<HTMLElement | null>,
  { min = 240, max = 620, initial = 560, fitHeight = false, reserveWidth = 0 }: BoardSizeOptions = {}
) {
  const size = ref(initial);
  let observer: ResizeObserver | null = null;

  function update(): void {
    const el = containerRef.value;
    if (!el) return;
    const width = el.clientWidth - toValue(reserveWidth);
    if (width <= 0) return;
    const height = toValue(fitHeight) ? el.clientHeight : Infinity;
    size.value = Math.min(max, Math.max(min, Math.floor(Math.min(width, height))));
  }

  watch(() => [toValue(fitHeight), toValue(reserveWidth)], update, { flush: 'post' });

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
