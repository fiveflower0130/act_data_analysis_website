import { useMemo, useState } from 'react';
import { Card, Empty, Segmented, Spin, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import useDashboardStore from '../../../stores/dashboardStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { calcTopBalls } from '../utils/analysisHelpers';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';

const { Text } = Typography;

const COLOR_BAR_NORMAL = '#5BA4D5'; // 藍色：一般
const COLOR_BAR_TOP1   = '#F5C6A0'; // 橘色：Top 1
const COLOR_TOOLTIP_BG = '#1A2332';
const TOP_N = 10;

// ── 主元件 ──
const FailBallChart = () => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const [variant, setVariant] = useState<'io' | 'power'>('io');
  const {
    getCurrentFailSample,
    getCurrentFailSamplePower,
    failSamplePowerCache,
    isSearching,
    currentLotId,
    currentHbin,
  } = useDashboardStore();

  const failSampleData = variant === 'io'
    ? getCurrentFailSample()
    : getCurrentFailSamplePower();

  const title = `Fail Ball${currentLotId ? ` — ${currentLotId}` : ''}`;

  // 計算 Top N ball names
  const topBalls = useMemo(() => {
    if (!failSampleData) return [];
    return calcTopBalls(failSampleData.fail_sample, TOP_N);
  }, [failSampleData]);

  // ECharts 設定
  const chartOption = useMemo(() => {
    if (topBalls.length === 0) return {};

    const maxCount = Math.max(...topBalls.map((d) => d.count), 0);
    // Y 軸上限：取 total_duts 和 maxCount 中的較大值，確保所有長條都在圖表範圍內
    const yMax = Math.max(failSampleData?.total_duts ?? 0, maxCount, 1);

    return {
      backgroundColor: 'transparent',
      grid: { top: 20, bottom: 52, left: 44, right: 12 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLOR_TOOLTIP_BG,
        borderColor: '#1E3A5F',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: { name: string; dataIndex: number }[]) => {
          const p = params[0];
          const d = topBalls[p.dataIndex];
          return [
            `<b>${p.name}</b>`,
            `Count: ${d.count}`,
            `Total DUTs: ${failSampleData?.total_duts ?? 0}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        name: 'Ball Name',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: colorMode.textMuted, fontSize: 11 },
        data: topBalls.map((d) => d.ball),
        axisLine: { lineStyle: { color: colorMode.border } },
        axisTick: { lineStyle: { color: colorMode.border } },
        axisLabel: {
          color: colorMode.textSecondary,
          fontSize: topBalls.length > 6 ? 8 : 10,
          rotate: 0,   // 旋轉 30 度，避免 ball name 重疊
          interval: 0,  // 全部顯示，不跳過
        },
      },
      yAxis: {
        type: 'value',
        name: 'Fail Count (ea)',
        nameLocation: 'middle',
        nameGap: 32,
        nameTextStyle: { color: colorMode.textMuted, fontSize: 11 },
        min: 0,
        max: yMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colorMode.textSecondary,
          fontSize: 10,
          formatter: (v: number) => (Number.isInteger(v) ? `${v}` : ''), // 只顯示整數刻度
        },
        splitLine: { lineStyle: { color: colorMode.border, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: topBalls.length > 6 ? 24 : 28,
          data: topBalls.map((d) => ({
            value: d.count,
            itemStyle: {
              color: d.count === maxCount && maxCount > 0 ? COLOR_BAR_TOP1 : COLOR_BAR_NORMAL,
              borderRadius: [3, 3, 0, 0],
            },
          })),
          label: {
            show: true,
            position: 'top',
            fontSize: topBalls.length > 6 ? 8 : 10,
            color: colorMode.textSecondary,
            formatter: (p: { value: number }) => (p.value > 0 ? `${p.value}` : ''),
          },
        },
      ],
    };
  }, [topBalls, colorMode, failSampleData]);

  // ── 決定呈現狀態 ──
  const renderBody = () => {
    if (!currentLotId) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>請先搜尋 Lot ID</span>}
        />
      );
    }
    if (currentHbin === null) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>請選擇 Fail Mode</span>}
        />
      );
    }
    if (isSearching) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spin size="small" />
          <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>載入中…</Text>
        </div>
      );
    }
    if (!failSampleData) {
      // POWER：區分「從未取得（舊快取）」vs「取得後回 null（API 404）」
      const isNeverFetched =
        variant === 'power' &&
        currentLotId !== null &&
        !Object.prototype.hasOwnProperty.call(failSamplePowerCache, currentLotId);
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: colorMode.textMuted, fontSize: 12 }}>
              {isNeverFetched ? '請重新搜尋以取得 POWER 資料' : '此 Lot 尚未上傳 Netlist'}
            </span>
          }
        />
      );
    }
    if (topBalls.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>此 Fail Mode 無 Fail 資料</span>}
        />
      );
    }

    return (
      <ReactECharts
        option={chartOption}
        style={{ width: '100%', height: '100%' }}
        notMerge
      />
    );
  };

  return (
    <Card
      size="small"
      title={
        <span style={{ color: colorMode.textPrimary, fontSize: responsive.typography.contentTitle, fontWeight: 600 }}>
          {title}
        </span>
      }
      extra={
        <Segmented<'io' | 'power'>
          size="small"
          options={[
            { label: 'IO', value: 'io' },
            { label: 'POWER', value: 'power' },
          ]}
          value={variant}
          onChange={setVariant}
        />
      }
      style={{
        background: colorMode.surface,
        borderColor: colorMode.border,
        height: '100%',
      }}
      styles={{
        body: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100% - 46px)',
          overflow: 'hidden',
          padding: '8px 16px',
        },
      }}
    >
      {renderBody()}
    </Card>
  );
};

export default FailBallChart;
