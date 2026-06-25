import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Spin, Empty, Tooltip } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { getStackingDie } from '../../../api/netlist';
import type { StackingDieLayer } from '../../../types/api';

const { Text } = Typography;

// ── 配色（參考產線習慣用色）──
const COLOR_FAIL   = '#F5C6A0'; // 橘色：Top 1 失效 Die
const COLOR_NORMAL = '#C5DCF0'; // 藍色：正常 Die
const COLOR_SUBSTRATE = '#5BAD6F'; // 綠色：Substrate
const COLOR_TEXT_DARK = '#1A2332';

/** 從 fail_sample 計算各 Unity 出現次數 */
function calcDieFailCounts(failSample: { die_no: string[] }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  failSample.forEach((dut) => {
    dut.die_no.forEach((die) => {
      if (die) counts[die] = (counts[die] ?? 0) + 1;
    });
  });
  return counts;
}

/** 找出出現次數最多的 Die（可能多個並列） */
function findTopFailDies(counts: Record<string, number>): string[] {
  const entries = Object.entries(counts);
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, v]) => v));
  return entries.filter(([, v]) => v === max).map(([k]) => k);
}

// ── 單一 Die 方塊 ──
interface DieLayerBlockProps {
  unityNo: string;
  isSubstrate: boolean;
  isFailing: boolean;
  failCount: number;
  totalWidth: number;
  layerIndex: number;   // 0 = top of stack
  totalLayers: number;  // Substrate 不計
  dieCountInRow?: number;    // 同一層有幾個 Die（用於平均分配寬度）
  ballNamesForDie?: string[]; // 此 Die 對應各 Unity 中出現次數最多的 Ball Name
}

const DieLayerBlock = ({
  unityNo,
  isSubstrate,
  isFailing,
  failCount,
  totalWidth,
  layerIndex,
  totalLayers: _totalLayers,
  dieCountInRow = 1,
  ballNamesForDie = [],
}: DieLayerBlockProps) => {
  // Die 層依同排數量平均分配空間（含間距預留），Substrate 較寬以視覺呈現底座效果
  const DIE_ROW_GAP = 32; // 同層 Die 之間的水平間距（需與 row div 的 gap 一致）
  const rowRatio   = isSubstrate ? 1.5 : 1.2;
  const gapTotal   = isSubstrate ? 0 : (dieCountInRow - 1) * DIE_ROW_GAP;
  const blockWidth = (totalWidth * rowRatio - gapTotal) / dieCountInRow;
  const bgColor = isSubstrate ? COLOR_SUBSTRATE : isFailing ? COLOR_FAIL : COLOR_NORMAL;
  const height = isSubstrate ? 26 : 18;
  const border = isFailing
    ? '1.5px solid #D4783A'
    : isSubstrate
      ? '1px solid #3B8A4E'
      : '1px solid #9BBAD4';

  const label = isSubstrate ? 'Substrate' : unityNo;

  // 左右交錯偏移：偶數層（0,2,4...）向右，奇數層（1,3,5...）向左
  const isOddLayer = layerIndex % 2 === 1;
  const offsetAmount = 10; // 偏移距離 px，可調整
  const horizontalOffset = isOddLayer ? -offsetAmount : offsetAmount;

  return (
    <Tooltip
      title={
        `${label}${isFailing ? `：失效 ${failCount} 次` : ''}${ballNamesForDie.length > 0 ? `（集中： ${ballNamesForDie.join('、')}）` : ''}`
      }
      color={COLOR_TEXT_DARK}
      placement="right"
    >
      <div
        style={{
          width: blockWidth,
          height,
          background: bgColor,
          border,
          borderRadius: isSubstrate ? 3 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          position: 'relative',
          flexShrink: 0,
          boxShadow: isFailing
            ? '0 0 6px rgba(213,107,42,0.45)'
            : '0 1px 3px rgba(0,0,0,0.12)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          // ✅ 只有 Die 層才偏移，Substrate 不偏移
          transform: isSubstrate ? 'translateX(0)' : `translateX(${horizontalOffset}px)`,
        }}
      >
        <Text
          style={{
            fontSize: isSubstrate ? 12 : 11,
            fontWeight: isFailing ? 700 : 500,
            color: COLOR_TEXT_DARK,
            letterSpacing: 0.5,
            userSelect: 'none',
          }}
        >
          {label}
        </Text>
      </div>
    </Tooltip>
  );
};

