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
  /** LDAP 帳號驗證失敗（帳號或密碼錯誤），HTTP 401 */
  LdapAuthFailed: 1005,
  FileFormatError: 1007,
  DatabaseError: 1008,
  /** LDAP 服務不可用（連線失敗），HTTP 503 */
  LdapServiceError: 1009,
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
  /** Rolling Refresh Token，有效期 7 天（P1-2） */
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user_no: string;
  display_name: string;
  role: UserRole;
}

/** Refresh Token Request（P1-2） */
export interface RefreshRequest {
  refresh_token: string;
}

/** Refresh Token Response（P1-2） */
export interface RefreshResponse {
  access_token: string;
  /** 新的 refresh token（舊的同時失效） */
  refresh_token: string;
  expires_in: number;
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
  /** MongoDB 查得的 Fail DUT 總數（含 VDD），新增於 2026-06-06 */
  total_qty: number;
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

/** /data/search 回應中各測項的超規詳情 */
export interface TestItemResult {
  value: string;
  fail_reason: string;
  spec_max: string;
  spec_min: string;
  unit: string;
}

/** /data/search 回應中單一 DUT 的測試結果（含動態測項 key） */
export type TestResultValueItem = {
  serial_no: string;
  site_id: number;
  hbin: string;
  flag: number;
  real_time: string;
} & Record<string, string | number | TestItemResult>;

/** /data/search 回應中單一 Site 專屬的基本資訊（批次共用欄位已提升至 SearchResult 最外層） */
export interface SiteSummaryInfo {
  site_id: string;
  site_qty: number;
}

/** /data/search 回應中單一 Site 的資料 */
export interface SiteSearchResult {
  lot_info: SiteSummaryInfo;
  test_result_value: TestResultValueItem[];
}

/**
 * GET /api/v1/data/search 回應（2026-08-05 起：批次共用欄位提升至最外層，
 * 與 Fail Sample Import 的 `GET /data/fail-sample-import/{batch_id}` 格式一致）
 */
export interface SearchResult {
  customer: string;
  test_program: string;
  lot_id: string;
  wafer_id: string | null;
  hbin: number;
  execution_mode: string;
  tester: string;
  date: string;
  qty: number;
  sites: SiteSearchResult[];
}

/** Dashboard 搜尋歷史記錄 */
export interface SearchHistoryEntry {
  lotId: string;
  searchedAt: string; // ISO string（Zustand persist 序列化友好）
  hasAnyFail: boolean; // 是否有任一 HBIN 有 fail 資料（用於顯示 正常/警告 badge）
}
