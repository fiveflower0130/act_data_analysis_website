import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import addLog from '../utils/logging';
import type { ApiResponse, RefreshResponse } from '../types/api';

// ─── 基本設定 ─────────────────────────────────────────────────────────────────

// 開發模式：不設 BASE_URL，讓請求走 Vite proxy（/api → localhost:8001）
// 生產模式：透過 VITE_API_BASE_URL 環境變數指定後端位址
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Refresh Token 並發控制 ────────────────────────────────────────────────────

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

/** 通知所有等待中的請求（refresh 完成後呼叫） */
const notifyPending = (error: unknown, token: string | null = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
};

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

/** 解析 JWT payload 取得 exp 時間戳（ms），解析失敗回傳 null */
const getTokenExpiryMs = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * 呼叫 /auth/refresh 換取新 token，更新 localStorage。
 * 使用原生 axios（非 apiClient）避免攔截器循環呼叫。
 */
const doRefresh = async (): Promise<string> => {
  const storedRefreshToken = localStorage.getItem('refresh_token');
  if (!storedRefreshToken) throw new Error('no_refresh_token');

  const { data } = await axios.post<ApiResponse<RefreshResponse>>(
    `${BASE_URL}/api/v1/auth/refresh`,
    { refresh_token: storedRefreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30_000 },
  );

  const newAccess = data.data!.access_token;
  const newRefresh = data.data!.refresh_token;
  localStorage.setItem('access_token', newAccess);
  localStorage.setItem('refresh_token', newRefresh);
  addLog({ level: 'info', module: 'api', stack: ['token-refresh'], msg: 'access_token 更新成功' });
  return newAccess;
};

/**
 * 觸發 token refresh，並發請求共用同一次 refresh（避免重複呼叫）。
 * 其他請求在 isRefreshing=true 時會排入 pendingQueue 等待結果。
 */
const triggerRefresh = async (): Promise<string> => {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const newToken = await doRefresh();
    notifyPending(null, newToken);
    return newToken;
  } catch (err) {
    notifyPending(err);
    throw err;
  } finally {
    isRefreshing = false;
  }
};

/** 強制登出：清除兩個 token 並通知 Zustand（動態 import 避免循環依賴） */
const forceLogout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  import('../stores/authStore').then(({ default: useAuthStore }) => {
    if (useAuthStore.getState().token) {
      useAuthStore.getState().logout();
    }
  });
};

// ─── Request Interceptor：自動附加 JWT + 主動刷新 ─────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token = localStorage.getItem('access_token');

    if (token) {
      // 主動刷新：access_token 剩餘有效期 < 5 分鐘時，先換新 token
      const expiryMs = getTokenExpiryMs(token);
      if (expiryMs !== null && expiryMs - Date.now() < 5 * 60 * 1000) {
        try {
          token = await triggerRefresh();
        } catch {
          // 主動刷新失敗：仍用舊 token 送出，401 response interceptor 再做最後處理
          token = localStorage.getItem('access_token') ?? token;
        }
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    addLog({
      level: 'debug',
      module: 'api',
      stack: ['request'],
      msg: `${config.method?.toUpperCase()} ${config.url}`,
    });

    return config;
  },
  (error: AxiosError) => {
    addLog({ level: 'error', module: 'api', stack: ['request'], msg: error });
    return Promise.reject(error);
  },
);

// ─── Response Interceptor：401 被動刷新 + 重試 ───────────────────────────────

apiClient.interceptors.response.use(
  (response) => {
    addLog({
      level: 'debug',
      module: 'api',
      stack: ['response'],
      msg: `${response.status} ${response.config.url}`,
    });
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? 'unknown';
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (status === 401 && !config._retry) {
      // 首次 401：若有 refresh_token，嘗試換新 access token 後重試原請求
      // 若無 refresh_token（例如 login 本身失敗），直接拒絕，不做無效的 refresh 請求
      if (!localStorage.getItem('refresh_token')) {
        return Promise.reject(error);
      }
      config._retry = true;
      try {
        const newToken = await triggerRefresh();
        config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(config);
      } catch {
        addLog({
          level: 'warn',
          module: 'api',
          stack: ['response', '401'],
          msg: `Token refresh 失敗，強制登出 (${url})`,
        });
        forceLogout();
        return Promise.reject(error);
      }
    } else if (status === 401 && config._retry) {
      // 重試後仍 401（refresh token 已失效或帳號停用）→ 強制登出
      addLog({ level: 'warn', module: 'api', stack: ['response', '401'], msg: `重試請求仍 401，強制登出 (${url})`});
      forceLogout();
    } else if (status === 403) {
      addLog({ level: 'warn', module: 'api', stack: ['response', '403'], msg: `權限不足 (${url})` });
    } else if (status && status >= 500) {
      addLog({ level: 'error', module: 'api', stack: ['response', String(status)], msg: `伺服器錯誤 (${url})` });
    } else {
      addLog({ level: 'error', module: 'api', stack: ['response'], msg: error.message });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
