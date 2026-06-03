import { Card, Typography } from 'antd';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

interface PlaceholderChartProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PlaceholderChart = ({ title, subtitle, icon }: PlaceholderChartProps) => (
  <Card
    size="small"
    title={
      <span style={{ color: tokens.colors.textPrimary, fontSize: 13 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {title}
      </span>
    }
    style={{ background: tokens.colors.surface, borderColor: tokens.colors.border, height: '100%' }}
    bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 46px)' }}
  >
    <div style={{ textAlign: 'center' }}>
      <Text style={{ color: tokens.colors.textMuted, fontSize: 12 }}>
        {subtitle ?? '功能開發中，即將推出'}
      </Text>
    </div>
  </Card>
);

export default PlaceholderChart;
