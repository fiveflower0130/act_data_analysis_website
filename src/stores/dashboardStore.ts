import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getFailSample, getFailSamplePower } from '../api/analysis';
import { getTray } from '../api/netlist';
import type { FailSampleResult, HBinValue, SearchHistoryEntry, TraySpec } from '../types/api';
import addLog from '../utils/logging';

const HBIN_VALUES: HBinValue[] = [2, 3, 4, 5];
const MAX_HISTORY = 30; // 最多保留 30 筆搜尋記錄

/** cache[lotId][hbin] = FailSampleResult | null（null 表示後端 404 無資料） */
type FailSampleCache = Record<string, Partial<Record<HBinValue, FailSampleResult | null>>>;

interface DashboardState {
  searchHistory: SearchHistoryEntry[];
  failSampleCache: FailSampleCache;
  failSamplePowerCache: FailSampleCache;
  traySpecCache: Record<string, TraySpec>;
  currentLotId: string | null;
  currentHbin: HBinValue | null;
  isSearching: boolean;
  searchError: string | null;
}

interface DashboardActions {
  /** 輸入 Lot ID 並搜尋，對所有 HBIN 並行取得 fail-sample（IO）與 fail-sample-power（POWER）資料後快取 */
  search: (lotId: string) => Promise<void>;
  /** 從歷史記錄點選一個 Lot，切換當前 Lot（資料從快取讀） */
  selectFromHistory: (lotId: string) => void;
  /** 刪除指定歷史記錄（同時清除 IO / POWER 快取） */
  removeFromHistory: (lotId: string) => void;
  /** 選取 Fail Mode（HBIN） */
  setHbin: (hbin: HBinValue) => void;
  clearError: () => void;
  /** 取得目前選取的 fail-sample（IO）結果（若無則 null） */
  getCurrentFailSample: () => FailSampleResult | null;
  /** 取得目前選取的 fail-sample-power（POWER）結果（若無則 null） */
  getCurrentFailSamplePower: () => FailSampleResult | null;
  /** 懶加載 Tray 規格，已快取則跳過 API 呼叫 */
  fetchTraySpec: (testProgram: string) => Promise<void>;
  /** 取得 Tray 規格（若尚未快取則 null） */
  getTraySpec: (testProgram: string) => TraySpec | null;
}

