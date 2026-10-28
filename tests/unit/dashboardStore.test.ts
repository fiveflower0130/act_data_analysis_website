import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock API 與 Logger
vi.mock('../../src/api/analysis', () => ({
  getFailSample: vi.fn(),
  getFailSamplePower: vi.fn(),
}));
vi.mock('../../src/api/netlist', () => ({
  getTray: vi.fn(),
  getStackingDie: vi.fn(),
}));
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import useDashboardStore from '../../src/stores/dashboardStore';
import { getFailSample as mockGetFailSample, getFailSamplePower as mockGetFailSamplePower } from '../../src/api/analysis';
import { getTray as mockGetTray } from '../../src/api/netlist';
import type { FailSampleResult, HBinValue, TraySpec } from '../../src/types/api';

// ─── 測試輔助 ─────────────────────────────────────────────────────────────────

const mkResult = (hbin: HBinValue, total_duts: number): FailSampleResult => ({
  lot_id: 'TEST001',
  hbin,
  test_program: 'PGM_A',
  total_qty: total_duts + 5,
  total_duts,
  fail_sample: total_duts > 0
    ? [{ dut_no: 1, die_no: ['U7'], ball_name: ['AY10'], bond_finger: ['BF1'] }]
    : [],
});

const apiOk = (result: FailSampleResult) =>
  Promise.resolve({ data: { code: 200, message: 'OK', data: result } });

const api404 = () =>
  Promise.reject(Object.assign(new Error('Not Found'), { response: { status: 404 } }));

// ─── dashboardStore ───────────────────────────────────────────────────────────

