import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import addLog, { getLogBuffer, clearLogs, downloadLogs } from '../../src/utils/logging';

// 抑制 console 輸出避免干擾測試輸出
beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  clearLogs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Logger — addLog', () => {
  it('應將 log 存入 buffer', () => {
    addLog({ level: 'info', module: 'test', stack: [], msg: 'hello' });
    expect(getLogBuffer()).toHaveLength(1);
    expect(getLogBuffer()[0].msg).toBe('hello');
  });

  it('應正確記錄所有欄位', () => {
    addLog({ level: 'warn', module: 'authStore', stack: ['login'], msg: '測試訊息', user: 'E001' });
    const entry = getLogBuffer()[0];
    expect(entry.level).toBe('warn');
    expect(entry.module).toBe('authStore');
    expect(entry.user).toBe('E001');
    expect(entry.msg).toBe('測試訊息');
  });

  it('msg 為 Error 物件時應轉換為字串', () => {
    const err = new Error('connection failed');
    addLog({ level: 'error', module: 'api', stack: ['client'], msg: err });
    expect(getLogBuffer()[0].msg).toContain('connection failed');
  });

  it('未提供 user 時應預設為 "system"', () => {
    addLog({ level: 'debug', module: 'test', stack: [], msg: 'no user' });
    expect(getLogBuffer()[0].user).toBe('system');
  });

  it('raw 欄位應包含格式化字串', () => {
    addLog({ level: 'info', module: 'test', stack: ['sub'], msg: 'format check' });
    expect(getLogBuffer()[0].raw).toContain('[INFO ]');
    expect(getLogBuffer()[0].raw).toContain('test/sub');
  });
});

describe('Logger — getLogBuffer / clearLogs', () => {
  it('getLogBuffer 應回傳所有記錄', () => {
    addLog({ level: 'debug', module: 'A', stack: [], msg: 'msg1' });
    addLog({ level: 'info', module: 'B', stack: [], msg: 'msg2' });
    expect(getLogBuffer()).toHaveLength(2);
  });

  it('clearLogs 應清空 buffer 並清除 sessionStorage', () => {
    addLog({ level: 'info', module: 'test', stack: [], msg: 'before clear' });
    clearLogs();
    expect(getLogBuffer()).toHaveLength(0);
    expect(sessionStorage.getItem('act_log_buffer')).toBeNull();
  });
});

describe('Logger — ring buffer 上限', () => {
  it('超過 2000 筆時應自動捨棄最舊的記錄', () => {
    for (let i = 0; i < 2001; i++) {
      addLog({ level: 'debug', module: 'test', stack: [], msg: `msg-${i}` });
    }
    const buf = getLogBuffer();
    expect(buf).toHaveLength(2000);
    // msg-0 應被捨棄，第一筆應為 msg-1
    expect(buf[0].msg).toBe('msg-1');
    // 最後一筆應為 msg-2000
    expect(buf[buf.length - 1].msg).toBe('msg-2000');
  });
});

describe('Logger — downloadLogs', () => {
  it('buffer 有資料時應觸發下載', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const mockAnchor = { href: '', download: '', click: vi.fn(), style: {} };
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

    addLog({ level: 'info', module: 'test', stack: [], msg: 'export' });
    downloadLogs();

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(mockAnchor.click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('buffer 為空時應記錄 warn 並不觸發下載', () => {
    const createObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;

    downloadLogs();

    expect(createObjectURL).not.toHaveBeenCalled();
    // 會新增一筆 warn log（來自 downloadLogs 本身）
    expect(getLogBuffer()[0].level).toBe('warn');
  });
});
