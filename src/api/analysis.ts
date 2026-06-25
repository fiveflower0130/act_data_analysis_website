import type { ApiResponse, FailSampleResult } from '../types/api';
import apiClient from './client';

/** GET /api/v1/analysis/fail-sample */
export const getFailSample = (lotId: string, hbin: number) =>
  apiClient.get<ApiResponse<FailSampleResult>>('/api/v1/analysis/fail-sample', {
    params: { lot_id: lotId, hbin },
  });

/** GET /api/v1/analysis/fail-sample-power（結構與 fail-sample 相同，die_no 固定為 "All"）*/
export const getFailSamplePower = (lotId: string, hbin: number) =>
  apiClient.get<ApiResponse<FailSampleResult>>('/api/v1/analysis/fail-sample-power', {
    params: { lot_id: lotId, hbin },
  });
