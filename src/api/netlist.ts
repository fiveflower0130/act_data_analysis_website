import type { AxiosProgressEvent } from 'axios';
import type {
  ApiResponse,
  BinNameItem,
  BinPriorityItem,
  DieMappingItem,
  NetlistConnection,
  NetlistProgram,
  NetlistSheetInfo,
  NetlistUploadResult,
  StackingDieLayer,
  TestSpecItem,
  TraySpec,
} from '../types/api';
import apiClient from './client';

const netlistProgramPath = (testProgram: string, resource: string) =>
  `/api/v1/netlist/programs/${encodeURIComponent(testProgram)}/${resource}`;

/** GET /api/v1/netlist/programs */
export const getNetlistPrograms = () =>
  apiClient.get<ApiResponse<NetlistProgram[]>>('/api/v1/netlist/programs');

/** GET /api/v1/netlist/programs/{test_program}/sheets */
export const getNetlistSheets = (testProgram: string) =>
  apiClient.get<ApiResponse<NetlistSheetInfo[]>>(
    netlistProgramPath(testProgram, 'sheets'),
  );

/** POST /api/v1/netlist/upload */
export const uploadNetlist = (
  file: File,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<ApiResponse<NetlistUploadResult>>('/api/v1/netlist/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...(onUploadProgress ? { onUploadProgress } : {}),
  });
};

/** GET /api/v1/netlist/programs/{test_program}/netlist */
export const getNetlistConnections = (testProgram: string) =>
  apiClient.get<ApiResponse<NetlistConnection[]>>(
    netlistProgramPath(testProgram, 'netlist'),
  );

/** GET /api/v1/netlist/programs/{test_program}/test-spec */
export const getTestSpec = (testProgram: string) =>
  apiClient.get<ApiResponse<TestSpecItem[]>>(
    netlistProgramPath(testProgram, 'test-spec'),
  );

/** GET /api/v1/netlist/programs/{test_program}/die-mapping */
export const getDieMapping = (testProgram: string) =>
  apiClient.get<ApiResponse<DieMappingItem[]>>(
    netlistProgramPath(testProgram, 'die-mapping'),
  );

/** GET /api/v1/netlist/programs/{test_program}/bin-name */
export const getBinName = (testProgram: string) =>
  apiClient.get<ApiResponse<BinNameItem[]>>(
    netlistProgramPath(testProgram, 'bin-name'),
  );

/** GET /api/v1/netlist/programs/{test_program}/bin-priority */
export const getBinPriority = (testProgram: string) =>
  apiClient.get<ApiResponse<BinPriorityItem[]>>(
    netlistProgramPath(testProgram, 'bin-priority'),
  );

/** GET /api/v1/netlist/programs/{test_program}/stacking-die */
export const getStackingDie = (testProgram: string) =>
  apiClient.get<ApiResponse<StackingDieLayer[]>>(netlistProgramPath(testProgram, 'stacking-die'));

/** GET /api/v1/netlist/programs/{test_program}/tray */
export const getTray = (testProgram: string) =>
  apiClient.get<ApiResponse<TraySpec>>(netlistProgramPath(testProgram, 'tray'));
