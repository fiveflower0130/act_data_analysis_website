import { Card, Typography, Badge } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import { HBinLabel } from '../../../types/api';
import { tokens } from '../../../styles/tokens';

const { Text, Paragraph } = Typography;

const ResultsPanel = () => {
  const { currentLotId, currentHbin } = useDashboardStore();

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: tokens.colors.textPrimary, fontSize: 13 }}>
            {currentLotId ? `${currentLotId} 結果分析` : '結果分析'}
          </Text>
          {currentHbin !== null && (
            <Badge
              color={tokens.colors.primary}
              text={<span style={{ color: tokens.colors.textMuted, fontSize: 11 }}>Fail Mode: {HBinLabel[currentHbin]}</span>}
            />
          )}
        </div>
      }
      style={{ background: tokens.colors.surface, borderColor: tokens.colors.border, height: '100%' }}
      bodyStyle={{ padding: 16, height: 'calc(100% - 46px)', overflowY: 'auto' }}
    >
      {!currentLotId ? (
        <Paragraph style={{ color: tokens.colors.textMuted, fontSize: 12, margin: 0 }}>
          請先搜尋 Lot ID 以查看結果分析。
        </Paragraph>
      ) : (
        <Paragraph style={{ color: tokens.colors.textMuted, fontSize: 12, margin: 0 }}>
          結果分析區域尚在規劃中，待產線人員提供分析文本後更新。
        </Paragraph>
      )}
    </Card>
  );
};

export default ResultsPanel;
