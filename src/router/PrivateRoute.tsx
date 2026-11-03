import { Spin } from 'antd';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import type { UserRole } from '../types/api';

interface PrivateRouteProps {
  /** 有設定時，只有指定角色可以進入；未授權角色導向 Dashboard */
  allowedRoles?: UserRole[];
}

/** 已登入才能進入的路由守衛，可選擇性限制角色 */
const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    if (token && allowedRoles && !user && !isLoading) {
      void restoreSession();
    }
  }, [allowedRoles, isLoading, restoreSession, token, user]);

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles) {
    if (!user || isLoading) {
      return (
        <div style={{ display: 'grid', minHeight: '100%', placeItems: 'center' }}>
          <Spin />
        </div>
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
