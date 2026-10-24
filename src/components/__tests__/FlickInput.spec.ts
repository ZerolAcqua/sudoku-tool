import { beforeAll, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import FlickInput from '@/components/FlickInput.vue';

// jsdom 没有指针捕获，补一个空实现
beforeAll(() => {
  Element.prototype.setPointerCapture ??= () => {};
});

// jsdom 没有 PointerEvent：用 MouseEvent 携带坐标，再补上 pointerId / pointerType
async function pointer(
  wrapper: VueWrapper,
  type: string,
  { x, y, pointerType = 'mouse' }: { x: number; y: number; pointerType?: string }
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
  Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } });
  wrapper.element.dispatchEvent(event);
  await nextTick();
}

async function gesture(dx: number, dy: number, props: { disabled?: boolean } = {}) {
  const wrapper = mount(FlickInput, { props, slots: { default: '<div />' } });
  await pointer(wrapper, 'pointerdown', { x: 100, y: 100 });
  await pointer(wrapper, 'pointermove', { x: 100 + dx / 2, y: 100 + dy / 2 });
  await pointer(wrapper, 'pointermove', { x: 100 + dx, y: 100 + dy });
  await pointer(wrapper, 'pointerup', { x: 100 + dx, y: 100 + dy });
  return wrapper;
}

describe('FlickInput 手势输入', () => {
  // 方位与九宫数字键盘一致：7 8 9 / 4 5 6 / 1 2 3
  it.each([
    { name: '点按', dx: 0, dy: 0, digit: 5 },
    { name: '轻微抖动仍算点按', dx: 5, dy: -4, digit: 5 },
    { name: '左', dx: -60, dy: 0, digit: 4 },
    { name: '右', dx: 60, dy: 0, digit: 6 },
    { name: '上', dx: 0, dy: -60, digit: 8 },
    { name: '下', dx: 0, dy: 60, digit: 2 },
    { name: '左上', dx: -50, dy: -50, digit: 7 },
    { name: '右上', dx: 50, dy: -50, digit: 9 },
    { name: '左下', dx: -50, dy: 50, digit: 1 },
    { name: '右下', dx: 50, dy: 50, digit: 3 },
  ])('$name → $digit', async ({ dx, dy, digit }) => {
    const wrapper = await gesture(dx, dy);
    expect(wrapper.emitted('input')).toEqual([[digit]]);
  });

  it('滑动过程中预告候选数字，抬起后清空预告', async () => {
    const wrapper = await gesture(-60, 0);
    const previews = wrapper.emitted('preview')!.map(([n]) => n);
    expect(previews[0]).toBe(5);
    expect(previews).toContain(4);
    expect(previews.at(-1)).toBeNull();
  });

  it('禁用时不响应', async () => {
    const wrapper = await gesture(60, 0, { disabled: true });
    expect(wrapper.emitted('input')).toBeUndefined();
  });

  it('指针被系统取消时不提交', async () => {
    const wrapper = mount(FlickInput, { slots: { default: '<div />' } });
    await pointer(wrapper, 'pointerdown', { x: 0, y: 0, pointerType: 'touch' });
    await pointer(wrapper, 'pointercancel', { x: 0, y: 0, pointerType: 'touch' });
    expect(wrapper.emitted('input')).toBeUndefined();
    expect(wrapper.emitted('preview')!.at(-1)).toEqual([null]);
  });
});
