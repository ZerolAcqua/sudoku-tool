import { describe, expect, it } from 'vitest';
import { parsePuzzleText, toPuzzleText } from '@/utils/puzzleText';

const TEXT = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

describe('puzzleText', () => {
  it('81 位文本与 9×9 盘面可以互相还原', () => {
    const board = parsePuzzleText(TEXT)!;
    expect(board).toHaveLength(9);
    expect(board[0]).toEqual([5, 3, 0, 0, 7, 0, 0, 0, 0]);
    expect(toPuzzleText(board)).toBe(TEXT);
  });

  it('空格可写作 . ，允许夹杂空白与换行', () => {
    const loose = TEXT.replace(/0/g, '.').replace(/(.{9})/g, '$1\n  ');
    expect(parsePuzzleText(loose)).toEqual(parsePuzzleText(TEXT));
  });

  it.each([
    ['少于 81 位', TEXT.slice(0, 80)],
    ['多于 81 位', TEXT + '1'],
    ['含非法字符', 'x' + TEXT.slice(1)],
  ])('%s时返回 null', (_, input) => {
    expect(parsePuzzleText(input)).toBeNull();
  });
});
