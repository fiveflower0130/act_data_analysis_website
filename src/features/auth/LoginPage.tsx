import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import useAuthStore from '../../stores/authStore';
import { tokens } from '../../styles/tokens';
import { useResponsiveTokens } from '../../hooks/useResponsiveTokens';
import { ApiErrorCode } from '../../types/api';
import type { ApiResponse } from '../../types/api';
import addLog from '../../utils/logging';

const { Title, Text } = Typography;

interface LoginFormValues {
  user_no: string;
  password: string;
}

const LoginPage = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const responsive = useResponsiveTokens();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null);
    try {
      await login(values.user_no, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiResponse<unknown>>;

      if (!axiosErr.response) {
        // 完全沒有收到回應 → 後端服務無法連線
        setErrorMsg('無法連線到伺服器，請確認網路或稍後再試。');
      } else {
        const apiCode = axiosErr.response.data?.code;
        addLog({ level: 'error', module: 'handleSubmit', stack: ['loginPage'], msg: `登入失敗 apiCode: ${apiCode}`, user: values.user_no,});
        if (apiCode === ApiErrorCode.LdapServiceError) {
          // HTTP 503 + code=1009：LDAP 服務不可用（非帳密問題）
          setErrorMsg('LDAP 服務異常，請稍後再試或聯繫管理員。');
        } else {
          // 401 / 422 / 其他 → 帳號或密碼錯誤
          setErrorMsg('帳號或密碼錯誤，請再試一次。');
        }
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: tokens.colors.base,
      }}
    >
      <Card
        style={{
          width: responsive.isMobile ? '90vw' : 420,
          maxWidth: 420,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: responsive.spacing.cardRadius,
          padding: '8px 4px',
        }}
      >
        {/* Logo + 標題 */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Activity
            size={48}
            color={tokens.colors.primary}
            strokeWidth={1.5}
            style={{ marginBottom: 12 }}
          />
          <Title level={3} style={{ color: tokens.colors.textPrimary, marginBottom: 4, marginTop: 0 }}>
            ACT Data Analytics AI
          </Title>
          <Text style={{ color: tokens.colors.textMuted }}>5920 智慧分析系統</Text>
        </div>

        <div style={{ borderTop: `1px solid ${tokens.colors.border}`, marginBottom: 24 }} />

        {errorMsg && (
          <Alert
            title={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          disabled={isLoading}
          requiredMark={false}
        >
          <Form.Item
            label={<Text style={{ color: tokens.colors.textSecondary }}>帳號 / Username</Text>}
            name="user_no"
            rules={[{ required: true, message: '請輸入帳號' }]}
          >
            <Input
              size="large"
              placeholder="輸入您的帳號"
              autoComplete="username"
              prefix={
                <img
                  src="/user.png"
                  alt="user"
                  style={{ width: 16, height: 16, opacity: 0.5 }}
                />
              }
            />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: tokens.colors.textSecondary }}>密碼 / Password</Text>}
            name="password"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password
              size="large"
              placeholder="輸入您的密碼"
              autoComplete="current-password"
              prefix={
                <img
                  src="/lock.png"
                  alt="lock"
                  style={{ width: 16, height: 16, opacity: 0.5 }}
                />
              }
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
            >
              登入 Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
