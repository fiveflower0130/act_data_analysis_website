import { Layout, Avatar, Dropdown, Typography, Space } from 'antd';
import { LogOut, User } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { tokens } from '../styles/tokens';

const { Header, Sider, Content } = Layout;
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
        <Text strong style={{ color: tokens.colors.textPrimary, fontSize: 18, letterSpacing: 1 }}>
          ACT Failure Analysis System
        </Text>

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

      <Layout>
        {/* ── Left Sidebar ── */}
        <Sider
          width={320}
          style={{
            background: tokens.colors.surface,
            borderRight: `1px solid ${tokens.colors.border}`,
            overflowY: 'auto',
          }}
        >
          {/* Sidebar 內容由各功能頁自行注入，目前為空 */}
        </Sider>

        {/* ── Center Content ── */}
        <Content
          style={{
            padding: 24,
            background: tokens.colors.base,
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
