import { Badge, Typography, Empty } from 'antd';
import { Clock } from 'lucide-react';
import useDashboardStore from '../../../stores/dashboardStore';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

const SearchHistory = () => {
  const { searchHistory, currentLotId, selectFromHistory } = useDashboardStore();

  if (searchHistory.length === 0) {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 13 }}>搜尋記錄</Text>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: tokens.colors.textMuted, fontSize: 12 }}>尚無搜尋記錄</span>}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px' }}>
      <Text style={{ color: tokens.colors.textMuted, fontSize: 13 }}>搜尋記錄</Text>
      {/*時間顯示:YYYY-MM-DD HH:mm:ss */}
      <div style={{ marginTop: 8 }}>
        {searchHistory.map((entry) => {
          const isActive = entry.lotId === currentLotId;
          const date = new Date(entry.searchedAt);
          const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          return (
            <div
              key={entry.lotId}
              role="button"
              tabIndex={0}
              onClick={() => selectFromHistory(entry.lotId)}
              onKeyDown={(e) => e.key === 'Enter' && selectFromHistory(entry.lotId)}
              style={{
                cursor: 'pointer',
                padding: '8px 10px',
                borderRadius: 6,
                marginBottom: 4,
                background: isActive ? `${tokens.colors.primary}22` : 'transparent',
                border: isActive ? `1px solid ${tokens.colors.primary}55` : '1px solid transparent',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge
                    color="#52c41a"
                    title={entry.hasAnyFail ? '有失效資料' : '正常'}
                  />
                  <Text
                    style={{
                      color: isActive ? tokens.colors.primary : tokens.colors.textPrimary,
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {entry.lotId}
                  </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} style={{ color: tokens.colors.textMuted }} />
                  <Text style={{ color: tokens.colors.textMuted, fontSize: 11 }}>{timeStr}</Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchHistory;
