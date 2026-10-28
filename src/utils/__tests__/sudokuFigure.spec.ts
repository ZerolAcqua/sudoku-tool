import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { FigureSpecError, parseCandidates, parseCells, parseFigureSpec, resolveFigure } from '@/utils/sudokuFigure';
import { DRAWING_COLORS } from '@/constants/drawingColors';
import { SUSSER_DOTS, SUSSER_INTERIM } from './sudokuTextSamples';

const hex = (key: string) => DRAWING_COLORS.find((c) => c.key === key)!.value;

function figure(yaml: string) {
  return resolveFigure(parseFigureSpec(parse(yaml)));
}

describe('坐标写法', () => {
  it('r4c46 展开为同行两格，b5 展开为整宫', () => {
    expect(parseCells('r4c46')).toEqual([
      { row: 3, col: 3 },
      { row: 3, col: 5 },
    ]);
    expect(parseCells('b5')).toHaveLength(9);
    expect(parseCells('b5')[0]).toEqual({ row: 3, col: 3 });
    expect(parseCells('r1, c9')).toHaveLength(18);
  });

  it('候选数写在括号里，可以多个', () => {
    expect(parseCandidates('r4c46(17)')).toEqual([
      { row: 3, col: 3, digit: 1 },
      { row: 3, col: 3, digit: 7 },
      { row: 3, col: 5, digit: 1 },
      { row: 3, col: 5, digit: 7 },
    ]);
  });

  it.each([
    ['坐标写错', () => parseCells('r0c1')],
    ['单元格位置写了候选数', () => parseCells('r1c1(2)')],
    ['候选位置缺少候选数', () => parseCandidates('r1c1')],
  ])('%s 时报错', (_, fn) => {
    expect(fn).toThrow(FigureSpecError);
  });
});

describe('sudoku 代码块规格', () => {
  it('没有 frames 时顶层绘图视为单帧', () => {
    const fig = figure(`
puzzle: ${SUSSER_DOTS}
caption: 图注
highlight: b5
markers: { type: circle, at: r1c5 }
`);
    expect(fig.frames).toHaveLength(1);
    expect(fig.caption).toBe('图注');
    expect(fig.frames[0]!.caption).toBeUndefined();
    expect(fig.frames[0]!.highlights[0]).toMatchObject({ color: hex('yellow') });
    expect(fig.frames[0]!.markers).toEqual([{ cell: { row: 0, col: 4 }, type: 'circle', color: hex('red') }]);
    expect(fig.autoplay).toBe(false);
  });

  it('帧默认累加，reset 清空之前的绘图', () => {
    const fig = figure(`
puzzle: ${SUSSER_DOTS}
frames:
  - highlight: r1
  - highlight: { cells: c1, color: blue }
  - reset: true
    highlight: b1
`);
    expect(fig.frames.map((f) => f.highlights.length)).toEqual([1, 2, 1]);
    expect(fig.frames[1]!.highlights[1]!.color).toBe(hex('blue'));
    expect(fig.autoplay).toBe(true);
  });

  it('填数会清掉同行列宫的该候选，删数只影响当前及之后的帧', () => {
    const fig = figure(`
puzzle: ${SUSSER_DOTS}
frames:
  - eliminate: r1c1(1)
  - remove: r1c1(1)
  - place: r1c2=2
`);
    const [f0, f1, f2] = fig.frames;
    expect(f0!.candidates[0]![0]).toContain(1);
    expect(f0!.candidateMarkers).toHaveLength(1);
    // 删掉的候选上不再留强调圆点
    expect(f1!.candidates[0]![0]).not.toContain(1);
    expect(f1!.candidateMarkers).toHaveLength(0);
    expect(f2!.board[0]![1]).toBe(2);
    expect(f2!.given[0]![1]).toBe(false);
    expect(f2!.candidates[0]![0]).not.toContain(2);
    expect(f2!.candidates[0]![1]).toEqual([]);
  });

  it('链：== 强链实线，-- 弱链虚线', () => {
    const fig = figure(`
puzzle: ${SUSSER_DOTS}
chains:
  - path: r1c1(1) == r1c4(1) -- r3c5(1)
    arrow: true
`);
    expect(fig.frames[0]!.chains[0]).toMatchObject({
      cells: [
        { row: 0, col: 0, candidate: 1 },
        { row: 0, col: 3, candidate: 1 },
        { row: 2, col: 4, candidate: 1 },
      ],
      segmentStyles: ['solid', 'dashed'],
      arrow: true,
    });
  });

  it('题面带二次删数时默认显示候选数', () => {
    expect(figure(`puzzle: "${SUSSER_INTERIM}"`).showCandidates).toBe(true);
    expect(figure(`puzzle: "${SUSSER_DOTS}"`).showCandidates).toBe(false);
  });

  it('纯数字盘面不加引号会被 YAML 当成数字：报错提示，加引号即可', () => {
    const digits = SUSSER_DOTS.replace(/\./g, '0').replace(/^0/, '1');
    expect(() => figure(`puzzle: ${digits}`)).toThrow(/加引号/);
    expect(() => figure(`puzzle: "${digits}"`)).not.toThrow();
  });

  it.each([
    ['缺少 puzzle', 'highlight: b5'],
    ['未知字段', `puzzle: "${SUSSER_DOTS}"\nhighligt: b5`],
    ['未知颜色', `puzzle: "${SUSSER_DOTS}"\nhighlight: { cells: b5, color: cyan }`],
    ['frames 与顶层绘图混用', `puzzle: "${SUSSER_DOTS}"\nhighlight: b5\nframes: [{ highlight: b1 }]`],
    ['盘面格式错误', 'puzzle: "123"'],
    ['在提示数上填数', `puzzle: "${SUSSER_DOTS}"\nplace: r1c5=1`],
  ])('%s 时报错并指出位置', (_, yaml) => {
    expect(() => figure(yaml)).toThrow(FigureSpecError);
  });

  it('错误信息带字段路径', () => {
    expect(() =>
      figure(`puzzle: "${SUSSER_DOTS}"\nframes:\n  - highlight: b5\n  - chains: r1c1 == r10c1`)
    ).toThrow(/frames\[1\]\.chains/);
  });
});
