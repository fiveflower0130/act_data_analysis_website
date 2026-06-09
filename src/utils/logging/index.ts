/* eslint-disable no-console */
import dayjs from 'dayjs';

// ─── 型別定義 ────────────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  user: string;
  host: string;
  module: string;
  stack: string[];
  msg: string;
  /** 格式化後的完整字串，供下載使用 */
  raw: string;
}

interface AddLogParams {
  level: LogLevel;
  module: string;
  stack: string[];
  msg: unknown;
  user?: string;
}

// ─── 常數設定 ────────────────────────────────────────────────────────────────

/** 記憶體 ring buffer 最大筆數，超過時移除最舊的 */
const MAX_BUFFER_SIZE = 2000;

/** sessionStorage key */
const SESSION_KEY = 'act_log_buffer';

/** 生產環境下只輸出 warn 以上 */
const IS_DEV = import.meta.env.DEV;

// ─── 內部狀態 ────────────────────────────────────────────────────────────────

let logBuffer: LogEntry[] = [];

// 初始化時從 sessionStorage 恢復（頁面重整後可延續）
try {
  const saved = sessionStorage.getItem(SESSION_KEY);
  if (saved) logBuffer = JSON.parse(saved) as LogEntry[];
} catch {
  logBuffer = [];
}

// ─── 工具函式 ────────────────────────────────────────────────────────────────

/** 將模組路徑轉為 kebab-case（對應原版 _.kebabCase 行為） */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/** 取得當前頁面的 host（對應原版 ipV4:port） */
function getHost(): string {
  return window.location.host || 'localhost';
}

/** 瀏覽器 console 的 CSS 色彩樣式 */
const levelStyle: Record<LogLevel, string> = {
  debug: 'color:#42A5F5; font-weight:600',
  info:  'color:#4CAF50; font-weight:600',
  warn:  'color:#FFB74D; font-weight:600',
  error: 'color:#FF5252; font-weight:600',
};

// ─── 核心函式 ────────────────────────────────────────────────────────────────

/**
 * 新增一筆 log。
 *
 * 呼叫介面與原版保持一致：
 * ```ts
 * addLog({ level: 'info', module: 'auth', stack: ['login'], msg: '登入成功', user: '12345' })
 * ```
 */
const addLog = ({ level, module, stack, msg, user }: AddLogParams): void => {
  // 生產環境過濾 debug / info
  if (!IS_DEV && (level === 'debug' || level === 'info')) return;

  const timestamp = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
  const userLabel = user ?? 'system';
  const host = getHost();
  const modulePath = [module, ...stack].map(toKebabCase).join('/');
  const msgStr = msg instanceof Error
    ? `${msg.message}${msg.stack ? '\n' + msg.stack : ''}`
    : String(msg);

  // 格式對應原版：[timestamp] [LEVEL] [user] (host | module/stack): message
  const raw = `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${userLabel}] (${host} | ${modulePath}): ${msgStr}`;

  const entry: LogEntry = { timestamp, level, user: userLabel, host, module, stack, msg: msgStr, raw };

  // ── ring buffer ──
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.splice(0, logBuffer.length - MAX_BUFFER_SIZE);
  }

  // ── sessionStorage 持久化 ──
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(logBuffer));
  } catch {
    // sessionStorage 滿了時靜默失敗
  }

  // ── 瀏覽器 console 輸出 ──
  const consoleMethod = level === 'debug' ? console.debug
    : level === 'info'  ? console.info
    : level === 'warn'  ? console.warn
    : console.error;

  consoleMethod(`%c[${level.toUpperCase()}]%c ${raw.split(': ').slice(1).join(': ')}`, levelStyle[level], 'color:inherit');
};

// ─── 公開工具函式 ────────────────────────────────────────────────────────────

/** 取得當前 session 的所有 log entries（供除錯或 UI 顯示） */
export const getLogBuffer = (): Readonly<LogEntry[]> => logBuffer;

/** 清除記憶體與 sessionStorage 中的 log */
export const clearLogs = (): void => {
  logBuffer = [];
  sessionStorage.removeItem(SESSION_KEY);
};

/**
 * 將當前 session 所有 log 下載為本機 .log 檔。
 * 檔名格式：`YYYY-MM-DD.log`（對應原版每日一檔的慣例）
 */
export const downloadLogs = (): void => {
  if (logBuffer.length === 0) {
    addLog({ level: 'warn', module: 'logger', stack: ['download-logs'], msg: 'log buffer 為空，無內容可下載' });
    return;
  }

  const filename = `${dayjs().format('YYYY-MM-DD')}.log`;
  const content = logBuffer.map(e => e.raw).join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
  addLog({ level: 'info', module: 'logger', stack: ['download-logs'], msg: `已下載 ${logBuffer.length} 筆 log → ${filename}` });
};

export default addLog;
