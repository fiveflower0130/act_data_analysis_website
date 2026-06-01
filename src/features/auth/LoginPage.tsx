import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { tokens } from '../../styles/tokens';

const { Title, Text } = Typography;

interface LoginFormValues {
  employee_id: string;
  password: string;
}

const LoginPage = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setErrorMsg(null);
    try {
      await login(values.employee_id, values.password);
      navigate('/dashboard', { replace: true });
    } catch {
      setErrorMsg('工號或密碼錯誤，請再試一次。');
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
          width: 400,
          background: tokens.colors.surface,
          border: `1px solid ${tokens.colors.border}`,
          borderRadius: tokens.spacing.cardRadius,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ color: tokens.colors.textPrimary, marginBottom: 4 }}>
            ACT Failure Analysis
          </Title>
          <Text style={{ color: tokens.colors.textMuted }}>請使用工號與密碼登入</Text>
        </div>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit} disabled={isLoading}>
          <Form.Item
            label={<Text style={{ color: tokens.colors.textSecondary }}>工號</Text>}
            name="employee_id"
            rules={[{ required: true, message: '請輸入工號' }]}
          >
            <Input placeholder="請輸入工號" size="large" autoComplete="username" />
          </Form.Item>

          <Form.Item
            label={<Text style={{ color: tokens.colors.textSecondary }}>密碼</Text>}
            name="password"
            rules={[{ required: true, message: '請輸入密碼' }]}
          >
            <Input.Password placeholder="請輸入密碼" size="large" autoComplete="current-password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isLoading}
            >
              登入
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
