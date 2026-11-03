import { ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  downloadFailSampleImportCsv: vi.fn(),
  getFailSampleImportRows: vi.fn(),
}));

import {
  downloadFailSampleImportCsv,
  getFailSampleImportRows,
} from '../../src/api/data';
import FailSamplePreview from '../../src/features/netlist/components/FailSamplePreview';
import useAuthStore from '../../src/stores/authStore';
import useUploadStore from '../../src/stores/uploadStore';
import type { FailSampleImportBatchSummary } from '../../src/types/api';

const batch: FailSampleImportBatchSummary = {
  batch_id: 'batch-001',
  customer: 'MICRON',
  test_program: 'TP-001',
  lot_id: 'LOT-001',
  wafer_id: null,
  hbin: 3,
  execution_mode: 'RT',
  tester: 'ASE01',
  date: '2026-10-22 10:00:00',
  qty: 2,
  imported_at: '2026-10-22T10:01:00Z',
  source_file: 'sample.json',
  uploaded_by: 'E001',
};

const rowsResponse = {
  total: 2,
  filtered_total: 2,
  sites: ['1', '2'],
  items: [
    {
      site: '1',
      serial_no: '001',
      real_time: '2026-10-22 10:00:00',
      test_item: 'SHORT_IO',
      value: '-0.5',
      spec_min: '-0.7',
      spec_max: '-0.3',
      unit: 'V',
      pin_1: 'F15',
      pin_2: 'H9',
      fail_reason: '>spec_max',
      ihbin: '3',
    },
    {
      site: '2',
      serial_no: '002',
      real_time: '2026-10-22 10:01:00',
      test_item: 'OPEN_IO',
      value: '0.1',
      spec_min: '-0.2',
      spec_max: '0.2',
      unit: 'V',
      pin_1: 'F16',
      pin_2: 'H10',
      fail_reason: '',
      ihbin: '2',
    },
  ],
  page: 1,
  page_size: 100,
  site_stats: [
    { site: '1', dut_count: 3, row_count: 1 },
    { site: '2', dut_count: 4, row_count: 1 },
  ],
};

const renderPreview = () =>
  render(
    <ConfigProvider>
      <FailSamplePreview batch={batch} />
    </ConfigProvider>,
  );

