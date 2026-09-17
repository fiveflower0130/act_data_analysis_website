import type {
  ApiResponse,
  FailSampleImportListParams,
  FailSampleImportListResponse,
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

/** POST /api/v1/data/fail-sample-import/upload */
export const uploadFailSampleImport = (payload: unknown, sourceFile?: string) =>
  apiClient.post<ApiResponse<FailSampleImportUploadResult>>(
    '/api/v1/data/fail-sample-import/upload',
    payload,
    sourceFile ? { params: { source_file: sourceFile } } : undefined,
  );
