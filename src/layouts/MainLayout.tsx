import { Layout, Avatar, Dropdown, Typography, Space } from 'antd';
import { LogOut, User, Activity } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { tokens } from '../styles/tokens';

const { Header, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogOut size={14} />,
      label: '登出',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: tokens.colors.base }}>
      {/* ── Navbar ── */}
      <Header
        style={{
          height: 64,
          padding: '0 24px',
          background: tokens.colors.surface,
          borderBottom: `1px solid ${tokens.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Space align="center" size={8}>
          <Activity size={20} color={tokens.colors.primary} strokeWidth={1.5} />
          <Text strong style={{ color: tokens.colors.textPrimary, fontSize: 18, letterSpacing: 1 }}>
            ACT Failure Analysis AI
          </Text>
        </Space>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              size={32}
              icon={<User size={16} />}
              style={{ background: tokens.colors.primary }}
            />
            <Text style={{ color: tokens.colors.textPrimary }}>
              {user?.display_name ?? user?.user_no ?? '使用者'}
            </Text>
          </Space>
        </Dropdown>
      </Header>

      {/* ── Page Content（各功能頁自行管理左右欄佈局）── */}
      <Content style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
