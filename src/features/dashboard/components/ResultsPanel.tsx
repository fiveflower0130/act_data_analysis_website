import { Card, Typography, Badge } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import { HBinLabel } from '../../../types/api';
import { tokens } from '../../../styles/tokens';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { computeAnalysis } from '../utils/analysisHelpers';

const { Text, Paragraph } = Typography;

const ResultsPanel = () => {
  const { currentLotId, currentHbin, getCurrentFailSample } = useDashboardStore();
  const responsive = useResponsiveTokens();
  const failSampleData = getCurrentFailSample();

  const renderContent = () => {
    if (!currentLotId) {
      return (
        <Paragraph style={{ color: tokens.colors.textMuted, fontSize: responsive.typography.body, margin: 0 }}>
          請先搜尋 Lot ID 以查看結果分析。
        </Paragraph>
      );
    }

    if (!failSampleData || (failSampleData.total_qty ?? 0) === 0) {
      return (
        <Paragraph style={{ color: tokens.colors.textMuted, fontSize: responsive.typography.body, margin: 0 }}>
          無對應資料
        </Paragraph>
      );
    }

    const hbinLabel = currentHbin !== null ? HBinLabel[currentHbin] : '';
    const { ioFailCount, dieResults } = computeAnalysis(failSampleData.fail_sample);

    const concentrationStr = dieResults
      .map((r) => `${r.die}(${r.balls.join(', ')})`)
      .join('、');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Text style={{ color: tokens.colors.textPrimary, fontSize: responsive.typography.body, lineHeight: '1.8' }}>
          1. {failSampleData.total_qty} ea {hbinLabel} sample 中有 <span style={{ color: '#e61f8c' }}>{ioFailCount}</span> ea 為 IO pin fail.
        </Text>
        {ioFailCount > 0 && (
          <Text style={{ color: tokens.colors.textPrimary, fontSize: responsive.typography.body, lineHeight: '1.8' }}>
            2. {ioFailCount} ea 的 {hbinLabel} sample 均集中在 <span style={{ color: '#e61f8c' }}>{concentrationStr}</span>.
          </Text>
        )}
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: tokens.colors.textPrimary, fontSize: responsive.typography.contentTitle }}>
            {currentLotId ? `${currentLotId} 結果分析` : '結果分析'}
          </Text>
          {currentHbin !== null && (
            <Badge
              color={tokens.colors.primary}
              text={<span style={{ color: tokens.colors.textMuted, fontSize: responsive.typography.caption }}>Fail Mode: {HBinLabel[currentHbin]}</span>}
            />
          )}
        </div>
      }
      style={{ background: tokens.colors.surface, borderColor: tokens.colors.border, height: '100%' }}
      bodyStyle={{ padding: 16, height: 'calc(100% - 46px)', overflowY: 'auto' }}
    >
      {renderContent()}
    </Card>
  );
};

export default ResultsPanel;
