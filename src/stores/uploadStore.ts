import { create } from 'zustand';
import {
  getFailSampleImportList,
  getFailSampleImportRows,
  uploadFailSampleImport,
} from '../api/data';
import {
  getBinName,
  getBinPriority,
  getDieMapping,
  getNetlistConnections,
  getNetlistPrograms,
  getNetlistSheets,
  getStackingDie,
  getTestSpec,
  getTray,
  uploadNetlist,
} from '../api/netlist';
import { getApiErrorCode, getApiErrorMessage } from '../api/client';
import useDashboardStore from './dashboardStore';
import type {
  FailSampleImportBatchSummary,
  FailSampleImportListParams,
  FailSampleImportRowsParams,
  FailSampleImportRowsResponse,
  HBinValue,
  NetlistConnection,
  NetlistProgram,
  NetlistSheetInfo,
  NetlistSheetName,
  NetlistUploadResult,
  StackingDieLayer,
  TraySpec,
  FailSampleImportUploadResult,
} from '../types/api';
import addLog from '../utils/logging';
import {
  validateUploadFile,
  type UploadFileValidation,
} from '../features/netlist/utils/uploadValidation';
import { resolveDieUnity } from '../features/netlist/utils/previewHelpers';

export type UploadTheme = 'netlist' | 'fail-sample';
export type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'failed';

export type NetlistSheetRow = Record<string, unknown>;

export interface NetlistSheetPayload {
  rows: NetlistSheetRow[];
  total: number;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  status: UploadQueueStatus;
  progress?: number;
  statusCode?: number;
  apiCode?: number;
  errorMessage?: string;
  result?: NetlistUploadResult | FailSampleImportUploadResult;
}

export type UploadQueues = Record<UploadTheme, UploadQueueItem[]>;
export type UploadingByTopic = Record<UploadTheme, boolean>;

export interface UploadState {
  activeTheme: UploadTheme;
  queues: UploadQueues;
  netlistPrograms: NetlistProgram[];
  failSampleImports: FailSampleImportBatchSummary[];
  failSampleTotal: number;
  failSampleQuery: FailSampleImportListParams;
  netlistSheetCache: Record<string, Partial<Record<NetlistSheetName, NetlistSheetPayload>>>;
  netlistSheetMetaCache: Record<string, NetlistSheetInfo[]>;
  failSampleRowsCache: Record<string, FailSampleImportRowsResponse>;
  isLoading: boolean;
  isUploading: boolean;
  uploadingByTopic: UploadingByTopic;
  error: string | null;
}

export interface UploadActions {
  /** 切換主題；各主題的佇列與上傳狀態彼此獨立保留 */
  setActiveTheme: (theme: UploadTheme) => void;
  /** 將檔案加入目前主題佇列；檔名或大小不符會以失敗項目保留 */
  addFiles: (files: File[] | FileList) => void;
  removeQueueItem: (id: string) => void;
  /** 清空目前主題的成功、待上傳與失敗項目；進行中的項目不會被中斷 */
  clearQueue: () => void;
  /** 以並行工作者送出目前主題全部 pending 項目 */
  uploadAll: () => Promise<void>;
  fetchNetlistPrograms: () => Promise<void>;
  fetchFailSampleImports: (params?: FailSampleImportListParams) => Promise<void>;
  fetchFailSampleRows: (
    batchId: string,
    params?: FailSampleImportRowsParams,
  ) => Promise<FailSampleImportRowsResponse>;
  fetchNetlistSheets: (testProgram: string) => Promise<NetlistSheetInfo[]>;
  fetchNetlistSheet: (
    testProgram: string,
    sheet: NetlistSheetName,
  ) => Promise<NetlistSheetPayload>;
  clearNetlistSheetCache: (testProgram: string) => void;
  clearError: () => void;
}

const UPLOAD_CONCURRENCY = 3;

const createQueueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getStatusCode = (error: unknown) => {
  if (typeof error !== 'object' || error === null) return undefined;
  const status = (error as { response?: { status?: unknown } }).response?.status;
  return typeof status === 'number' ? status : undefined;
};

const readFileText = async (file: File): Promise<string> => {
  if (typeof file.text === 'function') return file.text();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('檔案讀取失敗'));
    reader.readAsText(file);
  });
};

