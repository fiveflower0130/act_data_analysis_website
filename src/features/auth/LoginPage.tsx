import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { tokens } from '../../styles/tokens';

const { Title, Text } = Typography;

interface LoginFormValues {
  user_no: string;
  password: string;
}

const LoginPage = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null);
    try {
      await login(values.user_no, values.password);
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMsg('帳號或密碼錯誤，請再試一次。');
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
          width: 420,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: tokens.spacing.cardRadius,
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
