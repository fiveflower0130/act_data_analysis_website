import type { DieMappingItem } from '../../../types/api';

export type SortOrder = 'ascend' | 'descend' | null;

export interface SortState {
  key: string | null;
  order: SortOrder;
}

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).toLocaleLowerCase();
};

export const filterPreviewRows = (
  rows: Record<string, unknown>[],
  query: string,
) => {
  const keyword = query.trim().toLocaleLowerCase();
  if (!keyword) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) => normalizeValue(value).includes(keyword)),
  );
};

export const sortPreviewRows = (
  rows: Record<string, unknown>[],
  sort: SortState,
) => {
  if (!sort.key || !sort.order) return rows;

  return [...rows].sort((left, right) => {
    const leftValue = left[sort.key!];
    const rightValue = right[sort.key!];
    const leftNumber = typeof leftValue === 'number' ? leftValue : Number(leftValue);
    const rightNumber = typeof rightValue === 'number' ? rightValue : Number(rightValue);
    const bothNumbers =
      leftValue !== '' &&
      rightValue !== '' &&
      Number.isFinite(leftNumber) &&
      Number.isFinite(rightNumber);
    const comparison = bothNumbers
      ? leftNumber - rightNumber
      : normalizeValue(leftValue).localeCompare(normalizeValue(rightValue), 'zh-TW');

    return sort.order === 'ascend' ? comparison : -comparison;
  });
};

export const paginatePreviewRows = <T,>(rows: T[], page: number, pageSize: number) => {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
};

const normalizeDiePin = (value: string) => {
  const normalized = value.trim();
  const lastDotIndex = normalized.lastIndexOf('.');
  return lastDotIndex > 0 ? normalized.slice(0, lastDotIndex) : normalized;
};

export const resolveDieUnity = (
  diePinRaw: string | null | undefined,
  diePin: string | null | undefined,
  mapping: DieMappingItem[],
) => {
  const candidates = [diePinRaw, diePin]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, normalizeDiePin(value)]);

  const match = mapping.find((item) => candidates.includes(item.die_pin));
  return match?.unity_no ?? '';
};

export const getPageCount = (total: number, pageSize: number) =>
  Math.max(1, Math.ceil(total / pageSize));
