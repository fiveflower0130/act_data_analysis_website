import type { ApiResponse, StackingDieLayer } from '../types/api';
import apiClient from './client';

/** GET /api/v1/netlist/programs/{test_program}/stacking-die
 *  取得指定 Test Program 的疊層 Die 結構（layer_no、unity_no、is_substrate）
 */
export const getStackingDie = (testProgram: string) =>
  apiClient.get<ApiResponse<StackingDieLayer[]>>(
    `/api/v1/netlist/programs/${encodeURIComponent(testProgram)}/stacking-die`,
  );
