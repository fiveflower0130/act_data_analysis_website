import { describe, it, expect } from 'vitest';
import { countFrequency, getTopKeys, computeAnalysis, buildTrayPages, calcTopBalls } from '../../src/features/dashboard/utils/analysisHelpers';
import type { FailSampleItem, TraySpec } from '../../src/types/api';

// ─── 測試輔助：建立 FailSampleItem ─────────────────────────────────────────────

const mkItem = (dut_no: number, die_no: string[], ball_name: string[]): FailSampleItem => ({
  dut_no,
  die_no,
  ball_name,
  bond_finger: [],
});

// ─── countFrequency ────────────────────────────────────────────────────────────

describe('countFrequency()', () => {
  it('空陣列 → 回傳空 Map', () => {
    expect(countFrequency([]).size).toBe(0);
  });

  it('正確統計各元素出現次數', () => {
    const freq = countFrequency(['a', 'b', 'a', 'c', 'a', 'b']);
    expect(freq.get('a')).toBe(3);
    expect(freq.get('b')).toBe(2);
    expect(freq.get('c')).toBe(1);
  });

  it('支援數字型別', () => {
    const freq = countFrequency([1, 2, 1, 3]);
    expect(freq.get(1)).toBe(2);
    expect(freq.get(2)).toBe(1);
  });
});

// ─── getTopKeys ────────────────────────────────────────────────────────────────

describe('getTopKeys()', () => {
  it('空 Map → 回傳空陣列', () => {
    expect(getTopKeys(new Map())).toEqual([]);
  });

  it('單一最高值：只回傳該 key', () => {
    const freq = new Map([['U7', 5], ['U2', 3], ['U1', 1]]);
    expect(getTopKeys(freq)).toEqual(['U7']);
  });

  it('並列最高值：全部回傳，以升冪排序', () => {
    const freq = new Map([['U7', 5], ['U2', 5], ['U1', 2]]);
    expect(getTopKeys(freq)).toEqual(['U2', 'U7']);
  });

  it('全部相同次數：全部回傳', () => {
    const freq = new Map([['U3', 1], ['U1', 1], ['U2', 1]]);
    expect(getTopKeys(freq)).toEqual(['U1', 'U2', 'U3']);
  });
});

// ─── computeAnalysis ──────────────────────────────────────────────────────────