// ── 主元件 ──
const FailDieChart = () => {
  const colorMode = useThemeColors();
  const { getCurrentFailSample, isSearching, currentLotId, currentHbin } = useDashboardStore();
  const failSampleData = getCurrentFailSample();

  // 容器寬度（方塊寬度計算用）
  const [containerWidth, setContainerWidth] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);

  const [layers, setLayers] = useState<StackingDieLayer[]>([]);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [layerError, setLayerError] = useState<string | null>(null);
  const lastFetchedProgram = useRef<string | null>(null);

  // 量測容器寬度
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    observer.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, []);

  // 依 test_program 取得疊層結構（快取避免重複請求）
  useEffect(() => {
    const program = failSampleData?.test_program ?? null;
    if (!program || program === lastFetchedProgram.current) return;

    lastFetchedProgram.current = program;
    setLoadingLayers(true);
    setLayerError(null);

    getStackingDie(program)
      .then((res) => {
        setLayers(res.data.data ?? []);
      })
      .catch(() => {
        setLayerError('無法取得疊層資料');
        setLayers([]);
      })
      .finally(() => setLoadingLayers(false));
  }, [failSampleData?.test_program]);

  // 換 Lot 時重置
  useEffect(() => {
    if (!currentLotId) {
      setLayers([]);
      lastFetchedProgram.current = null;
    }
  }, [currentLotId]);

  const failCounts = useMemo(
    () => (failSampleData ? calcDieFailCounts(failSampleData.fail_sample) : {}),
    [failSampleData],
  );

  const topFailDies = useMemo(() => findTopFailDies(failCounts), [failCounts]);

  /**
   * 建立 die_no → ball_name[] 對應表（Ball Name需先處理並只取出現次數最多的）
   * 如果同一 Die 對應多個 Ball Name，則以出現次數最多的為主（可能有並列），避免 tooltip 顯示過長難以閱讀
   */
  const dieToBallNames = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    failSampleData?.fail_sample.forEach((dut) => {
      dut.die_no.forEach((die, i) => {
        if (!die) return;
        if (!map[die]) map[die] = {};
        const ball = dut.ball_name[i];
        if (ball) map[die][ball] = (map[die][ball] ?? 0) + 1;
      });
    });
    // 只保留出現次數最多的 Ball Name
    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([die, ballCounts]) => {
      const maxCount = Math.max(...Object.values(ballCounts));
      result[die] = Object.entries(ballCounts)
        .filter(([, count]) => count === maxCount)
        .map(([ball]) => ball);
    });
    return result;
  }, [failSampleData]);

  // 將層次排序：layer_no 越小 = 物理越高 → 顯示在上方；Substrate 最底
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => a.layer_no - b.layer_no),
    [layers],
  );

  const substrate = sortedLayers.find((l) => l.is_substrate);

  /**
   * 依 layer_no 分組，每組內依 Unity 編號升序排列（U1 → U2 → U3）
   * 結果陣列依 layer_no 升序（物理上層在前）
   */
  const groupedLayers = useMemo(() => {
    const nonSubstrate = sortedLayers.filter((l) => !l.is_substrate);
    const map = new Map<number, typeof nonSubstrate>();
    nonSubstrate.forEach((l) => {
      const group = map.get(l.layer_no) ?? [];
      group.push(l);
      map.set(l.layer_no, group);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([layerNo, dies]) => ({
        layerNo,
        dies: [...dies].sort(
          (a, b) =>
            parseInt(a.unity_no.replace(/\D/g, ''), 10) -
            parseInt(b.unity_no.replace(/\D/g, ''), 10),
        ),
      }));
  }, [sortedLayers]);

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
    if (sortedLayers.length === 0) {
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

    // ── 繪製疊層圖 ──
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
        {/* Top 1 資訊列 */}
        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, background: COLOR_FAIL, border: '1px solid #D4783A', borderRadius: 2, flexShrink: 0 }} />
          <Text style={{ color: colorMode.textPrimary, fontSize: 11 }}>
            Top 1：{topFailDies.length > 0 ? topFailDies.join('、') : '—'}
            {topFailDies.length > 0 && failCounts[topFailDies[0]] != null
              ? `（失效 ${failCounts[topFailDies[0]]} 次）`
              : ''}
          </Text>
        </div>

        {/* 疊層方塊（上→下 = 物理高→低） gap是層與層之間間距、同層左右間距*/}
        <div
          ref={containerRef}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
        >
          {groupedLayers.map(({ layerNo, dies }, groupIdx) => (
            // 同一 layer_no 的 Die 橫向並排，依 Unity 編號升序
            <div
              key={layerNo}
              style={{ display: 'flex', flexDirection: 'row', gap: 32, justifyContent: 'center' }}
            >
              {dies.map((layer) => (
                <DieLayerBlock
                  key={layer.unity_no}
                  unityNo={layer.unity_no}
                  isSubstrate={false}
                  isFailing={topFailDies.includes(layer.unity_no)}
                  failCount={failCounts[layer.unity_no] ?? 0}
                  totalWidth={containerWidth}
                  layerIndex={groupIdx}
                  totalLayers={groupedLayers.length}
                  dieCountInRow={dies.length}
                  ballNamesForDie={dieToBallNames[layer.unity_no] ?? []}
                />
              ))}
            </div>
          ))}
          {substrate && (
            <DieLayerBlock
              key="substrate"
              unityNo={substrate.unity_no}
              isSubstrate
              isFailing={false}
              failCount={0}
              totalWidth={containerWidth}
              layerIndex={groupedLayers.length}
              totalLayers={groupedLayers.length}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      /*卡片標題*/
      size="small"
      title={
        <span style={{ color: colorMode.textPrimary, fontSize: 13, fontWeight: 600 }}>
          Top 1 Fail Die
        </span>
      }
      /*卡片外框*/
      style={{ 
        background: colorMode.surface,
        borderColor: colorMode.border,
        height: '100%',
      }}
      /*卡片內容區域*/
      styles={{
        body: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100% - 46px)',
          overflow: 'hidden',
          padding: '8px 16px', //
        },
      }}
    >
      {renderBody()}
    </Card>
  );
};

export default FailDieChart;
