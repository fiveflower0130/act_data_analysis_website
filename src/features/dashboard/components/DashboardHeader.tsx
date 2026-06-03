import { Select, Typography, Button, Space } from 'antd';
import { Download } from 'lucide-react';
import useDashboardStore from '../../../stores/dashboardStore';
import type { HBinValue } from '../../../types/api';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

const HBIN_OPTIONS: { label: string; value: HBinValue }[] = [
  { label: 'Short (: HBIN = 3)', value: 3 },
  { label: 'Open (: HBIN = 2)', value: 2 },
  { label: 'Leak (: HBIN = 4)', value: 4 },
  { label: 'Function (: HBIN = 5)', value: 5 },
];

const DashboardHeader = () => {
  const { currentHbin, currentLotId, setHbin } = useDashboardStore();

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
        <Text strong style={{ color: tokens.colors.textPrimary, fontSize: 15 }}>
          預測分析儀表板
        </Text>
        <Select
          placeholder="選擇 Fail Mode"
          value={currentHbin ?? undefined}
          onChange={(val) => setHbin(val as HBinValue)}
          options={HBIN_OPTIONS}
          disabled={!currentLotId}
          style={{ width: 200 }}
        />
      </Space>

      <Button
        icon={<Download size={14} />}
        disabled={!currentLotId || currentHbin === null}
        title="匯出報告（即將推出）"
      >
        匯出報告
      </Button>
    </div>
  );
};

export default DashboardHeader;
