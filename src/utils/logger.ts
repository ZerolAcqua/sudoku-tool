/**
 * 轻量日志工具
 *
 * 提供 debug / info / warn / error 四级日志，级别可通过环境变量 VITE_LOG_LEVEL 控制，
 * 运行时可调用 setLogLevel 动态调整。默认级别：开发环境 debug，生产环境 error。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
  silent: 'SILENT',
}

type ActiveLevel = Exclude<LogLevel, 'silent'>

function resolveDefaultLevel(): LogLevel {
  const configured = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined
  if (configured && configured in LEVEL_ORDER) {
    return configured
  }
  return import.meta.env.DEV ? 'debug' : 'error'
}

let currentLevel: LogLevel = resolveDefaultLevel()

/** 动态调整日志级别（低于该级别的日志将被静默） */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

function emit(level: ActiveLevel, args: unknown[]): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return
  console[level](`[${LEVEL_LABEL[level]}]`, ...args)
}

/** 全局 logger：按需调用 debug / info / warn / error */
export const logger: Record<ActiveLevel, (...args: unknown[]) => void> = {
  debug: (...args) => emit('debug', args),
  info: (...args) => emit('info', args),
  warn: (...args) => emit('warn', args),
  error: (...args) => emit('error', args),
}
