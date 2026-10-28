// 教程盘面（Markdown 里的 ```sudoku 代码块）：YAML 规格的校验与逐帧计算
// 构建期插件用它校验并规范化规格（写错直接报错），浏览器端再用它把规格算成每一帧的盘面 props。
// 本文件只用相对路径引用：构建期插件在 Node 侧加载它，那里没有 `@` 别名。
//
// 规格示例：
//   puzzle: ....8+3......5.2....   # 任意支持的数独文本格式（见 sudokuText.ts）
//   showCandidates: true
//   frames:
//     - caption: 第 5 宫里 7 只能在 **r4c5**
//       highlight: { cells: b5, color: yellow }
//       candidates: r4c5(7)
//     - eliminate: r2c5(7)
//       chains: r4c5(7) == r6c5(7) -- r6c8(7)
//     - remove: r2c5(7)
//       place: r4c5=7
// 没有 frames 时，顶层的绘图字段视为唯一一帧（静态图）。帧默认在上一帧基础上累加，reset: true 清空之前的绘图。
import type { CandidateMarker, CellHighlight, CellMarker, CellPosition, Chain, ChainStyle } from '../types/sudoku';
import { DRAWING_COLORS } from '../constants/drawingColors';
import { parseSudokuText, SudokuTextError } from './sudokuText';

export type FigureMarkerType = 'circle' | 'cross' | 'dot' | 'star';

export interface HighlightSpec {
  cells: string;
  color?: string;
  opacity?: number;
}

export interface CandidateSpec {
  at: string;
  color?: string;
}

export interface MarkerSpec {
  type: FigureMarkerType;
  at: string;
  color?: string;
}

export interface LineSpec {
  from: string;
  to: string;
  color?: string;
}

export interface ChainSpec {
  path: string;
  color?: string;
  arrow?: boolean;
  curve?: 'straight' | 'smooth';
  width?: number;
}

export interface FrameSpec {
  caption?: string;
  duration?: number;
  reset?: boolean;
  highlight?: HighlightSpec[];
  candidates?: CandidateSpec[];
  eliminate?: CandidateSpec[];
  markers?: MarkerSpec[];
  lines?: LineSpec[];
  chains?: ChainSpec[];
  place?: string;
  remove?: string;
}

export interface FigureSpec {
  puzzle: string;
  showCandidates?: boolean;
  autoplay?: boolean;
  interval?: number;
  caption?: string;
  frames: FrameSpec[];
}

export interface FigureFrame {
  caption?: string;
  duration: number;
  board: number[][];
  given: boolean[][];
  candidates: number[][][];
  highlights: CellHighlight[];
  candidateMarkers: CandidateMarker[];
  markers: CellMarker[];
  chains: Chain[];
}

export interface ResolvedFigure {
  caption?: string;
  showCandidates: boolean;
  autoplay: boolean;
  frames: FigureFrame[];
}

export class FigureSpecError extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(path ? `${path}：${message}` : message);
    this.name = 'FigureSpecError';
  }
}

const DEFAULT_INTERVAL = 2500;

const color = (key: string) => DRAWING_COLORS.find((c) => c.key === key)!.value;

const DEFAULT_COLORS = {
  highlight: color('yellow'),
  candidates: color('green'),
  eliminate: color('red'),
  markers: color('red'),
  lines: color('red'),
  chains: color('blue'),
};

// ---------------- 坐标写法 ----------------
// r4c5 单格；r4c46 = r4c4 + r4c6；r1 整行；c5 整列；b5 整宫；后缀 (17) 表示候选数 1、7
// 多个写法用空格或逗号分隔

interface CellSelection extends CellPosition {
  digits: number[];
}

const SELECTOR = /^(?:r([1-9]+)c([1-9]+)|r([1-9]+)|c([1-9]+)|b([1-9]+))(?:\(([1-9]+)\))?$/;

function digitsOf(text: string): number[] {
  return Array.from(new Set(text.split('').map(Number)));
}

