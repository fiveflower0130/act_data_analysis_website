import { Empty, Pagination, Typography } from 'antd';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo } from 'react';
import { filterPreviewRows, paginatePreviewRows, sortPreviewRows, type SortState } from '../utils/previewHelpers';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text } = Typography;

export interface PreviewColumn {
  key: string;
  label: string;
}

interface PreviewTableProps {
  columns: PreviewColumn[];
  rows: Record<string, unknown>[];
  query: string;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  page: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  emptyText?: string;
}

const PAGE_SIZE = 100;

const formatCell = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const PreviewTable = ({
  columns,
  rows,
  query,
  sort,
  onSortChange,
  page,
  onPageChange,
  loading = false,
  emptyText = '沒有符合的資料',
}: PreviewTableProps) => {
  const colorMode = useThemeColors();
  const filteredRows = useMemo(() => filterPreviewRows(rows, query), [rows, query]);
  const sortedRows = useMemo(
    () => sortPreviewRows(filteredRows, sort),
    [filteredRows, sort],
  );
  const pageRows = useMemo(
    () => paginatePreviewRows(sortedRows, page, PAGE_SIZE),
    [sortedRows, page],
  );

  const toggleSort = (key: string) => {
    if (sort.key !== key) {
      onSortChange({ key, order: 'ascend' });
      onPageChange(1);
      return;
    }

    if (sort.order === 'ascend') {
      onSortChange({ key, order: 'descend' });
    } else if (sort.order === 'descend') {
      onSortChange({ key: null, order: null });
    } else {
      onSortChange({ key, order: 'ascend' });
    }
    onPageChange(1);
  };

  const getSortIcon = (key: string) => {
    if (sort.key !== key || !sort.order) {
      return <ChevronsUpDown size={13} aria-hidden="true" />;
    }
    return sort.order === 'ascend'
      ? <ArrowUp size={13} aria-hidden="true" />
      : <ArrowDown size={13} aria-hidden="true" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
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
        <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: colorMode.card }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  aria-sort={
                    sort.key === column.key
                      ? sort.order === 'ascend'
                        ? 'ascending'
                        : sort.order === 'descend'
                          ? 'descending'
                          : 'none'
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
            {loading ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32, textAlign: 'center' }}>
                  <Text style={{ color: colorMode.textMuted }}>載入中…</Text>
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32 }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span style={{ color: colorMode.textMuted }}>{emptyText}</span>}
                  />
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => (
                <tr key={`${rowIndex}-${String(row[columns[0]?.key ?? ''])}`}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: '8px 10px',
                        borderBottom: `1px solid ${colorMode.border}`,
                        color: column.key === 'fail_reason' ? colorMode.danger : colorMode.textPrimary,
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
          marginTop: 10,
        }}
      >
        <Text style={{ color: colorMode.textMuted, fontSize: 12 }}>
          {query.trim()
            ? `符合 ${sortedRows.length} 列（已篩選，原 ${rows.length} 列）`
            : `符合 ${sortedRows.length} 列（共 ${rows.length} 列）`}
        </Text>
        {sortedRows.length > PAGE_SIZE && (
          <Pagination
            size="small"
            current={page}
            pageSize={PAGE_SIZE}
            total={sortedRows.length}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
};

export default PreviewTable;
