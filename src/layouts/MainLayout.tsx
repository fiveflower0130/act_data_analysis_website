import { useEffect } from 'react';
import { Layout, Avatar, Dropdown, Typography, Space } from 'antd';
import { LogOut, User, Activity } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { useResponsiveTokens } from '../hooks/useResponsiveTokens';
import { tokens } from '../styles/tokens';

const { Header, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const { user, token, logout, restoreSession } = useAuthStore();
  const navigate = useNavigate();
  const responsive = useResponsiveTokens();

  // 頁面重整後，token 從 localStorage 恢復但 user 為 null，重新呼叫 /me 取得使用者資訊
  useEffect(() => {
    if (token && !user) {
      restoreSession().catch(() => {
        // restoreSession 內部已處理 logout，此處靜默即可
      });
    }
  }, [token, user, restoreSession]);

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
          height: responsive.spacing.navbarHeight,
          lineHeight: `${responsive.spacing.navbarHeight}px`,
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
          <Activity size={responsive.isMobile ? 16 : 20} color={tokens.colors.primary} strokeWidth={1.5} />
          <Text strong style={{ 
              color: tokens.colors.textPrimary, 
              fontSize: responsive.typography.sectionTitle,
              letterSpacing: 1 
            }}>
            ACT Failure Analysis AI
          </Text>
        </Space>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              size={responsive.isMobile ? 28 : 32}
              icon={<User size={responsive.isMobile ? 14 : 16} />}
              style={{ background: tokens.colors.primary }}
            />
            <Text style={{ color: tokens.colors.textPrimary, fontSize: responsive.typography.body }}>
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
