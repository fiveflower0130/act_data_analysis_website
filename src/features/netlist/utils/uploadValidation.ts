import type { UploadTheme } from '../../../stores/uploadStore';

export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024;

export const getAcceptedExtension = (theme: UploadTheme) =>
  theme === 'netlist' ? '.xlsx' : '.json';

export const getFilenameRule = (theme: UploadTheme) =>
  theme === 'netlist'
    ? 'NL-{Test_Program}_({Security}).xlsx'
    : '{Test_Program}_{Lot_ID}_{Wafer_ID}_{AT|RT}_{14位數字}.json（Wafer_ID 目前多為空值，故常見雙底線）';

export type UploadFileValidation =
  | { valid: true }
  | { valid: false; reason: 'extension'; message: string }
  | { valid: false; reason: 'filename'; message: string }
  | { valid: false; reason: 'size'; message: string };

const getFileExtension = (fileName: string) => {
  const extensionIndex = fileName.lastIndexOf('.');
  return extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : '';
};

/**
 * 檔名規則採寬鬆比對：Test Program 與 Lot ID 可能含有底線或其他
 * 後端允許字元，因此以分隔符、模式與 14 位數時間戳為必要條件。
 *
 * Fail Sample 檔名實際格式為 `{Test_Program}_{Lot_ID}_{Wafer_ID}_{AT|RT}_{14位數字}.json`，
 * `Wafer_ID` 目前產線幾乎皆為空值，因此常見的 `__`（雙底線）其實是「空的 Wafer_ID」，
 * 並非固定的雙底線分隔符；此處以 `.*` 容許 Wafer_ID 為空或任意內容。
 */
export const matchesUploadFilename = (theme: UploadTheme, fileName: string) => {
  if (theme === 'netlist') {
    return /^NL-.+_(?:\((?:Security\s+)?[A-Za-z0-9]+\)|(?:Security\s+)?[A-Za-z0-9]+)\.xlsx$/i.test(
      fileName,
    );
  }

  return /^.+_.+_.*_(?:AT|RT)_\d{14}\.json$/i.test(fileName);
};

export const validateUploadFile = (
  theme: UploadTheme,
  file: Pick<File, 'name' | 'size'>,
): UploadFileValidation => {
  const acceptedExtension = getAcceptedExtension(theme);
  if (getFileExtension(file.name) !== acceptedExtension) {
    return {
      valid: false,
      reason: 'extension',
      message: `檔案格式不符合需求（本主題僅接受 ${acceptedExtension}）`,
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return {
      valid: false,
      reason: 'size',
      message: '檔案超過 5MB',
    };
  }

  if (!matchesUploadFilename(theme, file.name)) {
    return {
      valid: false,
      reason: 'filename',
      message: `檔名格式不符（應為 ${getFilenameRule(theme)}）`,
    };
  }

  return { valid: true };
};
