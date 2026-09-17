import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/data', () => ({
  getFailSampleImportList: vi.fn(),
  uploadFailSampleImport: vi.fn(),
}));
vi.mock('../../src/api/netlist', () => ({
  getNetlistPrograms: vi.fn(),
  uploadNetlist: vi.fn(),
}));
vi.mock('../../src/api/analysis', () => ({
  getFailSample: vi.fn(),
  getFailSamplePower: vi.fn(),
}));
vi.mock('../../src/utils/logging', () => ({
  default: vi.fn(),
}));

import { getFailSampleImportList, uploadFailSampleImport } from '../../src/api/data';
import { getNetlistPrograms, uploadNetlist } from '../../src/api/netlist';
import useDashboardStore from '../../src/stores/dashboardStore';
import useUploadStore from '../../src/stores/uploadStore';

const netlistResult = {
  test_program: 'TP-001',
  filename: 'NL-TP-001_C.xlsx',
  security_level: 'C',
  action: 'created' as const,
};

const failSampleResult = {
  batch_id: 'batch-001',
  chunk_count: 1,
  site_count: 1,
  test_result_value_count: 1,
};

const resetStore = () => {
  useUploadStore.setState({
    activeTheme: 'netlist',
    netlistPrograms: [],
    failSampleImports: [],
    uploadQueue: [],
    isLoading: false,
    isUploading: false,
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
      data: { code: 0, message: 'OK', data: { items: [], total: 0, limit: 50, offset: 0 } },
    } as never);
  });

  it('新增、移除與清空佇列', () => {
    const file = new File(['content'], 'NL-TP-001_C.xlsx');

    act(() => {
      useUploadStore.getState().addFiles([file]);
    });
    expect(useUploadStore.getState().uploadQueue).toHaveLength(1);
    const queueId = useUploadStore.getState().uploadQueue[0].id;

    act(() => {
      useUploadStore.getState().removeQueueItem(queueId);
    });
    expect(useUploadStore.getState().uploadQueue).toHaveLength(0);

    act(() => {
      useUploadStore.getState().addFiles([file, file]);
      useUploadStore.getState().clearQueue();
    });
    expect(useUploadStore.getState().uploadQueue).toHaveLength(0);
  });

  it('切換上傳主題時清空佇列', () => {
    act(() => {
      useUploadStore.getState().addFiles([new File(['content'], 'file.xlsx')]);
      useUploadStore.getState().setActiveTheme('fail-sample');
    });

    expect(useUploadStore.getState().activeTheme).toBe('fail-sample');
    expect(useUploadStore.getState().uploadQueue).toHaveLength(0);
  });

  it('Netlist 上傳成功與 HTTP 失敗時更新每筆狀態', async () => {
    vi.mocked(uploadNetlist)
      .mockResolvedValueOnce({
        data: { code: 0, message: 'OK', data: netlistResult },
      } as never)
      .mockRejectedValueOnce({ response: { status: 400 }, message: '格式錯誤' });

    act(() => {
      useUploadStore.getState().addFiles([
        new File(['xlsx'], 'good.xlsx'),
        new File(['xlsx'], 'bad.xlsx'),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    const queue = useUploadStore.getState().uploadQueue;
    expect(queue[0]).toMatchObject({ fileName: 'good.xlsx', status: 'success', result: netlistResult });
    expect(queue[1]).toMatchObject({
      fileName: 'bad.xlsx',
      status: 'failed',
      statusCode: 400,
    });
    expect(useUploadStore.getState().isUploading).toBe(false);
    expect(uploadNetlist).toHaveBeenCalledTimes(2);
  });

  it('Fail Sample JSON 解析失敗不呼叫 API，解析成功則帶入 source_file', async () => {
    vi.mocked(uploadFailSampleImport).mockResolvedValue({
      data: { code: 0, message: 'OK', data: failSampleResult },
    } as never);

    act(() => {
      useUploadStore.getState().setActiveTheme('fail-sample');
      useUploadStore.getState().addFiles([
        new File(['{invalid'], 'invalid.json'),
        new File(['{"lot_id":"LOT-001","hbin":3,"sites":[{}]}'], 'valid.json'),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    const queue = useUploadStore.getState().uploadQueue;
    expect(queue[0]).toMatchObject({ status: 'failed' });
    expect(queue[0].statusCode).toBeUndefined();
    expect(queue[1]).toMatchObject({ status: 'success', result: failSampleResult });
    expect(uploadFailSampleImport).toHaveBeenCalledWith(
      { lot_id: 'LOT-001', hbin: 3, sites: [{}] },
      'valid.json',
    );
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
        new File(['{"lot_id":"LOT-001","hbin":4,"sites":[{}]}'], 'valid.json'),
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
        new File(['{"data":{"lot_id":"LOT-002","hbin":3,"sites":[{}]}}'], 'wrapped.json'),
      ]);
    });

    await act(async () => {
      await useUploadStore.getState().uploadAll();
    });

    expect(invalidateCacheSpy).toHaveBeenCalledWith('LOT-002', 3);
    invalidateCacheSpy.mockRestore();
  });

});