const extractFailSampleLotHbin = (
  payload: unknown,
): { lotId?: string; hbin?: number } => {
  if (typeof payload !== 'object' || payload === null) return {};

  const obj = payload as Record<string, unknown>;
  const inner =
    typeof obj.data === 'object' && obj.data !== null && typeof obj.test_program !== 'string'
      ? (obj.data as Record<string, unknown>)
      : obj;
  const lotId = typeof inner.lot_id === 'string' ? inner.lot_id : undefined;
  const hbin = typeof inner.hbin === 'number' ? inner.hbin : undefined;
  return { lotId, hbin };
};

const createQueues = (): UploadQueues => ({
  netlist: [],
  'fail-sample': [],
});

const createUploadingByTopic = (): UploadingByTopic => ({
  netlist: false,
  'fail-sample': false,
});

const getFailSampleRowsCacheKey = (
  batchId: string,
  params: FailSampleImportRowsParams,
) => {
  const normalized = {
    sites: [...(params.sites ?? [])].sort(),
    q: params.q?.trim() ?? '',
    sort_by: params.sort_by ?? 'site',
    sort_order: params.sort_order ?? 'asc',
    page: params.page ?? 1,
    page_size: params.page_size ?? 100,
  };
  return `${batchId}:${JSON.stringify(normalized)}`;
};

const getUploadValidationMessage = (validation: UploadFileValidation) => {
  if (validation.valid) return undefined;
  return `失敗：${validation.message}`;
};

const updateQueueItem = (
  state: UploadState,
  theme: UploadTheme,
  id: string,
  update: Partial<UploadQueueItem>,
) => ({
  queues: {
    ...state.queues,
    [theme]: state.queues[theme].map((item) =>
      item.id === id ? { ...item, ...update } : item,
    ),
  },
});

