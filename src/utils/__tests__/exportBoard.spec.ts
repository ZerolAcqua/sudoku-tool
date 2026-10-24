import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SudokuBoard from '@/components/SudokuBoard.vue';
import { toSvgString } from '@/utils/exportBoard';

const EMPTY = Array.from({ length: 9 }, () => Array(9).fill(0));

// 导出依赖页面上的 CSS 变量取色：测试里注入一份与 style.css 同名的变量
let style: HTMLStyleElement;
beforeEach(() => {
  style = document.createElement('style');
  style.textContent = `:root {
    --color-surface: #ffffff;
    --color-given-num: #1c1b19;
    --color-user-num: #8f6100;
    --color-board-line: #1c1b19;
    --color-board-line-thin: #c4bfb6;
  }`;
  document.head.appendChild(style);
});
afterEach(() => style.remove());

function boardSvg(): SVGSVGElement {
  const board = EMPTY.map((row) => [...row]);
  board[0]![0] = 5;
  board[0]![1] = 3;
  const given = board.map((row) => row.map((v) => v === 5));
  const wrapper = mount(SudokuBoard, { props: { board, given, mode: 'display' }, attachTo: document.body });
  return wrapper.element as SVGSVGElement;
}

function parse(svgText: string): Document {
  return new DOMParser().parseFromString(svgText.replace(/^<\?xml[^>]*>\s*/, ''), 'image/svg+xml');
}

describe('toSvgString', () => {
  it('把所有 fill / stroke 中的 var(--color-*) 解析成实际色值（脱离页面后颜色不丢）', () => {
    const text = toSvgString(boardSvg());
    expect(text).not.toMatch(/(fill|stroke)="var\(/);
    // 题目数（给定）与用户填数分别取到各自的颜色
    expect(text).toContain('fill="#1c1b19"');
    expect(text).toContain('fill="#8f6100"');
  });

  it('输出合法的独立 SVG 文件：XML 头、命名空间、指定尺寸', () => {
    const text = toSvgString(boardSvg(), 900);
    expect(text.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const root = parse(text).documentElement;
    expect(root.tagName).toBe('svg');
    expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(root.getAttribute('width')).toBe('900');
    expect(root.getAttribute('height')).toBe('900');
  });

  it('在最底层补一块铺满 viewBox 的白底（页面上盘面外留白是透明的）', () => {
    const root = parse(toSvgString(boardSvg())).documentElement;
    const first = root.firstElementChild!;
    expect(first.tagName).toBe('rect');
    expect(root.getAttribute('viewBox')).toBe('-10 -10 920 920');
    expect([first.getAttribute('x'), first.getAttribute('y'), first.getAttribute('width'), first.getAttribute('height')])
      .toEqual(['-10', '-10', '920', '920']);
    expect(first.getAttribute('fill')).toBe('#ffffff');
  });

  it('不修改页面上的原盘面', () => {
    const svg = boardSvg();
    const before = svg.outerHTML;
    toSvgString(svg);
    expect(svg.outerHTML).toBe(before);
  });

  it('传入的不是 <svg> 元素时给出明确报错（回归：组件 $el 曾是文本锚点）', () => {
    const anchor = document.createTextNode('') as unknown as SVGElement;
    expect(() => toSvgString(anchor)).toThrow('toSvgString 需要一个 <svg> 元素');
  });
});
