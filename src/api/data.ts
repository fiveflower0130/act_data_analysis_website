import type { AxiosProgressEvent } from 'axios';
import type {
  ApiResponse,
  FailSampleImportDetail,
  FailSampleImportListParams,
  FailSampleImportListResponse,
  FailSampleImportRowsParams,
  FailSampleImportRowsResponse,
  FailSampleImportUploadResult,
  SearchResult,
} from '../types/api';
import apiClient from './client';

/** GET /api/v1/data/search（需要 lot_id + hbin） */
export const searchByLotAndHbin = (lotId: string, hbin: number) =>
  apiClient.get<ApiResponse<SearchResult>>('/api/v1/data/search', {
    params: { lot_id: lotId, hbin },
  });

/** GET /api/v1/data/fail-sample-import */
export const getFailSampleImportList = (params: FailSampleImportListParams = {}) =>
  apiClient.get<ApiResponse<FailSampleImportListResponse>>('/api/v1/data/fail-sample-import', {
    params,
  });

/** GET /api/v1/data/fail-sample-import/{batch_id} */
export const getFailSampleImportDetail = (batchId: string) =>
  apiClient.get<ApiResponse<FailSampleImportDetail>>(
    `/api/v1/data/fail-sample-import/${encodeURIComponent(batchId)}`,
  );

/** GET /api/v1/data/fail-sample-import/{batch_id}/rows */
export const getFailSampleImportRows = (
  batchId: string,
  params: FailSampleImportRowsParams = {},
) => {
  const { sites, ...rest } = params;
  return apiClient.get<ApiResponse<FailSampleImportRowsResponse>>(
    `/api/v1/data/fail-sample-import/${encodeURIComponent(batchId)}/rows`,
    {
      params: {
        ...rest,
        ...(sites && sites.length > 0 ? { sites: sites.join(',') } : {}),
      },
    },
  );
};

/** GET /api/v1/data/fail-sample-import/{batch_id}/csv */
export const downloadFailSampleImportCsv = (batchId: string) =>
  apiClient.get<Blob>(
    `/api/v1/data/fail-sample-import/${encodeURIComponent(batchId)}/csv`,
    { responseType: 'blob' },
  );

/** POST /api/v1/data/fail-sample-import/upload */
export const uploadFailSampleImport = (
  payload: unknown,
  sourceFile: string,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
) =>
  apiClient.post<ApiResponse<FailSampleImportUploadResult>>(
    '/api/v1/data/fail-sample-import/upload',
    payload,
    {
      params: { source_file: sourceFile },
      ...(onUploadProgress ? { onUploadProgress } : {}),
    },
  );
