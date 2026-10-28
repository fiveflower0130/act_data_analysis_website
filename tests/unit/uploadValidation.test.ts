import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_FILE_SIZE,
  matchesUploadFilename,
  validateUploadFile,
} from '../../src/features/netlist/utils/uploadValidation';

const file = (name: string, size = 10) => ({ name, size }) as File;

describe('uploadValidation', () => {
  it('接受 Fail Sample 與 Netlist 的合法檔名', () => {
    expect(matchesUploadFilename('fail-sample', 'TP_A_LOT_001__RT_20261022123456.json')).toBe(true);
    expect(matchesUploadFilename('netlist', 'NL-TP_A_(C).xlsx')).toBe(true);
    expect(matchesUploadFilename('netlist', 'NL-TP_A_C.xlsx')).toBe(true);
    expect(matchesUploadFilename('netlist', 'NL-TP_A_(Security C).xlsx')).toBe(true);
  });

  it('拒絕錯誤副檔名並回傳 extension reason', () => {
    expect(validateUploadFile('fail-sample', file('sample.xlsx'))).toMatchObject({
      valid: false,
      reason: 'extension',
    });
  });

  it('檔名格式錯誤仍保留為失敗項目', () => {
    expect(validateUploadFile('netlist', file('netlist.xlsx'))).toMatchObject({
      valid: false,
      reason: 'filename',
      message: expect.stringContaining('檔名格式不符'),
    });
  });

  it('拒絕超過 2MB 的檔案', () => {
    expect(
      validateUploadFile(
        'fail-sample',
        file('TP_LOT__AT_20261022123456.json', MAX_UPLOAD_FILE_SIZE + 1),
      ),
    ).toMatchObject({
      valid: false,
      reason: 'size',
      message: '檔案超過 2MB',
    });
  });

  it('要求 Fail Sample 檔名使用 14 位數字時間', () => {
    expect(matchesUploadFilename('fail-sample', 'TP_LOT__RT_20261022.json')).toBe(false);
    expect(validateUploadFile('fail-sample', file('TP_LOT__RT_invalid.json'))).toMatchObject({
      valid: false,
      reason: 'filename',
      message: expect.stringContaining('14位數字'),
    });
  });
});
