// 81 位盘面文本 ⇄ 9×9 数组：识别页导出与绘图页导入共用同一格式
// 空格可写作 0 或 .，允许夹杂空白与换行

export function parsePuzzleText(text: string): number[][] | null {
  const digits = text.replace(/\s+/g, '').replace(/\./g, '0');
  if (!/^[0-9]{81}$/.test(digits)) return null;
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => Number(digits[r * 9 + c]))
  );
}

export function toPuzzleText(board: number[][]): string {
  return board.flat().map((v) => (v > 0 ? String(v) : '0')).join('');
}
