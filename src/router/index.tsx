import { createBrowserRouter } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../features/auth/LoginPage';
import DashboardPage from '../features/dashboard/DashboardPage';
import NetlistUploadPage from '../features/netlist/NetlistUploadPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/dashboard', element: <DashboardPage /> },
          {
            element: <PrivateRoute allowedRoles={['engineer', 'admin']} />,
            children: [{ path: '/upload', element: <NetlistUploadPage /> }],
          },
        ],
      },
    ],
  },
]);

export default router;
