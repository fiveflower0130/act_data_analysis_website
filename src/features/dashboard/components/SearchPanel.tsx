import { Input, Button, Typography, Space, Spin } from 'antd';
import { Search } from 'lucide-react';
import { useState } from 'react';
import useDashboardStore from '../../../stores/dashboardStore';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

const SearchPanel = () => {
  const [inputValue, setInputValue] = useState('');
  const { isSearching, searchError, search } = useDashboardStore();
  const colorMode = useThemeColors();

  const handleSearch = async () => {
    if (!inputValue.trim()) return;
    await search(inputValue);
    setInputValue('');
  };

  return (
    <div style={{ padding: '16px' }}>
      <Text strong style={{ color: colorMode.textPrimary, fontSize: 14, letterSpacing: 0.5 }}> 
        Failure Lot Search
      </Text>

      <Space.Compact style={{ width: '100%', marginTop: 10 }}>
        <Input
          prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
          placeholder="請輸入 Lot ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onPressEnter={handleSearch}
          disabled={isSearching}
          style={{ background: colorMode.base, borderColor: colorMode.border, color: colorMode.textPrimary }}
          allowClear
        />
        <Button
          type="primary"
          onClick={handleSearch}
          disabled={isSearching || !inputValue.trim()}
          icon={isSearching ? <Spin size="small" /> : null}
        >
          搜尋
        </Button>
      </Space.Compact>

      {searchError && (
        <Text style={{ color: colorMode.danger, fontSize: 12, marginTop: 6, display: 'block' }}>
          {searchError}
        </Text>
      )}
    </div>
  );
};

export default SearchPanel;
