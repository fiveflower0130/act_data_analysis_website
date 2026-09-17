import type {
  ApiResponse,
  NetlistProgram,
  NetlistUploadResult,
  StackingDieLayer,
  TraySpec,
} from '../types/api';
import apiClient from './client';

/** GET /api/v1/netlist/programs */
export const getNetlistPrograms = () =>
  apiClient.get<ApiResponse<NetlistProgram[]>>('/api/v1/netlist/programs');

/** POST /api/v1/netlist/upload */
export const uploadNetlist = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ApiResponse<NetlistUploadResult>>('/api/v1/netlist/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

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
