import { Empty, Input, Pagination, Spin, Tag, Typography } from 'antd';
import { FileText, Search } from 'lucide-react';
import type { FailSampleImportBatchSummary, NetlistProgram } from '../../../types/api';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text, Title } = Typography;

export type SelectedUpload =
  | { theme: 'netlist'; item: NetlistProgram }
  | { theme: 'fail-sample'; item: FailSampleImportBatchSummary };

interface UploadedReferenceListProps {
  theme: UploadTheme;
  netlistPrograms: NetlistProgram[];
  failSampleImports: FailSampleImportBatchSummary[];
  total: number;
  page: number;
  searchTerm: string;
  selectedId: string | number | null;
  loading: boolean;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (selection: SelectedUpload) => void;
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatUploader = (userNo: string | null | undefined) => userNo || '—';

const cardStyle = (selected: boolean, colors: ReturnType<typeof useThemeColors>) => ({
  display: 'block',
  width: '100%',
  padding: 10,
  marginBottom: 8,
  textAlign: 'left' as const,
  border: `1px solid ${selected ? colors.primary : colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  cursor: 'pointer',
});

const fieldStyle = (color: string) => ({
  display: 'block',
  marginTop: 4,
  color,
  fontSize: '12px',
  lineHeight: 1.45,
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
});

const UploadedReferenceList = ({
  theme,
  netlistPrograms,
  failSampleImports,
  total,
  page,
  searchTerm,
  selectedId,
  loading,
  onSearchChange,
  onPageChange,
  onSelect,
}: UploadedReferenceListProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const isNetlist = theme === 'netlist';

  return (
    <section
      aria-label="已上傳檔案"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: 14,
        border: `1px solid ${colorMode.border}`,
        borderRadius: responsive.spacing.cardRadius,
        background: colorMode.card,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <Title level={4} style={{ margin: 0, color: colorMode.textPrimary, fontSize: responsive.typography.cardTitle }}>
          已上傳檔案
        </Title>
        <Text style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>
          共 {total} 批
        </Text>
      </div>

      <Input
        aria-label={isNetlist ? '搜尋檔名或 test_program' : '搜尋 Lot ID、test_program 或檔名'}
        prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
        placeholder={isNetlist ? '搜尋檔名 / test_program' : '搜尋 Lot ID / test_program / 檔名'}
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        allowClear
        style={{
          marginTop: 10,
          background: colorMode.surface,
          borderColor: colorMode.border,
          color: colorMode.textPrimary,
        }}
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 12 }}>
        <Spin spinning={loading}>
          {isNetlist ? (
            netlistPrograms.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: colorMode.textMuted }}>尚無 Netlist 資料</span>}
              />
            ) : (
              netlistPrograms.map((program) => (
                <button
                  type="button"
                  key={program.id}
                  aria-label={`預覽 ${program.test_program}`}
                  onClick={() => onSelect({ theme: 'netlist', item: program })}
                  style={cardStyle(selectedId === program.id, colorMode)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText size={14} color={colorMode.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body }}>
                        {program.test_program}
                      </Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>檔名：{program.filename}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳時間：{formatDate(program.uploaded_at)}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳者：{formatUploader(program.uploaded_by)}</Text>
                    </div>
                  </div> 
                </button>
              ))
            )
          ) : failSampleImports.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: colorMode.textMuted }}>尚無 Fail Sample 資料</span>}
            />
          ) : (
            failSampleImports.map((batch) => (
              <button
                type="button"
                key={batch.batch_id}
                aria-label={`預覽 ${batch.lot_id}`}
                onClick={() => onSelect({ theme: 'fail-sample', item: batch })}
                style={cardStyle(selectedId === batch.batch_id, colorMode)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <FileText size={14} color={colorMode.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text strong style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body }}>
                        {batch.lot_id}
                      </Text>
                      <Tag color={colorMode.primary}>
                        {batch.execution_mode}
                      </Tag>
                    </div>
                    <Text style={fieldStyle(colorMode.textSecondary)}>檔名：{batch.source_file || '—'}</Text>
                    <Text style={fieldStyle(colorMode.textSecondary)}>上傳時間：{formatDate(batch.imported_at)}</Text>
                    <Text style={fieldStyle(colorMode.textSecondary)}>上傳者：{formatUploader(batch.uploaded_by)}</Text>
                  </div>
                </div>
              </button>
            ))
          )}
        </Spin>
      </div>

      {total > 10 && (
        <Pagination
          size="small"
          current={page}
          pageSize={10}
          total={total}
          showSizeChanger={false}
          showQuickJumper={false}
          onChange={onPageChange}
          style={{ flexShrink: 0, marginTop: 10, textAlign: 'center' }}
        />
      )}
    </section>
  );
};

export default UploadedReferenceList;
