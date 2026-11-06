import { Button, Empty, Typography } from 'antd';
import { Check, Clock3, FileText, LoaderCircle, X } from 'lucide-react';
import type { UploadQueueItem, UploadQueueStatus } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

interface UploadQueueTableProps {
  items: UploadQueueItem[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const statusMeta = (status: UploadQueueStatus, statusCode: number | undefined, colors: ReturnType<typeof useThemeColors>) => {
  if (status === 'pending') {
    return { label: '待上傳', color: colors.textSecondary, background: colors.border, icon: <Clock3 size={13} /> };
  }
  if (status === 'uploading') {
    return { label: '上傳中', color: colors.primary, background: `${colors.primary}22`, icon: <LoaderCircle size={13} /> };
  }
  if (status === 'success') {
    return { label: '匯入成功', color: colors.success, background: colors.successBg, icon: <Check size={13} /> };
  }
  return {
    label: statusCode ? `失敗（${statusCode}）` : '失敗',
    color: colors.danger,
    background: colors.dangerBg,
    icon: <X size={13} />,
  };
};

const UploadQueueTable = ({ items, onRemove, disabled = false }: UploadQueueTableProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();

  if (items.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={<span style={{ color: colorMode.textMuted }}>尚未選擇檔案</span>}
        style={{ margin: '32px 0' }}
      />
    );
  }

  return (
    <div>
      {items.map((item) => {
        const meta = statusMeta(item.status, item.statusCode, colorMode);
        return (
          <div
            key={item.id}
            style={{
              display: 'block',
              padding: '8px 12px',
              marginBottom: 8,
              border: `1px solid ${colorMode.border}`,
              borderRadius: 8,
              background: colorMode.surface,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <FileText size={14} color={colorMode.primary} style={{ flexShrink: 0 }} />
              <Text
                title={item.fileName}
                style={{
                  color: colorMode.textPrimary,
                  fontSize: responsive.typography.body,
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'normal',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
              >
                {item.fileName}
              </Text>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  padding: '3px 9px',
                  borderRadius: 12,
                  color: meta.color,
                  background: meta.background,
                  fontSize: responsive.typography.caption,
                }}
              >
                {meta.icon}
                {meta.label}
              </span>
              {(item.status === 'pending' || item.status === 'failed' || item.status === 'success') && (
                <Button
                  type="text"
                  size="small"
                  icon={<X size={14} />}
                  aria-label={`移除 ${item.fileName}`}
                  onClick={() => onRemove(item.id)}
                  disabled={disabled}
                  style={{ color: colorMode.textMuted, flexShrink: 0 }}
                />
              )}
            </div>
            {item.status === 'uploading' && (
              <div
                aria-label={`${item.fileName} 上傳進度`}
                style={{
                  height: 5,
                  margin: '8px 0 0 22px',
                  overflow: 'hidden',
                  borderRadius: 999,
                  background: colorMode.border,
                }}
              >
                <div
                  style={{
                    width: `${item.progress ?? 0}%`,
                    height: '100%',
                    background: colorMode.primary,
                    transition: 'width 0.15s ease',
                  }}
                />
              </div>
            )}
            {item.errorMessage && (
              <Text
                style={{
                  display: 'block',
                  color: colorMode.danger,
                  fontSize: responsive.typography.caption,
                  margin: '5px 28px 0 22px',
                }}
              >
                {item.errorMessage}
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UploadQueueTable;
