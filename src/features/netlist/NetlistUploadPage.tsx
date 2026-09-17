import { useEffect } from 'react';
import { Alert, Button, Card, Divider, Space, Typography } from 'antd';
import { CheckCircle2, Trash2, UploadCloud } from 'lucide-react';
import UploadDropzone from './components/UploadDropzone';
import UploadQueueTable from './components/UploadQueueTable';
import UploadThemeSelector from './components/UploadThemeSelector';
import UploadedReferenceList from './components/UploadedReferenceList';
import useUploadStore from '../../stores/uploadStore';
import { useResponsiveTokens } from '../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../hooks/useThemeColors';

const { Text } = Typography;

const NETLIST_WARNING =
  '同一 test_program 上傳將直接覆蓋舊版本，相關快取資料將一併清除。送出後失敗不提供重試，請重新選擇檔案再次上傳。';
const FAIL_SAMPLE_WARNING =
  '重複上傳同一批資料將建立獨立新批次，不會自動去重清除舊資料，請避免重複上傳。送出後失敗不提供重試，請重新選擇檔案再次上傳。';

const NetlistUploadPage = () => {
  const {
    activeTheme,
    netlistPrograms,
    failSampleImports,
    uploadQueue,
    isLoading,
    isUploading,
    error,
    setActiveTheme,
    addFiles,
    removeQueueItem,
    clearQueue,
    uploadAll,
    fetchNetlistPrograms,
    fetchFailSampleImports,
    clearError,
  } = useUploadStore();
  const responsive = useResponsiveTokens();
  const colorMode = useThemeColors();

  useEffect(() => {
    void fetchNetlistPrograms();
  }, [fetchNetlistPrograms]);

  useEffect(() => {
    if (activeTheme === 'fail-sample' && failSampleImports.length === 0) {
      void fetchFailSampleImports();
    }
  }, [activeTheme, failSampleImports.length, fetchFailSampleImports]);

  const hasPendingFiles = uploadQueue.some((item) => item.status === 'pending');

  const handleUploadAll = async () => {
    if (!hasPendingFiles) return;
    await uploadAll();
    if (activeTheme === 'netlist') {
      await fetchNetlistPrograms();
    } else {
      await fetchFailSampleImports();
    }
  };

  const isNetlist = activeTheme === 'netlist';

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        background: colorMode.base,
      }}
    >
      <aside
        style={{
          flex: responsive.isMobile ? '0 0 220px' : '0 0 27%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: colorMode.surface,
          borderRight: `1px solid ${colorMode.border}`,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            padding: 14,
            border: `1px solid ${colorMode.border}`,
            borderRadius: responsive.spacing.cardRadius,
            background: colorMode.card,
          }}
        >
          <UploadThemeSelector
            value={activeTheme}
            onChange={setActiveTheme}
            disabled={isUploading}
          />
        </div>

        <UploadedReferenceList
          key={activeTheme}
          theme={activeTheme}
          netlistPrograms={netlistPrograms}
          failSampleImports={failSampleImports}
          loading={isLoading && !isUploading}
        />

        <Text
          style={{
            flexShrink: 0,
            padding: '10px 8px 0',
            borderTop: `1px dashed ${colorMode.border}`,
            color: colorMode.textMuted,
            fontSize: responsive.typography.caption,
            lineHeight: 1.7,
          }}
        >
          僅 engineer 以上角色可見「資料上傳」與「歷史紀錄」兩項功能；viewer 主選單不會出現這兩項功能入口。
        </Text>
      </aside>

      <main
        style={{
          flex: responsive.isMobile ? 1 : '0 0 73%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: responsive.isMobile ? 12 : 20,
          overflowY: 'auto',
          background: colorMode.base,
        }}
      >
        {error && (
          <Alert
            type="error"
            showIcon
            title={error}
            closable
            onClose={clearError}
            style={{ flexShrink: 0 }}
          />
        )}

        <Card
          size="small"
          title={
            <Space size={8}>
              <UploadCloud size={16} color={colorMode.primary} />
              <Text style={{ color: colorMode.textPrimary }}>選擇檔案</Text>
            </Space>
          }
          style={{
            flexShrink: 0,
            background: colorMode.surface,
            borderColor: colorMode.border,
          }}
          styles={{ body: { padding: responsive.isMobile ? 12 : 18 } }}
        >
          <UploadDropzone theme={activeTheme} onFilesSelected={addFiles} disabled={isUploading} />
          <Alert
            type="warning"
            showIcon
            title={isNetlist ? NETLIST_WARNING : FAIL_SAMPLE_WARNING}
            style={{
              marginTop: 12,
              color: colorMode.warning,
              borderColor: colorMode.warning,
            }}
          />
        </Card>

        <Card
          size="small"
          title={
            <Space size={8}>
              <CheckCircle2 size={16} color={colorMode.primary} />
              <Text style={{ color: colorMode.textPrimary }}>上傳佇列</Text>
            </Space>
          }
          extra={
            <Text style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>
              選好檔案後暫存，按「全部上傳」才會送出
            </Text>
          }
          style={{
            flex: '1 1 0',
            minHeight: 260,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: colorMode.surface,
            borderColor: colorMode.border,
          }}
          styles={{
            body: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              padding: responsive.isMobile ? 12 : 18,
            },
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <UploadQueueTable
              items={uploadQueue}
              onRemove={removeQueueItem}
              disabled={isUploading}
            />
          </div>
          <Divider style={{ margin: '12px 0', borderColor: colorMode.border }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            <Button
              icon={<Trash2 size={14} />}
              onClick={clearQueue}
              disabled={uploadQueue.length === 0 || isUploading}
            >
              清空
            </Button>
            <Button
              type="primary"
              icon={<UploadCloud size={14} />}
              onClick={() => void handleUploadAll()}
              loading={isUploading}
              disabled={!hasPendingFiles || isUploading}
            >
              全部上傳
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default NetlistUploadPage;
