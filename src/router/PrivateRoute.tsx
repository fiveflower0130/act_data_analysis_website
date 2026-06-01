import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

/** 已登入才能進入的路由守衛 */
const PrivateRoute = () => {
  const token = useAuthStore((s) => s.token);
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