function parseToken(token: string, path: string): CellSelection[] {
  const m = token.match(SELECTOR);
  if (!m) throw new FigureSpecError(`无法识别的坐标「${token}」，应形如 r4c5、r4c46(7)、r1、c5、b5`, path);
  const [, rows, cols, rowOnly, colOnly, boxes, cands] = m;
  const digits = cands ? digitsOf(cands) : [];
  const cells: CellPosition[] = [];
  if (rows && cols) {
    for (const r of digitsOf(rows)) for (const c of digitsOf(cols)) cells.push({ row: r - 1, col: c - 1 });
  } else if (rowOnly) {
    for (const r of digitsOf(rowOnly)) for (let c = 0; c < 9; c++) cells.push({ row: r - 1, col: c });
  } else if (colOnly) {
    for (const c of digitsOf(colOnly)) for (let r = 0; r < 9; r++) cells.push({ row: r, col: c - 1 });
  } else if (boxes) {
    for (const b of digitsOf(boxes)) {
      const br = Math.floor((b - 1) / 3) * 3;
      const bc = ((b - 1) % 3) * 3;
      for (let i = 0; i < 9; i++) cells.push({ row: br + Math.floor(i / 3), col: bc + (i % 3) });
    }
  }
  return cells.map((cell) => ({ ...cell, digits }));
}

function tokens(text: string): string[] {
  return text.split(/[\s,，]+/).filter(Boolean);
}

export function parseCells(text: string, path = ''): CellPosition[] {
  return tokens(text).flatMap((t) => {
    const cells = parseToken(t, path);
    if (cells[0]?.digits.length) throw new FigureSpecError(`「${t}」这里只需要单元格，不要写候选数`, path);
    return cells.map(({ row, col }) => ({ row, col }));
  });
}

export function parseCandidates(text: string, path = ''): Array<CellPosition & { digit: number }> {
  return tokens(text).flatMap((t) => {
    const cells = parseToken(t, path);
    if (!cells[0]?.digits.length) throw new FigureSpecError(`「${t}」需要写明候选数，如 ${t}(7)`, path);
    return cells.flatMap(({ row, col, digits }) => digits.map((digit) => ({ row, col, digit })));
  });
}

// 填数：r4c5=7，多个用空格分隔
function parsePlacements(text: string, path: string): Array<CellPosition & { digit: number }> {
  return tokens(text).map((t) => {
    const m = t.match(/^r([1-9])c([1-9])=([1-9])$/);
    if (!m) throw new FigureSpecError(`无法识别的填数「${t}」，应形如 r4c5=7`, path);
    return { row: Number(m[1]) - 1, col: Number(m[2]) - 1, digit: Number(m[3]) };
  });
}

// 链：节点之间用 == 连接表示强链（实线），-- 表示弱链（虚线）
function parseChainPath(text: string, path: string): Pick<Chain, 'cells' | 'segmentStyles'> {
  const parts = text.trim().split(/\s*(==|--)\s*/);
  if (parts.length < 3) throw new FigureSpecError('链至少需要两个节点，用 ==（强链）或 --（弱链）连接', path);
  const cells: Chain['cells'] = [];
  const segmentStyles: ChainStyle[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      segmentStyles.push(part === '==' ? 'solid' : 'dashed');
      return;
    }
    const sel = parseToken(part, path);
    if (sel.length !== 1 || sel[0]!.digits.length > 1) {
      throw new FigureSpecError(`链节点「${part}」必须是单个格（最多一个候选数），如 r4c5(7)`, path);
    }
    const { row, col, digits } = sel[0]!;
    cells.push(digits.length ? { row, col, candidate: digits[0] } : { row, col });
  });
  return { cells, segmentStyles };
}

function resolveColor(value: string | undefined, fallback: string, path: string): string {
  if (value === undefined) return fallback;
  const named = DRAWING_COLORS.find((c) => c.key === value);
  if (named) return named.value;
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  throw new FigureSpecError(
    `未知颜色「${value}」，可用 ${DRAWING_COLORS.map((c) => c.key).join(' / ')} 或 #hex`,
    path
  );
}

// ---------------- 规格校验（YAML 解析结果 → FigureSpec） ----------------

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function checkKeys(obj: Obj, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw new FigureSpecError(`未知字段「${key}」，可用字段：${allowed.join('、')}`, path);
    }
  }
}

