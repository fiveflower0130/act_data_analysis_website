import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../../src/router/PrivateRoute';
import type { UserRole } from '../../src/types/api';

// Mock useAuthStore（用 vi.fn 讓各測試可覆蓋回傳值）
const mockUseAuthStore = vi.fn();
interface MockAuthState {
  token: string | null;
  user?: { role: UserRole };
  isLoading?: boolean;
  restoreSession?: () => Promise<void>;
}

vi.mock('../../src/stores/authStore', () => ({
  default: (selector: (state: MockAuthState) => unknown) =>
    mockUseAuthStore(selector),
}));

/** 統一 render wrapper：/protected 為受保護路由，/login 為登入頁 */
const renderPrivateRoute = (initialPath = '/protected') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/protected" element={<div>受保護內容</div>} />
        </Route>
        <Route path="/login" element={<div>登入頁</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('PrivateRoute', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReset();
  });

  it('token 存在 → 渲染 <Outlet />（受保護內容）', () => {
    mockUseAuthStore.mockImplementation((selector) => selector({ token: 'valid-token' }));
    renderPrivateRoute();
    expect(screen.getByText('受保護內容')).toBeInTheDocument();
  });

  it('token 為 null → 重導向至 /login', () => {
    mockUseAuthStore.mockImplementation((selector) => selector({ token: null }));
    renderPrivateRoute();
    expect(screen.getByText('登入頁')).toBeInTheDocument();
    expect(screen.queryByText('受保護內容')).not.toBeInTheDocument();
  });

  it('allowedRoles 包含使用者角色 → 渲染受限內容', () => {
    const state: MockAuthState = {
      token: 'valid-token',
      user: { role: 'engineer' },
      isLoading: false,
      restoreSession: vi.fn(),
    };
    mockUseAuthStore.mockImplementation((selector) => selector(state));

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route element={<PrivateRoute allowedRoles={['engineer', 'admin']} />}>
            <Route path="/upload" element={<div>上傳內容</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('上傳內容')).toBeInTheDocument();
  });

  it('使用者角色不在 allowedRoles → 導向 Dashboard', () => {
    const state: MockAuthState = {
      token: 'valid-token',
      user: { role: 'viewer' },
      isLoading: false,
      restoreSession: vi.fn(),
    };
    mockUseAuthStore.mockImplementation((selector) => selector(state));

    render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route element={<PrivateRoute allowedRoles={['engineer', 'admin']} />}>
            <Route path="/upload" element={<div>上傳內容</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('上傳內容')).not.toBeInTheDocument();
  });
});
