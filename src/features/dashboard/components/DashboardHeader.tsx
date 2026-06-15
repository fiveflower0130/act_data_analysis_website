import { Select, Typography, Space } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import type { HBinValue } from '../../../types/api';
import { tokens } from '../../../styles/tokens';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';

const { Text } = Typography;

const HBIN_OPTIONS: { label: string; value: HBinValue }[] = [
  { label: 'Short', value: 3 },
  { label: 'Open', value: 2 },
  { label: 'Leak', value: 4 },
  { label: 'Function', value: 5 },
];

const DashboardHeader = () => {
  const { currentHbin, currentLotId, setHbin } = useDashboardStore();
  const responsive = useResponsiveTokens();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        background: tokens.colors.surface,
        borderBottom: `1px solid ${tokens.colors.border}`,
        minHeight: 52,
      }}
    >
      <Space size={12}>
        <Text strong style={{ color: tokens.colors.textPrimary, fontSize: responsive.typography.cardTitle }}>
          Fail Mode
        </Text>
        <Select
          placeholder="選擇 Fail Mode"
          value={currentHbin ?? undefined}
          onChange={(val) => setHbin(val as HBinValue)}
          options={HBIN_OPTIONS}
          disabled={!currentLotId}
          style={{ width: responsive.isMobile ? 160 : 200 }}
        />
      </Space>

      {/* 匯出報告功能開發中，待其他圖表功能完成後啟用
      <Button
        icon={<Download size={14} />}
        disabled={!currentLotId || currentHbin === null}
        title="匯出報告（即將推出）"
      >
        匯出報告
      </Button>
      */}
    </div>
  );
};

export default DashboardHeader;
