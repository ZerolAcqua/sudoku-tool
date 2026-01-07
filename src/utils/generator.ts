// 轻量唯余练习生成器：从固定解盘抽取练习（行/列/宫/一般）
// 保证仅一个目标格为空，其余给定，便于唯余练习与统计

export type UnitMode = 'row' | 'col' | 'box' | 'general'

export interface PracticePuzzle {
  board: number[][]
  given: boolean[][]
  focusCell: { row: number; col: number }
  focusHighlight: 'row' | 'col' | 'box' | 'all'
  mode: UnitMode
  answer: number
  candidates: number[][][] // 9x9: 仅目标格有候选，其余为空或 []
}

// 不使用固定解盘；仅根据练习类型随机放置八个数字

const emptyBoard = (): number[][] => Array.from({ length: 9 }, () => Array(9).fill(0))
const emptyMask = (): boolean[][] => Array.from({ length: 9 }, () => Array(9).fill(false))
const emptyCands = (): number[][][] => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [] as number[]))

const boxStart = (r: number, c: number) => ({ br: Math.floor(r/3)*3, bc: Math.floor(c/3)*3 })

const relatedUnion = (r: number, c: number): Array<{row:number,col:number}> => {
  const set = new Set<string>()
  // Row
  for (let cc=0; cc<9; cc++) {
    if (cc === c) continue
    set.add(`${r}-${cc}`)
  }
  // Col
  for (let rr=0; rr<9; rr++) {
    if (rr === r) continue
    set.add(`${rr}-${c}`)
  }
  // Box
  const { br, bc } = boxStart(r, c)
  for (let rr=br; rr<br+3; rr++) for (let cc=bc; cc<bc+3; cc++) {
    if (rr === r && cc === c) continue
    set.add(`${rr}-${cc}`)
  }
  return Array.from(set).map(s => {
    const parts = s.split('-')
    const rr = Number(parts[0]!)
    const cc = Number(parts[1]!)
    return { row: rr, col: cc }
  })
}

// 候选数不需要显示，此函数保留以备后续扩展
const computeCellCandidates = (_board: number[][], _r: number, _c: number): number[] => {
  return []
}

const finalizePuzzle = (
  board: number[][],
  given: boolean[][],
  focusCell: { row: number; col: number },
  mode: UnitMode
): PracticePuzzle => {
  const candidates = emptyCands()
  return {
    board,
    given,
    focusCell,
    mode,
    focusHighlight: mode === 'general' ? 'all' : mode,
    answer: board[focusCell.row]![focusCell.col]! || 0,
    candidates,
  }
}

export const genRowPuzzle = (): PracticePuzzle => {
  const r = Math.floor(Math.random()*9)
  const missingIndex = Math.floor(Math.random()*9)
  const board = emptyBoard()
  const given = emptyMask()
  const nums = Array.from({length:9}, (_,i)=>i+1)
  const ans = nums.splice(Math.floor(Math.random()*nums.length), 1)[0]!
  // 随机打乱剩余八个数字
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = tmp;
  }
  let idx = 0
  for (let c=0;c<9;c++) {
    if (c === missingIndex) continue
    board[r]![c]! = nums[idx++]!
    given[r]![c]! = true
  }
  // 目标格答案不写入盘面，仅用于校验
  const focus = { row: r, col: missingIndex }
  const p = finalizePuzzle(board, given, focus, 'row')
  // 将答案缓存到 focus 位置（finalize 中取 board 值，这里手动覆盖）
  p.answer = ans
  return p
}

export const genColPuzzle = (): PracticePuzzle => {
  const c = Math.floor(Math.random()*9)
  const missingIndex = Math.floor(Math.random()*9)
  const board = emptyBoard()
  const given = emptyMask()
  const nums = Array.from({length:9}, (_,i)=>i+1)
  const ans = nums.splice(Math.floor(Math.random()*nums.length), 1)[0]!
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = tmp;
  }
  let idx = 0
  for (let r=0;r<9;r++) {
    if (r === missingIndex) continue
    board[r]![c]! = nums[idx++]!
    given[r]![c]! = true
  }
  const focus = { row: missingIndex, col: c }
  const p = finalizePuzzle(board, given, focus, 'col')
  p.answer = ans
  return p
}

export const genBoxPuzzle = (): PracticePuzzle => {
  const br = Math.floor(Math.random()*3)*3
  const bc = Math.floor(Math.random()*3)*3
  const missingIndex = Math.floor(Math.random()*9)
  const mr = br + Math.floor(missingIndex/3)
  const mc = bc + (missingIndex%3)
  const board = emptyBoard()
  const given = emptyMask()
  const nums = Array.from({length:9}, (_,i)=>i+1)
  const ans = nums.splice(Math.floor(Math.random()*nums.length), 1)[0]!
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = tmp;
  }
  let idx = 0
  for (let dr=0;dr<3;dr++) for (let dc=0;dc<3;dc++) {
    const r = br + dr, c = bc + dc
    if (r === mr && c === mc) continue
    board[r]![c]! = nums[idx++]!
    given[r]![c]! = true
  }
  const focus = { row: mr, col: mc }
  const p = finalizePuzzle(board, given, focus, 'box')
  p.answer = ans
  return p
}

// 一般唯余：仍保持“仅一个格需要填写”，但不依赖固定解盘
// 简化实现：随机选择一个目标格和答案；在其所在的行随机填入其余八个数字，其它单元为空。
export const genGeneralPuzzle = (): PracticePuzzle => {
  const r = Math.floor(Math.random()*9)
  const c = Math.floor(Math.random()*9)
  const board = emptyBoard()
  const given = emptyMask()
  const nums = Array.from({length:9}, (_,i)=>i+1)
  const ans = nums.splice(Math.floor(Math.random()*nums.length), 1)[0]!
  // 关联格（行+列+宫）的并集里随机选 8 个位置放置剩余数字
  const union = relatedUnion(r, c)
  // 打乱并取前 8 个位置
  for (let i = union.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = union[i]!
    union[i] = union[j]!
    union[j] = tmp
  }
  const positions = union.slice(0, 8)
  // 打乱数字以避免固定顺序
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = nums[i]!;
    nums[i] = nums[j]!;
    nums[j] = tmp;
  }
  for (let i=0;i<8;i++) {
    const pos = positions[i]!
    const val = nums[i]!
    board[pos.row]![pos.col]! = val
    given[pos.row]![pos.col]! = true
  }
  const focus = { row: r, col: c }
  const p = finalizePuzzle(board, given, focus, 'general')
  p.answer = ans
  return p
}

export const genByMode = (mode: UnitMode): PracticePuzzle => {
  switch (mode) {
    case 'row': return genRowPuzzle()
    case 'col': return genColPuzzle()
    case 'box': return genBoxPuzzle()
    case 'general': return genGeneralPuzzle()
  }
}

export const pickRandomMode = (pool: UnitMode[]): UnitMode => {
  const list = pool.length ? pool : ['row','col','box','general'] as UnitMode[]
  const idx = Math.floor(Math.random()*list.length)
  return list[idx]!
}
