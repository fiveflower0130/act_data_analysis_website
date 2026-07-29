import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../../src/router/PrivateRoute';

// Mock useAuthStore（用 vi.fn 讓各測試可覆蓋回傳值）
const mockUseAuthStore = vi.fn();
vi.mock('../../src/stores/authStore', () => ({
  default: (selector: (state: { token: string | null }) => unknown) =>
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
});
