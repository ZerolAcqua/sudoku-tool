// 数独通用文本格式：导入解析 / 导出
// 格式定义参考 https://sudoku.kazusa.tech/appendix/sudoku-text-format
// - susser     ：81 位单行，`+d` 表示填入数，`:` 后为二次删数（三位一组：数字 行 列）
// - hodoku     ：`:技巧编号:涉及数字:Susser盘面:二次删数:删数结论:出数结论:额外信息`
// - multiline  ：带宫线的多行盘面（只表示数字）
// - pencilmark ：铅笔盘面，`<d>` 提示数、`*d*` 填入数、`12-34` 表示删去 3、4 后剩 1、2
// - sukaku     ：729 位候选数数独
// - excel      ：9 行、制表符分隔
// - opensudoku ：243 个 `|` 分隔的数字，每格三位
// 本文件不依赖 Vue 与 `@` 别名：构建期的 Markdown 插件（Node 侧）也直接引用它。

export type SudokuTextFormat =
  | 'susser'
  | 'hodoku'
  | 'multiline'
  | 'pencilmark'
  | 'sukaku'
  | 'excel'
  | 'opensudoku';

export const SUDOKU_TEXT_FORMATS: Array<{ id: SudokuTextFormat; label: string }> = [
  { id: 'susser', label: 'Susser' },
  { id: 'hodoku', label: 'HoDoKu' },
  { id: 'multiline', label: '多行文本' },
  { id: 'pencilmark', label: '铅笔盘面' },
  { id: 'sukaku', label: '候选数数独' },
  { id: 'excel', label: 'Excel 表格' },
  { id: 'opensudoku', label: 'OpenSudoku' },
];

// 一个候选数（row / col 从 0 开始）
export interface CandidateRef {
  digit: number;
  row: number;
  col: number;
}

// 盘面状态：数字 + 是否提示数 + 空格的当前候选数（已填格为空数组）
export interface SudokuGridState {
  digits: number[][];
  given: boolean[][];
  candidates: number[][][];
}

export interface HodokuInfo {
  technique: string;
  digits: string;
  eliminations: CandidateRef[];
  placements: CandidateRef[];
  extra: string;
}

export interface ParsedSudokuText {
  format: SudokuTextFormat;
  state: SudokuGridState;
  // 文本本身是否带有候选数信息（铅笔盘面、候选数数独、有二次删数的 Susser / HoDoKu）
  hasCandidates: boolean;
  hodoku?: HodokuInfo;
}

export class SudokuTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SudokuTextError';
  }
}

const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function grid<T>(fill: (r: number, c: number) => T): T[][] {
  return Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => fill(r, c)));
}

// 只看提示数与填入数推出的「初始候选数」
export function initialCandidates(digits: number[][]): number[][][] {
  return grid((r, c) => {
    if ((digits[r]?.[c] ?? 0) > 0) return [];
    const used = new Set<number>();
    for (let i = 0; i < 9; i++) {
      used.add(digits[r]?.[i] ?? 0);
      used.add(digits[i]?.[c] ?? 0);
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = br; i < br + 3; i++) {
      for (let j = bc; j < bc + 3; j++) used.add(digits[i]?.[j] ?? 0);
    }
    return ALL_DIGITS.filter((n) => !used.has(n));
  });
}

// 二次删数：初始候选中、当前已不存在的候选
export function eliminationsOf(state: SudokuGridState): CandidateRef[] {
  const initial = initialCandidates(state.digits);
  const result: CandidateRef[] = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const current = new Set(state.candidates[r]?.[c] ?? []);
      for (const digit of initial[r]![c]!) {
        if (!current.has(digit)) result.push({ digit, row: r, col: c });
      }
    }
  }
  return result;
}

function stateFromCells(
  cells: Array<{ digit: number; given: boolean; candidates?: number[] }>,
  eliminations: CandidateRef[] = []
): SudokuGridState {
  const digits = grid((r, c) => cells[r * 9 + c]!.digit);
  const given = grid((r, c) => cells[r * 9 + c]!.digit > 0 && cells[r * 9 + c]!.given);
  const initial = initialCandidates(digits);
  const candidates = grid((r, c) => {
    const cell = cells[r * 9 + c]!;
    if (cell.digit > 0) return [];
    return cell.candidates ? [...cell.candidates].sort((a, b) => a - b) : initial[r]![c]!;
  });
  for (const e of eliminations) {
    const list = candidates[e.row]![e.col]!;
    const idx = list.indexOf(e.digit);
    if (idx >= 0) list.splice(idx, 1);
  }
  return { digits, given, candidates };
}