describe('FailSamplePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUploadStore.setState({
      failSampleRowsCache: {},
      netlistSheetCache: {},
      netlistSheetMetaCache: {},
    });
    vi.mocked(getFailSampleImportRows).mockResolvedValue({
      data: { code: 0, message: 'OK', data: rowsResponse },
    } as never);
    useAuthStore.setState({
      token: 'token',
      user: {
        user_id: 'user-001',
        user_no: 'E001',
        display_name: '工程師',
        email: 'engineer@example.com',
        department: 'Test',
        division: 'FA',
        role: 'engineer',
        is_active: true,
        last_login_at: '2026-10-22T10:00:00Z',
      },
      isLoading: false,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  it('工程師可匯出 CSV 並使用 Content-Disposition 檔名', async () => {
    vi.mocked(downloadFailSampleImportCsv).mockResolvedValue({
      data: new Blob(['csv']),
      headers: { 'content-disposition': "attachment; filename*=UTF-8''export.csv" },
    } as never);
    let downloadedFilename: string | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });
    const user = userEvent.setup();

    renderPreview();
    await user.click(screen.getByRole('button', { name: '輸出 CSV' }));

    await waitFor(() => {
      expect(downloadFailSampleImportCsv).toHaveBeenCalledWith('batch-001');
      expect(clickSpy).toHaveBeenCalled();
    });
    expect(downloadedFilename).toBe('export.csv');
  });

  it('缺少 Content-Disposition 時回退使用 batch_id.csv', async () => {
    vi.mocked(downloadFailSampleImportCsv).mockResolvedValue({
      data: new Blob(['csv']),
      headers: {},
    } as never);
    let downloadedFilename: string | undefined;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      });
    const user = userEvent.setup();

    renderPreview();
    await user.click(screen.getByRole('button', { name: '輸出 CSV' }));

    await waitFor(() => expect(clickSpy).toHaveBeenCalled());
    expect(downloadedFilename).toBe('batch-001.csv');
  });

  it('viewer 不顯示 CSV 匯出按鈕', async () => {
    useAuthStore.setState({
      user: {
        user_id: 'user-002',
        user_no: 'V001',
        display_name: '查閱者',
        email: 'viewer@example.com',
        department: 'Test',
        division: 'FA',
        role: 'viewer',
        is_active: true,
        last_login_at: '2026-10-22T10:00:00Z',
      },
    });

    renderPreview();

    expect(screen.queryByRole('button', { name: '輸出 CSV' })).not.toBeInTheDocument();
    await screen.findByText('SHORT_IO');
  });

  it('載入後預設全選 Site、顯示統計並且全選不傳 sites', async () => {
    renderPreview();

    expect(await screen.findByText('SHORT_IO')).toBeInTheDocument();
    expect(screen.getByText('>spec_max')).toBeInTheDocument();
    expect(screen.getByText('符合 2 列（共 2 列）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Site 篩選：2/2' })).toBeInTheDocument();
    expect(getFailSampleImportRows).toHaveBeenCalledWith('batch-001', {
      sort_by: 'site',
      sort_order: 'asc',
      page: 1,
      page_size: 100,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Site 篩選：2/2' }));
    expect(await screen.findByRole('checkbox', { name: /Site 1/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Site 2/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Site 1.*3 顆.*1 列/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Site 2.*4 顆.*1 列/ })).toBeChecked();
    expect(getFailSampleImportRows).toHaveBeenCalledTimes(1);
  });

  it('部分勾選 Site 時傳送 sites 參數並回到第 1 頁', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByText('SHORT_IO');

    await user.click(screen.getByRole('button', { name: 'Site 篩選：2/2' }));
    await user.click(screen.getByRole('checkbox', { name: /Site 1/ }));

    await waitFor(() => {
      expect(getFailSampleImportRows).toHaveBeenLastCalledWith('batch-001', {
        sites: ['2'],
        sort_by: 'site',
        sort_order: 'asc',
        page: 1,
        page_size: 100,
      });
    });
    expect(screen.getByRole('button', { name: 'Site 篩選：1/2' })).toBeInTheDocument();
  });

  it('全部清除 Site 時不發 API 並顯示空狀態', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByText('SHORT_IO');
    const callCount = vi.mocked(getFailSampleImportRows).mock.calls.length;

    await user.click(screen.getByRole('button', { name: 'Site 篩選：2/2' }));
    await user.click(screen.getByRole('button', { name: '全部清除' }));

    expect(await screen.findByText('未選取任何 Site')).toBeInTheDocument();
    expect(screen.getByText('符合 0 列（共 0 列）')).toBeInTheDocument();
    expect(getFailSampleImportRows).toHaveBeenCalledTimes(callCount);
  });

  it('site_stats 缺漏某 Site 時顯示破折號容錯', async () => {
    vi.mocked(getFailSampleImportRows).mockResolvedValueOnce({
      data: {
        code: 0,
        message: 'OK',
        data: {
          ...rowsResponse,
          site_stats: [{ site: '1', dut_count: 3, row_count: 1 }],
        },
      },
    } as never);
    const user = userEvent.setup();
    renderPreview();
    await screen.findByText('SHORT_IO');

    await user.click(screen.getByRole('button', { name: 'Site 篩選：2/2' }));
    expect(screen.getByRole('checkbox', { name: /Site 1.*3 顆.*1 列/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Site 2.*— 顆.*— 列/ })).toBeChecked();
  });

  it('搜尋會 debounce 並以 q 送出 rows 查詢', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByText('SHORT_IO');

    const search = screen.getByRole('textbox', { name: '搜尋 Fail Sample 明細' });
    await user.type(search, 'serial');

    await waitFor(() => {
      expect(getFailSampleImportRows).toHaveBeenLastCalledWith('batch-001', {
        q: 'serial',
        sort_by: 'site',
        sort_order: 'asc',
        page: 1,
        page_size: 100,
      });
    }, { timeout: 1000 });
  });

  it('點擊欄位標題會切換後端排序欄位與順序', async () => {
    const user = userEvent.setup();
    renderPreview();
    await screen.findByText('SHORT_IO');

    await user.click(screen.getByRole('button', { name: 'value' }));
    await waitFor(() => {
      expect(getFailSampleImportRows).toHaveBeenLastCalledWith('batch-001', {
        sort_by: 'value',
        sort_order: 'asc',
        page: 1,
        page_size: 100,
      });
    });

    await user.click(screen.getByRole('button', { name: 'value' }));
    await waitFor(() => {
      expect(getFailSampleImportRows).toHaveBeenLastCalledWith('batch-001', {
        sort_by: 'value',
        sort_order: 'desc',
        page: 1,
        page_size: 100,
      });
    });
  });

  it('rows API 失敗時顯示後端訊息', async () => {
    vi.mocked(getFailSampleImportRows).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          detail: {
            code: 1003,
            message: '批次不存在',
          },
        },
      },
    });

    renderPreview();

    expect(await screen.findByText('批次不存在')).toBeInTheDocument();
  });
});
