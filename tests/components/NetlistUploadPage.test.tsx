import { ConfigProvider } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  deleteFailSampleImport: vi.fn(),
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

import { deleteFailSampleImport, getFailSampleImportList, uploadFailSampleImport } from '../../src/api/data';
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
    deletingBatchIds: [],
    error: null,
  });
};

const singleFailSampleItem = (overrides: Record<string, unknown> = {}) => ({
  batch_id: 'batch-001',
  customer: 'MICRON',
  test_program: 'TP-001',
  lot_id: 'LOT-001',
  wafer_id: null,
  hbin: 3,
  execution_mode: 'RT',
  tester: 'ASE07-5070-001',
  date: '2026-10-22 10:00:00',
  qty: 1,
  imported_at: '2026-10-22T10:00:01+08:00',
  source_file: 'TP-001_LOT-001__RT_20261022100000.json',
  uploaded_by: '12345',
  ...overrides,
});

const mockSingleFailSampleList = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(getFailSampleImportList).mockResolvedValue({
    data: {
      code: 0,
      message: 'OK',
      data: { items: [singleFailSampleItem(overrides)], total: 1, limit: 10, offset: 0 },
    },
  } as never);
};

// 確認區收合時採用 grid-template-rows 動畫而非移除 DOM 節點，故以 style 斷言取代
// `not.toBeInTheDocument()`。
const expectConfirmPanelCollapsed = () => {
  const title = screen.getByText('確定要刪除此 Fail Sample 批次？');
  const panel = title.closest('[role="presentation"]');
  expect(panel).toHaveStyle({ gridTemplateRows: '0fr' });
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

  it('點擊刪除按鈕會展開確認區，確認後呼叫刪除 API 並重新整理清單', async () => {
    mockSingleFailSampleList();
    vi.mocked(deleteFailSampleImport).mockResolvedValue({
      data: { code: 0, message: '刪除成功', data: { batch_id: 'batch-001', deleted: true } },
    } as never);

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: '刪除 LOT-001 批次' });
    await user.click(deleteButton);

    expect(await screen.findByText('確定要刪除此 Fail Sample 批次？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '確定刪除' }));

    await waitFor(() => {
      expect(deleteFailSampleImport).toHaveBeenCalledWith('batch-001');
    });
    expect(getFailSampleImportList).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('已刪除批次 LOT-001')).toBeInTheDocument();
  });

  it('取消刪除確認區不會呼叫刪除 API，且確認區會收合', async () => {
    mockSingleFailSampleList();

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: '刪除 LOT-001 批次' });
    await user.click(deleteButton);

    expect(await screen.findByText('確定要刪除此 Fail Sample 批次？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(deleteFailSampleImport).not.toHaveBeenCalled();
    await waitFor(() => {
      expectConfirmPanelCollapsed();
    });
  });

  it('再次點擊刪除按鈕可收合已展開的確認區', async () => {
    mockSingleFailSampleList();

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: '刪除 LOT-001 批次' });
    await user.click(deleteButton);
    expect(await screen.findByText('確定要刪除此 Fail Sample 批次？')).toBeInTheDocument();

    await user.click(deleteButton);
    await waitFor(() => {
      expectConfirmPanelCollapsed();
    });
  });

  it('展開確認區後按下 Esc 可收合', async () => {
    mockSingleFailSampleList();

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: '刪除 LOT-001 批次' });
    await user.click(deleteButton);
    expect(await screen.findByText('確定要刪除此 Fail Sample 批次？')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expectConfirmPanelCollapsed();
    });
  });

  it('刪除失敗時在確認區內顯示錯誤訊息，且不出現頁面層級 Alert', async () => {
    mockSingleFailSampleList();
    vi.mocked(deleteFailSampleImport).mockRejectedValue({
      response: { status: 404, data: 'batch not found' },
    });

    const user = userEvent.setup();
    renderPage();

    const deleteButton = await screen.findByRole('button', { name: '刪除 LOT-001 批次' });
    await user.click(deleteButton);
    await user.click(screen.getByRole('button', { name: '確定刪除' }));

    expect(await screen.findByText('batch not found')).toBeInTheDocument();
    // 確認區仍維持展開（刪除失敗不應自動收合），且錯誤只顯示一次（不應同時出現在頁面 Alert）
    expect(screen.getByText('確定要刪除此 Fail Sample 批次？')).toBeInTheDocument();
    expect(screen.getAllByText('batch not found')).toHaveLength(1);
    expect(useUploadStore.getState().error).toBeNull();
  });
});
