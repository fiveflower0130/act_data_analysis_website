import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import addLog from '../utils/logging';
import { login as apiLogin, getMe } from '../api/auth';
import type { UserInfo } from '../types/api';

// ─── 型別 ─────────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isLoading: boolean;
  /** 執行登入（呼叫 API → 儲存 token + user） */
  login: (employeeId: string, password: string) => Promise<void>;
  /** 登出（清除 token + user） */
  logout: () => void;
  /** 以現有 token 重新取得 user 資訊（頁面重整後恢復 session） */
  restoreSession: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,

      login: async (employeeId, password) => {
        set({ isLoading: true });
        try {
          const { data } = await apiLogin({ employee_id: employeeId, password });
          localStorage.setItem('access_token', data.access_token);
          // 取得完整 UserInfo
          const { data: userInfo } = await getMe();
          set({ token: data.access_token, user: userInfo, isLoading: false });
          addLog({ level: 'info', module: 'authStore', stack: ['login'], msg: `登入成功：${userInfo.display_name}`, user: userInfo.user_no });
        } catch (err) {
          set({ isLoading: false });
          addLog({ level: 'error', module: 'authStore', stack: ['login'], msg: err });
          throw err;
        }
      },

      logout: () => {
        const user = get().user?.user_no ?? 'unknown';
        localStorage.removeItem('access_token');
        set({ token: null, user: null });
        addLog({ level: 'info', module: 'authStore', stack: ['logout'], msg: `登出：${user}`, user });
      },

      restoreSession: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        set({ isLoading: true });
        try {
          const { data } = await getMe();
          set({ token, user: data, isLoading: false });
          addLog({ level: 'debug', module: 'authStore', stack: ['restore-session'], msg: `Session 恢復：${data.display_name}`, user: data.user_no });
        } catch {
          // token 已失效
          localStorage.removeItem('access_token');
          set({ token: null, user: null, isLoading: false });
        }
      },
    }),
    {
      name: 'act-auth',
      // 只持久化 token，user 由 restoreSession 重新取得
      partialize: (state) => ({ token: state.token }),
    },
  ),
);

export default useAuthStore;