function str(v: unknown, path: string): string {
  if (typeof v === 'string') return v;
  // YAML 会把纯数字解析成 number；81 位全数字盘面此时已丢精度，只能提示改写
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new FigureSpecError('纯数字盘面会被 YAML 当成数字，请加引号、用 | 多行写法或用 . 表示空格', path);
    return String(v);
  }
  throw new FigureSpecError('应为字符串', path);
}

function optStr(v: unknown, path: string): string | undefined {
  return v === undefined || v === null ? undefined : str(v, path);
}

function optBool(v: unknown, path: string): boolean | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'boolean') throw new FigureSpecError('应为 true 或 false', path);
  return v;
}

function optNum(v: unknown, path: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) throw new FigureSpecError('应为正数', path);
  return v;
}

// 单个或列表；字符串是只写坐标的简写
function list<T>(v: unknown, path: string, item: (x: unknown, path: string) => T): T[] | undefined {
  if (v === undefined || v === null) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  return arr.map((x, i) => item(x, Array.isArray(v) ? `${path}[${i}]` : path));
}

function highlightItem(v: unknown, path: string): HighlightSpec {
  if (!isObj(v)) return { cells: str(v, path) };
  checkKeys(v, ['cells', 'color', 'opacity'], path);
  const opacity = optNum(v.opacity, `${path}.opacity`);
  return { cells: str(v.cells, `${path}.cells`), color: optStr(v.color, `${path}.color`), ...(opacity ? { opacity } : {}) };
}

function candidateItem(v: unknown, path: string): CandidateSpec {
  if (!isObj(v)) return { at: str(v, path) };
  checkKeys(v, ['at', 'color'], path);
  return { at: str(v.at, `${path}.at`), color: optStr(v.color, `${path}.color`) };
}

const MARKER_TYPES: FigureMarkerType[] = ['circle', 'cross', 'dot', 'star'];

function markerItem(v: unknown, path: string): MarkerSpec {
  if (!isObj(v)) throw new FigureSpecError('应为 { type, at, color? }', path);
  checkKeys(v, ['type', 'at', 'color'], path);
  const type = str(v.type, `${path}.type`) as FigureMarkerType;
  if (!MARKER_TYPES.includes(type)) throw new FigureSpecError(`type 应为 ${MARKER_TYPES.join(' / ')}`, `${path}.type`);
  return { type, at: str(v.at, `${path}.at`), color: optStr(v.color, `${path}.color`) };
}

function lineItem(v: unknown, path: string): LineSpec {
  if (!isObj(v)) throw new FigureSpecError('应为 { from, to, color? }', path);
  checkKeys(v, ['from', 'to', 'color'], path);
  return { from: str(v.from, `${path}.from`), to: str(v.to, `${path}.to`), color: optStr(v.color, `${path}.color`) };
}

function chainItem(v: unknown, path: string): ChainSpec {
  if (!isObj(v)) return { path: str(v, path) };
  checkKeys(v, ['path', 'color', 'arrow', 'curve', 'width'], path);
  const curve = optStr(v.curve, `${path}.curve`);
  if (curve !== undefined && curve !== 'straight' && curve !== 'smooth') {
    throw new FigureSpecError('curve 应为 straight 或 smooth', `${path}.curve`);
  }
  return {
    path: str(v.path, `${path}.path`),
    color: optStr(v.color, `${path}.color`),
    arrow: optBool(v.arrow, `${path}.arrow`),
    curve,
    width: optNum(v.width, `${path}.width`),
  };
}

const FRAME_KEYS = [
  'caption',
  'duration',
  'reset',
  'highlight',
  'candidates',
  'eliminate',
  'markers',
  'lines',
  'chains',
  'place',
  'remove',
] as const;

const FIGURE_KEYS = ['puzzle', 'showCandidates', 'autoplay', 'interval', 'caption', 'frames'] as const;

