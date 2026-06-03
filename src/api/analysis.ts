import type { ApiResponse, FailSampleResult } from '../types/api';
import apiClient from './client';

/** GET /api/v1/analysis/fail-sample */
export const getFailSample = (lotId: string, hbin: number) =>
  apiClient.get<ApiResponse<FailSampleResult>>('/api/v1/analysis/fail-sample', {
    params: { lot_id: lotId, hbin },
  });
