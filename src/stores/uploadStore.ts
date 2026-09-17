import { create } from 'zustand';
import { getFailSampleImportList, uploadFailSampleImport } from '../api/data';
import { getNetlistPrograms, uploadNetlist } from '../api/netlist';
import useDashboardStore from './dashboardStore';
import type {
  FailSampleImportBatchSummary,
  HBinValue,
  NetlistProgram,
  NetlistUploadResult,
  FailSampleImportUploadResult,
} from '../types/api';
import addLog from '../utils/logging';

export type UploadTheme = 'netlist' | 'fail-sample';
export type UploadQueueStatus = 'pending' | 'uploading' | 'success' | 'failed';

export interface UploadQueueItem {
  id: string;
  file: File;
  fileName: string;
  status: UploadQueueStatus;
  statusCode?: number;
  errorMessage?: string;
  result?: NetlistUploadResult | FailSampleImportUploadResult;
}

export interface UploadState {
  activeTheme: UploadTheme;
  netlistPrograms: NetlistProgram[];
  failSampleImports: FailSampleImportBatchSummary[];
  uploadQueue: UploadQueueItem[];
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

export interface UploadActions {
  /** 切換上傳主題，同時清空目前佇列 */
  setActiveTheme: (theme: UploadTheme) => void;
  /** 將檔案加入上傳佇列 */
  addFiles: (files: File[] | FileList) => void;
  /** 從上傳佇列移除指定檔案 */
  removeQueueItem: (id: string) => void;
  /** 清空整個上傳佇列 */
  clearQueue: () => void;
  /** 依序送出所有待上傳檔案；已完成或失敗項目不會重試 */
  uploadAll: () => Promise<void>;
  /** 取得 Netlist 清單 */
  fetchNetlistPrograms: () => Promise<void>;
  /** 取得最新 Fail Sample Import 批次清單 */
  fetchFailSampleImports: () => Promise<void>;
  clearError: () => void;
}

const createQueueId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null) {
    const responseMessage = (
      error as { response?: { data?: { message?: unknown } } }
    ).response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage) {
      return responseMessage;
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
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

const useUploadStore = create<UploadState & UploadActions>()((set, get) => ({
  activeTheme: 'netlist',
  netlistPrograms: [],
  failSampleImports: [],
  uploadQueue: [],
  isLoading: false,
  isUploading: false,
  error: null,

  setActiveTheme: (theme) => {
    set({
      activeTheme: theme,
      uploadQueue: [],
      error: null,
    });
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['setActiveTheme'],
      msg: `切換上傳主題：${theme}，已清空上傳佇列`,
    });
  },

  addFiles: (files) => {
    const queueItems = Array.from(files).map<UploadQueueItem>((file) => ({
      id: createQueueId(),
      file,
      fileName: file.name,
      status: 'pending',
    }));

    if (queueItems.length === 0) return;

    set((state) => ({
      uploadQueue: [...state.uploadQueue, ...queueItems],
      error: null,
    }));
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['addFiles'],
      msg: `加入 ${queueItems.length} 個檔案至上傳佇列`,
    });
  },

  removeQueueItem: (id) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((item) => item.id !== id),
    }));
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['removeQueueItem'],
      msg: `從上傳佇列移除檔案：${id}`,
    });
  },

  clearQueue: () => {
    set({ uploadQueue: [] });
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['clearQueue'],
      msg: '清空上傳佇列',
    });
  },

  uploadAll: async () => {
    if (get().isUploading) return;

    const theme = get().activeTheme;
    const pendingIds = get()
      .uploadQueue
      .filter((item) => item.status === 'pending')
      .map((item) => item.id);

    if (pendingIds.length === 0) return;

    set({ isUploading: true, isLoading: true, error: null });
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['uploadAll'],
      msg: `開始批次上傳：${theme}，共 ${pendingIds.length} 個檔案`,
    });

    for (const id of pendingIds) {
      const queueItem = get().uploadQueue.find((item) => item.id === id);
      if (!queueItem || queueItem.status !== 'pending') continue;

      set((state) => ({
        uploadQueue: state.uploadQueue.map((item) =>
          item.id === id
            ? { ...item, status: 'uploading', errorMessage: undefined, statusCode: undefined }
            : item,
        ),
      }));

      try {
        if (theme === 'netlist') {
          const response = await uploadNetlist(queueItem.file);
          const result = response.data.data;
          set((state) => ({
            uploadQueue: state.uploadQueue.map((item) =>
              item.id === id
                ? { ...item, status: 'success', result: result ?? undefined }
                : item,
            ),
          }));
          addLog({
            level: 'info',
            module: 'uploadStore',
            stack: ['uploadAll', 'netlist'],
            msg: `Netlist 上傳成功：${queueItem.fileName}`,
          });
        } else {
          let payload: unknown;
          try {
            payload = JSON.parse(await readFileText(queueItem.file));
          } catch (error) {
            const message = getErrorMessage(error, 'JSON 格式錯誤，無法解析檔案');
            set((state) => ({
              uploadQueue: state.uploadQueue.map((item) =>
                item.id === id
                  ? { ...item, status: 'failed', errorMessage: message }
                  : item,
              ),
            }));
            addLog({
              level: 'warn',
              module: 'uploadStore',
              stack: ['uploadAll', 'fail-sample'],
              msg: `Fail Sample JSON 解析失敗：${queueItem.fileName}`,
            });
            continue;
          }

          const response = await uploadFailSampleImport(payload, queueItem.fileName);
          const result = response.data.data;
          set((state) => ({
            uploadQueue: state.uploadQueue.map((item) =>
              item.id === id
                ? { ...item, status: 'success', result: result ?? undefined }
                : item,
            ),
          }));
          const { lotId, hbin } = extractFailSampleLotHbin(payload);
          if (lotId) {
            useDashboardStore.getState().invalidateFailSampleCache(
              lotId,
              hbin as HBinValue | undefined,
            );
          }
          addLog({
            level: 'info',
            module: 'uploadStore',
            stack: ['uploadAll', 'fail-sample'],
            msg: `Fail Sample 上傳成功：${queueItem.fileName}`,
          });
        }
      } catch (error) {
        const statusCode = getStatusCode(error);
        const message = getErrorMessage(error, '上傳失敗');
        set((state) => ({
          uploadQueue: state.uploadQueue.map((item) =>
            item.id === id
              ? { ...item, status: 'failed', statusCode, errorMessage: message }
              : item,
          ),
        }));
        addLog({
          level: 'error',
          module: 'uploadStore',
          stack: ['uploadAll', theme],
          msg: `${queueItem.fileName} 上傳失敗${statusCode ? ` (${statusCode})` : ''}：${message}`,
        });
      }
    }

    set({ isUploading: false, isLoading: false });
    addLog({
      level: 'info',
      module: 'uploadStore',
      stack: ['uploadAll'],
      msg: `批次上傳完成：${theme}`,
    });
  },

  fetchNetlistPrograms: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getNetlistPrograms();
      set({
        netlistPrograms: response.data.data ?? [],
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, '取得 Netlist 清單失敗');
      set({ isLoading: false, error: message });
      addLog({
        level: 'error',
        module: 'uploadStore',
        stack: ['fetchNetlistPrograms'],
        msg: message,
      });
    }
  },

  fetchFailSampleImports: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFailSampleImportList({ limit: 50, offset: 0 });
      set({
        failSampleImports: response.data.data?.items ?? [],
        isLoading: false,
      });
    } catch (error) {
      const message = getErrorMessage(error, '取得 Fail Sample 清單失敗');
      set({ isLoading: false, error: message });
      addLog({
        level: 'error',
        module: 'uploadStore',
        stack: ['fetchFailSampleImports'],
        msg: message,
      });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useUploadStore;