// ---------------- 解析 ----------------

// 三位一组的候选列表，如 `882 883 484`（分组间的空白可省略）
function parseCandidateList(text: string): CandidateRef[] {
  const compact = text.replace(/\s+/g, '');
  if (!compact) return [];
  const groups = compact.match(/.{1,3}/g)!;
  return groups.map((group) => {
    if (!/^[1-9]{3}$/.test(group)) throw new SudokuTextError(`候选数「${group}」应为三位「数字 行 列」`);
    return { digit: Number(group[0]), row: Number(group[1]) - 1, col: Number(group[2]) - 1 };
  });
}

// Susser 盘面部分：`.`/`0` 空格，`d` 提示数，`+d` 填入数
function parseSusserGrid(text: string) {
  const compact = text.replace(/\s+/g, '');
  const tokens = compact.match(/\+[1-9]|[0-9.]/g) ?? [];
  if (tokens.join('') !== compact) throw new SudokuTextError('Susser 盘面只能包含数字、. 与 +');
  if (tokens.length !== 81) throw new SudokuTextError(`Susser 盘面需要 81 格，实际 ${tokens.length} 格`);
  return tokens.map((t) => ({
    digit: t === '.' ? 0 : Number(t.replace('+', '')),
    given: !t.startsWith('+'),
  }));
}

function parseSusser(text: string): ParsedSudokuText {
  const [board = '', elims = '', ...rest] = text.trim().split(':');
  if (rest.length > 0) throw new SudokuTextError('Susser 格式只能有一个冒号');
  const eliminations = parseCandidateList(elims);
  return {
    format: 'susser',
    state: stateFromCells(parseSusserGrid(board), eliminations),
    hasCandidates: eliminations.length > 0,
  };
}

function parseHodoku(text: string): ParsedSudokuText {
  const parts = text.trim().split(':');
  // 以冒号开头，split 后首项为空
  if (parts[0] !== '' || parts.length < 4) throw new SudokuTextError('HoDoKu 格式应以冒号开头且至少包含盘面部分');
  const [, technique = '', digits = '', board = '', elims = '', concElims = '', concPlacements = '', ...extra] = parts;
  if (!board) throw new SudokuTextError('HoDoKu 格式缺少 Susser 盘面');
  const eliminations = parseCandidateList(elims);
  return {
    format: 'hodoku',
    state: stateFromCells(parseSusserGrid(board), eliminations),
    hasCandidates: eliminations.length > 0,
    hodoku: {
      technique: technique || '0000',
      digits: digits || 'x',
      eliminations: parseCandidateList(concElims),
      placements: parseCandidateList(concPlacements),
      extra: extra.join(':'),
    },
  };
}

function parseSukaku(compact: string): ParsedSudokuText {
  const cells = Array.from({ length: 81 }, (_, i) => {
    const chunk = compact.slice(i * 9, i * 9 + 9);
    const candidates: number[] = [];
    for (let k = 0; k < 9; k++) {
      const ch = chunk[k]!;
      if (ch === '.' || ch === '0') continue;
      if (Number(ch) !== k + 1) throw new SudokuTextError(`候选数数独第 ${i + 1} 格第 ${k + 1} 位应为 ${k + 1}、. 或 0`);
      candidates.push(k + 1);
    }
    return { digit: 0, given: false, candidates };
  });
  return { format: 'sukaku', state: stateFromCells(cells), hasCandidates: true };
}

function parseOpenSudoku(compact: string): ParsedSudokuText {
  const nums = compact.split('|').map(Number);
  const cells = Array.from({ length: 81 }, (_, i) => ({ digit: nums[i * 3]!, given: true }));
  return { format: 'opensudoku', state: stateFromCells(cells), hasCandidates: false };
}

function parseExcel(text: string): ParsedSudokuText {
  // 整行全空的行也是 8 个制表符，只去掉首尾的空行
  const lines = text.replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, '').split(/\r?\n/);
  if (lines.length !== 9) throw new SudokuTextError(`Excel 表格格式需要 9 行，实际 ${lines.length} 行`);
  const cells = lines.flatMap((line, r) => {
    const fields = line.split('\t');
    if (fields.length > 9) throw new SudokuTextError(`Excel 表格第 ${r + 1} 行超过 9 列`);
    return Array.from({ length: 9 }, (_, c) => {
      const v = (fields[c] ?? '').trim().replace('+', '');
      if (v !== '' && !/^[0-9.]$/.test(v)) throw new SudokuTextError(`Excel 表格 r${r + 1}c${c + 1} 内容无法识别：「${v}」`);
      return { digit: v === '' || v === '.' ? 0 : Number(v), given: !(fields[c] ?? '').includes('+') };
    });
  });
  return { format: 'excel', state: stateFromCells(cells), hasCandidates: false };
}

