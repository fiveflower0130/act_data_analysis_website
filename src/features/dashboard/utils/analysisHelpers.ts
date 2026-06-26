import type { FailSampleItem } from '../../../types/api';

/** 統計陣列中各元素的出現次數，回傳 Map<element, count> */
export function countFrequency<T>(arr: T[]): Map<T, number> {
  const map = new Map<T, number>();
  arr.forEach((item) => map.set(item, (map.get(item) ?? 0) + 1));
  return map;
}

/** 取出 Map 中所有 value 等於最大值的 key（含並列），以升冪排序 */
export function getTopKeys(freq: Map<string, number>): string[] {
  if (freq.size === 0) return [];
  const max = Math.max(...freq.values());
  return [...freq.entries()]
    .filter(([, count]) => count === max)
    .map(([key]) => key)
    .sort();
}

export interface DieResult {
  die: string;
  balls: string[];
}

/** 計算 ResultsPanel 需要的所有衍生數值 */
export function computeAnalysis(failSample: FailSampleItem[]): {
  ioFailCount: number;
  dieResults: DieResult[];
} {
  // IO pin fail：ball_name 陣列不為空且至少一個元素不是空字串
  const ioPinFailItems = failSample.filter(
    (item) => item.ball_name.length > 0 && item.ball_name.some((b) => b !== ''),
  );
  const ioFailCount = ioPinFailItems.length;

  if (ioFailCount === 0) {
    return { ioFailCount, dieResults: [] };
  }

  // 計算 die_no 出現頻率（只計非空字串）
  const dieFreq = countFrequency(
    ioPinFailItems.flatMap((item) => item.die_no.filter((d) => d !== '')),
  );
  const topDies = getTopKeys(dieFreq);

  // 對每個並列最高 die，計算其下 ball_name 頻率
  const dieResults: DieResult[] = topDies.map((die) => {
    const dieItems = ioPinFailItems.filter((item) => item.die_no.includes(die));
    const ballFreq = countFrequency(
      dieItems.flatMap((item) => item.ball_name.filter((b) => b !== '')),
    );
    return { die, balls: getTopKeys(ballFreq) };
  });

  return { ioFailCount, dieResults };
}

/**
 * 計算 ball_name 在所有 DUT 出現的總次數（同一 DUT 內重複計），
 * 取前 topN 筆降序排列。用於 FailBallChart 和 ResultsPanel。
 */
export function calcTopBalls(
  failSample: FailSampleItem[],
  topN = 10,
): { ball: string; count: number }[] {
  const counts: Record<string, number> = {};
  failSample.forEach((dut) => {
    dut.ball_name.forEach((ball) => {
      if (ball) counts[ball] = (counts[ball] ?? 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([ball, count]) => ({ ball, count }));
}
