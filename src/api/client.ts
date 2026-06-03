import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import addLog from '../utils/logging';

// ─── 基本設定 ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor：自動附加 JWT ────────────────────────────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
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

// ─── Response Interceptor：統一錯誤處理 ──────────────────────────────────────

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
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? 'unknown';

    if (status === 401) {
      localStorage.removeItem('access_token');
      addLog({ level: 'warn', module: 'api', stack: ['response', '401'], msg: `未授權，已清除 token (${url})` });
      // 呼叫 authStore.logout() 以清除 Zustand state，使 PrivateRoute 重新導向 /login
      // 使用動態 import 避免 client ↔ authStore ↔ api/auth ↔ client 循環依賴
      import('../stores/authStore').then(({ default: useAuthStore }) => {
        // 僅在有登入狀態時才觸發（避免 /auth/login 本身的 401 也觸發 logout）
        if (useAuthStore.getState().token) {
          useAuthStore.getState().logout();
        }
      });
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
