import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Spin, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import useDashboardStore from '../../../stores/dashboardStore';
import { HBinLabel } from '../../../types/api';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { getStackingDie } from '../../../api/netlist';
import type { FailSampleItem, StackingDieLayer } from '../../../types/api';

const { Text } = Typography;

// ── 配色（與 FailDieChart 一致）──
const COLOR_BAR_NORMAL = '#5BA4D5'; // 藍色：一般 Die
const COLOR_BAR_TOP1   = '#F5C6A0'; // 橘色：Fail Rate 最高的 Die
const COLOR_TOOLTIP_BG = '#1A2332';

/**
 * 計算每個 unity_no 的 Fail Rate
 * - 分子：每個 DUT 的 die_no 去重後，含該 unity 的 DUT 數量
 * - 分母：total_qty
 */
function calcFailRates(
  failSample: FailSampleItem[],
  totalQty: number,
  allUnities: string[],
): { unity: string; count: number; rate: number }[] {
  // 每個 DUT 去重後，統計各 unity 出現在幾個 DUT 中
  const dutCounts: Record<string, number> = {};
  failSample.forEach((dut) => {
    const uniqueDies = new Set(dut.die_no.filter(Boolean));
    uniqueDies.forEach((die) => {
      dutCounts[die] = (dutCounts[die] ?? 0) + 1;
    });
  });

  return allUnities.map((unity) => {
    const count = dutCounts[unity] ?? 0;
    const rate  = totalQty > 0 ? (count / totalQty) * 100 : 0;
    return { unity, count, rate };
  });
}

// ── 主元件 ──
const FailDieRateChart = () => {
  const colorMode = useThemeColors();
  const { getCurrentFailSample, isSearching, currentLotId, currentHbin } = useDashboardStore();
  const failSampleData = getCurrentFailSample();

  const [stackingLayers, setStackingLayers] = useState<StackingDieLayer[]>([]);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [layerError, setLayerError]       = useState<string | null>(null);
  const lastFetchedProgram = useRef<string | null>(null);

  const title = `Fail Die Rate${currentHbin ? ` — ${HBinLabel[currentHbin]}` : ''}`;
  // 依 test_program 取得疊層結構（快取避免重複請求）
  useEffect(() => {
    const program = failSampleData?.test_program ?? null;
    if (!program || program === lastFetchedProgram.current) return;

    lastFetchedProgram.current = program;
    setLoadingLayers(true);
    setLayerError(null);

    getStackingDie(program)
      .then((res) => setStackingLayers(res.data.data ?? []))
      .catch(() => {
        setLayerError('無法取得疊層資料');
        setStackingLayers([]);
      })
      .finally(() => setLoadingLayers(false));
  }, [failSampleData?.test_program]);

  // 換 Lot 時重置
  useEffect(() => {
    if (!currentLotId) {
      setStackingLayers([]);
      lastFetchedProgram.current = null;
    }
  }, [currentLotId]);

  // 所有 Unity（排除 Substrate），依編號升序、去重
  const allUnities = useMemo(() => {
    const seen = new Set<string>();
    return stackingLayers
      .filter((l) => !l.is_substrate)
      .map((l) => l.unity_no)
      .filter((u) => (seen.has(u) ? false : seen.add(u) && true))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
  }, [stackingLayers]);

  // 計算各 Die 的 Fail Rate
  const rateData = useMemo(() => {
    if (!failSampleData || allUnities.length === 0) return [];
    return calcFailRates(failSampleData.fail_sample, failSampleData.total_qty, allUnities);
  }, [failSampleData, allUnities]);

  // ECharts 設定
  const chartOption = useMemo(() => {
    if (rateData.length === 0) return {};

    const maxRate = Math.max(...rateData.map((d) => d.rate), 0);
    // // Y 軸上限：比最高值多 20%，至少 10%，最多 100%
    // const yMax = Math.min(100, Math.ceil((maxRate * 1.2) / 10) * 10 || 10);
    const totalQty = failSampleData?.total_qty ?? 0;

    return {
      backgroundColor: 'transparent',
      grid: { top: 20, bottom: 44, left: 52, right: 12 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLOR_TOOLTIP_BG,
        borderColor: '#1E3A5F',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: { name: string; dataIndex: number }[]) => {
          const p = params[0];
          const d = rateData[p.dataIndex];
          return [
            `<b>${p.name}</b>`,
            `Fail Rate: ${d.rate.toFixed(1)}%`,
            `Count: ${d.count} / ${totalQty}`,
          ].join('<br/>');
        },
      },
      xAxis: {
        type: 'category',
        name: 'Die Location',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: colorMode.textMuted, fontSize: 11 },
        data: rateData.map((d) => d.unity),
        axisLine: { lineStyle: { color: colorMode.border } },
        axisTick: { lineStyle: { color: colorMode.border } },
        axisLabel: { color: colorMode.textSecondary, fontSize: rateData.length > 12 ? 8 : 10 },
      },
      yAxis: {
        type: 'value',
        name: 'Fail Rate',
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: { color: colorMode.textMuted, fontSize: 11 },
        min: 0,
        max: 100,  // 固定 0~100%，不隨資料變動若要改為浮動則寫成 max: yMax
        interval: 20, // 固定每 10% 一個級距，若要改為浮動則寫成 interval: yMax / 10
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: colorMode.textSecondary,
          fontSize: rateData.length > 12 ? 8 : 10, // 字體大小隨X軸數量調整
          formatter: (v: number) => `${v}%`,
        },
        splitLine: { lineStyle: { color: colorMode.border, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: rateData.length > 12 ? 24 : 28,        // 最大寬度隨資料量調整，避免過胖
          data: rateData.map((d) => ({
            value: parseFloat(d.rate.toFixed(2)),
            itemStyle: {
              // 最高 Fail Rate（Top 1）用橘色標示，其餘用藍色
              color: d.rate === maxRate && maxRate > 0 ? COLOR_BAR_TOP1 : COLOR_BAR_NORMAL,
              borderRadius: [3, 3, 0, 0],
            },
          })),
          label: {
            show: true,
            position: 'top',
            fontSize: rateData.length > 12 ? 8 : 10, // 字體大小隨X軸數量調整
            color: colorMode.textSecondary,
            formatter: (p: { value: number }) =>
              p.value > 0 ? `${p.value.toFixed(1)}%` : '',
          },
        },
      ],
    };
  }, [rateData, colorMode, failSampleData]);

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
    if (isSearching || loadingLayers) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spin size="small" />
          <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>載入中…</Text>
        </div>
      );
    }
    if (layerError) {
      return <Text style={{ color: colorMode.danger, fontSize: 12 }}>{layerError}</Text>;
    }
    if (stackingLayers.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>此 Lot 尚未上傳 Netlist</span>}
        />
      );
    }
    if (!failSampleData || failSampleData.fail_sample.length === 0) {
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
        <span style={{ color: colorMode.textPrimary, fontSize: 13, fontWeight: 600 }}>
          {title}
          {/* {currentLotId && (
            <span style={{ color: colorMode.textMuted, fontWeight: 400, marginLeft: 8, fontSize: 11 }}>
              {currentLotId}
            </span>
          )} */}
        </span>
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

export default FailDieRateChart;
