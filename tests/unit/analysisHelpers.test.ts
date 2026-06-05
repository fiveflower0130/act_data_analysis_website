import { describe, it, expect } from 'vitest';
import { countFrequency, getTopKeys, computeAnalysis } from '../../src/features/dashboard/utils/analysisHelpers';
import type { FailSampleItem } from '../../src/types/api';

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
