import type { FailSampleItem, TraySpec } from '../../../types/api';

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

/** 計算 ResultsPanel 與 FailTrayChart 需要的所有衍生數值 */
export function computeAnalysis(failSample: FailSampleItem[]): {
  ioFailCount: number;
  dieResults: DieResult[];
  ioPinFailItems: FailSampleItem[];
} {
  // IO pin fail：ball_name 陣列不為空且至少一個元素不是空字串
  const ioPinFailItems = failSample.filter(
    (item) => item.ball_name.length > 0 && item.ball_name.some((b) => b !== ''),
  );
  const ioFailCount = ioPinFailItems.length;

  if (ioFailCount === 0) {
    return { ioFailCount, dieResults: [], ioPinFailItems };
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

  return { ioFailCount, dieResults, ioPinFailItems };
}

// ── Tray 相關 ─────────────────────────────────────────────────────────────────

export type CellStatus = 'orange' | 'blue' | 'gray';

export interface TrayCell {
  dutNo: number;      // 資料庫 dut_no（佔位格為 0）
  ballName: string;   // 此 DUT 的 ball_name（第一個非空值；佔位或 POWER-only 為 ''）
  status: CellStatus;
}

function getCellStatus(dut: FailSampleItem | undefined, topBalls: Set<string>): CellStatus {
  if (!dut) return 'gray'; // 不在 ioPinFailItems → gray（POWER-only fail 或 pass）
  if (dut.ball_name.some((b) => b && topBalls.has(b))) return 'orange';
  return 'blue';
}

/**
 * 將 ioPinFailItems（有 ball_name 的 IO fail 項目）對應到 Tray DUT 位置，回傳分頁後的 TrayCell 陣列。
 * - 每頁容量 = col_count × row_count，DUT #1 起依 left-to-right, top-to-bottom 排列
 * - 共畫 totalDuts（= total_qty）個 DUT 格：ioPinFailItems → orange/blue；其餘 → gray
 * - 最後一頁不足容量時以 dutNo=0 灰色佔位格補滿
 */
export function buildTrayPages(
  ioPinFailItems: FailSampleItem[],
  dieResults: DieResult[],
  traySpec: TraySpec,
  totalDuts: number,
): TrayCell[][] {
  const capacity = traySpec.col_count * traySpec.row_count;
  if (capacity <= 0 || totalDuts <= 0) return [];

  const dutMap = new Map<number, FailSampleItem>();
  ioPinFailItems.forEach((item) => dutMap.set(item.dut_no, item));

  const topBalls = new Set<string>(dieResults.flatMap((d) => d.balls));

  const pages: TrayCell[][] = [];
  for (let start = 1; start <= totalDuts; start += capacity) {
    const page: TrayCell[] = [];
    for (let dutNo = start; dutNo < start + capacity; dutNo++) {
      if (dutNo <= totalDuts) {
        const dut = dutMap.get(dutNo);
        page.push({
          dutNo,
          ballName: dut?.ball_name.find((b) => b) ?? '',
          status: getCellStatus(dut, topBalls),
        });
      } else {
        page.push({ dutNo: 0, ballName: '', status: 'gray' });
      }
    }
    pages.push(page);
  }
  return pages;
}

// ── Ball 統計 ─────────────────────────────────────────────────────────────────

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
