import { Card, Typography } from 'antd';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

interface PlaceholderChartProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PlaceholderChart = ({ title, subtitle, icon }: PlaceholderChartProps) => {
  const colorMode = useThemeColors();
  return (
  <Card
    size="small"
    title={
      <span style={{ color: colorMode.textPrimary, fontSize: 13 }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
        {title}
      </span>
    }
    style={{ background: colorMode.surface, borderColor: colorMode.border, height: '100%' }}
    bodyStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 46px)' }}
  >
    <div style={{ textAlign: 'center' }}>
      <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>
        {subtitle ?? '功能開發中，即將推出'}
      </Text>
    </div>
  </Card>
  );
};

export default PlaceholderChart;
