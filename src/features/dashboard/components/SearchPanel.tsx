import { Input, Button, Typography, Space, Spin } from 'antd';
import { Search } from 'lucide-react';
import { useState } from 'react';
import useDashboardStore from '../../../stores/dashboardStore';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

const SearchPanel = () => {
  const [inputValue, setInputValue] = useState('');
  const { isSearching, searchError, search } = useDashboardStore();

  const handleSearch = async () => {
    if (!inputValue.trim()) return;
    await search(inputValue);
    setInputValue('');
  };

  return (
    <div style={{ padding: '16px' }}>
      <Text strong style={{ color: tokens.colors.textPrimary, fontSize: 13, letterSpacing: 0.5 }}>
        Failure Lot Search
      </Text>

      <Space.Compact style={{ width: '100%', marginTop: 10 }}>
        <Input
          prefix={<Search size={14} style={{ color: tokens.colors.textMuted }} />}
          placeholder="請輸入 Lot ID"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase())}
          onPressEnter={handleSearch}
          disabled={isSearching}
          style={{ background: tokens.colors.base, borderColor: tokens.colors.border, color: tokens.colors.textPrimary }}
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
        <Text style={{ color: tokens.colors.danger, fontSize: 12, marginTop: 6, display: 'block' }}>
          {searchError}
        </Text>
      )}
    </div>
  );
};

export default SearchPanel;
