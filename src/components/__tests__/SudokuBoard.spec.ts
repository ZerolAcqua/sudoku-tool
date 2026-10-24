import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SudokuBoard from '@/components/SudokuBoard.vue';

const EMPTY = () => Array.from({ length: 9 }, () => Array(9).fill(0) as number[]);

describe('SudokuBoard', () => {
  // 回归：模板最外层若有注释，开发模式下组件会变成片段，$el 变成文本锚点，
  // 绘图页 / IODemo 拿 $el 做导出就会报「setAttribute is not a function」。
  // 测试运行在开发模式（保留注释），所以这条能直接拦住同类改动。
  it('根节点是单个 <svg>：组件实例的 $el 就是 svg 元素', () => {
    const wrapper = mount(SudokuBoard, { props: { board: EMPTY() } });
    expect(wrapper.element).toBeInstanceOf(SVGSVGElement);
    expect(wrapper.vm.$el).toBe(wrapper.element);
    expect(wrapper.classes()).toContain('sudoku-svg');
  });

  it('透传的 class 落在 svg 上（识别页用 class 控制盘面尺寸）', () => {
    const wrapper = mount(SudokuBoard, { props: { board: EMPTY() }, attrs: { class: 'size-full' } });
    expect(wrapper.classes()).toContain('size-full');
  });

  it('按 size 设置宽高，并渲染盘面上的数字', () => {
    const board = EMPTY();
    board[4]![4] = 7;
    const wrapper = mount(SudokuBoard, { props: { board, size: 300 } });
    expect(wrapper.attributes('width')).toBe('300');
    expect(wrapper.attributes('height')).toBe('300');
    const digits = wrapper.findAll('text').filter((t) => t.text() === '7' && t.attributes('font-size') === '65');
    expect(digits).toHaveLength(1);
  });

  it('交互模式下点击格子，抛出该格坐标', async () => {
    const wrapper = mount(SudokuBoard, { props: { board: EMPTY(), mode: 'interactive' } });
    await wrapper.find('rect[x="300"][y="200"][fill="transparent"]').trigger('click');
    expect(wrapper.emitted('cell-click')).toEqual([[{ row: 2, col: 3 }]]);
  });
});
