import { Alert, Badge, Button, Divider, Drawer, Space, Typography } from 'antd';
import { Trash2, UploadCloud, X } from 'lucide-react';
import { useState } from 'react';
import type { UploadQueueItem } from '../../../stores/uploadStore';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';
import UploadDropzone from './UploadDropzone';
import UploadQueueTable from './UploadQueueTable';

const { Text, Title } = Typography;

const NETLIST_WARNING =
  '同一 test_program 上傳將直接覆蓋舊版本，相關快取資料將一併清除。送出後失敗不提供重試，請重新選擇檔案再次上傳。';
const FAIL_SAMPLE_WARNING =
  '重複上傳同一批資料將建立獨立新批次，不會自動去重清除舊資料，請避免重複上傳。送出後失敗不提供重試，請重新選擇檔案再次上傳。';

interface UploadDrawerProps {
  open: boolean;
  theme: UploadTheme;
  queue: UploadQueueItem[];
  isUploading: boolean;
  error: string | null;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
  onInvalidFiles: (fileNames: string[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onUploadAll: () => void;
  onClearError: () => void;
}

const UploadDrawer = ({
  open,
  theme,
  queue,
  isUploading,
  error,
  onClose,
  onFilesSelected,
  onInvalidFiles,
  onRemove,
  onClear,
  onUploadAll,
  onClearError,
}: UploadDrawerProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const isNetlist = theme === 'netlist';
  const pendingCount = queue.filter((item) => item.status === 'pending').length;
  const clearableCount = queue.filter((item) => item.status !== 'uploading').length;

  const handleInvalidFiles = (fileNames: string[]) => {
    setInvalidFiles((current) => Array.from(new Set([...current, ...fileNames])));
    onInvalidFiles(fileNames);
  };

  const handleClose = () => {
    setInvalidFiles([]);
    onClose();
  };

  return (
    <Drawer
      title={
        <Space size={8}>
          <UploadCloud size={18} color={colorMode.primary} />
          <Title level={4} style={{ margin: 0, color: colorMode.textPrimary }}>
            上傳檔案
          </Title>
          <Badge
            count={queue.length}
            showZero
            style={{ backgroundColor: colorMode.primary }}
          />
        </Space>
      }
      placement="right"
      size={440}
      open={open}
      onClose={handleClose}
      closeIcon={<X size={20} color={colorMode.textSecondary} />}
      styles={{
        header: {
          background: colorMode.surface,
          borderBottomColor: colorMode.border,
        },
        body: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: responsive.isMobile ? 14 : 18,
          background: colorMode.base,
        },
        footer: {
          background: colorMode.surface,
          borderTopColor: colorMode.border,
        },
      }}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button
            icon={<Trash2 size={14} />}
            onClick={onClear}
            disabled={clearableCount === 0}
          >
            清空
          </Button>
          <Button
            type="primary"
            icon={<UploadCloud size={14} />}
            onClick={onUploadAll}
            loading={isUploading}
            disabled={pendingCount === 0 || isUploading}
          >
            全部上傳{pendingCount > 0 ? `（${pendingCount}）` : ''}
          </Button>
        </div>
      )}
    >
      {error && (
        <Alert
          type="error"
          showIcon
          title={error}
          closable
          onClose={onClearError}
        />
      )}

      {invalidFiles.length > 0 && (
        <Alert
          type="error"
          showIcon
          closable
          onClose={() => setInvalidFiles([])}
          title="以下檔案副檔名不符合目前主題，未加入佇列"
          description={
            <div style={{ overflowWrap: 'anywhere' }}>
              {invalidFiles.map((fileName) => (
                <div key={fileName}>{fileName}</div>
              ))}
            </div>
          }
        />
      )}

      <UploadDropzone
        theme={theme}
        onFilesSelected={onFilesSelected}
        onInvalidFiles={handleInvalidFiles}
      />

      <Alert
        type="warning"
        showIcon
        title={isNetlist ? NETLIST_WARNING : FAIL_SAMPLE_WARNING}
      />

      <Divider style={{ margin: '2px 0', borderColor: colorMode.border }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Text strong style={{ color: colorMode.textPrimary }}>
          上傳佇列
        </Text>
        <Text style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>
          關閉視窗不會清除佇列或中斷上傳
        </Text>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <UploadQueueTable
          items={queue}
          onRemove={onRemove}
        />
      </div>
    </Drawer>
  );
};

export default UploadDrawer;