describe('computeAnalysis()', () => {
  it('空陣列 → ioFailCount=0，dieResults=[]', () => {
    const result = computeAnalysis([]);
    expect(result.ioFailCount).toBe(0);
    expect(result.dieResults).toEqual([]);
  });

  it('所有 ball_name 為空陣列 → ioFailCount=0', () => {
    const items = [
      mkItem(1, ['U7'], []),
      mkItem(2, ['U2'], []),
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(0);
    expect(result.dieResults).toEqual([]);
  });

  it('所有 ball_name 為空字串 → ioFailCount=0', () => {
    const items = [
      mkItem(1, ['U7'], ['']),
      mkItem(2, ['U2'], ['']),
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(0);
  });

  it('基本案例：正確計算 ioFailCount 與最高頻 die/ball', () => {
    // U7 出現 3 次，U2 出現 1 次 → U7 最高
    // U7 下 ball_name：AY10 × 2、F15 × 1 → AY10 最高
    const items = [
      mkItem(1, ['U7'], ['AY10']),
      mkItem(2, ['U7'], ['AY10']),
      mkItem(3, ['U7'], ['F15']),
      mkItem(4, ['U2'], ['AU18']),
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(4);
    expect(result.dieResults).toEqual([{ die: 'U7', balls: ['AY10'] }]);
  });

  it('die_no 並列：全部列出，以升冪排序', () => {
    // U2 和 U7 各出現 2 次
    const items = [
      mkItem(1, ['U7'], ['AY10']),
      mkItem(2, ['U7'], ['AY10']),
      mkItem(3, ['U2'], ['AU18']),
      mkItem(4, ['U2'], ['AU18']),
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(4);
    expect(result.dieResults.map((r) => r.die)).toEqual(['U2', 'U7']);
    expect(result.dieResults[0]).toEqual({ die: 'U2', balls: ['AU18'] });
    expect(result.dieResults[1]).toEqual({ die: 'U7', balls: ['AY10'] });
  });

  it('ball_name 並列：全部列出，以升冪排序', () => {
    // U7 下 AY10 × 1、F15 × 1 → 並列
    const items = [
      mkItem(1, ['U7'], ['AY10']),
      mkItem(2, ['U7'], ['F15']),
    ];
    const result = computeAnalysis(items);
    expect(result.dieResults).toEqual([{ die: 'U7', balls: ['AY10', 'F15'] }]);
  });

  it('混合空與非空 ball_name：只計入非空的 item', () => {
    const items = [
      mkItem(1, ['U7'], ['AY10']),   // IO fail
      mkItem(2, ['U7'], ['']),        // 非 IO fail（空字串）
      mkItem(3, ['U2'], []),          // 非 IO fail（空陣列）
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(1);
    expect(result.dieResults).toEqual([{ die: 'U7', balls: ['AY10'] }]);
  });

  it('die_no 為空字串不計入頻率統計', () => {
    // item 有 ball_name 但 die_no 為空字串 → 算入 ioFailCount，die_no 不計入統計
    const items = [
      mkItem(1, [''], ['AY10']),
      mkItem(2, ['U7'], ['AY10']),
      mkItem(3, ['U7'], ['AY10']),
    ];
    const result = computeAnalysis(items);
    expect(result.ioFailCount).toBe(3);
    // '' 被過濾，U7 出現 2 次
    expect(result.dieResults).toEqual([{ die: 'U7', balls: ['AY10'] }]);
  });
});

// ─── buildTrayPages ────────────────────────────────────────────────────────────

const mkTray = (col: number, row: number): TraySpec => ({ col_count: col, row_count: row });

describe('buildTrayPages()', () => {
  it('totalDuts=0 → 回傳空陣列', () => {
    expect(buildTrayPages([], [], mkTray(5, 4), 0)).toEqual([]);
  });

  it('容量為 0 → 回傳空陣列', () => {
    expect(buildTrayPages([mkItem(1, ['U7'], ['AY10'])], [], mkTray(0, 5), 3)).toEqual([]);
  });

  it('單頁：DUT 位置 = tray 容量，每格 dutNo 正確', () => {
    const spec = mkTray(2, 3); // 6 格
    const items = [1, 2, 3, 4].map((n) => mkItem(n, ['U7'], ['AY10']));
    const pages = buildTrayPages(items, [], spec, 6);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(6);
    // 真實 DUT 位置（1-6）一律非 gray；不在 dutMap 的 DUT → blue
    expect(pages[0].every((c) => c.status !== 'gray')).toBe(true);
    // dut 1-4 在 dutMap（dieResults 為空 → blue），5-6 不在 dutMap → blue
    expect(pages[0].every((c) => c.status === 'blue')).toBe(true);
  });

  it('不在 ioPinFailItems 的 DUT 位置 → blue（視同 Fail）', () => {
    // ioPinFailItems 只有 DUT#1；totalDuts=4 → 位置 2,3,4 不在 dutMap → blue
    const items = [mkItem(1, ['U7'], ['AY10'])];
    const pages = buildTrayPages(items, [], mkTray(2, 2), 4);
    expect(pages[0][0].status).not.toBe('gray'); // DUT#1 在 dutMap
    expect(pages[0][1].status).toBe('blue');      // DUT#2 不在 dutMap → blue
    expect(pages[0][2].status).toBe('blue');      // DUT#3 不在 dutMap → blue
    expect(pages[0][3].status).toBe('blue');      // DUT#4 不在 dutMap → blue
  });

  it('totalDuts < 容量：最後一頁以 dutNo=0 佔位補滿', () => {
    const spec = mkTray(3, 2); // 6 格
    const items = [1, 2, 3, 4].map((n) => mkItem(n, ['U7'], ['AY10']));
    const pages = buildTrayPages(items, [], spec, 4);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(6);
    expect(pages[0].map((c) => c.dutNo)).toEqual([1, 2, 3, 4, 0, 0]);
    expect(pages[0][4]).toMatchObject({ dutNo: 0, ballName: '', status: 'gray' });
  });

  it('多頁：totalDuts 超過一頁容量', () => {
    const spec = mkTray(5, 2); // 10 格/頁
    const items = [1, 3, 5, 7, 9].map((n) => mkItem(n, ['U7'], ['AY10']));
    const pages = buildTrayPages(items, [], spec, 15);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(10);
    expect(pages[1]).toHaveLength(10);
    // 第二頁 DUT 11-15（都不在 dutMap → blue），然後 dutNo=0 佔位（gray）
    expect(pages[1].slice(0, 5).every((c) => c.status === 'blue' && c.dutNo > 0)).toBe(true);
    expect(pages[1].slice(5).every((c) => c.dutNo === 0 && c.status === 'gray')).toBe(true);
  });

  it('顏色：ball 在 topBalls → orange（Top Die Fail）', () => {
    const items = [mkItem(1, ['U7'], ['AY10'])];
    const dieResults = [{ die: 'U7', balls: ['AY10'] }];
    const pages = buildTrayPages(items, dieResults, mkTray(2, 1), 2);
    expect(pages[0][0].status).toBe('orange');
    expect(pages[0][0].ballName).toBe('AY10');
  });

  it('顏色：ball 不在 topBalls → blue', () => {
    const items = [mkItem(1, ['U7'], ['F15'])];
    const dieResults = [{ die: 'U7', balls: ['AY10'] }]; // F15 不在 topBalls
    const pages = buildTrayPages(items, dieResults, mkTray(2, 1), 2);
    expect(pages[0][0].status).toBe('blue');
    expect(pages[0][0].ballName).toBe('F15');
  });

  it('佔位格（dutNo=0）：超出 totalDuts 的格子才為 dutNo=0', () => {
    // totalDuts=1，tray 容量=2 → 第 2 格超出範圍，為佔位格
    const items = [mkItem(1, ['U7'], ['AY10'])];
    const dieResults = [{ die: 'U7', balls: ['AY10'] }];
    const pages = buildTrayPages(items, dieResults, mkTray(2, 1), 1);
    expect(pages[0][0]).toMatchObject({ dutNo: 1, status: 'orange' });     // 真實 DUT
    expect(pages[0][1]).toMatchObject({ dutNo: 0, ballName: '', status: 'gray' }); // 佔位格
  });
});

// ─── calcTopBalls ──────────────────────────────────────────────────────────────

describe('calcTopBalls()', () => {
  it('空陣列 → 回傳空陣列', () => {
    expect(calcTopBalls([])).toEqual([]);
  });

  it('DUT 內 ball_name 為空陣列 → 不計入統計', () => {
    const items = [mkItem(1, [], []), mkItem(2, [], [])];
    expect(calcTopBalls(items)).toEqual([]);
  });

  it('正確累加同一 DUT 內重複出現的 ball_name（不去重）', () => {
    const items = [mkItem(1, ['U1', 'U1'], ['AY10', 'AY10'])];
    const result = calcTopBalls(items);
    expect(result).toEqual([{ ball: 'AY10', count: 2 }]);
  });

  it('跨多個 DUT 累加同一 ball_name 出現次數', () => {
    const items = [
      mkItem(1, ['U1'], ['AY10']),
      mkItem(2, ['U1'], ['AY10']),
      mkItem(3, ['U2'], ['BZ5']),
    ];
    const result = calcTopBalls(items);
    expect(result).toEqual([
      { ball: 'AY10', count: 2 },
      { ball: 'BZ5', count: 1 },
    ]);
  });

  it('依 count 由高到低降序排序', () => {
    const items = [
      mkItem(1, ['U1'], ['A']),
      mkItem(2, ['U2'], ['B']),
      mkItem(3, ['U2'], ['B']),
      mkItem(4, ['U2'], ['B']),
      mkItem(5, ['U3'], ['C']),
      mkItem(6, ['U3'], ['C']),
    ];
    const result = calcTopBalls(items);
    expect(result.map((r) => r.ball)).toEqual(['B', 'C', 'A']);
    expect(result.map((r) => r.count)).toEqual([3, 2, 1]);
  });

  it('預設只取前 10 筆（topN 預設值）', () => {
    const items = Array.from({ length: 15 }, (_, i) => mkItem(i + 1, [`U${i}`], [`Ball${i}`]));
    const result = calcTopBalls(items);
    expect(result).toHaveLength(10);
  });

  it('自訂 topN 參數：只取前 N 筆', () => {
    const items = [
      mkItem(1, ['U1'], ['A']),
      mkItem(2, ['U2'], ['B']),
      mkItem(3, ['U2'], ['B']),
      mkItem(4, ['U3'], ['C']),
      mkItem(5, ['U3'], ['C']),
      mkItem(6, ['U3'], ['C']),
    ];
    const result = calcTopBalls(items, 2);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.ball)).toEqual(['C', 'B']);
  });

  it('忽略空字串的 ball_name', () => {
    const items = [mkItem(1, ['U1', 'U2'], ['', 'AY10'])];
    const result = calcTopBalls(items);
    expect(result).toEqual([{ ball: 'AY10', count: 1 }]);
  });
});
