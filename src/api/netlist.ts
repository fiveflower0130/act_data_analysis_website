import type { ApiResponse, StackingDieLayer, TraySpec } from '../types/api';
import apiClient from './client';

/** GET /api/v1/netlist/programs/{test_program}/stacking-die */
export const getStackingDie = (testProgram: string) =>
  apiClient.get<ApiResponse<StackingDieLayer[]>>(
    `/api/v1/netlist/programs/${encodeURIComponent(testProgram)}/stacking-die`,
  );

/** GET /api/v1/netlist/programs/{test_program}/tray */
export const getTray = (testProgram: string) =>
  apiClient.get<ApiResponse<TraySpec>>(
    `/api/v1/netlist/programs/${encodeURIComponent(testProgram)}/tray`,
  );