describe('dashboardStore', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      searchHistory: [],
      failSampleCache: {},
      failSamplePowerCache: {},
      traySpecCache: {},
      currentLotId: null,
      currentHbin: 3,
      isSearching: false,
      searchError: null,
    });
    vi.clearAllMocks();
    // POWER 預設回傳空結果，避免影響 IO 相關測試（clearAllMocks 之後設定）
    vi.mocked(mockGetFailSamplePower).mockResolvedValue(
      { data: { code: 200, message: 'OK', data: null } } as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 初始狀態 ────────────────────────────────────────────────────────────────

  it('初始狀態：currentHbin 預設為 3（Short）', () => {
    const { currentHbin } = useDashboardStore.getState();
    expect(currentHbin).toBe(3);
  });

  it('初始狀態：currentLotId 為 null', () => {
    expect(useDashboardStore.getState().currentLotId).toBeNull();
  });

  // ─── setHbin ─────────────────────────────────────────────────────────────────

  describe('setHbin()', () => {
    it('應更新 currentHbin', () => {
      useDashboardStore.getState().setHbin(2);
      expect(useDashboardStore.getState().currentHbin).toBe(2);
    });
  });

  // ─── getCurrentFailSample ────────────────────────────────────────────────────

  describe('getCurrentFailSample()', () => {
    it('currentLotId 為 null → 回傳 null', () => {
      expect(useDashboardStore.getState().getCurrentFailSample()).toBeNull();
    });

    it('有快取資料 → 回傳對應 hbin 的結果', () => {
      useDashboardStore.setState({
        currentLotId: 'LOT001',
        currentHbin: 3,
        failSampleCache: { LOT001: { 3: mkResult(3, 5) } },
      });
      const result = useDashboardStore.getState().getCurrentFailSample();
      expect(result).not.toBeNull();
      expect(result?.hbin).toBe(3);
      expect(result?.total_duts).toBe(5);
    });

    it('快取中沒有對應 hbin → 回傳 null', () => {
      useDashboardStore.setState({
        currentLotId: 'LOT001',
        currentHbin: 4,
        failSampleCache: { LOT001: { 3: mkResult(3, 5) } },
      });
      expect(useDashboardStore.getState().getCurrentFailSample()).toBeNull();
    });
  });

  // ─── selectFromHistory ───────────────────────────────────────────────────────

  describe('selectFromHistory()', () => {
    it('應切換 currentLotId', () => {
      useDashboardStore.getState().selectFromHistory('LOT002');
      expect(useDashboardStore.getState().currentLotId).toBe('LOT002');
    });

    it('應清除 searchError', () => {
      useDashboardStore.setState({ searchError: '上次發生錯誤' });
      useDashboardStore.getState().selectFromHistory('LOT003');
      expect(useDashboardStore.getState().searchError).toBeNull();
    });
  });

  // ─── search ──────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('搜尋成功：快取 4 個 HBIN 結果，currentLotId 更新', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, hbin === 3 ? 10 : 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const state = useDashboardStore.getState();
      expect(state.currentLotId).toBe('TEST001');
      expect(state.isSearching).toBe(false);
      expect(state.failSampleCache['TEST001']).toBeDefined();
      expect(state.failSampleCache['TEST001'][3]?.total_duts).toBe(10);
    });

    it('Lot ID 自動轉大寫並 trim', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('  test001  ');
      });

      expect(useDashboardStore.getState().currentLotId).toBe('TEST001');
    });

    it('空字串不發出搜尋請求', async () => {
      await act(async () => {
        await useDashboardStore.getState().search('   ');
      });

      expect(mockGetFailSample).not.toHaveBeenCalled();
    });

    it('部分 HBIN 404 → 該 hbin 存 null，其餘正常快取', async () => {
      vi.mocked(mockGetFailSample).mockImplementation((_, hbin) => {
        if (hbin === 4) return api404() as never;
        return apiOk(mkResult(hbin as HBinValue, 1)) as never;
      });

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const cache = useDashboardStore.getState().failSampleCache['TEST001'];
      expect(cache[4]).toBeNull();
      expect(cache[3]).not.toBeNull();
    });

    it('搜尋完成後新增一筆歷史記錄，最新在最前', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const { searchHistory } = useDashboardStore.getState();
      expect(searchHistory.length).toBe(1);
      expect(searchHistory[0].lotId).toBe('TEST001');
    });

    it('重複搜尋同一 Lot → 歷史記錄去重，保留最新', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
        await useDashboardStore.getState().search('test001');
      });

      expect(useDashboardStore.getState().searchHistory.length).toBe(1);
    });
  });

  // ─── clearError ──────────────────────────────────────────────────────────────

  describe('clearError()', () => {
    it('應清除 searchError', () => {
      useDashboardStore.setState({ searchError: '發生錯誤' });
      useDashboardStore.getState().clearError();
      expect(useDashboardStore.getState().searchError).toBeNull();
    });
  });

  // ─── getCurrentFailSamplePower ─────────────────────────────────────────────

  describe('getCurrentFailSamplePower()', () => {
    it('currentLotId 為 null → 回傳 null', () => {
      expect(useDashboardStore.getState().getCurrentFailSamplePower()).toBeNull();
    });

    it('有快取資料 → 回傳對應 hbin 的 POWER 結果', () => {
      useDashboardStore.setState({
        currentLotId: 'LOT001',
        currentHbin: 4,
        failSamplePowerCache: { LOT001: { 4: mkResult(4, 3) } },
      });
      const result = useDashboardStore.getState().getCurrentFailSamplePower();
      expect(result).not.toBeNull();
      expect(result?.hbin).toBe(4);
      expect(result?.total_duts).toBe(3);
    });

    it('快取中沒有對應 hbin → 回傳 null', () => {
      useDashboardStore.setState({
        currentLotId: 'LOT001',
        currentHbin: 5,
        failSamplePowerCache: { LOT001: { 4: mkResult(4, 3) } },
      });
      expect(useDashboardStore.getState().getCurrentFailSamplePower()).toBeNull();
    });
  });

  // ─── search() — POWER 快取 & hasAnyFail ─────────────────────────────────────

  describe('search() — POWER 快取與 hasAnyFail', () => {
    it('IO/POWER 皆並行取得並各自快取', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 5)) as never);
      vi.mocked(mockGetFailSamplePower)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 2)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const state = useDashboardStore.getState();
      expect(state.failSampleCache['TEST001'][3]?.total_duts).toBe(5);
      expect(state.failSamplePowerCache['TEST001'][3]?.total_duts).toBe(2);
    });

    it('POWER 部分 HBIN 404 → 該 hbin 存 null，不影響其他快取', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 1)) as never);
      vi.mocked(mockGetFailSamplePower).mockImplementation((_, hbin) => {
        if (hbin === 4) return api404() as never;
        return apiOk(mkResult(hbin as HBinValue, 1)) as never;
      });

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const powerCache = useDashboardStore.getState().failSamplePowerCache['TEST001'];
      expect(powerCache[4]).toBeNull();
      expect(powerCache[3]).not.toBeNull();
    });

    it('IO 結果有 fail 樣本 → hasAnyFail 為 true', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, hbin === 3 ? 10 : 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const entry = useDashboardStore.getState().searchHistory[0];
      expect(entry.hasAnyFail).toBe(true);
    });

    it('IO 結果全無 fail 樣本 → hasAnyFail 為 false', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 0)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const entry = useDashboardStore.getState().searchHistory[0];
      expect(entry.hasAnyFail).toBe(false);
    });

    it('hasAnyFail 只看 IO 資料，即使 POWER 有 fail 也不影響', async () => {
      vi.mocked(mockGetFailSample)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 0)) as never);
      vi.mocked(mockGetFailSamplePower)
        .mockImplementation((_, hbin) => apiOk(mkResult(hbin as HBinValue, 10)) as never);

      await act(async () => {
        await useDashboardStore.getState().search('test001');
      });

      const entry = useDashboardStore.getState().searchHistory[0];
      expect(entry.hasAnyFail).toBe(false);
    });
  });

  // ─── removeFromHistory ───────────────────────────────────────────────────────

  describe('removeFromHistory()', () => {
    beforeEach(() => {
      useDashboardStore.setState({
        searchHistory: [
          { lotId: 'LOT001', searchedAt: '2026-01-01T00:00:00.000Z', hasAnyFail: true },
          { lotId: 'LOT002', searchedAt: '2026-01-02T00:00:00.000Z', hasAnyFail: false },
        ],
        failSampleCache: {
          LOT001: { 3: mkResult(3, 1) },
          LOT002: { 3: mkResult(3, 0) },
        },
        failSamplePowerCache: {
          LOT001: { 3: mkResult(3, 1) },
          LOT002: { 3: mkResult(3, 0) },
        },
        currentLotId: 'LOT001',
      });
    });

    it('應從 searchHistory 移除指定 lotId', () => {
      useDashboardStore.getState().removeFromHistory('LOT002');
      const { searchHistory } = useDashboardStore.getState();
      expect(searchHistory.map((h) => h.lotId)).toEqual(['LOT001']);
    });

    it('應同時清除 IO 與 POWER 快取', () => {
      useDashboardStore.getState().removeFromHistory('LOT002');
      const state = useDashboardStore.getState();
      expect(state.failSampleCache['LOT002']).toBeUndefined();
      expect(state.failSamplePowerCache['LOT002']).toBeUndefined();
      // 未刪除的 lotId 保留
      expect(state.failSampleCache['LOT001']).toBeDefined();
    });

    it('刪除的是目前選取的 lotId → currentLotId 重設為 null', () => {
      useDashboardStore.getState().removeFromHistory('LOT001');
      expect(useDashboardStore.getState().currentLotId).toBeNull();
    });

    it('刪除的不是目前選取的 lotId → currentLotId 維持不變', () => {
      useDashboardStore.getState().removeFromHistory('LOT002');
      expect(useDashboardStore.getState().currentLotId).toBe('LOT001');
    });
  });

  // ─── fetchTraySpec / getTraySpec ─────────────────────────────────────────────

  describe('fetchTraySpec() / getTraySpec()', () => {
    const mkSpec = (col: number, row: number): TraySpec => ({ col_count: col, row_count: row });

    it('getTraySpec：尚未快取 → 回傳 null', () => {
      expect(useDashboardStore.getState().getTraySpec('PGM_A')).toBeNull();
    });

    it('fetchTraySpec 成功 → 快取規格，getTraySpec 可取得', async () => {
      vi.mocked(mockGetTray).mockResolvedValue(
        { data: { code: 200, message: 'OK', data: mkSpec(8, 10) } } as never,
      );

      await act(async () => {
        await useDashboardStore.getState().fetchTraySpec('PGM_A');
      });

      expect(mockGetTray).toHaveBeenCalledWith('PGM_A');
      const spec = useDashboardStore.getState().getTraySpec('PGM_A');
      expect(spec).toEqual(mkSpec(8, 10));
    });

    it('已快取（即使值為 undefined 內容）→ 不重複呼叫 API', async () => {
      useDashboardStore.setState({ traySpecCache: { PGM_A: mkSpec(8, 10) } });

      await act(async () => {
        await useDashboardStore.getState().fetchTraySpec('PGM_A');
      });

      expect(mockGetTray).not.toHaveBeenCalled();
    });

    it('API 失敗 → 不拋出例外，且不寫入快取', async () => {
      vi.mocked(mockGetTray).mockRejectedValue(new Error('Network Error'));

      await act(async () => {
        await expect(useDashboardStore.getState().fetchTraySpec('PGM_B')).resolves.toBeUndefined();
      });

      expect(useDashboardStore.getState().getTraySpec('PGM_B')).toBeNull();
    });
  });
});
