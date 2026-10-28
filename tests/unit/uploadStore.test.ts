import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  getFailSampleImportList: vi.fn(),
  getFailSampleImportRows: vi.fn(),
  uploadFailSampleImport: vi.fn(),
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
vi.mock('../../src/api/analysis', () => ({
  getFailSample: vi.fn(),
  getFailSamplePower: vi.fn(),
}));
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import {
  getFailSampleImportList,
  getFailSampleImportRows,
  uploadFailSampleImport,
} from '../../src/api/data';
import { getNetlistPrograms, getNetlistSheets, uploadNetlist } from '../../src/api/netlist';
import useDashboardStore from '../../src/stores/dashboardStore';
import useUploadStore from '../../src/stores/uploadStore';

const netlistResult = {
  test_program: 'TP-001',
  filename: 'NL-TP-001_(C).xlsx',
  security_level: 'C',
  action: 'created' as const,
};

const failSampleResult = {
  batch_id: 'batch-001',
  chunk_count: 1,
  site_count: 1,
  test_result_value_count: 1,
};

const validNetlistFile = (name = 'NL-TP-001_(C).xlsx') =>
  new File(['xlsx'], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

const validFailSampleFile = (
  content = '{"lot_id":"LOT-001","hbin":3,"sites":[{}]}',
  name = 'TP-001_LOT-001__RT_20261022123456.json',
) => new File([content], name, { type: 'application/json' });

const resetStore = () => {
  useUploadStore.setState({
    activeTheme: 'netlist',
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

describe('uploadStore', () => {
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
      data: {
        code: 0,
        message: 'OK',
        data: [
          { name: 'Netlist', row_count: 10 },
          { name: 'Test_Spec', row_count: 20 },
          { name: 'Bin_Priority', row_count: 3 },
          { name: 'Bin_Name', row_count: 4 },
          { name: 'Stacking_Die', row_count: 5 },
          { name: 'Tray', row_count: 1 },
        ],
      },
    } as never);
  });

  it('依主題保留佇列，切換主題不會清空檔案', () => {
    act(() => {
      useUploadStore.getState().addFiles([validNetlistFile()]);
      useUploadStore.getState().setActiveTheme('fail-sample');
      useUploadStore.getState().addFiles([validFailSampleFile()]);
    });

    expect(useUploadStore.getState().queues.netlist).toHaveLength(1);
    expect(useUploadStore.getState().queues['fail-sample']).toHaveLength(1);
    expect(useUploadStore.getState().activeTheme).toBe('fail-sample');

    act(() => {
      useUploadStore.getState().setActiveTheme('netlist');
      useUploadStore.getState().removeQueueItem(useUploadStore.getState().queues.netlist[0].id);
    });
    expect(useUploadStore.getState().queues.netlist).toHaveLength(0);
    expect(useUploadStore.getState().queues['fail-sample']).toHaveLength(1);
  });

  it('錯誤副檔名不入佇列，檔名錯誤與超大檔案則保留為失敗項目', () => {
    const tooLarge = new File(['x'], 'NL-TP-001_(C).xlsx');
    Object.defineProperty(tooLarge, 'size', { value: 2 * 1024 * 1024 + 1 });

    act(() => {
      useUploadStore.getState().addFiles([
        new File(['x'], 'not-netlist.json'),
        new File(['x'], 'wrong-name.xlsx'),
        tooLarge,
      ]);
    });

    const queue = useUploadStore.getState().queues.netlist;
    expect(queue).toHaveLength(2);
    expect(queue.every((item) => item.status === 'failed')).toBe(true);
    expect(queue[0].errorMessage).toContain('檔名格式不符');
    expect(queue[1].errorMessage).toContain('檔案超過 2MB');
  });

  it('清空佇列會移除成功與失敗項目', () => {
    act(() => {
      useUploadStore.getState().addFiles([
        validNetlistFile(),
        validNetlistFile('wrong-name.xlsx'),
      ]);
    });
    const queue = useUploadStore.getState().queues.netlist;
    expect(queue).toHaveLength(2);
    useUploadStore.setState({
      queues: {
        netlist: queue.map((item, index) => ({
          ...item,
          status: index === 0 ? 'success' : item.status,
        })),
        'fail-sample': [],
      },
    });

    act(() => {
      useUploadStore.getState().clearQueue();
    });
    expect(useUploadStore.getState().queues.netlist).toHaveLength(0);
  });

  it('Netlist 上傳成功與 HTTP 失敗時更新每筆狀態', async () => {
    vi.mocked(uploadNetlist)
      .mockResolvedValueOnce({
        data: { code: 0, message: 'OK', data: netlistResult },
      } as never)
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            detail: {
              code: 1011,
              message: '檔案超過 2 MB',
            },
          },
        },
      });

    act(() => {
      useUploadStore.getState().addFiles([
        validNetlistFile(),
        validNetlistFile('NL-TP-002_(C).xlsx'),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    const queue = useUploadStore.getState().queues.netlist;
    expect(queue[0]).toMatchObject({ fileName: 'NL-TP-001_(C).xlsx', status: 'success', result: netlistResult });
    expect(queue[1]).toMatchObject({
      fileName: 'NL-TP-002_(C).xlsx',
      status: 'failed',
      statusCode: 400,
      apiCode: 1011,
      errorMessage: '失敗：檔案超過 2 MB',
    });
    expect(useUploadStore.getState().isUploading).toBe(false);
    expect(uploadNetlist).toHaveBeenCalledTimes(2);
    expect(uploadNetlist).toHaveBeenCalledWith(queue[0].file, expect.any(Function));
  });

  it('Fail Sample JSON 解析失敗不呼叫 API，解析成功則帶入 source_file', async () => {
    vi.mocked(uploadFailSampleImport).mockResolvedValue({
      data: { code: 0, message: 'OK', data: failSampleResult },
    } as never);

    act(() => {
      useUploadStore.getState().setActiveTheme('fail-sample');
      useUploadStore.getState().addFiles([
        validFailSampleFile('{invalid', 'TP-001_LOT-001__RT_20261022123456.json'),
        validFailSampleFile(),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    const queue = useUploadStore.getState().queues['fail-sample'];
    expect(queue[0]).toMatchObject({ status: 'failed' });
    expect(queue[0].statusCode).toBeUndefined();
    expect(queue[1]).toMatchObject({ status: 'success', result: failSampleResult });
    expect(uploadFailSampleImport).toHaveBeenCalledWith(
      { lot_id: 'LOT-001', hbin: 3, sites: [{}] },
      'TP-001_LOT-001__RT_20261022123456.json',
      expect.any(Function),
    );
  });

  it('Fail Sample rows 依查詢條件快取，重複查看不重新呼叫 API', async () => {
    vi.mocked(getFailSampleImportRows).mockResolvedValue({
      data: {
        code: 0,
        message: 'OK',
        data: {
          total: 1,
          filtered_total: 1,
          sites: ['1'],
          items: [
            {
              site: '1',
              serial_no: '1',
              real_time: '2026-10-22 10:00:00',
              test_item: 'SHORT',
              value: '-0.5',
              spec_min: '-0.7',
              spec_max: '-0.3',
              unit: 'V',
              pin_1: '',
              pin_2: '',
              fail_reason: '>spec_max',
              ihbin: '3',
            },
          ],
          page: 1,
          page_size: 100,
        },
      },
    } as never);

    const params = {
      sites: ['1'],
      q: 'short',
      sort_by: 'value' as const,
      sort_order: 'desc' as const,
      page: 1,
      page_size: 100,
    };
    const first = await useUploadStore.getState().fetchFailSampleRows('batch-001', params);
    const second = await useUploadStore.getState().fetchFailSampleRows('batch-001', params);

    expect(first).toEqual(second);
    expect(getFailSampleImportRows).toHaveBeenCalledTimes(1);
    expect(getFailSampleImportRows).toHaveBeenCalledWith('batch-001', params);
  });

  it('Netlist Sheet metadata 依 test_program 快取', async () => {
    const first = await useUploadStore.getState().fetchNetlistSheets('TP-001');
    const second = await useUploadStore.getState().fetchNetlistSheets('TP-001');

    expect(first).toHaveLength(6);
    expect(second).toEqual(first);
    expect(getNetlistSheets).toHaveBeenCalledTimes(1);
    expect(useUploadStore.getState().netlistSheetMetaCache['TP-001']).toHaveLength(6);
  });

  it('Fail Sample 上傳成功後清除 Dashboard 對應 Lot 與 HBIN 快取', async () => {
    const invalidateCacheSpy = vi.spyOn(
      useDashboardStore.getState(),
      'invalidateFailSampleCache',
    );
    vi.mocked(uploadFailSampleImport).mockResolvedValue({
      data: { code: 0, message: 'OK', data: failSampleResult },
    } as never);

    act(() => {
      useUploadStore.getState().setActiveTheme('fail-sample');
      useUploadStore.getState().addFiles([
        validFailSampleFile('{"lot_id":"LOT-001","hbin":4,"sites":[{}]}'),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    expect(invalidateCacheSpy).toHaveBeenCalledWith('LOT-001', 4);
    invalidateCacheSpy.mockRestore();
  });

  it('Fail Sample 外層 data 包裝格式也能清除 Dashboard 快取', async () => {
    const invalidateCacheSpy = vi.spyOn(
      useDashboardStore.getState(),
      'invalidateFailSampleCache',
    );
    vi.mocked(uploadFailSampleImport).mockResolvedValue({
      data: { code: 0, message: 'OK', data: failSampleResult },
    } as never);

    act(() => {
      useUploadStore.getState().setActiveTheme('fail-sample');
      useUploadStore.getState().addFiles([
        validFailSampleFile(
          '{"data":{"lot_id":"LOT-002","hbin":3,"sites":[{}]}}',
          'TP-001_LOT-002__RT_20261022123456.json',
        ),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    expect(invalidateCacheSpy).toHaveBeenCalledWith('LOT-002', 3);
    invalidateCacheSpy.mockRestore();
  });
});
