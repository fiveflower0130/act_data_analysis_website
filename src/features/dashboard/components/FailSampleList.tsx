import { useState, useMemo, useEffect } from 'react';
import { Table, Card, Tag, Empty, Typography, ConfigProvider, Pagination } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import useDashboardStore from '../../../stores/dashboardStore';
import { HBinLabel } from '../../../types/api';
import { tokens } from '../../../styles/tokens';

const { Text } = Typography;

/** Table body 固定高度（px）*/
const TABLE_SCROLL_Y = 520;
const PAGE_SIZE = 20;

/** 展開為單列資料（不含 rowSpan，分頁後再計算）*/
interface FlatRow {
  key: string;
  dutNo: number;
  dieNo: string;
  ballName: string;
}

/** 含分頁內 rowSpan 的完整列資料 */
interface TableRow extends FlatRow {
  rowSpan: number;
}

/** 在目前分頁的 slice 內重新計算 rowSpan，避免跨頁 rowSpan 錯亂 */
function calcRowSpan(slice: FlatRow[]): TableRow[] {
  return slice.map((row, idx) => {
    const isFirst = idx === 0 || slice[idx - 1].dutNo !== row.dutNo;
    if (!isFirst) return { ...row, rowSpan: 0 };
    let span = 0;
    for (let i = idx; i < slice.length && slice[i].dutNo === row.dutNo; i++) span++;
    return { ...row, rowSpan: span };
  });
}

const COLUMNS: ColumnsType<TableRow> = [
  {
    title: <span style={{ fontWeight: 700 }}>Dut No</span>,
    dataIndex: 'dutNo',
    key: 'dutNo',
    width: 72,
    align: 'center',
    // onCell: (row) => ({
    //   rowSpan: row.rowSpan,
    //   style: {
    //     background: 'rgba(30, 229, 30, 0.12)',
    //     border: row.rowSpan > 0 ? `1px solid ${tokens.colors.primary}` : undefined,
    //     borderLeft: `1px solid ${tokens.colors.primary}`,
    //   },
    // }),
    render: (val: number) =>
      val ? (
        <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>{val}</Tag>
      ) : (
        <Text strong style={{ color: tokens.colors.textMuted, fontSize: 16 }}>{val}</Text>
      ),
  },
  {
    title: <span style={{ fontWeight: 700 }}>Die No</span>,
    dataIndex: 'dieNo',
    key: 'dieNo',
    width: 100,
    align: 'center',
    render: (val: string) =>
      val ? (
        <Tag color="geekblue" style={{ margin: 0, fontWeight: 600 }}>{val}</Tag>
      ) : (
        <Text style={{ color: tokens.colors.textMuted }}>—</Text>
      ),
  },
  {
    title: <span style={{ fontWeight: 700 }}>Ball Name</span>,
    dataIndex: 'ballName',
    key: 'ballName',
    align: 'center',
    render: (val: string) =>
      val ? (
        <Tag color="gold" style={{ margin: 0, fontWeight: 600 }}>{val}</Tag>
      ) : (
        <Text style={{ color: tokens.colors.textMuted }}>—</Text>
      ),
  },
];

const FailSampleList = () => {
  const [page, setPage] = useState(1);
  const { currentLotId, currentHbin, isSearching, getCurrentFailSample } = useDashboardStore();
  const failSampleData = getCurrentFailSample();

  // 資料來源改變時重置至第 1 頁
  useEffect(() => {
    setPage(1);
  }, [currentLotId, currentHbin]);

  const title = `Fail Sample List${currentHbin ? ` — ${HBinLabel[currentHbin]}` : ''}`;

  // 展開所有 DUT → flat rows（不含 rowSpan）
  const allFlatRows = useMemo<FlatRow[]>(() => {
    if (!failSampleData) return [];
    const rows: FlatRow[] = [];
    failSampleData.fail_sample
      .filter((d) => d.ball_name.length > 0)
      .forEach((dut) => {
        dut.ball_name.forEach((ball, idx) => {
          rows.push({
            key: `${dut.dut_no}-${idx}`,
            dutNo: dut.dut_no,
            dieNo: dut.die_no[idx] ?? '',
            ballName: ball,
          });
        });
      });
    return rows;
  }, [failSampleData]);

  const failDutCount = useMemo(
    () => failSampleData?.fail_sample.filter((d) => d.ball_name.length > 0).length ?? 0,
    [failSampleData],
  );

  // 目前頁的 slice + 重新計算 rowSpan
  const pageRows = useMemo<TableRow[]>(() => {
    const start = (page - 1) * PAGE_SIZE;
    const slice = allFlatRows.slice(start, start + PAGE_SIZE);
    return calcRowSpan(slice);
  }, [allFlatRows, page]);

  const statsExtra =
    failSampleData && allFlatRows.length > 0 ? (
      <Text style={{ color: tokens.colors.textMuted, fontSize: 11 }}>
        {failSampleData.total_duts}個DUT &nbsp; {failDutCount}筆 Fail &nbsp; {allFlatRows.length}顆 Ball
      </Text>
    ) : undefined;

  // 依目前狀態決定空值提示文字（由 Table 內部 locale 顯示，確保 tbody 高度固定）
  const emptyDescription = (() => {
    if (!currentLotId) return '請先搜尋 Lot ID';
    if (currentHbin === null) return '請選擇 Fail Mode';
    if (!failSampleData) return '此 Lot 尚未上傳 Netlist';
    return '此 Fail Mode 無 Fail 資料';
  })();

  return (
    <Card
      size="small"
      title={<span style={{ color: tokens.colors.textPrimary, fontSize: 13, fontWeight: 600 }}>{title}</span>}
      extra={statsExtra}
      style={{
        background: tokens.colors.card,
        borderColor: tokens.colors.border,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{ body: { padding: '8px 12px 10px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/*
       * CSS override：將 Ant Design Table body 從 max-height 改為固定 height，
       * 確保資料少或空值時 tbody 仍維持 TABLE_SCROLL_Y px，不縮減。
       */}
      <style>{`.fsl-table-wrap .ant-table-body { height: ${TABLE_SCROLL_Y}px !important; }`}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
        {/* Table 永遠渲染；空值狀態透過 locale.emptyText 顯示，不替換整個元件 */}
        <div className="fsl-table-wrap" style={{ flex: 1, minHeight: 0 }}>
          <ConfigProvider
            theme={{
              components: {
                Table: {
                  headerBg: '#0f1e38',
                  colorBgContainer: '#132540',
                  rowHoverBg: '#1a3060',
                  headerColor: tokens.colors.textPrimary,
                  colorText: tokens.colors.textSecondary,
                  borderColor: 'rgba(100,160,230,0.25)',
                  headerSplitColor: 'rgba(100,160,230,0.25)',
                },
              },
            }}
          >
            <Table<TableRow>
              columns={COLUMNS}
              dataSource={pageRows}
              loading={isSearching}
              pagination={false}
              size="small"
              bordered
              scroll={{ y: TABLE_SCROLL_Y }}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span style={{ color: tokens.colors.textMuted }}>{emptyDescription}</span>}
                  />
                ),
              }}
              style={{ fontSize: 12 }}
            />
          </ConfigProvider>
        </div>

        {/* 分頁列：僅在資料超過單頁時顯示；移除無效的頁數下拉選單 */}
        {allFlatRows.length > PAGE_SIZE && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexShrink: 0 }}>
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={allFlatRows.length}
              onChange={setPage}
              size="small"
              showSizeChanger={false}
              showTotal={(total) => `共${total}筆`}
            />
          </div>
        )}
      </div>
    </Card>
  );
};

export default FailSampleList;

