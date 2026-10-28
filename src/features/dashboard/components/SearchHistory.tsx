import { useState } from 'react';
import { Typography, Empty, Button } from 'antd';
import { Clock, X, ChevronDown, ChevronUp, SearchCheck } from 'lucide-react';
import useDashboardStore from '../../../stores/dashboardStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';

const { Text } = Typography;

const VISIBLE_COUNT = 7; // 預設顯示最近幾筆

const SearchHistory = () => {
  const { searchHistory, currentLotId, selectFromHistory, removeFromHistory } = useDashboardStore();
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const [showAll, setShowAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (searchHistory.length === 0) {
    return (
      <div style={{ padding: '0 16px 16px' }}>
        <Text style={{ color: colorMode.textMuted, fontSize: 13 }}>搜尋記錄</Text>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<span style={{ color: colorMode.textMuted, fontSize: 12 }}>尚無搜尋記錄</span>}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  const visibleHistory = showAll ? searchHistory : searchHistory.slice(0, VISIBLE_COUNT);
  const hiddenCount = searchHistory.length - VISIBLE_COUNT;

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ marginTop: 8 }}>
        <Text style={{ color: colorMode.textPrimary, fontSize: responsive.typography.contentTitle, fontWeight: 600 }}>
          Search History
        </Text>
      </div>
      <div style={{ marginTop: 8 }}>
        {visibleHistory.map((entry) => {
          const isActive = entry.lotId === currentLotId;
          const isHovered = hoveredId === entry.lotId;
          const date = new Date(entry.searchedAt);
          // 使用 zh-TW 時區格式化時間，僅顯示時分秒，不顯示下午/上午
          const timeStr = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

          return (
            <div
              key={entry.lotId}
              role="button"
              tabIndex={0}
              onClick={() => selectFromHistory(entry.lotId)}
              onKeyDown={(e) => e.key === 'Enter' && selectFromHistory(entry.lotId)}
              onMouseEnter={() => setHoveredId(entry.lotId)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: 6,
                marginBottom: 4,
                background: isActive ? `${colorMode.primary}22` : isHovered ? `${colorMode.border}55` : 'transparent',
                border: isActive ? `1px solid ${colorMode.primary}55` : '1px solid transparent',
                transition: 'background 0.15s',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                {/* 左側：SearchCheck 圖示 + lotId，綠色圖示表示已搜尋記錄 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <SearchCheck
                    size={12}
                    color={colorMode.success}
                    style={{ flexShrink: 0 }}
                  />
                  <Text
                    ellipsis
                    style={{
                      color: isActive ? colorMode.primary : colorMode.textPrimary,
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      maxWidth: 110,
                    }}
                  >
                    {entry.lotId}
                  </Text>
                </div>

                {/* 右側：時間（hover 時讓出空間給刪除鈕）或刪除鈕 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {isHovered ? (
                    // hover 時顯示刪除鈕
                    <Button
                      type="text"
                      size="small"
                      icon={<X size={12} />}
                      onClick={(e) => {
                        e.stopPropagation(); // 避免觸發 selectFromHistory
                        removeFromHistory(entry.lotId);
                      }}
                      style={{
                        color: colorMode.danger,
                        padding: '0 4px',
                        height: 20,
                        minWidth: 20,
                      }}
                    />
                  ) : (
                    // 非 hover 時顯示時間
                    <>
                      <Clock size={10} style={{ color: colorMode.textMuted }} />
                      <Text style={{ color: colorMode.textMuted, fontSize: 10 }}>{timeStr}</Text>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 展開 / 收合按鈕 */}
      {searchHistory.length > VISIBLE_COUNT && (
        <Button
          type="text"
          size="small"
          icon={showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          onClick={() => setShowAll((prev) => !prev)}
          style={{
            color: colorMode.textMuted,
            fontSize: 11,
            padding: '0 4px',
            height: 24,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            marginTop: 2,
          }}
        >
          {showAll ? '收合' : `展開更多 ${hiddenCount} 筆`}
        </Button>
      )}
    </div>
  );
};

export default SearchHistory;
