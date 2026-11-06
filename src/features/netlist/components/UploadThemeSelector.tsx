import { Select, Typography } from 'antd';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';

const { Title } = Typography;

interface UploadThemeSelectorProps {
  value: UploadTheme;
  onChange: (theme: UploadTheme) => void;
  disabled?: boolean;
}

const UploadThemeSelector = ({ value, onChange, disabled = false }: UploadThemeSelectorProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();

  return (
    <section
      aria-label="上傳主題"
      style={{
        display: 'flex',
        flex: '0 0 auto',
        overflow: 'hidden',
        padding: 10,
        border: `1px solid ${colorMode.border}`,
        borderRadius: responsive.spacing.cardRadius,
        background: colorMode.card,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <Title level={4} style={{ margin: 0, color: colorMode.textPrimary, fontSize: responsive.typography.cardTitle, }}>
          上傳主題
        </Title>
        <Select
          aria-label="上傳主題"
          value={value}
          onChange={(nextTheme) => onChange(nextTheme as UploadTheme)}
          disabled={disabled}
          options={[
            { label: 'Fail Sample', value: 'fail-sample' },
            { label: 'Netlist', value: 'netlist' },
          ]}
          style={{
            width: '100%',
            marginTop: 10,
            background: colorMode.surface,
            borderColor: colorMode.border,
            color: colorMode.textPrimary, 
          }}
        />
      </div>
    </section>
  );
};

export default UploadThemeSelector;
