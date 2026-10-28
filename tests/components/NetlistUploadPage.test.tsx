import { ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  getFailSampleImportList: vi.fn(),
  getFailSampleImportRows: vi.fn(),
  uploadFailSampleImport: vi.fn(),
  downloadFailSampleImportCsv: vi.fn(),
}));
vi.mock('../../src/api/netlist', () => ({
  getNetlistPrograms: vi.fn(),
  getNetlistSheets: vi.fn(),
  uploadNetlist: vi.fn(),
  getNetlistConnections: vi.fn(),
  getTestSpec: vi.fn(),
  getDieMapping: vi.fn(),
  getBinName: vi.fn(),
  getBinPriority: vi.fn(),
  getStackingDie: vi.fn(),
  getTray: vi.fn(),
}));
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import { getFailSampleImportList, uploadFailSampleImport } from '../../src/api/data';
import { getNetlistPrograms, getNetlistSheets, uploadNetlist } from '../../src/api/netlist';
import NetlistUploadPage from '../../src/features/netlist/NetlistUploadPage';
import useUploadStore from '../../src/stores/uploadStore';

const renderPage = () =>
  render(
    <ConfigProvider>
      <NetlistUploadPage />
    </ConfigProvider>,
  );

const resetStore = () => {
  useUploadStore.setState({
    activeTheme: 'fail-sample',
    queues: { netlist: [], 'fail-sample': [] },
    netlistPrograms: [],
    failSampleImports: [],
    failSampleTotal: 0,
    failSampleQuery: { limit: 10, offset: 0 },
    netlistSheetCache: {},
    netlistSheetMetaCache: {},
    failSampleRowsCache: {},
    isLoading: false,
    isUploading: false,
    uploadingByTopic: { netlist: false, 'fail-sample': false },
    error: null,
  });
};

describe('NetlistUploadPage v7', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    vi.mocked(getNetlistPrograms).mockResolvedValue({
      data: { code: 0, message: 'OK', data: [] },
    } as never);
    vi.mocked(getFailSampleImportList).mockResolvedValue({
      data: { code: 0, message: 'OK', data: { items: [], total: 0, limit: 10, offset: 0 } },
    } as never);
    vi.mocked(getNetlistSheets).mockResolvedValue({
      data: { code: 0, message: 'OK', data: [] },
    } as never);
    vi.mocked(uploadNetlist).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: {
          test_program: 'TP-001',
          filename: 'NL-TP-001_(C).xlsx',
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

  it('預設顯示 Fail Sample，切換主題後顯示各自的上傳設定', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: '上傳主題' })).toBeInTheDocument();
    expect(screen.getAllByText('Fail Sample').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('搜尋 Lot ID / test_program / 檔名')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Netlist', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByPlaceholderText('搜尋檔名 / test_program')).toBeInTheDocument();
  });

  it('開啟 Drawer 後加入檔案，全部上傳會呼叫 Fail Sample API', async () => {
    const user = userEvent.setup();
    const file = new File(
      ['{"lot_id":"LOT-001","hbin":3,"sites":[{}]}'],
      'TP-001_LOT-001__RT_20261022123456.json',
      { type: 'application/json' },
    );
    renderPage();

    await user.click(screen.getAllByRole('button', { name: /上傳檔案（0）/ })[0]);
    expect(screen.getByText('上傳佇列')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput as HTMLInputElement, file);

    expect(await screen.findByText(file.name)).toBeInTheDocument();
    expect(screen.getByText('待上傳')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '全部上傳（1）' }));

    await waitFor(() => {
      expect(uploadFailSampleImport).toHaveBeenCalledWith(
        { lot_id: 'LOT-001', hbin: 3, sites: [{}] },
        file.name,
        expect.any(Function),
      );
    });
    expect(await screen.findByText('匯入成功')).toBeInTheDocument();
  });

  it('切換主題後仍保留原主題的 queue', async () => {
    const user = userEvent.setup();
    const file = new File(
      ['{"lot_id":"LOT-001","hbin":3,"sites":[{}]}'],
      'TP-001_LOT-001__RT_20261022123456.json',
    );
    renderPage();

    await user.click(screen.getAllByRole('button', { name: /上傳檔案（0）/ })[0]);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);
    expect(await screen.findByText(file.name)).toBeInTheDocument();

    const closeButton = document.querySelector('.ant-drawer-close') as HTMLElement;
    await user.click(closeButton);
    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Netlist', { selector: '.ant-select-item-option-content' }));
    expect(screen.getAllByRole('button', { name: /上傳檔案（0）/ }).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: /上傳檔案（0）/ })[0]);
    expect(screen.queryByText(file.name)).not.toBeInTheDocument();
    await user.click(document.querySelector('.ant-drawer-close') as HTMLElement);
    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Fail Sample', { selector: '.ant-select-item-option-content' }));
    expect(screen.getAllByRole('button', { name: /上傳檔案（1）/ }).length).toBeGreaterThan(0);
  });

  it('清單卡片顯示 uploaded_by 工號並可選取預覽', async () => {
    vi.mocked(getNetlistPrograms).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: [
          {
            id: 1,
            test_program: 'TP-001',
            filename: 'NL-TP-001_(C).xlsx',
            security_level: 'C',
            uploaded_by: 'E001',
            uploaded_at: '2026-09-01T08:00:00Z',
            updated_at: '2026-09-01T08:00:00Z',
          },
        ],
      },
    } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('combobox', { name: '上傳主題' }));
    await user.click(await screen.findByText('Netlist', { selector: '.ant-select-item-option-content' }));
    expect(await screen.findByText('上傳者：E001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '預覽 TP-001' }));
    expect((await screen.findAllByText('NL-TP-001_(C).xlsx')).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '已上傳檔案' })).toBeInTheDocument();
  });

  it('Fail Sample 清單搜尋以 q debounce 傳給後端並使用回傳 total', async () => {
    const user = userEvent.setup();
    renderPage();

    const search = screen.getByRole('textbox', {
      name: '搜尋 Lot ID、test_program 或檔名',
    });
    await user.type(search, 'LOT-001');

    await waitFor(() => {
      expect(getFailSampleImportList).toHaveBeenLastCalledWith({
        q: 'LOT-001',
        limit: 10,
        offset: 0,
      });
    }, { timeout: 1000 });
  });
});