function frameSpec(v: Obj, path: string): FrameSpec {
  const p = (key: string) => (path ? `${path}.${key}` : key);
  const frame: FrameSpec = {
    caption: optStr(v.caption, p('caption')),
    duration: optNum(v.duration, p('duration')),
    reset: optBool(v.reset, p('reset')),
    highlight: list(v.highlight, p('highlight'), highlightItem),
    candidates: list(v.candidates, p('candidates'), candidateItem),
    eliminate: list(v.eliminate, p('eliminate'), candidateItem),
    markers: list(v.markers, p('markers'), markerItem),
    lines: list(v.lines, p('lines'), lineItem),
    chains: list(v.chains, p('chains'), chainItem),
    place: optStr(v.place, p('place')),
    remove: optStr(v.remove, p('remove')),
  };
  // 去掉未填写的字段，序列化进页面时更紧凑
  return Object.fromEntries(Object.entries(frame).filter(([, x]) => x !== undefined)) as FrameSpec;
}

// 校验 YAML 解析结果并规范化（无 frames 的简写展开为单帧）；校验通过后再试算一遍，坐标、盘面错误也在这里暴露
export function parseFigureSpec(raw: unknown): FigureSpec {
  if (!isObj(raw)) throw new FigureSpecError('sudoku 代码块应为 YAML 对象', '');
  const hasFrames = raw.frames !== undefined;
  const frameKeysOnTop = FRAME_KEYS.filter((k) => k !== 'caption' && raw[k] !== undefined);
  if (hasFrames && frameKeysOnTop.length > 0) {
    throw new FigureSpecError(`写了 frames 时，${frameKeysOnTop.join('、')} 应写在每一帧里`, '');
  }
  checkKeys(raw, hasFrames ? FIGURE_KEYS : [...FIGURE_KEYS, ...FRAME_KEYS], '');
  if (raw.puzzle === undefined) throw new FigureSpecError('缺少 puzzle（盘面文本）', '');

  let frames: FrameSpec[];
  if (hasFrames) {
    if (!Array.isArray(raw.frames) || raw.frames.length === 0) throw new FigureSpecError('frames 应为非空列表', 'frames');
    frames = raw.frames.map((f, i) => {
      if (!isObj(f)) throw new FigureSpecError('每一帧应为对象', `frames[${i}]`);
      checkKeys(f, FRAME_KEYS, `frames[${i}]`);
      return frameSpec(f, `frames[${i}]`);
    });
  } else {
    // 单帧简写：顶层 caption 作为图注，不再重复为帧说明
    const { caption: _caption, ...rest } = raw;
    frames = [frameSpec(rest, '')];
  }

  const spec: FigureSpec = {
    puzzle: str(raw.puzzle, 'puzzle'),
    frames,
  };
  const showCandidates = optBool(raw.showCandidates, 'showCandidates');
  const autoplay = optBool(raw.autoplay, 'autoplay');
  const interval = optNum(raw.interval, 'interval');
  const caption = optStr(raw.caption, 'caption');
  if (showCandidates !== undefined) spec.showCandidates = showCandidates;
  if (autoplay !== undefined) spec.autoplay = autoplay;
  if (interval !== undefined) spec.interval = interval;
  if (caption !== undefined) spec.caption = caption;

  resolveFigure(spec);
  return spec;
}

// ---------------- 逐帧计算 ----------------

function clone<T>(grid: T[][]): T[][] {
  return grid.map((row) => row.map((v) => (Array.isArray(v) ? ([...v] as T) : v)));
}

