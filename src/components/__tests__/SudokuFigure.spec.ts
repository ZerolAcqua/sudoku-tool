import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SudokuFigure from '@/components/SudokuFigure.vue';
import type { FigureSpec } from '@/utils/sudokuFigure';

const PUZZLE = '....8.......5.2.....3...1...5.....2.8...9...66..375..9.15.2.83.....5.......739...';

const SPEC: FigureSpec = {
  puzzle: PUZZLE,
  caption: '图注',
  frames: [
    { caption: '第一步', highlight: [{ cells: 'b2' }] },
    { caption: '第二步' },
    { caption: '第三步', place: 'r1c6=3' },
  ],
};

function visibleCaption(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('p').find((p) => !p.classes().includes('invisible'))?.text();
}

describe('SudokuFigure', () => {
  it('显示当前帧说明与图注', () => {
    const wrapper = mount(SudokuFigure, { props: { spec: SPEC } });
    expect(visibleCaption(wrapper)).toBe('第一步');
    expect(wrapper.find('figcaption').text()).toBe('图注');
    expect(wrapper.text()).toContain('1 / 3');
  });

  it('上一步 / 下一步 / 进度点切帧，首尾循环', async () => {
    const wrapper = mount(SudokuFigure, { props: { spec: SPEC } });
    await wrapper.get('[aria-label="上一步"]').trigger('click');
    expect(visibleCaption(wrapper)).toBe('第三步');
    await wrapper.get('[aria-label="下一步"]').trigger('click');
    expect(visibleCaption(wrapper)).toBe('第一步');
    await wrapper.get('[aria-label="第 2 步"]').trigger('click');
    expect(wrapper.get('[aria-current="step"]').attributes('aria-label')).toBe('第 2 步');
  });

  it('手动切帧后停止自动播放', async () => {
    const wrapper = mount(SudokuFigure, { props: { spec: SPEC } });
    expect(wrapper.find('[aria-label="暂停"]').exists()).toBe(true);
    await wrapper.get('[aria-label="下一步"]').trigger('click');
    expect(wrapper.find('[aria-label="播放"]').exists()).toBe(true);
  });

  it('切到填数的帧时盘面出现填入数', async () => {
    const wrapper = mount(SudokuFigure, { props: { spec: SPEC } });
    const filled = () => wrapper.findAll('text').filter((t) => t.text() === '3' && t.attributes('fill') === 'var(--color-user-num)');
    expect(filled()).toHaveLength(0);
    await wrapper.get('[aria-label="第 3 步"]').trigger('click');
    expect(filled()).toHaveLength(1);
  });

  it('单帧静态图不显示播放控制', () => {
    const wrapper = mount(SudokuFigure, { props: { spec: { puzzle: PUZZLE, frames: [{}] } } });
    expect(wrapper.find('[aria-label="播放控制"]').exists()).toBe(false);
  });
});
