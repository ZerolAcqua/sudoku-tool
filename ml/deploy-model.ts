/**
 * 将最新的训练检查点部署到 public/models/sudoku-digit
 */
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const checkpointDir = path.join(__dirname, 'models')
const deployDir = path.join(__dirname, '../public/models/sudoku-digit')

function getLatestCheckpoint(): { dir: string; epoch: number } | null {
  if (!fs.existsSync(checkpointDir)) return null

  const entries = fs.readdirSync(checkpointDir, { withFileTypes: true })
  let maxEpoch = -1
  let maxDir = ''

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const match = entry.name.match(/^checkpoint-epoch-(\d+)$/)
    if (!match) continue
    const epoch = Number(match[1])
    if (Number.isFinite(epoch) && epoch > maxEpoch) {
      maxEpoch = epoch
      maxDir = entry.name
    }
  }

  if (maxEpoch < 0) return null
  return { dir: path.join(checkpointDir, maxDir), epoch: maxEpoch }
}

function deploy() {
  const latest = getLatestCheckpoint()
  if (!latest) {
    console.error('未找到检查点')
    process.exit(1)
  }

  // 清空并重建目标目录
  if (fs.existsSync(deployDir)) {
    fs.rmSync(deployDir, { recursive: true })
  }
  fs.mkdirSync(deployDir, { recursive: true })

  // 复制所有文件
  const files = fs.readdirSync(latest.dir)
  for (const file of files) {
    fs.copyFileSync(path.join(latest.dir, file), path.join(deployDir, file))
  }

  console.log(`已部署 checkpoint-epoch-${latest.epoch} -> public/models/sudoku-digit`)
}

deploy()