function peers(row: number, col: number): CellPosition[] {
  const result: CellPosition[] = [];
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (r === row && c === col) continue;
      if (r === row || c === col || (Math.floor(r / 3) * 3 === br && Math.floor(c / 3) * 3 === bc)) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

export function resolveFigure(spec: FigureSpec): ResolvedFigure {
  let parsed;
  try {
    parsed = parseSudokuText(spec.puzzle);
  } catch (e) {
    if (e instanceof SudokuTextError) throw new FigureSpecError(e.message, 'puzzle');
    throw e;
  }

  let board = clone(parsed.state.digits);
  let given = clone(parsed.state.given);
  let candidates = clone(parsed.state.candidates);
  const showCandidates = spec.showCandidates ?? parsed.hasCandidates;
  const interval = spec.interval ?? DEFAULT_INTERVAL;

  let highlights: CellHighlight[] = [];
  let candidateMarkers: CandidateMarker[] = [];
  let markers: CellMarker[] = [];
  let chains: Chain[] = [];

  const frames = spec.frames.map((frame, i) => {
    const path = spec.frames.length > 1 || i > 0 ? `frames[${i}]` : '';
    const p = (key: string) => (path ? `${path}.${key}` : key);

    if (frame.reset) {
      highlights = [];
      candidateMarkers = [];
      markers = [];
      chains = [];
    }

    // 先改盘面（填数 / 删候选），再叠加本帧绘图
    if (frame.remove || frame.place) {
      board = clone(board);
      given = clone(given);
      candidates = clone(candidates);
      for (const { row, col, digit } of frame.remove ? parseCandidates(frame.remove, p('remove')) : []) {
        candidates[row]![col] = candidates[row]![col]!.filter((n) => n !== digit);
      }
      for (const { row, col, digit } of frame.place ? parsePlacements(frame.place, p('place')) : []) {
        if (board[row]![col]! > 0 && given[row]![col]) {
          throw new FigureSpecError(`r${row + 1}c${col + 1} 是提示数，不能再填数`, p('place'));
        }
        board[row]![col] = digit;
        given[row]![col] = false;
        candidates[row]![col] = [];
        for (const peer of peers(row, col)) {
          candidates[peer.row]![peer.col] = candidates[peer.row]![peer.col]!.filter((n) => n !== digit);
        }
      }
      // 已经删掉的候选上不再留强调圆点
      candidateMarkers = candidateMarkers.filter((m) => candidates[m.row]![m.col]!.includes(m.candidate));
    }

    frame.highlight?.forEach((h, k) => {
      const at = frame.highlight!.length > 1 ? `${p('highlight')}[${k}]` : p('highlight');
      highlights = [
        ...highlights,
        {
          cells: parseCells(h.cells, at),
          color: resolveColor(h.color, DEFAULT_COLORS.highlight, at),
          ...(h.opacity ? { opacity: h.opacity } : {}),
        },
      ];
    });

    for (const key of ['candidates', 'eliminate'] as const) {
      frame[key]?.forEach((c, k) => {
        const at = frame[key]!.length > 1 ? `${p(key)}[${k}]` : p(key);
        const fill = resolveColor(c.color, DEFAULT_COLORS[key], at);
        candidateMarkers = [
          ...candidateMarkers,
          ...parseCandidates(c.at, at).map(({ row, col, digit }) => ({ row, col, candidate: digit, color: fill })),
        ];
      });
    }

    frame.markers?.forEach((m, k) => {
      const at = frame.markers!.length > 1 ? `${p('markers')}[${k}]` : p('markers');
      const stroke = resolveColor(m.color, DEFAULT_COLORS.markers, at);
      markers = [...markers, ...parseCells(m.at, `${at}.at`).map((cell) => ({ cell, type: m.type, color: stroke }))];
    });

    frame.lines?.forEach((l, k) => {
      const at = frame.lines!.length > 1 ? `${p('lines')}[${k}]` : p('lines');
      const ends = [...parseCells(l.from, `${at}.from`), ...parseCells(l.to, `${at}.to`)];
      if (ends.length !== 2) throw new FigureSpecError('摒除线的 from / to 各自只能是一个格', at);
      markers = [
        ...markers,
        { type: 'line', cells: ends, color: resolveColor(l.color, DEFAULT_COLORS.lines, at), strokeWidth: 3 },
      ];
    });

    frame.chains?.forEach((c, k) => {
      const at = frame.chains!.length > 1 ? `${p('chains')}[${k}]` : p('chains');
      const { cells, segmentStyles } = parseChainPath(c.path, at);
      chains = [
        ...chains,
        {
          id: `chain-${i}-${k}`,
          cells,
          segmentStyles,
          color: resolveColor(c.color, DEFAULT_COLORS.chains, at),
          arrow: c.arrow ?? false,
          curve: c.curve ?? 'straight',
          strokeWidth: c.width ?? 2.5,
        },
      ];
    });

    return {
      caption: frame.caption,
      duration: frame.duration ?? interval,
      board,
      given,
      candidates,
      highlights,
      candidateMarkers,
      markers,
      chains,
    } satisfies FigureFrame;
  });

  return {
    caption: spec.caption,
    showCandidates,
    autoplay: spec.autoplay ?? frames.length > 1,
    frames,
  };
}