// 宫线行：只由画线字符组成，且含横线
function isBorderLine(line: string): boolean {
  return /^[\s.\-:+'|=]+$/.test(line) && /[-=]/.test(line);
}

const SINGLE_CELL_TOKEN = /^(?:\+?[1-9]|[0.])$/;

function gridLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !isBorderLine(line));
}

function whitespaceTokens(lines: string[]): string[] {
  return lines.flatMap((line) => line.replace(/\|/g, ' ').split(/\s+/).filter(Boolean));
}

// 按空白切分正好 81 个、且出现候选数写法时视为铅笔盘面
function looksLikePencilmark(tokens: string[]): boolean {
  return tokens.length === 81 && tokens.some((t) => !SINGLE_CELL_TOKEN.test(t));
}

// 多行文本 / 铅笔盘面：铅笔盘面逐个 token 解析，否则逐字符扫描
function parseGridLines(text: string): ParsedSudokuText {
  const lines = gridLines(text);
  const tokens = whitespaceTokens(lines);

  if (looksLikePencilmark(tokens)) {
    const cells = tokens.map((t, i) => {
      const at = `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^<([1-9])>$/))) return { digit: Number(m[1]), given: true };
      if ((m = t.match(/^\*([1-9])\*$/) ?? t.match(/^\+([1-9])$/))) return { digit: Number(m[1]), given: false };
      // 单个数字：格式本身不区分提示数 / 填入数 / 唯一候选，按提示数处理
      if (/^[1-9]$/.test(t)) return { digit: Number(t), given: true };
      if ((m = t.match(/^([1-9]*)(?:-([1-9]+))?$/))) {
        return { digit: 0, given: false, candidates: Array.from(new Set(m[1]!.split('').map(Number))) };
      }
      throw new SudokuTextError(`铅笔盘面 ${at} 无法识别：「${t}」`);
    });
    return { format: 'pencilmark', state: stateFromCells(cells), hasCandidates: true };
  }

  const cellTokens = lines.flatMap((line) => line.replace(/[|\s]/g, '').match(/\+[1-9]|[0-9.]/g) ?? []);
  if (cellTokens.length !== 81) throw new SudokuTextError(`多行盘面需要 81 格，实际识别到 ${cellTokens.length} 格`);
  const cells = cellTokens.map((t) => ({ digit: t === '.' ? 0 : Number(t.replace('+', '')), given: !t.startsWith('+') }));
  return { format: 'multiline', state: stateFromCells(cells), hasCandidates: false };
}

// 只做形态判断，不保证内容合法（合法性由 parseSudokuText 报错）
export function detectSudokuFormat(text: string): SudokuTextFormat | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(':')) return 'hodoku';
  const compact = trimmed.replace(/\s+/g, '');
  if (/^\d(?:\|\d){242}$/.test(compact)) return 'opensudoku';
  if (/^[0-9.]{729}$/.test(compact)) return 'sukaku';
  if (text.includes('\t')) return 'excel';
  // 不带宫线的 9 行数字也归为 Susser（去掉空白后完全等价）
  if (/^[0-9.+]+(?::[0-9]*)?$/.test(compact)) return 'susser';
  return looksLikePencilmark(whitespaceTokens(gridLines(trimmed))) ? 'pencilmark' : 'multiline';
}

// 自动识别格式（或按指定格式）解析；内容不合法时抛 SudokuTextError
export function parseSudokuText(text: string, format?: SudokuTextFormat): ParsedSudokuText {
  const fmt = format ?? detectSudokuFormat(text);
  if (!fmt) throw new SudokuTextError('文本为空');
  const compact = text.replace(/\s+/g, '');
  switch (fmt) {
    case 'hodoku':
      return parseHodoku(text);
    case 'susser':
      return parseSusser(text);
    case 'sukaku':
      if (!/^[0-9.]{729}$/.test(compact)) throw new SudokuTextError('候选数数独需要 729 位数字或 .');
      return parseSukaku(compact);
    case 'opensudoku':
      if (!/^\d(?:\|\d){242}$/.test(compact)) throw new SudokuTextError('OpenSudoku 格式需要 243 个以 | 分隔的数字');
      return parseOpenSudoku(compact);
    case 'excel':
      return parseExcel(text);
    case 'multiline':
    case 'pencilmark': {
      const parsed = parseGridLines(text);
      if (format && parsed.format !== format) {
        throw new SudokuTextError(format === 'pencilmark' ? '未识别到铅笔盘面的候选数' : '内容是铅笔盘面而非多行盘面');
      }
      return parsed;
    }
  }
}

// ---------------- 导出 ----------------

export interface FormatOptions {
  // Susser / HoDoKu 的空格字符，默认 `.`
  empty?: '.' | '0';
  // HoDoKu 的技巧信息
  hodoku?: Partial<HodokuInfo>;
}

function candidateListText(list: CandidateRef[]): string {
  return list.map((e) => `${e.digit}${e.row + 1}${e.col + 1}`).join(' ');
}

function susserGridText(state: SudokuGridState, empty: string): string {
  return state.digits
    .flatMap((row, r) => row.map((v, c) => (v > 0 ? `${state.given[r]![c] ? '' : '+'}${v}` : empty)))
    .join('');
}

// 宫线：`.---.---.` 顶边、`:---+---:` 宫间、`'---'---'` 底边；widths 为三个宫列内容宽度
function borderLine(widths: number[], left: string, mid: string, right: string): string {
  return left + widths.map((w) => '-'.repeat(w)).join(mid) + right;
}

function boxedGrid(cellText: (r: number, c: number) => string): string {
  const colWidths = Array.from({ length: 9 }, (_, c) =>
    Math.max(...Array.from({ length: 9 }, (_, r) => cellText(r, c).length))
  );
  const boxWidths = [0, 1, 2].map((b) => colWidths.slice(b * 3, b * 3 + 3).reduce((s, w) => s + w, 0) + 4);
  const lines: string[] = [borderLine(boxWidths, '.', '.', '.')];
  for (let r = 0; r < 9; r++) {
    if (r === 3 || r === 6) lines.push(borderLine(boxWidths, ':', '+', ':'));
    const boxes = [0, 1, 2].map(
      (b) => ' ' + [0, 1, 2].map((k) => cellText(r, b * 3 + k).padEnd(colWidths[b * 3 + k]!)).join(' ') + ' '
    );
    lines.push(`|${boxes.join('|')}|`);
  }
  lines.push(borderLine(boxWidths, "'", "'", "'"));
  return lines.map((line) => line.trimEnd()).join('\n');
}

export function formatSudokuText(state: SudokuGridState, format: SudokuTextFormat, options: FormatOptions = {}): string {
  const empty = options.empty ?? '.';
  const digit = (r: number, c: number) => state.digits[r]![c]!;
  switch (format) {
    case 'susser': {
      const elims = candidateListText(eliminationsOf(state));
      return susserGridText(state, empty) + (elims ? `:${elims}` : '');
    }
    case 'hodoku': {
      const h = options.hodoku ?? {};
      return [
        '',
        h.technique || '0000',
        h.digits || 'x',
        susserGridText(state, empty),
        candidateListText(eliminationsOf(state)),
        candidateListText(h.eliminations ?? []),
        candidateListText(h.placements ?? []),
        h.extra ?? '',
      ].join(':');
    }
    case 'multiline':
      return boxedGrid((r, c) => (digit(r, c) > 0 ? String(digit(r, c)) : '.'));
    case 'pencilmark':
      return boxedGrid((r, c) => {
        const v = digit(r, c);
        if (v > 0) return state.given[r]![c] ? `<${v}>` : `*${v}*`;
        return state.candidates[r]![c]!.join('') || '.';
      });
    case 'sukaku':
      return state.digits
        .flatMap((row, r) =>
          row.map((v, c) => {
            const set = new Set(v > 0 ? [v] : state.candidates[r]![c]!);
            return ALL_DIGITS.map((n) => (set.has(n) ? String(n) : '.')).join('');
          })
        )
        .join('');
    case 'excel':
      return state.digits.map((row) => row.map((v) => (v > 0 ? String(v) : '')).join('\t')).join('\n');
    case 'opensudoku':
      return state.digits.flatMap((row) => row.map((v) => (v > 0 ? `${v}|0|0` : '0|0|1'))).join('|');
  }
}
