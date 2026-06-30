import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Segmented, Spin, Tooltip, Typography } from 'antd';
import useDashboardStore from '../../../stores/dashboardStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { buildTrayPages, computeAnalysis } from '../utils/analysisHelpers';
import type { CellStatus, TrayCell } from '../utils/analysisHelpers';

const { Text } = Typography;

// 橘色 / 藍色與 FailBallChart 保持一致（TOP1 / NORMAL）
const CELL_COLOR: Record<CellStatus, string> = {
  orange: '#F5C6A0',   // Top Die Fail
  blue:   '#5BA4D5',   // 一般 Fail
  gray:   '#2A3F52',   // 一般（pass），接近 tray 底色
};

const CELL_LABEL: Record<CellStatus, string> = {
  orange: 'Top Die Fail',
  blue:   '一般 Fail',
  gray:   '一般',
};

// Y 軸標籤寬度（px）
const Y_LABEL_WIDTH = 12;

const FailTrayChart = () => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const [variant, setVariant] = useState<'io' | 'power'>('io');
  const [currentPage, setCurrentPage] = useState(0);

  const {
    currentLotId,
    currentHbin,
    isSearching,
    failSamplePowerCache,
    getCurrentFailSample,
    getCurrentFailSamplePower,
    fetchTraySpec,
    getTraySpec,
  } = useDashboardStore();

  const ioData = getCurrentFailSample();
  const powerData = getCurrentFailSamplePower();
  const failSampleData = variant === 'io' ? ioData : powerData;
  const testProgram = (ioData ?? powerData)?.test_program ?? null;
  const traySpec = testProgram ? getTraySpec(testProgram) : null;

  useEffect(() => {
    if (testProgram) fetchTraySpec(testProgram);
  }, [testProgram, fetchTraySpec]);

  useEffect(() => {
    setCurrentPage(0);
  }, [currentLotId, currentHbin, variant]);

  const { dieResults, ioPinFailItems } = useMemo(
    () =>
      failSampleData
        ? computeAnalysis(failSampleData.fail_sample)
        : { ioFailCount: 0, dieResults: [], ioPinFailItems: [] },
    [failSampleData],
  );

  const pages = useMemo(
    () =>
      failSampleData && traySpec
        ? buildTrayPages(
            ioPinFailItems,
            dieResults,
            traySpec,
            failSampleData.total_qty,
          )
        : [],
    [failSampleData, ioPinFailItems, dieResults, traySpec],
  );

  const safePage = Math.min(currentPage, Math.max(0, pages.length - 1));
  const cells = pages[safePage] ?? [];

  const getTooltipTitle = (cell: TrayCell) => {
    if (cell.dutNo === 0) return null;
    return (
      <div style={{ fontSize: 11 }}>
        <div><b>DUT #{cell.dutNo}</b></div>
        <div>Ball：{cell.ballName || '—'}</div>
        <div>狀態：{CELL_LABEL[cell.status]}</div>
      </div>
    );
  };

  const title = `Fail on Tray${currentLotId ? ` — ${currentLotId}` : ''}`;

  const axisTextStyle = {
    color: colorMode.textMuted,
    fontSize: 12,
    userSelect: 'none' as const,
  };

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
      const isNeverFetched =
        variant === 'power' &&
        currentLotId !== null &&
        !Object.prototype.hasOwnProperty.call(failSamplePowerCache, currentLotId);
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span style={{ color: colorMode.textMuted, fontSize: 12 }}>
              {isNeverFetched ? '請重新搜尋以取得 POWER 資料' : '此 Fail Mode 無資料'}
            </span>
          }
        />
      );
    }
    if (!traySpec) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spin size="small" />
          <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>載入 Tray 規格…</Text>
        </div>
      );
    }
    if (pages.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>無 DUT 資料</span>}
        />
      );
    }

    return (
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', paddingTop: 8, paddingRight: 8, display: 'flex', flexDirection: 'column' }}>

        {/* Grid 區：Y 軸標籤 + Tray 格子（gap 提供 row 標籤與格子的間距） */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8 }}>

          {/* Y 軸：row(N)，垂直居中、逆時針旋轉 */}
          <div
            style={{
              width: Y_LABEL_WIDTH,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                ...axisTextStyle,
                transform: 'rotate(-90deg)',
                whiteSpace: 'nowrap',
              }}
            >
              row({traySpec.row_count})
            </Text>
          </div>

          {/* Tray Grid */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: `repeat(${traySpec.col_count}, 1fr)`,
              gridTemplateRows: `repeat(${traySpec.row_count}, 1fr)`,
              gap: 2,
            }}
          >
            {cells.map((cell, i) =>
              cell.dutNo === 0 ? (
                // 超出 totalDuts 的佔位格：顯示與 pass 相同的底色
                <div
                  key={`pad-${i}`}
                  style={{ borderRadius: 2, backgroundColor: CELL_COLOR.gray }}
                />
              ) : (
                <Tooltip key={cell.dutNo} title={getTooltipTitle(cell)} mouseEnterDelay={0.1}>
                  <div
                    style={{
                      borderRadius: 2,
                      backgroundColor: CELL_COLOR[cell.status],
                      cursor: cell.status !== 'gray' ? 'pointer' : 'default',
                    }}
                  />
                </Tooltip>
              ),
            )}
          </div>
        </div>

        {/* 底部列：X 軸標籤（col(N)）+ 分頁導航（同一列） */}
        <div
          style={{
            height: 22,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            paddingTop: 4,           // col 標籤與格子間距
            paddingLeft: Y_LABEL_WIDTH + 8, // 與格子左緣對齊
          }}
        >
          {/* col 標籤：佔滿剩餘空間，置中 */}
          <Text style={{ ...axisTextStyle, flex: 1, textAlign: 'center' }}>
            col({traySpec.col_count})
          </Text>

          {/* 分頁導航（僅多頁時顯示） */}
          {pages.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Button
                type="text"
                size="small"
                disabled={safePage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
                style={{ color: colorMode.textSecondary, padding: '0 4px', minWidth: 'unset' }}
              >
                ‹
              </Button>
              <Text style={{ color: colorMode.textMuted, fontSize: 10 }}>
                {safePage + 1}/{pages.length}
              </Text>
              <Button
                type="text"
                size="small"
                disabled={safePage === pages.length - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                style={{ color: colorMode.textSecondary, padding: '0 4px', minWidth: 'unset' }}
              >
                ›
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      size="small"
      title={
        <span
          style={{
            color: colorMode.textPrimary,
            fontSize: responsive.typography.contentTitle,
            fontWeight: 600,
          }}
        >
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100% - 46px)',
          overflow: 'hidden',
          padding: '8px 12px',
        },
      }}
    >
      {renderBody()}
    </Card>
  );
};

export default FailTrayChart;
