import type { ApiResponse, SearchResult } from '../types/api';
import apiClient from './client';

/** GET /api/v1/data/search（需要 lot_id + hbin） */
export const searchByLotAndHbin = (lotId: string, hbin: number) =>
  apiClient.get<ApiResponse<SearchResult>>('/api/v1/data/search', {
    params: { lot_id: lotId, hbin },
  });