const useUploadStore = create<UploadState & UploadActions>()((set, get) => ({
  activeTheme: 'fail-sample',
  queues: createQueues(),
  netlistPrograms: [],
  failSampleImports: [],
  failSampleTotal: 0,
  failSampleQuery: { limit: 10, offset: 0 },
  netlistSheetCache: {},
  netlistSheetMetaCache: {},
  failSampleRowsCache: {},
  isLoading: false,
  isUploading: false,
  uploadingByTopic: createUploadingByTopic(),
  error: null,

  setActiveTheme: (theme) => {
    set({ activeTheme: theme, error: null });
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['setActiveTheme'],
      msg: `切換上傳主題：${theme}，保留各主題佇列`,
    });
  },

  addFiles: (files) => {
    const theme = get().activeTheme;
    const queueItems = Array.from(files)
      .map<UploadQueueItem | null>((file) => {
        const validation = validateUploadFile(theme, file);
        if (!validation.valid && validation.reason === 'extension') return null;

        return {
          id: createQueueId(),
          file,
          fileName: file.name,
          status: validation.valid ? 'pending' : 'failed',
          errorMessage: getUploadValidationMessage(validation),
        };
      })
      .filter((item): item is UploadQueueItem => item !== null);

    if (queueItems.length === 0) return;

    set((state) => ({
      queues: {
        ...state.queues,
        [theme]: [...state.queues[theme], ...queueItems],
      },
      error: null,
    }));
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['addFiles'],
      msg: `加入 ${queueItems.length} 個 ${theme} 檔案至上傳佇列`,
    });
  },

  removeQueueItem: (id) => {
    const theme = get().activeTheme;
    set((state) => ({
      queues: {
        ...state.queues,
        [theme]: state.queues[theme].filter(
          (item) => item.id !== id || item.status === 'uploading',
        ),
      },
    }));
  },

  clearQueue: () => {
    const theme = get().activeTheme;
    set((state) => ({
      queues: {
        ...state.queues,
        [theme]: state.queues[theme].filter((item) => item.status === 'uploading'),
      },
    }));
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['clearQueue'],
      msg: `清空 ${theme} 上傳佇列（保留進行中項目）`,
    });
  },

  uploadAll: async () => {
    const theme = get().activeTheme;
    if (get().uploadingByTopic[theme]) return;

    const pendingIds = get()
      .queues[theme]
      .filter((item) => item.status === 'pending')
      .map((item) => item.id);
    if (pendingIds.length === 0) return;

    set((state) => ({
      isUploading: true,
      isLoading: true,
      error: null,
      uploadingByTopic: { ...state.uploadingByTopic, [theme]: true },
    }));

    const uploadOne = async (id: string) => {
      const queueItem = get().queues[theme].find((item) => item.id === id);
      if (!queueItem || queueItem.status !== 'pending') return;

      set((state) => ({
        ...updateQueueItem(state, theme, id, {
          status: 'uploading',
          progress: 0,
          errorMessage: undefined,
          statusCode: undefined,
          apiCode: undefined,
        }),
      }));

      const onUploadProgress = (event: { loaded: number; total?: number }) => {
        const total = event.total;
        if (!total) return;
        set((state) => ({
          ...updateQueueItem(state, theme, id, {
            progress: Math.min(100, Math.round((event.loaded / total) * 100)),
          }),
        }));
      };

      try {
        if (theme === 'netlist') {
          const response = await uploadNetlist(queueItem.file, onUploadProgress);
          const result = response.data.data;
          set((state) => ({
            ...updateQueueItem(state, theme, id, {
              status: 'success',
              progress: 100,
              result: result ?? undefined,
            }),
          }));
          if (result?.test_program) {
            get().clearNetlistSheetCache(result.test_program);
          }
        } else {
          let payload: unknown;
          try {
            payload = JSON.parse(await readFileText(queueItem.file));
          } catch (error) {
            set((state) => ({
              ...updateQueueItem(state, theme, id, {
                status: 'failed',
                errorMessage: `失敗：${getApiErrorMessage(error, 'JSON 格式錯誤，無法解析檔案')}`,
              }),
            }));
            return;
          }

          const response = await uploadFailSampleImport(
            payload,
            queueItem.fileName,
            onUploadProgress,
          );
          const result = response.data.data;
          set((state) => ({
            ...updateQueueItem(state, theme, id, {
              status: 'success',
              progress: 100,
              result: result ?? undefined,
            }),
          }));
          const { lotId, hbin } = extractFailSampleLotHbin(payload);
          if (lotId) {
            useDashboardStore.getState().invalidateFailSampleCache(
              lotId,
              hbin as HBinValue | undefined,
            );
          }
        }
      } catch (error) {
        const statusCode = getStatusCode(error);
        set((state) => ({
          ...updateQueueItem(state, theme, id, {
            status: 'failed',
            apiCode: getApiErrorCode(error),
            statusCode,
            errorMessage: `失敗：${getApiErrorMessage(error, '上傳失敗')}`,
          }),
        }));
      }
    };

    let cursor = 0;
    const worker = async () => {
      while (cursor < pendingIds.length) {
        const currentIndex = cursor;
        cursor += 1;
        await uploadOne(pendingIds[currentIndex]);
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(UPLOAD_CONCURRENCY, pendingIds.length) },
          () => worker(),
        ),
      );
    } finally {
      set((state) => {
        const uploadingByTopic = {
          ...state.uploadingByTopic,
          [theme]: false,
        };
        return {
          uploadingByTopic,
          isUploading: Object.values(uploadingByTopic).some(Boolean),
          isLoading: false,
        };
      });
    }

    if (theme === 'netlist') {
      await get().fetchNetlistPrograms();
    } else {
      await get().fetchFailSampleImports(get().failSampleQuery);
    }
  },

  fetchNetlistPrograms: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getNetlistPrograms();
      const programs = response.data.data ?? [];
      set({ netlistPrograms: programs, isLoading: false });
    } catch (error) {
      const message = getApiErrorMessage(error, '取得 Netlist 清單失敗');
      set({ isLoading: false, error: message });
      addLog({
        level: 'error',
        module: 'uploadStore',
        stack: ['fetchNetlistPrograms'],
        msg: message,
      });
    }
  },

  fetchFailSampleImports: async (params = {}) => {
    const query: FailSampleImportListParams = {
      limit: 10,
      offset: 0,
      ...params,
    };
    set({ isLoading: true, error: null, failSampleQuery: query });
    try {
      const response = await getFailSampleImportList(query);
      const data = response.data.data;
      set({
        failSampleImports: data?.items ?? [],
        failSampleTotal: data?.total ?? 0,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, '取得 Fail Sample 清單失敗');
      set({ isLoading: false, error: message });
      addLog({
        level: 'error',
        module: 'uploadStore',
        stack: ['fetchFailSampleImports'],
        msg: message,
      });
    }
  },

  fetchFailSampleRows: async (batchId, params = {}) => {
    const query: FailSampleImportRowsParams = {
      sort_by: 'site',
      sort_order: 'asc',
      page: 1,
      page_size: 100,
      ...params,
    };
    const cacheKey = getFailSampleRowsCacheKey(batchId, query);
    const cached = get().failSampleRowsCache[cacheKey];
    if (cached) return cached;

    const response = await getFailSampleImportRows(batchId, query);
    const data = response.data.data;
    if (!data) throw new Error('Fail Sample 明細回應為空');

    set((state) => ({
      failSampleRowsCache: {
        ...state.failSampleRowsCache,
        [cacheKey]: data,
      },
    }));
    return data;
  },

  fetchNetlistSheets: async (testProgram) => {
    const cached = get().netlistSheetMetaCache[testProgram];
    if (cached) return cached;

    const response = await getNetlistSheets(testProgram);
    const sheets = response.data.data ?? [];
    set((state) => ({
      netlistSheetMetaCache: {
        ...state.netlistSheetMetaCache,
        [testProgram]: sheets,
      },
    }));
    return sheets;
  },

  fetchNetlistSheet: async (testProgram, sheet) => {
    const cached = get().netlistSheetCache[testProgram]?.[sheet];
    if (cached) return cached;

    let payload: NetlistSheetPayload;
    switch (sheet) {
      case 'Netlist': {
        const [connectionsResponse, mappingResponse] = await Promise.all([
          getNetlistConnections(testProgram),
          getDieMapping(testProgram),
        ]);
        const connections = connectionsResponse.data.data ?? [];
        const mapping = mappingResponse.data.data ?? [];
        const rows = connections.map((row: NetlistConnection) => ({
          package_pin: row.package_pin,
          bond_finger: row.bond_finger,
          die_pin: row.die_pin_raw ?? row.die_pin,
          die_unity: resolveDieUnity(row.die_pin_raw, row.die_pin, mapping),
          net_name: row.net_name,
        }));
        payload = { rows, total: rows.length };
        break;
      }
      case 'Test_Spec': {
        const response = await getTestSpec(testProgram);
        const rows = response.data.data ?? [];
        payload = { rows: rows as unknown as NetlistSheetRow[], total: rows.length };
        break;
      }
      case 'Bin_Priority': {
        const response = await getBinPriority(testProgram);
        const rows = response.data.data ?? [];
        payload = { rows: rows as unknown as NetlistSheetRow[], total: rows.length };
        break;
      }
      case 'Bin_Name': {
        const response = await getBinName(testProgram);
        const rows = response.data.data ?? [];
        payload = { rows: rows as unknown as NetlistSheetRow[], total: rows.length };
        break;
      }
      case 'Stacking_Die': {
        const response = await getStackingDie(testProgram);
        const rows = (response.data.data ?? []).map((row: StackingDieLayer) => ({
          layer: row.layer_no,
          unity: row.unity_no,
          is_substrate: row.is_substrate,
        }));
        payload = { rows, total: rows.length };
        break;
      }
      case 'Tray': {
        const response = await getTray(testProgram);
        const row = response.data.data as TraySpec | null;
        const rows = row
          ? [{ column: row.col_count, row: row.row_count }]
          : [];
        payload = { rows, total: rows.length };
        break;
      }
      default:
        throw new Error(`Unsupported netlist sheet: ${sheet satisfies never}`);
    }

    set((state) => ({
      netlistSheetCache: {
        ...state.netlistSheetCache,
        [testProgram]: {
          ...state.netlistSheetCache[testProgram],
          [sheet]: payload,
        },
      },
    }));
    return payload;
  },

  clearNetlistSheetCache: (testProgram) => {
    set((state) => {
      const netlistSheetCache = { ...state.netlistSheetCache };
      const netlistSheetMetaCache = { ...state.netlistSheetMetaCache };
      delete netlistSheetCache[testProgram];
      delete netlistSheetMetaCache[testProgram];
      return { netlistSheetCache, netlistSheetMetaCache };
    });
  },

  clearError: () => set({ error: null }),
}));

export default useUploadStore;
