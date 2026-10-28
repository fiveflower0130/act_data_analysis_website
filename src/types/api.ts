/**
 * API 統一回應格式（來源：api-contract-structure.instructions.md）
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/** FastAPI HTTPException 使用的巢狀錯誤資料格式 */
export interface ApiErrorDetail {
  code?: number;
  message?: string;
  data?: unknown;
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
  /** 查詢對象存在，但對應的 Netlist 尚未上傳 */
  NetlistUnavailable: 1010,
  /** 上傳檔案超過 2 MB，HTTP 400 */
  FileTooLarge: 1011,
  /** 上傳檔名格式錯誤，HTTP 400 */
  FilenameFormatError: 1012,
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
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
}

/** Netlist 預覽 Sheet 筆數資訊 */
export interface NetlistSheetInfo {
  name: NetlistSheetName;
  row_count: number;
}

/** Netlist 預覽可選的資料表 */
export const NetlistSheet = {
  Netlist: 'Netlist',
  TestSpec: 'Test_Spec',
  BinPriority: 'Bin_Priority',
  BinName: 'Bin_Name',
  StackingDie: 'Stacking_Die',
  Tray: 'Tray',
} as const;

export type NetlistSheetName = (typeof NetlistSheet)[keyof typeof NetlistSheet];

/** Netlist 上傳結果 */
export interface NetlistUploadResult {
  test_program: string;
  filename: string;
  security_level: string | null;
  action: 'created' | 'updated';
}

/** Fail Sample Import 清單查詢參數 */
export interface FailSampleImportListParams {
  lot_id?: string;
  hbin?: number;
  execution_mode?: string;
  date_from?: string;
  date_to?: string;
  /** 對 lot_id／test_program／source_file 做不分大小寫的模糊 OR 搜尋 */
  q?: string;
  limit?: number;
  offset?: number;
}

/** Fail Sample Import 批次摘要（清單不含 sites 明細） */
export interface FailSampleImportBatchSummary {
  batch_id: string;
  customer: string;
  test_program: string;
  lot_id: string;
  wafer_id: string | null;
  hbin: number;
  execution_mode: string;
  tester: string;
  date: string;
  qty: number;
  imported_at: string;
  source_file: string | null;
  uploaded_by: string | null;
}

/** Fail Sample Import 清單回應 */
export interface FailSampleImportListResponse {
  items: FailSampleImportBatchSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** Fail Sample Import 批次完整資料 */
export interface FailSampleImportDetail extends SearchResult {
  batch_id: string;
  imported_at: string;
  source_file: string | null;
  uploaded_by: string | null;
}

/** Fail Sample Import 上傳結果 */
export interface FailSampleImportUploadResult {
  batch_id: string;
  chunk_count: number;
  site_count: number;
  test_result_value_count: number;
}

/** Fail Sample 明細列可排序欄位 */
export const FailSampleImportRowField = {
  Site: 'site',
  SerialNo: 'serial_no',
  RealTime: 'real_time',
  TestItem: 'test_item',
  Value: 'value',
  SpecMin: 'spec_min',
  SpecMax: 'spec_max',
  Unit: 'unit',
  Pin1: 'pin_1',
  Pin2: 'pin_2',
  FailReason: 'fail_reason',
  Ihbin: 'ihbin',
} as const;

export type FailSampleImportRowField =
  (typeof FailSampleImportRowField)[keyof typeof FailSampleImportRowField];

export type FailSampleImportRowSortOrder = 'asc' | 'desc';

/** GET /data/fail-sample-import/{batch_id}/rows 查詢參數 */
export interface FailSampleImportRowsParams {
  sites?: string[];
  q?: string;
  sort_by?: FailSampleImportRowField;
  sort_order?: FailSampleImportRowSortOrder;
  page?: number;
  page_size?: number;
}

/** GET /data/fail-sample-import/{batch_id}/rows 單筆明細 */
export interface FailSampleImportRow {
  site: string;
  serial_no: string;
  real_time: string;
  test_item: string;
  value: string;
  spec_min: string;
  spec_max: string;
  unit: string;
  pin_1: string;
  pin_2: string;
  fail_reason: string;
  ihbin: string;
}

/** GET /data/fail-sample-import/{batch_id}/rows Site 統計 */
export interface FailSampleImportSiteStat {
  site: string;
  dut_count: number;
  row_count: number;
}

/** GET /data/fail-sample-import/{batch_id}/rows 回應 */
export interface FailSampleImportRowsResponse {
  total: number;
  filtered_total: number;
  sites: string[];
  items: FailSampleImportRow[];
  page: number;
  page_size: number;
  /** 各 Site 的整批統計；後端回傳順序與 sites 一致 */
  site_stats: FailSampleImportSiteStat[];
}

/** 使用者清單項目（欄位 id 與 UserInfo.user_id 不同） */
export interface UserListItem {
  id: string;
  user_no: string;
  display_name: string;
  email: string;
  department: string;
  division: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string;
}

/** 使用者清單查詢參數 */
export interface UserListParams {
  skip?: number;
  limit?: number;
}

/** GET /netlist/programs/{test_program}/netlist */
export interface NetlistConnection {
  package_pin: string | null;
  bond_finger: string | null;
  die_pin: string | null;
  die_pin_raw?: string | null;
  net_name: string | null;
  unity_no?: string | null;
}

/** GET /netlist/programs/{test_program}/test-spec */
export interface TestSpecItem {
  item_name: string;
  fail_bin_code_min: number | string | null;
  fail_bin_code_max: number | string | null;
  relax: boolean | string | null;
  relax_min: number | string | null;
  relax_max: number | string | null;
}

/** GET /netlist/programs/{test_program}/die-mapping */
export interface DieMappingItem {
  die_pin: string;
  unity_no: string;
}

/** GET /netlist/programs/{test_program}/bin-name */
export interface BinNameItem {
  sw_bin_no: number | string;
  sw_bin_name: string | null;
  hw_bin_no: number | string;
  hw_bin_name: string | null;
  bin_test_type: string | null;
}

/** GET /netlist/programs/{test_program}/bin-priority */
export interface BinPriorityItem {
  hw_bin_no: number | string;
  hw_bin_name: string | null;
  bin_test_type: string | null;
  priority_no: number | string;
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
