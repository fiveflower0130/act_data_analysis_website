import { useMemo, useState } from 'react';
import { Empty, Input, Spin, Typography } from 'antd';
import { FileText, Search } from 'lucide-react';
import type { FailSampleImportBatchSummary, NetlistProgram } from '../../../types/api';
import type { UploadTheme } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

interface UploadedReferenceListProps {
  theme: UploadTheme;
  netlistPrograms: NetlistProgram[];
  failSampleImports: FailSampleImportBatchSummary[];
  loading: boolean;
}

const formatDate = (value: string) => {
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

const UploadedReferenceList = ({
  theme,
  netlistPrograms,
  failSampleImports,
  loading,
}: UploadedReferenceListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const formatUploader = (userNo: string | null | undefined) => {
    if (!userNo) return '—';
    return userNo;
  };

  const filteredNetlistPrograms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return netlistPrograms;
    return netlistPrograms.filter((program) =>
      `${program.test_program} ${program.filename}`.toLowerCase().includes(keyword),
    );
  }, [netlistPrograms, searchTerm]);

  const filteredFailSampleImports = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return failSampleImports;
    return failSampleImports.filter((batch) =>
      `${batch.lot_id} ${batch.test_program}`.toLowerCase().includes(keyword),
    );
  }, [failSampleImports, searchTerm]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        minHeight: 0,
        overflow: 'hidden',
        padding: '16px',
        border: `1px solid ${colorMode.border}`,
        borderRadius: responsive.spacing.cardRadius,
        background: colorMode.card,
      }}
    >
      <Text
        strong
        style={{
          color: colorMode.textPrimary,
          fontSize: responsive.typography.cardTitle,
        }}
      >
        已上傳檔案
      </Text>
      <Input
        aria-label={theme === 'netlist' ? '搜尋檔名或 test_program' : '搜尋 Lot ID 或 test_program'}
        prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
        placeholder={theme === 'netlist' ? '搜尋檔名 / test_program' : '搜尋 Lot ID / test_program'}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
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
          {theme === 'netlist' ? (
            filteredNetlistPrograms.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: colorMode.textMuted }}>尚無 Netlist 資料</span>}
              />
            ) : (
              filteredNetlistPrograms.map((program) => (
                <div
                  key={program.id}
                  style={{
                    display: 'block',
                    padding: '10px',
                    marginBottom: 8,
                    border: `1px solid ${colorMode.border}`,
                    borderRadius: 8,
                    background: colorMode.surface,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText size={14} color={colorMode.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          display: 'block',
                          color: colorMode.textPrimary,
                          fontSize: responsive.typography.body,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        {program.test_program}
                      </Text>
                      <Text
                        style={{
                          display: 'block',
                          color: colorMode.textSecondary,
                          fontSize: responsive.typography.caption,
                          marginTop: 3,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                        }}
                      >
                        檔名：{program.filename}
                      </Text>
                      <Text
                        style={{
                          display: 'block',
                          color: colorMode.textMuted,
                          fontSize: responsive.typography.caption,
                          marginTop: 3,
                        }}
                      >
                        時間：{formatDate(program.uploaded_at)}
                      </Text>
                      <Text
                        style={{
                          display: 'block',
                          color: colorMode.textMuted,
                          fontSize: responsive.typography.caption,
                          marginTop: 3,
                        }}
                      >
                        上傳者：{formatUploader(program.uploaded_by)}
                      </Text>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredFailSampleImports.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: colorMode.textMuted }}>尚無 Fail Sample 資料</span>}
              />
            ) : (
              filteredFailSampleImports.map((batch) => (
                <div
                  key={batch.batch_id}
                  style={{
                    display: 'block',
                    padding: '10px',
                    marginBottom: 8,
                    border: `1px solid ${colorMode.border}`,
                    borderRadius: 8,
                    background: colorMode.surface,
                  }}
                >
                  <Text
                    strong
                    style={{
                      display: 'block',
                      color: colorMode.textPrimary,
                      fontSize: responsive.typography.body,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {batch.lot_id}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: colorMode.textSecondary,
                      fontSize: responsive.typography.caption,
                      marginTop: 3,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    Test Program：{batch.test_program}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: colorMode.textSecondary,
                      fontSize: responsive.typography.caption,
                      marginTop: 3,
                    }}
                  >
                    模式：{batch.execution_mode}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: colorMode.textMuted,
                      fontSize: responsive.typography.caption,
                      marginTop: 3,
                    }}
                  >
                    匯入時間：{formatDate(batch.imported_at)}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: colorMode.textMuted,
                      fontSize: responsive.typography.caption,
                      marginTop: 3,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    來源檔案：{batch.source_file ?? '—'}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      color: colorMode.textMuted,
                      fontSize: responsive.typography.caption,
                      marginTop: 3,
                    }}
                  >
                    上傳者：{formatUploader(batch.uploaded_by)}
                  </Text>
                </div>
              ))
            )
          )}
        </Spin>
      </div>
    </div>
  );
};

export default UploadedReferenceList;
