import { describe, expect, it } from 'vitest';
import {
  filterPreviewRows,
  paginatePreviewRows,
  resolveDieUnity,
  sortPreviewRows,
} from '../../src/features/netlist/utils/previewHelpers';

describe('previewHelpers', () => {
  const rows = [
    { package_pin: 'A2', count: 10 },
    { package_pin: 'A1', count: 2 },
    { package_pin: 'B1', count: 20 },
  ];

  it('以所有欄位進行不分大小寫搜尋', () => {
    expect(filterPreviewRows(rows, 'a1')).toEqual([{ package_pin: 'A1', count: 2 }]);
  });

  it('依數字欄位排序並支援分頁', () => {
    const sorted = sortPreviewRows(rows, { key: 'count', order: 'ascend' });
    expect(sorted.map((row) => row.count)).toEqual([2, 10, 20]);
    expect(paginatePreviewRows(sorted, 2, 2)).toEqual([{ package_pin: 'B1', count: 20 }]);
  });

  it('以 die_pin_raw 去除最後一個點號後對應 unity', () => {
    expect(
      resolveDieUnity('CA0.F15', 'CA0', [
        { die_pin: 'CA0', unity_no: 'U1' },
      ]),
    ).toBe('U1');
    expect(
      resolveDieUnity('A.B.C', null, [
        { die_pin: 'A.B', unity_no: 'U2' },
      ]),
    ).toBe('U2');
    expect(resolveDieUnity('UNKNOWN.F15', null, [])).toBe('');
  });
});
