import { Alert, Badge, Input, Select, Space, Typography } from 'antd';
import { FileSpreadsheet, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '../../../api/client';
import {
  NetlistSheet,
  type NetlistProgram,
  type NetlistSheetInfo,
  type NetlistSheetName,
} from '../../../types/api';
import useUploadStore from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';
import PreviewTable, { type PreviewColumn } from './PreviewTable';
import type { SortState } from '../utils/previewHelpers';

const { Text, Title } = Typography;

const SHEET_OPTIONS: Array<{ label: string; value: NetlistSheetName }> = [
  { label: 'Netlist', value: NetlistSheet.Netlist },
  { label: 'Test_Spec', value: NetlistSheet.TestSpec },
  { label: 'Bin_Priority', value: NetlistSheet.BinPriority },
  { label: 'Bin_Name', value: NetlistSheet.BinName },
  { label: 'Stacking_Die', value: NetlistSheet.StackingDie },
  { label: 'Tray', value: NetlistSheet.Tray },
];

const SHEET_COLUMNS: Record<NetlistSheetName, PreviewColumn[]> = {
  Netlist: [
    { key: 'package_pin', label: 'package_pin' },
    { key: 'bond_finger', label: 'bond_finger' },
    { key: 'die_pin', label: 'die_pin' },
    { key: 'die_unity', label: 'die_unity' },
    { key: 'net_name', label: 'net_name' },
  ],
  Test_Spec: [
    { key: 'item_name', label: 'item_name' },
    { key: 'fail_bin_code_min', label: 'fail_bin_code_min' },
    { key: 'fail_bin_code_max', label: 'fail_bin_code_max' },
    { key: 'relax', label: 'relax' },
    { key: 'relax_min', label: 'relax_min' },
    { key: 'relax_max', label: 'relax_max' },
  ],
  Bin_Priority: [
    { key: 'hw_bin_no', label: 'hw_bin_no' },
    { key: 'hw_bin_name', label: 'hw_bin_name' },
    { key: 'bin_test_type', label: 'bin_test_type' },
    { key: 'priority_no', label: 'priority_no' },
  ],
  Bin_Name: [
    { key: 'sw_bin_no', label: 'sw_bin_no' },
    { key: 'sw_bin_name', label: 'sw_bin_name' },
    { key: 'hw_bin_no', label: 'hw_bin_no' },
    { key: 'hw_bin_name', label: 'hw_bin_name' },
    { key: 'bin_test_type', label: 'bin_test_type' },
  ],
  Stacking_Die: [
    { key: 'layer', label: 'layer' },
    { key: 'unity', label: 'unity' },
    { key: 'is_substrate', label: 'is_substrate' },
  ],
  Tray: [
    { key: 'column', label: 'column' },
    { key: 'row', label: 'row' },
  ],
};

interface NetlistPreviewProps {
  program: NetlistProgram;
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

interface NetlistSheetViewProps {
  testProgram: string;
  sheet: NetlistSheetName;
  query: string;
}

const NetlistSheetView = ({ testProgram, sheet, query }: NetlistSheetViewProps) => {
  const fetchNetlistSheet = useUploadStore((state) => state.fetchNetlistSheet);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: null, order: null });
  const [prevQuery, setPrevQuery] = useState(query);

  if (prevQuery !== query) {
    setPrevQuery(query);
    if (page !== 1) setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    void fetchNetlistSheet(testProgram, sheet)
      .then((payload) => {
        if (!cancelled) setRows(payload.rows);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setRows([]);
          setError(getApiErrorMessage(reason, '取得 Netlist 預覽資料失敗'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchNetlistSheet, sheet, testProgram]);

  return (
    <>
      {error && <Alert type="error" showIcon title={error} closable onClose={() => setError(null)} />}

      <PreviewTable
        columns={SHEET_COLUMNS[sheet]}
        rows={rows}
        query={query}
        sort={sort}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
        page={page}
        onPageChange={setPage}
        loading={loading}
        emptyText="此 Sheet 尚無資料"
      />
    </>
  );
};

const NetlistPreview = ({ program }: NetlistPreviewProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const fetchNetlistSheets = useUploadStore((state) => state.fetchNetlistSheets);
  const [sheet, setSheet] = useState<NetlistSheetName>(NetlistSheet.Netlist);
  const [query, setQuery] = useState('');
  const [sheetMetadata, setSheetMetadata] = useState<NetlistSheetInfo[]>([]);
  const [sheetMetadataError, setSheetMetadataError] = useState<string | null>(null);
  const [sheetMetadataLoading, setSheetMetadataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchNetlistSheets(program.test_program)
      .then((metadata) => {
        if (!cancelled) setSheetMetadata(metadata);
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setSheetMetadata([]);
          setSheetMetadataError(getApiErrorMessage(reason, '取得 Sheet 資訊失敗'));
        }
      })
      .finally(() => {
        if (!cancelled) setSheetMetadataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchNetlistSheets, program.test_program]);

  const infoItems = useMemo(
    () => [
      ['file_name', program.filename],
      ['test_program', program.test_program],
      ['security', program.security_level || '—'],
      ['sheet', sheetMetadataLoading ? '…' : String(sheetMetadata.length || '—')],
      ['uploader', program.uploaded_by || '—'],
      ['update_time', formatDate(program.updated_at)],
    ],
    [program, sheetMetadata.length, sheetMetadataLoading],
  );

  return (
    <section
      aria-label="Netlist 預覽"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          paddingBottom: 10,
          borderBottom: `1px solid ${colorMode.border}`,
        }}
      >
        <Space size={8}>
          <Title level={4} style={{ margin: 0, color: colorMode.textPrimary }}>
            資料預覽
          </Title>
          <FileSpreadsheet size={18} color={colorMode.primary} />
          <Text style={{ margin: 0, color: colorMode.textPrimary }}>
            {program.filename}
          </Text>
          <Badge
            count="已上傳檔案"
            style={{ backgroundColor: colorMode.successBg, color: colorMode.success }}
          />
        </Space>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {infoItems.map(([label, value]) => (
          <div
            key={label}
            style={{
              minWidth: 0,
              padding: '9px 10px',
              border: `1px solid ${colorMode.border}`,
              borderRadius: 8,
              background: colorMode.card,
            }}
          >
            <Text style={{ display: 'block', color: colorMode.textMuted, fontSize: 11 }}>{label}</Text>
            <Text
              style={{
                display: 'block',
                marginTop: 3,
                color: colorMode.textPrimary,
                fontSize: responsive.typography.body,
                overflowWrap: 'anywhere',
              }}
            >
              {value}
            </Text>
          </div>
        ))}
      </div>

      {sheetMetadataError && (
        <Alert
          type="error"
          showIcon
          title={sheetMetadataError}
          closable
          onClose={() => setSheetMetadataError(null)}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Select
          aria-label="選擇 Netlist Sheet"
          value={sheet}
          options={SHEET_OPTIONS.map((option) => {
            const metadata = sheetMetadata.find((item) => item.name === option.value);
            const rowCount = metadata ? ` (${metadata.row_count})` : '';
            return { ...option, label: `${option.label}${rowCount}` };
          })}
          onChange={(value: NetlistSheetName) => {
            setSheet(value);
            setQuery('');
          }}
          style={{ width: 190 }}
        />
        <Input
          aria-label="搜尋預覽資料"
          prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
          placeholder="搜尋目前資料表所有欄位"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          allowClear
          style={{
            flex: '1 1 0',
            maxWidth: '100%',
            background: colorMode.surface,
            borderColor: colorMode.border,
            color: colorMode.textPrimary,
          }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <NetlistSheetView
          key={`${program.test_program}-${sheet}`}
          testProgram={program.test_program}
          sheet={sheet}
          query={query}
        />
      </div>
    </section>
  );
};

export default NetlistPreview;
