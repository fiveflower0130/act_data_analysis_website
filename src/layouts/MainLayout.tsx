import { useEffect } from 'react';
import { Layout, Avatar, Dropdown, Typography, Space, Tooltip } from 'antd';
import { LogOut, User, Activity, Sun, Moon } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useThemeStore from '../stores/themeStore';
import { useResponsiveTokens } from '../hooks/useResponsiveTokens';
import { useThemeColors } from '../hooks/useThemeColors';

const { Header, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const { user, token, logout, restoreSession } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const responsive = useResponsiveTokens();
  const colorMode = useThemeColors();

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
    <Layout style={{ minHeight: '100vh', background: colorMode.base }}>
      {/* ── Navbar ── */}
      <Header
        style={{
          height: responsive.spacing.navbarHeight,
          lineHeight: `${responsive.spacing.navbarHeight}px`,
          padding: '0 24px',
          background: colorMode.surface,
          borderBottom: `1px solid ${colorMode.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Space align="center" size={8}>
          <Activity size={responsive.isMobile ? 16 : 20} color={colorMode.primary} strokeWidth={1.5} />
          <Text strong style={{ 
              color: colorMode.textPrimary, 
              fontSize: responsive.typography.sectionTitle,
              letterSpacing: 1 
            }}>
            ACT Failure Analysis AI
          </Text>
        </Space>

        <Space size={12} align="center">
          {/* Light / Dark 切換 : Light時裡面底會是深色字是白色*/}
          <Tooltip 
            title={mode === 'dark' ? '切換淺色模式' : '切換深色模式'}
            color={mode === 'dark' ? colorMode.base : colorMode.surface}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={toggleTheme}
              onKeyDown={(e) => e.key === 'Enter' && toggleTheme()}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: 6,
                color: colorMode.textPrimary,
                transition: 'color 0.2s, background 0.2s',
              }}
            >
              {mode === 'dark'
                ? <Sun size={responsive.isMobile ? 16 : 18} />
                : <Moon size={responsive.isMobile ? 16 : 18} />}
            </div>
          </Tooltip>

          {/* 使用者選單 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar
                size={responsive.isMobile ? 28 : 32}
                icon={<User size={responsive.isMobile ? 14 : 16} />}
                style={{ background: colorMode.primary }}
              />
              <Text style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body }}>
                {user?.display_name ?? user?.user_no ?? '使用者'}
              </Text>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      {/* ── Page Content（各功能頁自行管理左右欄佈局）── */}
      <Content style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;

