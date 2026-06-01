import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// Mock API 模組（必須在 import store 之前宣告）
vi.mock('../../src/api/auth', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}));

// Mock Logger 避免 console 干擾
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import useAuthStore from '../../src/stores/authStore';
import { login as mockLogin, getMe as mockGetMe } from '../../src/api/auth';

const MOCK_TOKEN = 'mock-jwt-token-abc123';
const MOCK_USER = {
  user_no: 'E001',
  display_name: '測試用戶',
  role: 'viewer' as const,
  email: 'test@example.com',
};

describe('authStore', () => {
  beforeEach(() => {
    // 重置 store 狀態
    useAuthStore.setState({ token: null, user: null, isLoading: false });
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('登入成功：應儲存 token、user，並寫入 localStorage', async () => {
      vi.mocked(mockLogin).mockResolvedValue({
        data: { code: 200, message: 'OK', data: { access_token: MOCK_TOKEN, token_type: 'bearer' } },
      } as never);
      vi.mocked(mockGetMe).mockResolvedValue({
        data: { code: 200, message: 'OK', data: MOCK_USER },
      } as never);

      await act(async () => {
        await useAuthStore.getState().login('E001', 'correct-password');
      });

      const state = useAuthStore.getState();
      expect(state.token).toBe(MOCK_TOKEN);
      expect(state.user).toEqual(MOCK_USER);
      expect(state.isLoading).toBe(false);
      expect(localStorage.getItem('access_token')).toBe(MOCK_TOKEN);
    });

    it('API 呼叫期間 isLoading 應為 true，完成後回到 false', async () => {
      // 用受控的 Promise 讓 API「卡住」
      let rejectLogin!: (e: Error) => void;
      vi.mocked(mockLogin).mockReturnValue(
        new Promise<never>((_, e) => { rejectLogin = e; }) as never,
      );

      // 背景執行 login（不 await，故意讓它掛在 API 等待中）
      const loginPromise = useAuthStore.getState().login('E001', 'password').catch(() => {});

      // 此時 API 還在等待 → isLoading 應為 true
      expect(useAuthStore.getState().isLoading).toBe(true);

      // 模擬 API 失敗（reject），讓 store 執行 catch block 清理
      rejectLogin(new Error('cancelled'));
      await loginPromise;

      // 清理後 isLoading 應回到 false
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('登入失敗：應清除 localStorage 並拋出錯誤', async () => {
      vi.mocked(mockLogin).mockRejectedValue(new Error('401 Unauthorized'));

      await expect(
        act(async () => {
          await useAuthStore.getState().login('E001', 'wrong-password');
        })
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('應清除 token、user 並移除 localStorage', () => {
      useAuthStore.setState({ token: MOCK_TOKEN, user: MOCK_USER });
      localStorage.setItem('access_token', MOCK_TOKEN);

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  // ─── restoreSession ───────────────────────────────────────────────────────

  describe('restoreSession()', () => {
    it('有效 token：應重新取得 user 並恢復 session', async () => {
      localStorage.setItem('access_token', MOCK_TOKEN);
      vi.mocked(mockGetMe).mockResolvedValue({
        data: { code: 200, message: 'OK', data: MOCK_USER },
      } as never);

      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(MOCK_USER);
      expect(state.token).toBe(MOCK_TOKEN);
      expect(state.isLoading).toBe(false);
      expect(mockGetMe).toHaveBeenCalledOnce();
    });

    it('無 token：應直接返回，不呼叫 API', async () => {
      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });

      expect(mockGetMe).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('token 失效（API 回 401）：應清除 localStorage', async () => {
      localStorage.setItem('access_token', 'expired-token');
      vi.mocked(mockGetMe).mockRejectedValue(new Error('401 Unauthorized'));

      await act(async () => {
        await useAuthStore.getState().restoreSession();
      });

      expect(localStorage.getItem('access_token')).toBeNull();
      const state = useAuthStore.getState();
      expect(state.token).toBeNull();
      expect(state.user).toBeNull();
    });
  });
});
