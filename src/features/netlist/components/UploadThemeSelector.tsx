import { Select, Typography } from 'antd';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';

const { Text } = Typography;

interface UploadThemeSelectorProps {
  value: UploadTheme;
  onChange: (theme: UploadTheme) => void;
  disabled?: boolean;
}

const UploadThemeSelector = ({ value, onChange, disabled = false }: UploadThemeSelectorProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();

  return (
    <div>
      <Text
        strong
        style={{
          color: colorMode.textPrimary,
          fontSize: responsive.typography.cardTitle,
        }}
      >
        上傳主題
      </Text>
      <Select
        aria-label="上傳主題"
        value={value}
        onChange={(nextTheme) => onChange(nextTheme as UploadTheme)}
        disabled={disabled}
        options={[
          { label: 'Netlist', value: 'netlist' },
          { label: 'Fail Sample', value: 'fail-sample' },
        ]}
        style={{ width: '100%', marginTop: 10 }}
      />
    </div>
  );
};

export default UploadThemeSelector;
