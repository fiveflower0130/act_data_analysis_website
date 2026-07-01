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
import type { FailSampleResult, HBinValue } from '../../src/types/api';

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
});
