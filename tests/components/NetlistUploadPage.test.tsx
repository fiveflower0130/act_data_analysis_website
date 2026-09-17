import { ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  getFailSampleImportList: vi.fn(),
  uploadFailSampleImport: vi.fn(),
}));
vi.mock('../../src/api/netlist', () => ({
  getNetlistPrograms: vi.fn(),
  uploadNetlist: vi.fn(),
}));
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import { getFailSampleImportList, uploadFailSampleImport } from '../../src/api/data';
import { getNetlistPrograms, uploadNetlist } from '../../src/api/netlist';
import NetlistUploadPage from '../../src/features/netlist/NetlistUploadPage';
import useUploadStore from '../../src/stores/uploadStore';

const renderPage = () =>
  render(
    <ConfigProvider>
      <NetlistUploadPage />
    </ConfigProvider>,
  );

describe('NetlistUploadPage', () => {
  beforeEach(() => {
    useUploadStore.setState({
      activeTheme: 'netlist',
      netlistPrograms: [],
      failSampleImports: [],
      uploadQueue: [],
      isLoading: false,
      isUploading: false,
      error: null,
    });
    vi.clearAllMocks();
    vi.mocked(getNetlistPrograms).mockResolvedValue({
      data: { code: 0, message: 'OK', data: [] },
    } as never);
    vi.mocked(getFailSampleImportList).mockResolvedValue({
      data: { code: 0, message: 'OK', data: { items: [], total: 0, limit: 50, offset: 0 } },
    } as never);
    vi.mocked(uploadNetlist).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: {
          test_program: 'TP-001',
          filename: 'NL-TP-001_C.xlsx',
          security_level: 'C',
          action: 'created',
        },
      },
    } as never);
    vi.mocked(uploadFailSampleImport).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: {
          batch_id: 'batch-001',
          chunk_count: 1,
          site_count: 1,
          test_result_value_count: 1,
        },
      },
    } as never);
  });

  it('切換上傳主題後左右欄提示與清單內容同步改變', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('NL-{Test_Program}_{Security}.xlsx')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜尋檔名 / test_program')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Fail Sample', { selector: '.ant-select-item-option-content' }));

    expect(screen.getByText('Fail Sample 匯入資料（.json）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜尋 Lot ID / test_program')).toBeInTheDocument();
    expect(screen.getByText(/重複上傳同一批資料將建立獨立新批次/)).toBeInTheDocument();
  });

  it('選擇檔案加入佇列，按全部上傳後呼叫 Netlist API', async () => {
    const user = userEvent.setup();
    const file = new File(['xlsx content'], 'NL-TP-001_C.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    renderPage();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);

    expect(await screen.findByText('NL-TP-001_C.xlsx')).toBeInTheDocument();
    expect(screen.getByText('待上傳')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '全部上傳' }));

    await waitFor(() => {
      expect(uploadNetlist).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByText('成功')).toBeInTheDocument();
  });

  it('切換至 Fail Sample 後解析 JSON 並呼叫對應 API', async () => {
    const user = userEvent.setup();
    const file = new File(['{"lot_id":"LOT-001","sites":[{}]}'], 'sample.json', {
      type: 'application/json',
    });
    renderPage();

    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Fail Sample', { selector: '.ant-select-item-option-content' }));

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);

    expect(await screen.findByText('sample.json')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '全部上傳' }));

    await waitFor(() => {
      expect(uploadFailSampleImport).toHaveBeenCalledWith(
        { lot_id: 'LOT-001', sites: [{}] },
        'sample.json',
      );
    });
    expect(await screen.findByText('成功')).toBeInTheDocument();
  });

  it('清單直接顯示 uploaded_by 工號', async () => {
    vi.mocked(getNetlistPrograms).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: [
          {
            id: 1,
            test_program: 'TP-001',
            filename: 'NL-TP-001_C.xlsx',
            security_level: 'C',
            uploaded_by: 'E001',
            uploaded_at: '2026-09-01T08:00:00Z',
            updated_at: '2026-09-01T08:00:00Z',
          },
        ],
      },
    } as never);
    vi.mocked(getFailSampleImportList).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: {
          items: [
            {
              batch_id: 'batch-001',
              customer: 'MICRON',
              test_program: 'TP-001',
              lot_id: 'LOT-001',
              wafer_id: null,
              hbin: 3,
              execution_mode: 'RT',
              tester: 'ASE01',
              date: '2026-09-01 08:00:00',
              qty: 1,
              imported_at: '2026-09-01T08:01:00Z',
              source_file: 'sample.json',
              uploaded_by: 'E999',
            },
          ],
          total: 1,
          limit: 50,
          offset: 0,
        },
      },
    } as never);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('上傳者：E001')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Fail Sample', { selector: '.ant-select-item-option-content' }));

    expect(await screen.findByText('上傳者：E999')).toBeInTheDocument();
  });
});