const useDashboardStore = create<DashboardState & DashboardActions>()(
  persist(
    (set, get) => ({
      searchHistory: [],
      failSampleCache: {},
      failSamplePowerCache: {},
      traySpecCache: {},
      currentLotId: null,
      currentHbin: 3 as HBinValue,
      isSearching: false,
      searchError: null,

      search: async (lotId: string) => {
        const trimmedId = lotId.trim().toUpperCase();
        if (!trimmedId) return;

        set({ isSearching: true, searchError: null });
        addLog({ level: 'info', module: 'dashboardStore', stack: ['search'], msg: `搜尋 Lot: ${trimmedId}` });

        try {
          // 對 4 個 HBIN 並行發出請求（IO + POWER 各 4 個，共 8 個）
          const [ioResults, powerResults] = await Promise.all([
            Promise.allSettled(HBIN_VALUES.map((hbin) => getFailSample(trimmedId, hbin))),
            Promise.allSettled(HBIN_VALUES.map((hbin) => getFailSamplePower(trimmedId, hbin))),
          ]);

          const hbinCache: Partial<Record<HBinValue, FailSampleResult | null>> = {};
          let hasAnyFail = false;

          ioResults.forEach((result, idx) => {
            const hbin = HBIN_VALUES[idx];
            if (result.status === 'fulfilled') {
              const data = result.value.data.data;
              hbinCache[hbin] = data;
              if (data && data.fail_sample.some((s) => s.ball_name.length > 0)) {
                hasAnyFail = true;
              }
              addLog({ level: 'info', module: 'dashboardStore', stack: ['search'], msg: `IO HBIN=${hbin} 取得 ${data?.total_duts ?? 0} 筆` });
            } else {
              hbinCache[hbin] = null;
              addLog({ level: 'warn', module: 'dashboardStore', stack: ['search'], msg: `IO HBIN=${hbin} 無資料: ${result.reason?.message}` });
            }
          });

          const powerCache: Partial<Record<HBinValue, FailSampleResult | null>> = {};

          powerResults.forEach((result, idx) => {
            const hbin = HBIN_VALUES[idx];
            if (result.status === 'fulfilled') {
              const data = result.value.data.data;
              powerCache[hbin] = data;
              addLog({ level: 'info', module: 'dashboardStore', stack: ['search'], msg: `POWER HBIN=${hbin} 取得 ${data?.total_duts ?? 0} 筆` });
            } else {
              powerCache[hbin] = null;
              addLog({ level: 'warn', module: 'dashboardStore', stack: ['search'], msg: `POWER HBIN=${hbin} 無資料: ${result.reason?.message}` });
            }
          });

          const newEntry: SearchHistoryEntry = {
            lotId: trimmedId,
            searchedAt: new Date().toISOString(),
            hasAnyFail,
          };

          set((state) => ({
            isSearching: false,
            currentLotId: trimmedId,
            failSampleCache: {
              ...state.failSampleCache,
              [trimmedId]: hbinCache,
            },
            failSamplePowerCache: {
              ...state.failSamplePowerCache,
              [trimmedId]: powerCache,
            },
            // 最新在最上方，去重後保留最新一筆，最多 MAX_HISTORY 筆
            searchHistory: [
              newEntry,
              ...state.searchHistory.filter((h) => h.lotId !== trimmedId),
            ].slice(0, MAX_HISTORY),
          }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : '搜尋失敗';
          addLog({ level: 'error', module: 'dashboardStore', stack: ['search'], msg: `搜尋錯誤: ${message}` });
          set({ isSearching: false, searchError: message });
        }
      },

      selectFromHistory: (lotId: string) => {
        set({ currentLotId: lotId, searchError: null });
        addLog({ level: 'info', module: 'dashboardStore', stack: ['selectFromHistory'], msg: `切換至歷史記錄: ${lotId}` });
      },

      removeFromHistory: (lotId: string) => {
        set((state) => {
          // 移除歷史記錄；若刪除的是當前選取項目，一併清除 currentLotId
          const newHistory = state.searchHistory.filter((h) => h.lotId !== lotId);
          const newCache = { ...state.failSampleCache };
          const newPowerCache = { ...state.failSamplePowerCache };
          delete newCache[lotId];
          delete newPowerCache[lotId];
          return {
            searchHistory: newHistory,
            failSampleCache: newCache,
            failSamplePowerCache: newPowerCache,
            currentLotId: state.currentLotId === lotId ? null : state.currentLotId,
          };
        });
        addLog({ level: 'info', module: 'dashboardStore', stack: ['removeFromHistory'], msg: `刪除歷史記錄: ${lotId}` });
      },

      setHbin: (hbin: HBinValue) => {
        set({ currentHbin: hbin });
        addLog({ level: 'info', module: 'dashboardStore', stack: ['setHbin'], msg: `選取 Fail Mode HBIN=${hbin}` });
      },

      clearError: () => set({ searchError: null }),

      getCurrentFailSample: () => {
        const { currentLotId, currentHbin, failSampleCache } = get();
        if (!currentLotId || currentHbin === null) return null;
        return failSampleCache[currentLotId]?.[currentHbin] ?? null;
      },

      getCurrentFailSamplePower: () => {
        const { currentLotId, currentHbin, failSamplePowerCache } = get();
        if (!currentLotId || currentHbin === null) return null;
        return failSamplePowerCache[currentLotId]?.[currentHbin] ?? null;
      },

      fetchTraySpec: async (testProgram: string) => {
        if (get().traySpecCache[testProgram] !== undefined) return;
        try {
          const res = await getTray(testProgram);
          const spec = res.data.data;
          if (spec) {
            set((state) => ({
              traySpecCache: { ...state.traySpecCache, [testProgram]: spec },
            }));
            addLog({ level: 'info', module: 'dashboardStore', stack: ['fetchTraySpec'], msg: `Tray 規格取得成功: ${testProgram} ${spec.col_count}×${spec.row_count}` });
          }
        } catch (err) {
          addLog({ level: 'warn', module: 'dashboardStore', stack: ['fetchTraySpec'], msg: `Tray 規格取得失敗: ${err instanceof Error ? err.message : String(err)}` });
        }
      },

      getTraySpec: (testProgram: string) => {
        return get().traySpecCache[testProgram] ?? null;
      },
    }),
    {
      name: 'dashboard-store',
      // 只持久化歷史記錄和快取，loading/error 不需要持久化
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        failSampleCache: state.failSampleCache,
        failSamplePowerCache: state.failSamplePowerCache,
        traySpecCache: state.traySpecCache,
        currentLotId: state.currentLotId,
        currentHbin: state.currentHbin,
      }),
    },
  ),
);

export default useDashboardStore;
