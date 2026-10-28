import { describe, expect, it } from 'vitest';
import {
  detectSudokuFormat,
  eliminationsOf,
  formatSudokuText,
  parseSudokuText,
  SudokuTextError,
  type SudokuTextFormat,
} from '@/utils/sudokuText';
import * as S from './sudokuTextSamples';

const INTERIM_ELIMS = '882 883 484 684 486 686 188 189';

function elimText(text: string): string {
  return eliminationsOf(parseSudokuText(text).state)
    .map((e) => `${e.digit}${e.row + 1}${e.col + 1}`)
    .sort()
    .join(' ');
}

describe('sudokuText 格式识别', () => {
  it.each<[string, string, SudokuTextFormat]>([
    ['Susser（.）', S.SUSSER_DOTS, 'susser'],
    ['Susser（0）', S.SUSSER_ZEROS, 'susser'],
    ['Susser 中间盘面', S.SUSSER_INTERIM, 'susser'],
    ['多行文本', S.MULTILINE, 'multiline'],
    ['铅笔盘面', S.PENCILMARK, 'pencilmark'],
    ['候选数数独', S.SUKAKU, 'sukaku'],
    ['Excel', S.EXCEL, 'excel'],
    ['OpenSudoku', S.OPENSUDOKU, 'opensudoku'],
    ['HoDoKu', S.HODOKU, 'hodoku'],
  ])('%s', (_, text, format) => {
    expect(detectSudokuFormat(text)).toBe(format);
    expect(parseSudokuText(text).format).toBe(format);
  });
});

describe('sudokuText 解析', () => {
  it('同一道初盘的各种写法解析出相同数字', () => {
    const expected = parseSudokuText(S.SUSSER_DOTS).state.digits;
    for (const text of [S.SUSSER_ZEROS, S.MULTILINE, S.EXCEL]) {
      expect(parseSudokuText(text).state.digits).toEqual(expected);
    }
    expect(expected[0]).toEqual([0, 0, 0, 0, 8, 0, 0, 0, 0]);
  });

  it('OpenSudoku 不区分提示数与填入数（规范示例是中间盘面）', () => {
    const { state } = parseSudokuText(S.OPENSUDOKU);
    expect(state.digits).toEqual(parseSudokuText(S.SUSSER_INTERIM).state.digits);
    expect(state.given[0]![5]).toBe(true);
  });

  it('Susser 区分提示数与填入数，并应用二次删数', () => {
    const { state, hasCandidates } = parseSudokuText(S.SUSSER_INTERIM);
    expect(hasCandidates).toBe(true);
    expect(state.digits[0]![5]).toBe(3);
    expect(state.given[0]![5]).toBe(false);
    expect(state.given[0]![4]).toBe(true);
    // 882：r8c2 删去 8
    expect(state.candidates[7]![1]).not.toContain(8);
    expect(elimText(S.SUSSER_INTERIM)).toBe(INTERIM_ELIMS.split(' ').sort().join(' '));
  });

  it('铅笔盘面与对应的 Susser 中间盘面表示同一局面', () => {
    const pencil = parseSudokuText(S.PENCILMARK).state;
    const susser = parseSudokuText(S.SUSSER_INTERIM).state;
    expect(pencil.digits).toEqual(susser.digits);
    expect(pencil.given).toEqual(susser.given);
    expect(pencil.candidates).toEqual(susser.candidates);
  });

  it('铅笔盘面的 12-34 写法只保留减号前的候选', () => {
    const text = S.PENCILMARK.replace('12457 ', '12-457');
    expect(parseSudokuText(text).state.candidates[0]![0]).toEqual([1, 2]);
  });

  it('Excel 表格末行全空（只有制表符）时不会被当成空行丢掉', () => {
    const text = S.EXCEL.split('\n').slice(0, 8).join('\n') + '\n' + '\t'.repeat(8) + '\n';
    const { state } = parseSudokuText(text);
    expect(state.digits[8]).toEqual(Array(9).fill(0));
  });

  it('候选数数独只含候选、没有数字', () => {
    const { state } = parseSudokuText(S.SUKAKU);
    expect(state.digits.flat().every((v) => v === 0)).toBe(true);
    expect(state.candidates[0]![0]).toEqual([1, 2, 4, 5, 7]);
  });

  it('HoDoKu 解析出技巧信息与结论', () => {
    const { state, hodoku } = parseSudokuText(S.HODOKU_UR4);
    expect(state.digits).toEqual(parseSudokuText(S.SUSSER_INTERIM).state.digits);
    expect(hodoku).toMatchObject({ technique: '0603', digits: '18' });
    expect(hodoku!.eliminations).toEqual([
      { digit: 1, row: 3, col: 3 },
      { digit: 1, row: 3, col: 5 },
    ]);
  });

  it.each([
    ['格数不足', S.SUSSER_DOTS.slice(1)],
    ['删数不是三位', `${S.SUSSER_DOTS}:88`],
    ['铅笔盘面单元格非法', S.PENCILMARK.replace('<8>', '<x>')],
  ])('%s 时报错', (_, text) => {
    expect(() => parseSudokuText(text)).toThrow(SudokuTextError);
  });
});

describe('sudokuText 导出', () => {
  it.each<SudokuTextFormat>(['susser', 'hodoku', 'pencilmark'])('%s 往返不丢失中间盘面信息', (format) => {
    const state = parseSudokuText(S.SUSSER_INTERIM).state;
    const text = formatSudokuText(state, format);
    expect(parseSudokuText(text).state).toEqual(state);
  });

  it.each<SudokuTextFormat>(['multiline', 'excel', 'opensudoku', 'sukaku'])('%s 往返保留数字', (format) => {
    const state = parseSudokuText(S.SUSSER_DOTS).state;
    const back = parseSudokuText(formatSudokuText(state, format), format).state;
    // 候选数数独没有「数字」：已填格导出为只含该数的候选
    if (format === 'sukaku') {
      state.digits.flat().forEach((v, i) => {
        if (v > 0) expect(back.candidates.flat()[i]).toEqual([v]);
      });
    } else {
      expect(back.digits).toEqual(state.digits);
    }
  });

  it('Susser / HoDoKu 导出与规范示例一致', () => {
    const state = parseSudokuText(S.SUSSER_INTERIM).state;
    expect(formatSudokuText(state, 'susser').split(':')[0]).toBe(S.SUSSER_INTERIM.split(':')[0]);
    const ur4 = parseSudokuText(S.HODOKU_UR4);
    expect(formatSudokuText(ur4.state, 'hodoku', { hodoku: ur4.hodoku })).toBe(S.HODOKU_UR4);
    expect(formatSudokuText(parseSudokuText(S.SUSSER_DOTS).state, 'multiline')).toBe(S.MULTILINE);
    expect(formatSudokuText(parseSudokuText(S.SUSSER_DOTS).state, 'excel')).toBe(S.EXCEL);
    expect(formatSudokuText(parseSudokuText(S.OPENSUDOKU).state, 'opensudoku')).toBe(S.OPENSUDOKU);
  });
});
