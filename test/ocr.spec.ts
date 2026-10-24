/**
 * OCR 回归测试（Vitest 项目 `ocr`）
 *
 * 运行：`npm run test:ocr`（只跑这一组）或 `npm test`（全部单测）
 *
 * 用途：调整识别算法（网格检测 / 单元格提取 / 数字识别）后，用一批固定的
 * 图片回归验证，避免出现「之前能识别的图片现在识别错了」这类问题。
 *
 * 测试直接复用浏览器里的真实识别入口 useOCR().recognize()，与线上逻辑完全一致
 * （包括置信度阈值过滤、空单元格二次校验等），不会因为测试里另写一份管线而失真。
 *
 * 用法：在下方 CASES 数组里填写用例，expected 为 81 位字符串，'0' 表示空格。
 *   expected 留空 "" 表示尚未填写真值：该用例标记为 todo，并打印实际识别结果供你核对。
 */

import * as tfNode from '@tensorflow/tfjs-node'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { installDomPolyfill } from './node-env'
import { setModelUrl } from '@/utils/ocr/mnistModel'
import { useOCR } from '@/composables/useOCR'
import { CONFIDENCE_THRESHOLD } from '@/utils/ocr/constants'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const IMG_DIR = path.join(__dirname, 'images') // 测试图片放在 test/images/ 下

type TestCase = { file: string; expected: string }

// ===================== 在这里维护测试用例 =====================
// 图片相对 test/images/ 目录；expected 填真实值，留空则仅打印实际结果。
const CASES: TestCase[] = [
  { file: '向-绽放.jpeg', expected: '040000080005060140200004006030957008900601070007300900700006200060000050009700004' },
  { file: '向-飞鱼导弹.jpeg', expected: '070002059080700004090030080006010000040500090007003000700001600000020070060400005' },
  { file: '谢三.png', expected: '004009000000004005700800902012000003500060009600000170103008006900700000000500800' },
  { file: '数独玩家.jpg', expected: '074000005108400096500097430200069843453010079000074251091002004000700002326941500' },
  { file: '破解数独.png', expected: '000801030060000700000000000804200000000400600300000500050060000000000084000090000' },
  { file: '本网站-演示数独.png', expected: '530070000600195000098000060800060003400803001700020006060000280000419005000080079'},
  { file: '本网站-演示数独（加粗）.png', expected: '530070000600195000098000060800060003400803001700020006060000280000419005000080079'},

  // 4 识别成 6
  // { file: '全民数独.png', expected: '600804570020700000000003000501600000302000000006050890000070000040002009007586040' },
  // 1 识别不到
  // { file: '谢老珍珠题.png', expected: '000000500200003610060500070000030100003675200006080000090002040072400009008000000' },
]
// ==============================================================

/** 把 81 位字符串格式化为 9×9 网格，便于肉眼核对 */
function formatBoard(s: string): string {
  const rows: string[] = []
  for (let r = 0; r < 9; r++) rows.push(s.slice(r * 9, r * 9 + 9).split('').join(' '))
  return rows.join('\n')
}

/** 逐格比较，返回所有不一致的位置（r,c 从 1 开始） */
function diffBoard(actual: string, expected: string): string[] {
  const lines: string[] = []
  for (let i = 0; i < 81; i++) {
    if (actual[i] !== expected[i]) {
      const r = Math.floor(i / 9) + 1
      const c = (i % 9) + 1
      lines.push(`(r${r},c${c}) 期望 ${expected[i]} 实际 ${actual[i]}`)
    }
  }
  return lines
}

describe('OCR 整盘识别', () => {
  let recognize: ReturnType<typeof useOCR>['recognize']

  beforeAll(() => {
    installDomPolyfill()
    // 引用 tfNode 以确保 @tensorflow/tfjs-node 的副作用（注册 file:// IO handler 与
    // node 后端）生效——未被引用的导入可能被打包工具省略，导致模型无法从本地加载。
    expect(tfNode.getBackend()).toBe('tensorflow')

    setModelUrl('file://' + path.join(ROOT, 'public/models/sudoku-digit/model.json'))
    // 复用浏览器里的真实识别入口（与 SolverPage.confirmCrop 调用的同一个函数）
    recognize = useOCR().recognize
  })

  for (const c of CASES.filter((c) => c.expected === '')) {
    it.todo(`${c.file}（未填写期望值）`, async () => {
      const actual = await recognize(path.join(IMG_DIR, c.file), { confidenceThreshold: CONFIDENCE_THRESHOLD, debug: false })
      console.log(`[todo] ${c.file} 实际识别结果：\n${formatBoard(actual)}`)
    })
  }

  it.each(CASES.filter((c) => c.expected !== ''))('$file', async ({ file, expected }) => {
    const actual = await recognize(path.join(IMG_DIR, file), { confidenceThreshold: CONFIDENCE_THRESHOLD, debug: false })

    // 失败时给出 9×9 对照与逐格差异，比直接比较 81 位字符串好读
    const diffs = diffBoard(actual, expected)
    const message = [
      `${file} 识别结果与期望不一致（${diffs.length} 处）`,
      '实际：\n' + formatBoard(actual),
      '期望：\n' + formatBoard(expected),
      ...diffs.slice(0, 20),
      diffs.length > 20 ? `... 其余 ${diffs.length - 20} 处省略` : '',
    ].join('\n')
    expect(actual, message).toBe(expected)
  })
})
