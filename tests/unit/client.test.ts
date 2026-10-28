import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ─── Mock axios：以可呼叫的 mock instance 捕捉 request/response 攔截器 handler ──
// apiClient = axios.create(...) 回傳值，client.ts 會對它呼叫 interceptors.request/response.use()
// 將 handler 存進 handlers 陣列，測試時直接取出呼叫，不需真的發送 HTTP 請求。
const requestHandlers: Array<{ fulfilled: (c: unknown) => unknown; rejected?: (e: unknown) => unknown }> = [];
const responseHandlers: Array<{ fulfilled: (r: unknown) => unknown; rejected?: (e: unknown) => unknown }> = [];

const mockAxiosPost = vi.fn();

vi.mock('axios', () => {
  const instance: ((config: unknown) => unknown) & Record<string, unknown> = Object.assign(
    vi.fn() as any,
    {
      interceptors: {
        request: {
          use: vi.fn((fulfilled: (c: unknown) => unknown, rejected?: (e: unknown) => unknown) => {
            requestHandlers.push({ fulfilled, rejected });
          }),
        },
        response: {
          use: vi.fn((fulfilled: (r: unknown) => unknown, rejected?: (e: unknown) => unknown) => {
            responseHandlers.push({ fulfilled, rejected });
          }),
        },
      },
      defaults: {},
    },
  );

  class AxiosError extends Error {}

  return {
    default: {
      create: vi.fn(() => instance),
      post: mockAxiosPost,
      AxiosError,
    },
    AxiosError,
  };
});

vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

// forceLogout() 內以動態 import 呼叫 authStore.logout()，需 mock 避免真的觸發 store 邏輯
const mockLogout = vi.fn();
const mockGetState = vi.fn(() => ({ token: 'some-token', logout: mockLogout }));
vi.mock('../../src/stores/authStore', () => ({
  default: { getState: mockGetState },
}));

// ─── 測試輔助：組出一個含 exp 的假 JWT（header.payload.signature） ──────────────
const makeJwt = (expSecondsFromNow: number): string => {
  const payload = { exp: Math.floor(Date.now() / 1000) + expSecondsFromNow };
  return `header.${btoa(JSON.stringify(payload))}.signature`;
};

