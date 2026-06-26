import type { ReactNode } from 'react';
import { Card, Typography, Badge } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import { HBinLabel } from '../../../types/api';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { computeAnalysis, calcTopBalls } from '../utils/analysisHelpers';

const { Text, Paragraph } = Typography;

const HIGHLIGHT = '#e61f8c';

const ResultsPanel = () => {
  const { currentLotId, currentHbin, getCurrentFailSample, getCurrentFailSamplePower } = useDashboardStore();
  const responsive = useResponsiveTokens();
  const colorMode = useThemeColors();
  const failSampleData = getCurrentFailSample();
  const failSamplePowerData = getCurrentFailSamplePower();

  const renderContent = () => {
    if (!currentLotId) {
      return (
        <Paragraph style={{ color: colorMode.textMuted, fontSize: responsive.typography.body, margin: 0 }}>
          請先搜尋 Lot ID 以查看結果分析。
        </Paragraph>
      );
    }

    if (!failSampleData || (failSampleData.total_qty ?? 0) === 0) {
      return (
        <Paragraph style={{ color: colorMode.textMuted, fontSize: responsive.typography.body, margin: 0 }}>
          無對應 IO 資料
        </Paragraph>
      );
    }

    const hbinLabel = currentHbin !== null ? HBinLabel[currentHbin] : '';
    const { ioFailCount, dieResults } = computeAnalysis(failSampleData.fail_sample);

    const concentrationStr = dieResults
      .map((r) => `${r.die} (${r.balls.join(', ')})`)
      .join('、');

    // POWER 分析（null 時以 0 呈現）
    const powerTotalQty = failSamplePowerData?.total_qty ?? 0;
    const powerFailCount = failSamplePowerData !== null
      ? computeAnalysis(failSamplePowerData.fail_sample).ioFailCount
      : 0;

    // Top 3 Power Fail Ball（僅在 powerFailCount > 0 時計算）
    const topPowerBalls = failSamplePowerData !== null && powerFailCount > 0
      ? calcTopBalls(failSamplePowerData.fail_sample, 3).map((b) => b.ball)
      : [];

    // 動態建立顯示項目，編號依顯示順序連續
    const items: { key: string; content: ReactNode }[] = [];

    // 項目 1：IO pin fail 數量（一律顯示）
    items.push({
      key: 'io-count',
      content: (
        <>
          {failSampleData.total_qty} ea {hbinLabel} sample 中有{' '}
          <span style={{ color: HIGHLIGHT }}>{ioFailCount}</span> ea 為 IO pin fail.
        </>
      ),
    });

    // 項目 2：Power pin fail 數量（一律顯示，與項目 1 邏輯相同）
    items.push({
      key: 'power-count',
      content: (
        <>
          {powerTotalQty} ea {hbinLabel} sample 中有{' '}
          <span style={{ color: HIGHLIGHT }}>{powerFailCount}</span> ea 為 Power pin fail.
        </>
      ),
    });

    // 項目 3：IO pin 集中位置（ioFailCount > 0 才顯示）
    if (ioFailCount > 0) {
      items.push({
        key: 'io-concentration',
        content: (
          <>
            {ioFailCount} ea IO pin 的 {hbinLabel} sample 均集中在{' '}
            <span style={{ color: HIGHLIGHT }}>{concentrationStr}</span>.
          </>
        ),
      });
    }

    // 項目 4：Top 3 Power Fail Ball（powerFailCount > 0 才顯示）
    if (powerFailCount > 0 && topPowerBalls.length > 0) {
      items.push({
        key: 'power-top3',
        content: (
          <>
            Power pin fail 的 Top 3 Fail Ball :{' '}
            <span style={{ color: HIGHLIGHT }}>{topPowerBalls.join(', ')}</span>.
          </>
        ),
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <Text
            key={item.key}
            style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body, lineHeight: '1.8' }}
          >
            {i + 1}. {item.content}
          </Text>
        ))}
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10}}>
          <Text style={{ color: colorMode.textPrimary, fontSize: responsive.typography.contentTitle }}>
            {currentLotId && currentHbin !== null ? `${currentLotId} — ${HBinLabel[currentHbin]} 結果分析` : '結果分析'}
          </Text>
          {/* {currentHbin !== null && (
            <Badge
              color={colorMode.primary}
              text={<span style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>Fail Mode: {HBinLabel[currentHbin]}</span>}
            />
          )} */}
        </div>
      }
      style={{ background: colorMode.surface, borderColor: colorMode.border, height: '100%' }}
      bodyStyle={{ padding: 16, height: 'calc(100% - 46px)', overflowY: 'auto' }}
    >
      {renderContent()}
    </Card>
  );
};

export default ResultsPanel;
