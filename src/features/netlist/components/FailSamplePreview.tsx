import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Empty,
  Input,
  Pagination,
  Popover,
  Space,
  Typography,
} from 'antd';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  ChevronDown,
  Download,
  FileJson,
  Search,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '../../../api/client';
import { downloadFailSampleImportCsv } from '../../../api/data';
import useAuthStore from '../../../stores/authStore';
import useUploadStore from '../../../stores/uploadStore';
import type {
  FailSampleImportBatchSummary,
  FailSampleImportRow,
  FailSampleImportRowField,
  FailSampleImportRowSortOrder,
  FailSampleImportSiteStat,
} from '../../../types/api';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text, Title } = Typography;

interface FailSamplePreviewProps {
  batch: FailSampleImportBatchSummary;
}

const PAGE_SIZE = 100;

const ROW_COLUMNS: Array<{ key: FailSampleImportRowField; label: string }> = [
  { key: 'site', label: 'site' },
  { key: 'serial_no', label: 'serial_no' },
  { key: 'real_time', label: 'real_time' },
  { key: 'test_item', label: 'test_item' },
  { key: 'value', label: 'value' },
  { key: 'spec_min', label: 'spec_min' },
  { key: 'spec_max', label: 'spec_max' },
  { key: 'unit', label: 'unit' },
  { key: 'pin_1', label: 'pin_1' },
  { key: 'pin_2', label: 'pin_2' },
  { key: 'fail_reason', label: 'fail_reason' },
  { key: 'ihbin', label: 'ihbin' },
];

// const formatDate = (value: string | null | undefined) => {
//   if (!value) return '—';
//   const date = new Date(value);
//   if (Number.isNaN(date.getTime())) return value;
//   return date.toLocaleString('zh-TW', {
//     year: 'numeric',
//     month: '2-digit',
//     day: '2-digit',
//     hour: '2-digit',
//     minute: '2-digit',
//     hour12: false,
//   });
// };

const getHeaderValue = (headers: unknown, key: string) => {
  if (!headers || typeof headers !== 'object') return undefined;
  const candidate = headers as {
    get?: (name: string) => string | undefined;
    [header: string]: unknown;
  };
  if (typeof candidate.get === 'function') return candidate.get(key);
  const value = candidate[key] ?? candidate[key.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
};

const getDownloadFilename = (headers: unknown, fallback: string) => {
  const disposition = getHeaderValue(headers, 'content-disposition');
  if (!disposition) return fallback;
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
  const plain = disposition.match(/filename="?([^"]+)"?/i)?.[1];
  return plain || fallback;
};

const formatCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const FailSamplePreview = ({ batch }: FailSamplePreviewProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const role = useAuthStore((state) => state.user?.role);
  const fetchFailSampleRows = useUploadStore((state) => state.fetchFailSampleRows);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FailSampleImportRow[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [siteStats, setSiteStats] = useState<FailSampleImportSiteStat[]>([]);
  const [siteFilterOpen, setSiteFilterOpen] = useState(false);
  const [siteSelectionInitialized, setSiteSelectionInitialized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<FailSampleImportRowField>('site');
  const [sortOrder, setSortOrder] = useState<FailSampleImportRowSortOrder>('asc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [resolvedRequestKey, setResolvedRequestKey] = useState<string | null>(null);
  const requestId = useRef(0);
  const siteSelectionInitializedRef = useRef(false);
  const canExport = role === 'engineer' || role === 'admin';

  const infoItems = useMemo(
    () => [
      ['customer', batch.customer],
      ['test_program', batch.test_program],
      ['lot_id', batch.lot_id],
      ['wafer_id', batch.wafer_id || '—'],
      ['hbin', batch.hbin],
      ['execution_mode', batch.execution_mode],
      ['tester', batch.tester || '—'],
      ['test_date', batch.date],
      ['qty', batch.qty],
    ],
    [batch],
  );

  const allSitesSelected =
    !siteSelectionInitialized ||
    sites.length === 0 ||
    (selectedSites.length === sites.length &&
      sites.every((site) => selectedSites.includes(site)));
  const noSitesSelected =
    siteSelectionInitialized && sites.length > 0 && selectedSites.length === 0;
  const requestedSites = useMemo(
    () => (allSitesSelected ? undefined : [...selectedSites].sort()),
    [allSitesSelected, selectedSites],
  );
  const normalizedSiteSelection = noSitesSelected
    ? 'none'
    : allSitesSelected
      ? 'all'
      : requestedSites;
  const siteStatsBySite = useMemo(
    () => new Map(siteStats.map((stat) => [stat.site, stat])),
    [siteStats],
  );
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        batchId: batch.batch_id,
        sites: normalizedSiteSelection,
        q: debouncedSearch,
        sortBy,
        sortOrder,
        page,
        pageSize: PAGE_SIZE,
      }),
    [batch.batch_id, debouncedSearch, normalizedSiteSelection, page, sortBy, sortOrder],
  );
  const loadingRows = !noSitesSelected && resolvedRequestKey !== requestKey;
  const visibleError = noSitesSelected || resolvedRequestKey !== requestKey ? null : error;
  const visibleRows = noSitesSelected ? [] : rows;
  const visibleTotal = noSitesSelected ? 0 : total;
  const visibleFilteredTotal = noSitesSelected ? 0 : filteredTotal;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;

    if (noSitesSelected) return;

    void fetchFailSampleRows(batch.batch_id, {
      ...(requestedSites ? { sites: requestedSites } : {}),
      q: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        if (requestId.current !== currentRequestId) return;
        setError(null);
        setRows(data.items);
        setSites(data.sites);
        setSiteStats(data.site_stats);
        if (!siteSelectionInitializedRef.current) {
          siteSelectionInitializedRef.current = true;
          setSelectedSites(data.sites);
          setSiteSelectionInitialized(true);
        }
        setTotal(data.total);
        setFilteredTotal(data.filtered_total);
        setResolvedRequestKey(requestKey);
      })
      .catch((reason: unknown) => {
        if (requestId.current !== currentRequestId) return;
        setRows([]);
        setError(getApiErrorMessage(reason, '取得 Fail Sample 明細失敗'));
        setResolvedRequestKey(requestKey);
      })
      ;
  }, [
    batch.batch_id,
    debouncedSearch,
    fetchFailSampleRows,
    noSitesSelected,
    page,
    requestKey,
    requestedSites,
    sortBy,
    sortOrder,
  ]);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await downloadFailSampleImportCsv(batch.batch_id);
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = getDownloadFilename(
        response.headers,
        `${batch.batch_id}.csv`,
      );
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (reason: unknown) {
      setError(getApiErrorMessage(reason, 'CSV 匯出失敗'));
    } finally {
      setDownloading(false);
    }
  };

  const toggleSort = (key: FailSampleImportRowField) => {
    setPage(1);
    if (sortBy !== key) {
      setSortBy(key);
      setSortOrder('asc');
      return;
    }
    setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
  };

  const getSortIcon = (key: FailSampleImportRowField) => {
    if (sortBy !== key) return <ChevronsUpDown size={13} aria-hidden="true" />;
    return sortOrder === 'asc'
      ? <ArrowUp size={13} aria-hidden="true" />
      : <ArrowDown size={13} aria-hidden="true" />;
  };

  const updateSelectedSites = (nextSites: string[]) => {
    setSelectedSites(nextSites);
    setPage(1);
  };

  const siteFilterContent = (
    <div
      style={{
        width: 260,
        padding: 10,
        background: colorMode.card,
        color: colorMode.textPrimary,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxHeight: 260,
          overflowY: 'auto',
        }}
      >
        {sites.length === 0 ? (
          <Text style={{ color: colorMode.textMuted }}>載入中…</Text>
        ) : (
          sites.map((site) => {
            const stat = siteStatsBySite.get(site);
            return (
              <Checkbox
                key={site}
                checked={selectedSites.includes(site)}
                onChange={(event) => {
                  const nextSites = event.target.checked
                    ? [...selectedSites, site]
                    : selectedSites.filter((selectedSite) => selectedSite !== site);
                  updateSelectedSites(nextSites);
                }}
                style={{ color: colorMode.textPrimary }}
              >
                <span style={{ color: colorMode.textPrimary }}>
                  {`Site ${site}\u3000(${stat?.dut_count ?? '—'} 顆／${stat?.row_count ?? '—'} 列)`}
                </span>
              </Checkbox>
            );
          })
        )}
      </div>
      <Divider style={{ margin: '10px 0', borderColor: colorMode.border }} />
      <Space size={4}>
        <Button
          type="text"
          size="small"
          onClick={() => updateSelectedSites(sites)}
          style={{ color: colorMode.primaryLight }}
        >
          全選
        </Button>
        <Button
          type="text"
          size="small"
          onClick={() => updateSelectedSites([])}
          style={{ color: colorMode.primaryLight }}
        >
          全部清除
        </Button>
      </Space>
    </div>
  );

  return (
    <section
      aria-label="Fail Sample 預覽"
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
          alignItems: 'flex-start',
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
          <FileJson size={18} color={colorMode.primary} />
          <Text style={{ margin: 0, color: colorMode.textPrimary }}>
            {batch.source_file || batch.lot_id}
          </Text>
          <Badge
            count="已上傳檔案"
            style={{ backgroundColor: colorMode.successBg, color: colorMode.success }}
          />
        </Space>
        {canExport && (
          <Button
            icon={<Download size={14} />}
            onClick={() => void handleDownload()}
            loading={downloading}
          >
            輸出 CSV
          </Button>
        )}
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
              {String(value ?? '—')}
            </Text>
          </div>
        ))}
      </div>

      <Divider style={{ margin: '2px 0', borderColor: colorMode.border }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Popover
          content={siteFilterContent}
          trigger="click"
          placement="bottomLeft"
          open={siteFilterOpen}
          onOpenChange={setSiteFilterOpen}
          styles={{
            container: {
              padding: 0,
              background: colorMode.card,
              border: `1px solid ${colorMode.border}`,
            },
            arrow: { background: colorMode.card },
          }}
        >
          <Button
          aria-label={`Site 篩選：${selectedSites.length}/${sites.length}`}
            aria-expanded={siteFilterOpen}
            icon={<ChevronDown size={14} />}
            iconPosition="end"
            style={{
              minWidth: 140,
              justifyContent: 'space-between',
              background: colorMode.surface,
              borderColor: colorMode.border,
              color: colorMode.textPrimary,
            }}
          >
            Site 篩選：{selectedSites.length}/{sites.length}
          </Button>
        </Popover>
        <Input
          aria-label="搜尋 Fail Sample 明細"
          prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
          placeholder="搜尋 12 個欄位"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(1);
          }}
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

      {visibleError && (
        <Alert
          type="error"
          showIcon
          title={visibleError}
          closable
          onClose={() => setError(null)}
        />
      )}

      <div
        style={{
          flex: 1,
          minHeight: 180,
          overflow: 'auto',
          border: `1px solid ${colorMode.border}`,
          borderRadius: 8,
          background: colorMode.surface,
        }}
      >
        <table style={{ width: '100%', minWidth: 1240, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: colorMode.card }}>
              {ROW_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  aria-sort={
                    sortBy === column.key
                      ? sortOrder === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                  style={{
                    padding: '9px 10px',
                    borderBottom: `1px solid ${colorMode.border}`,
                    color: colorMode.textSecondary,
                    fontSize: 12,
                    fontWeight: 600,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: 0,
                      border: 0,
                      background: colorMode.card,
                      color: colorMode.textSecondary,
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingRows ? (
              <tr>
                <td colSpan={ROW_COLUMNS.length} style={{ padding: 32, textAlign: 'center' }}>
                  <Text style={{ color: colorMode.textMuted }}>載入中…</Text>
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={ROW_COLUMNS.length} style={{ padding: 32 }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                      <span style={{ color: colorMode.textMuted }}>
                        {noSitesSelected
                          ? '未選取任何 Site'
                          : visibleTotal === 0
                            ? '此批次沒有明細'
                            : '沒有符合條件的明細'}
                      </span>
                    }
                  />
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr key={`${row.site}-${row.serial_no}-${row.test_item}-${rowIndex}`}>
                  {ROW_COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: '8px 10px',
                        borderBottom: `1px solid ${colorMode.border}`,
                        color: column.key === 'fail_reason'
                          ? colorMode.danger
                          : colorMode.textPrimary,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCell(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>
          符合 {visibleFilteredTotal} 列（共 {visibleTotal} 列）
        </Text>
        {visibleFilteredTotal > PAGE_SIZE && (
          <Pagination
            size="small"
            current={page}
            pageSize={PAGE_SIZE}
            total={visibleFilteredTotal}
            showSizeChanger={false}
            showLessItems
            onChange={(nextPage) => setPage(nextPage)}
          />
        )}
      </div>
    </section>
  );
};

export default FailSamplePreview;
