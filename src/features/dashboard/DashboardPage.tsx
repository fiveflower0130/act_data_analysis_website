import { Divider } from 'antd';
import SearchPanel from './components/SearchPanel';
import SearchHistory from './components/SearchHistory';
import DashboardHeader from './components/DashboardHeader';
import FailSampleList from './components/FailSampleList';
import PlaceholderChart from './components/PlaceholderChart';
import FailDieChart from './components/FailDieChart';
import ResultsPanel from './components/ResultsPanel';
import { useResponsiveTokens } from '../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../hooks/useThemeColors';

const DashboardPage = () => {
  const responsive = useResponsiveTokens();
  const colorMode = useThemeColors();

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', minWidth: 800 }}>
      {/* ── 左功能欄（響應式寬度）── */}
      <div
        style={{
          width: responsive.spacing.sidebarWidth,
          flexShrink: 0,
          background: colorMode.surface,
          borderRight: `1px solid ${colorMode.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <SearchPanel />
        <Divider style={{ margin: '0 16px', borderColor: colorMode.border, minWidth: 'unset', width: 'unset' }} />
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <SearchHistory />
        </div>
      </div>

      {/* ── 右功能欄（填滿剩餘，最小寬度跟隨響應式 sidebar）── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: colorMode.base,
        }}
      >
        {/* Fail Mode 下拉 */}
        <DashboardHeader />
        {/* 結果摘要（響應式高度）與上層間距12px */}
        <div
          style={{
            height: responsive.spacing.resultsHeight,
            flexShrink: 0,
            padding: '12px 12px 0px',
          }}
        >
          <ResultsPanel />
        </div>

        {/* 主內容區：左 FailSampleList（全高）+ 右 2×2 圖表 */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            padding: 12, //
            display: 'flex',
            gap: 12, 
          }}
        >
          {/* 左欄：Fail Sample List（固定 30%，全高）*/}
          <div style={{ width: '25%', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <FailSampleList />
          </div>

          {/* 右欄：2×2 圖表格 */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 12,
              overflow: 'hidden',
            }}
          >
            <PlaceholderChart title="Fail Sample on Tray" subtitle="Tray 排列圖，功能開發中" />
            <FailDieChart />
            <PlaceholderChart title="Fail Ball" subtitle="BGA Ball 分佈直方圖，功能開發中" />
            <PlaceholderChart title="Fail Die Rate" subtitle="各層 Die 失效率，功能開發中" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
