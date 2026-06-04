import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AxiosError } from 'axios';
import LoginPage from '../../src/features/auth/LoginPage';
import { ApiErrorCode } from '../../src/types/api';

// Mock useAuthStore（用 vi.fn 讓各測試可用 mockReturnValue 覆蓋）
const mockLogin = vi.fn();
vi.mock('../../src/stores/authStore', () => ({
  default: vi.fn(() => ({
    login: mockLogin,
    isLoading: false,
  })),
}));
import useAuthStore from '../../src/stores/authStore';

// Mock useNavigate（保留其他 react-router-dom 功能）
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock Logger
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

/** 統一 render wrapper（提供 Router + Ant Design Provider） */
const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <ConfigProvider>
        <LoginPage />
      </ConfigProvider>
    </MemoryRouter>
  );

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 渲染 ─────────────────────────────────────────────────────────────────

  describe('渲染', () => {
    it('應顯示帳號和密碼輸入欄位', () => {
      renderLoginPage();
      expect(screen.getByPlaceholderText('輸入您的帳號')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('輸入您的密碼')).toBeInTheDocument();
    });

    it('應顯示登入按鈕', () => {
      renderLoginPage();
      expect(screen.getByRole('button', { name: /登入/i })).toBeInTheDocument();
    });

    it('應顯示系統標題', () => {
      renderLoginPage();
      expect(screen.getByText('ACT Data Analytics AI')).toBeInTheDocument();
    });

    it('預設不應顯示錯誤訊息', () => {
      renderLoginPage();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ─── 載入狀態 ─────────────────────────────────────────────────────────────

  describe('載入狀態', () => {
    it('isLoading 為 true 時：按鈕應被禁用並顯示 loading', () => {
      // 覆蓋 mock 回傳 isLoading: true（模擬 API 呼叫中）
      vi.mocked(useAuthStore).mockReturnValueOnce({ login: mockLogin, isLoading: true });
      renderLoginPage();

      const button = screen.getByRole('button', { name: /登入/i });
      expect(button).toBeDisabled();
    });
  });

  // ─── 登入成功 ─────────────────────────────────────────────────────────────

  describe('登入成功', () => {
    it('應呼叫 login 並導向 /dashboard', async () => {
      mockLogin.mockResolvedValue(undefined);
      renderLoginPage();

      await userEvent.type(screen.getByPlaceholderText('輸入您的帳號'), 'E001');
      await userEvent.type(screen.getByPlaceholderText('輸入您的密碼'), 'correct-password');
      await userEvent.click(screen.getByRole('button', { name: /登入/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('E001', 'correct-password');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
      });
    });
  });

  // ─── 登入失敗 ─────────────────────────────────────────────────────────────

  describe('登入失敗', () => {
    /** 建立帶有 response 的 AxiosError mock */
    const makeAxiosError = (status: number, code?: number): AxiosError => {
      const err = new AxiosError('request failed');
      err.response = {
        status,
        data: { code: code ?? 0, message: '', data: null },
        headers: {},
        config: {} as never,
        statusText: String(status),
      };
      return err;
    };

    it('帳號或密碼錯誤（401）→ 應顯示對應錯誤訊息，且不導向', async () => {
      mockLogin.mockRejectedValue(makeAxiosError(401, ApiErrorCode.Unauthorized));
      renderLoginPage();

      await userEvent.type(screen.getByPlaceholderText('輸入您的帳號'), 'E001');
      await userEvent.type(screen.getByPlaceholderText('輸入您的密碼'), 'wrong-password');
      await userEvent.click(screen.getByRole('button', { name: /登入/i }));

      await waitFor(() => {
        expect(screen.getByText('帳號或密碼錯誤，請再試一次。')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('LDAP 服務不可用（503 + code 1009）→ 應顯示 LDAP 服務錯誤訊息', async () => {
      mockLogin.mockRejectedValue(makeAxiosError(503, ApiErrorCode.LdapServiceError));
      renderLoginPage();

      await userEvent.type(screen.getByPlaceholderText('輸入您的帳號'), 'E001');
      await userEvent.type(screen.getByPlaceholderText('輸入您的密碼'), 'any-password');
      await userEvent.click(screen.getByRole('button', { name: /登入/i }));

      await waitFor(() => {
        expect(screen.getByText('LDAP 服務異常，請稍後再試或聯繫管理員。')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('後端服務無法連線（無 response）→ 應顯示伺服器連線錯誤訊息', async () => {
      mockLogin.mockRejectedValue(new AxiosError('Network Error'));
      renderLoginPage();

      await userEvent.type(screen.getByPlaceholderText('輸入您的帳號'), 'E001');
      await userEvent.type(screen.getByPlaceholderText('輸入您的密碼'), 'any-password');
      await userEvent.click(screen.getByRole('button', { name: /登入/i }));

      await waitFor(() => {
        expect(screen.getByText('無法連線到伺服器，請確認網路或稍後再試。')).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('送出前未填帳號：不應呼叫 login', async () => {
      renderLoginPage();

      await userEvent.click(screen.getByRole('button', { name: /登入/i }));

      await waitFor(() => {
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });
});
