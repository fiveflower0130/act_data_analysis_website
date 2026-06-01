/**
 * API 統一回應格式（來源：api-contract-structure.instructions.md）
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** 錯誤代碼 */
export const ApiErrorCode = {
  Unknown: 1,
  Unauthorized: 1001,
  Forbidden: 1002,
  NotFound: 1003,
  ValidationError: 1004,
  LdapError: 1005,
  FileFormatError: 1007,
  DatabaseError: 1008,
} as const;

/** 使用者角色 */
export type UserRole = 'viewer' | 'engineer' | 'admin';

/** 登入 Request */
export interface LoginRequest {
  user_no: string;
  password: string;
}

/** 登入 Response */
export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  user_no: string;
  display_name: string;
  role: UserRole;
}

/** 當前使用者資訊 */
export interface UserInfo {
  user_id: string;
  user_no: string;
  display_name: string;
  email: string;
  department: string;
  division: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string;
}

/** HBIN 故障類型 */
export const HBin = {
  Open: 2,
  Short: 3,
  Leak: 4,
  Function: 5,
} as const;

export type HBinValue = (typeof HBin)[keyof typeof HBin];

export const HBinLabel: Record<HBinValue, string> = {
  2: 'Open',
  3: 'Short',
  4: 'Leak',
  5: 'Function',
};

/** ACT 批次 Site 基本資訊 */
export interface LotSiteInfo {
  file_id: number;
  lot_id: string;
  site_id: string;
  execution_mode: string;
  date: string;
  tester: string;
  customer: string;
  test_program: string;
}

/** Netlist Program 資訊 */
export interface NetlistProgram {
  id: number;
  test_program: string;
  filename: string;
  security_level: string | null;
  uploaded_at: string;
  updated_at: string;
}

/** Fail Sample 單筆資料 */
export interface FailSampleItem {
  dut_no: number;
  ball_name: string[];
  die_no: string[];
  bond_finger: string[];
}

/** Fail Sample List 分析結果 */
export interface FailSampleResult {
  lot_id: string;
  hbin: number;
  test_program: string;
  total_duts: number;
  fail_sample: FailSampleItem[];
}

/** Tray 規格 */
export interface TraySpec {
  col_count: number;
  row_count: number;
}

/** Stacking Die 層次 */
export interface StackingDieLayer {
  layer_no: number;
  unity_no: string;
  is_substrate: boolean;
}
