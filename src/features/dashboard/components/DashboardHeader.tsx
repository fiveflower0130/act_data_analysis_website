import { Select, Typography, Button, Space } from 'antd';
import { Download } from 'lucide-react';
import useDashboardStore from '../../../stores/dashboardStore';
import type { HBinValue } from '../../../types/api';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

const HBIN_OPTIONS: { label: string; value: HBinValue }[] = [
  { label: 'Short', value: 3 },
  { label: 'Open', value: 2 },
  { label: 'Leak', value: 4 },
  { label: 'Function', value: 5 },
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
          Fail Mode
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