describe('api/client.ts — apiClient 攔截器', () => {
  let apiClient: (config: unknown) => unknown;

  beforeEach(async () => {
    vi.resetModules();
    requestHandlers.length = 0;
    responseHandlers.length = 0;
    mockAxiosPost.mockReset();
    mockLogout.mockReset();
    mockGetState.mockReturnValue({ token: 'some-token', logout: mockLogout });
    localStorage.clear();

    const mod = await import('../../src/api/client');
    apiClient = mod.default as unknown as (config: unknown) => unknown;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Request Interceptor ────────────────────────────────────────────────────

  describe('request interceptor', () => {
    it('無 token：不附加 Authorization header', async () => {
      const config = { headers: {}, method: 'get', url: '/api/v1/data/search' };
      const result = (await requestHandlers[0].fulfilled(config)) as { headers: Record<string, string> };
      expect(result.headers.Authorization).toBeUndefined();
    });

    it('token 尚未接近過期：直接附加 Authorization header，不觸發 refresh', async () => {
      const token = makeJwt(60 * 60); // 1 小時後過期
      localStorage.setItem('access_token', token);

      const config = { headers: {}, method: 'get', url: '/api/v1/data/search' };
      const result = (await requestHandlers[0].fulfilled(config)) as { headers: Record<string, string> };

      expect(result.headers.Authorization).toBe(`Bearer ${token}`);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('token 剩餘效期 < 5 分鐘：主動觸發 refresh 並使用新 token', async () => {
      const oldToken = makeJwt(60); // 剩 1 分鐘，觸發主動刷新
      const newToken = makeJwt(60 * 60);
      localStorage.setItem('access_token', oldToken);
      localStorage.setItem('refresh_token', 'old-refresh-token');

      mockAxiosPost.mockResolvedValue({
        data: { code: 0, message: 'OK', data: { access_token: newToken, refresh_token: 'new-refresh-token' } },
      });

      const config = { headers: {}, method: 'get', url: '/api/v1/data/search' };
      const result = (await requestHandlers[0].fulfilled(config)) as { headers: Record<string, string> };

      expect(mockAxiosPost).toHaveBeenCalledTimes(1);
      expect(result.headers.Authorization).toBe(`Bearer ${newToken}`);
      expect(localStorage.getItem('access_token')).toBe(newToken);
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    });

    it('主動刷新失敗：改用舊 token 送出（不中斷請求）', async () => {
      const oldToken = makeJwt(60);
      localStorage.setItem('access_token', oldToken);
      localStorage.setItem('refresh_token', 'old-refresh-token');
      mockAxiosPost.mockRejectedValue(new Error('refresh failed'));

      const config = { headers: {}, method: 'get', url: '/api/v1/data/search' };
      const result = (await requestHandlers[0].fulfilled(config)) as { headers: Record<string, string> };

      expect(result.headers.Authorization).toBe(`Bearer ${oldToken}`);
    });

    it('無法解析 exp（格式錯誤的 token）：視為不需刷新，直接附加原 token', async () => {
      localStorage.setItem('access_token', 'not-a-valid-jwt');

      const config = { headers: {}, method: 'get', url: '/api/v1/data/search' };
      const result = (await requestHandlers[0].fulfilled(config)) as { headers: Record<string, string> };

      expect(result.headers.Authorization).toBe('Bearer not-a-valid-jwt');
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  // ─── Response Interceptor ───────────────────────────────────────────────────

  describe('response interceptor', () => {
    it('成功回應：原樣回傳', async () => {
      const response = { status: 200, config: { url: '/api/v1/data/search' }, data: { ok: true } };
      const result = await responseHandlers[0].fulfilled(response);
      expect(result).toBe(response);
    });

    it('401 + 無 refresh_token：直接拒絕，不呼叫 refresh API', async () => {
      const error = {
        response: { status: 401 },
        config: { url: '/api/v1/auth/login', _retry: false },
      };

      await expect(responseHandlers[0].rejected!(error)).rejects.toBe(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('401 + 有 refresh_token 且刷新成功：標記 _retry 並重試原請求', async () => {
      localStorage.setItem('refresh_token', 'valid-refresh-token');
      const newToken = makeJwt(60 * 60);
      mockAxiosPost.mockResolvedValue({
        data: { code: 0, message: 'OK', data: { access_token: newToken, refresh_token: 'new-refresh-token' } },
      });
      vi.mocked(apiClient).mockResolvedValue({ status: 200, data: { retried: true } });

      const config: Record<string, unknown> = { url: '/api/v1/data/search', headers: {}, _retry: false };
      const error = { response: { status: 401 }, config };

      const result = await responseHandlers[0].rejected!(error);

      expect(config._retry).toBe(true);
      expect((config.headers as Record<string, string>).Authorization).toBe(`Bearer ${newToken}`);
      expect(apiClient).toHaveBeenCalledWith(config);
      expect(result).toEqual({ status: 200, data: { retried: true } });
    });

    it('401 + refresh 失敗：強制登出並拒絕原請求', async () => {
      localStorage.setItem('refresh_token', 'expired-refresh-token');
      localStorage.setItem('access_token', 'expired-access-token');
      mockAxiosPost.mockRejectedValue(new Error('refresh token expired'));

      const config: Record<string, unknown> = { url: '/api/v1/data/search', headers: {}, _retry: false };
      const error = { response: { status: 401 }, config };

      await expect(responseHandlers[0].rejected!(error)).rejects.toBe(error);
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      // forceLogout() 內部以動態 import 呼叫 logout()，屬於 fire-and-forget promise，需等待微任務排空
      await vi.waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    });

    it('重試後仍 401（_retry 已為 true）：強制登出，不再次呼叫 refresh', async () => {
      localStorage.setItem('access_token', 'still-bad-token');
      localStorage.setItem('refresh_token', 'still-bad-refresh');

      const config: Record<string, unknown> = { url: '/api/v1/data/search', headers: {}, _retry: true };
      const error = { response: { status: 401 }, config };

      await expect(responseHandlers[0].rejected!(error)).rejects.toBe(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    });

    it('403：不觸發 refresh/logout，僅記錄並拒絕', async () => {
      const config: Record<string, unknown> = { url: '/api/v1/users', headers: {} };
      const error = { response: { status: 403 }, config };

      await expect(responseHandlers[0].rejected!(error)).rejects.toBe(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('500：不觸發 refresh/logout，僅記錄並拒絕', async () => {
      const config: Record<string, unknown> = { url: '/api/v1/data/search', headers: {} };
      const error = { response: { status: 500 }, config };

      await expect(responseHandlers[0].rejected!(error)).rejects.toBe(error);
      expect(mockAxiosPost).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
