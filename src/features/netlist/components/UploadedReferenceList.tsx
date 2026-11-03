import { Empty, Input, Pagination, Spin, Tag, Typography } from 'antd';
import { FileText, Search, Trash2, TriangleAlert } from 'lucide-react';
import type { MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FailSampleImportBatchSummary, NetlistProgram } from '../../../types/api';
import type { FailSampleImportDeleteOutcome, UploadTheme } from '../../../stores/uploadStore';
import { useResponsiveTokens } from '../../../hooks/useResponsiveTokens';
import { useThemeColors } from '../../../hooks/useThemeColors';

const { Text, Title } = Typography;

export type SelectedUpload =
  | { theme: 'netlist'; item: NetlistProgram }
  | { theme: 'fail-sample'; item: FailSampleImportBatchSummary };

interface UploadedReferenceListProps {
  theme: UploadTheme;
  netlistPrograms: NetlistProgram[];
  failSampleImports: FailSampleImportBatchSummary[];
  total: number;
  page: number;
  searchTerm: string;
  selectedId: string | number | null;
  loading: boolean;
  deletingBatchIds?: string[];
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onSelect: (selection: SelectedUpload) => void;
  onDeleteBatch?: (batch: FailSampleImportBatchSummary) => Promise<FailSampleImportDeleteOutcome>;
}

/** 刪除動畫結束後緩衝時間（毫秒），須略大於 CSS 的 .32s 滑出動畫 */
const EXIT_ANIMATION_MS = 340;
/** 展開確認區動畫的大致時長（毫秒），結束後才做捲動定位與焦點移動 */
const EXPAND_ANIMATION_MS = 280;

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatUploader = (userNo: string | null | undefined) => userNo || '—';

const cardStyle = (selected: boolean, colors: ReturnType<typeof useThemeColors>) => ({
  display: 'block',
  width: '100%',
  padding: 10,
  marginBottom: 8,
  textAlign: 'left' as const,
  border: `1px solid ${selected ? colors.primary : colors.border}`,
  borderRadius: 8,
  background: colors.surface,
  color: colors.textPrimary,
  cursor: 'pointer',
});

const fieldStyle = (color: string) => ({
  display: 'block',
  marginTop: 4,
  color,
  fontSize: '12px',
  lineHeight: 1.45,
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  wordBreak: 'break-word' as const,
});

const confirmActionButtonStyle = (
  colors: ReturnType<typeof useThemeColors>,
  variant: 'default' | 'danger',
  disabled: boolean,
) => ({
  padding: '5px 12px',
  fontSize: 12,
  borderRadius: 6,
  fontFamily: 'inherit',
  border: `1px solid ${variant === 'danger' ? colors.danger : colors.border}`,
  background: variant === 'danger' ? colors.danger : 'transparent',
  color: variant === 'danger' ? '#fff' : colors.textSecondary,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.6 : 1,
});

const UploadedReferenceList = ({
  theme,
  netlistPrograms,
  failSampleImports,
  total,
  page,
  searchTerm,
  selectedId,
  loading,
  deletingBatchIds = [],
  onSearchChange,
  onPageChange,
  onSelect,
  onDeleteBatch,
}: UploadedReferenceListProps) => {
  const colorMode = useThemeColors();
  const responsive = useResponsiveTokens();
  const isNetlist = theme === 'netlist';

  /** 目前展開確認區的 batch_id；同一時間只允許一張卡片展開 */
  const [confirmingBatchId, setConfirmingBatchId] = useState<string | null>(null);
  /** 確認區內的刪除失敗原因；切換確認卡片時重置 */
  const [confirmError, setConfirmError] = useState<string | null>(null);
  /** 刪除成功、正在播放滑出動畫的批次快照（API 已回應成功，但列表尚未視覺移除） */
  const [exiting, setExiting] = useState<{ batch: FailSampleImportBatchSummary; index: number } | null>(null);
  const [exitAnimating, setExitAnimating] = useState(false);
  /** 滑鼠懸停在刪除按鈕上的批次 ID */
  const [hoveredDeleteBatchId, setHoveredDeleteBatchId] = useState<string | null>(null);

  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const cancelButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  // 切換主題／分頁／搜尋時，列表會重繪，確認區狀態應隨之重置。
  // 採 React 文件建議的「渲染期間調整 state」寫法（比較前後 key 再呼叫 setState），
  // 避免多一次 effect 觸發的額外重繪。
  const resetKey = `${theme}|${page}|${searchTerm}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setConfirmingBatchId(null);
    setConfirmError(null);
  }

  // Esc 收合目前展開中的確認區
  useEffect(() => {
    if (!confirmingBatchId) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConfirmingBatchId(null);
        setConfirmError(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmingBatchId]);

  // 展開完成後：若卡片底部超出可視範圍則捲動列表容器，並將焦點移至「取消」按鈕
  useEffect(() => {
    if (!confirmingBatchId) return undefined;
    const timer = window.setTimeout(() => {
      const container = listContainerRef.current;
      const card = cardRefs.current.get(confirmingBatchId);
      if (container && card) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const overflowBottom = cardRect.bottom - containerRect.bottom;
        if (overflowBottom > 0) {
          container.scrollTop += overflowBottom;
        }
      }
      cancelButtonRefs.current.get(confirmingBatchId)?.focus();
    }, EXPAND_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [confirmingBatchId]);

  // 合併顯示清單：刪除成功、動畫播放中的批次即使已從後端清單移除，仍插回原本位置繼續顯示直到動畫結束
  const displayList = useMemo(() => {
    if (!exiting) return failSampleImports;
    if (failSampleImports.some((item) => item.batch_id === exiting.batch.batch_id)) {
      return failSampleImports;
    }
    const merged = [...failSampleImports];
    merged.splice(Math.min(exiting.index, merged.length), 0, exiting.batch);
    return merged;
  }, [failSampleImports, exiting]);

  const handleCardClick = (selection: SelectedUpload) => {
    onSelect(selection);
    setConfirmingBatchId(null);
    setConfirmError(null);
  };

  const handleDeleteClick = (
    event: MouseEvent<HTMLButtonElement>,
    batch: FailSampleImportBatchSummary,
  ) => {
    event.stopPropagation();
    setConfirmError(null);
    setConfirmingBatchId((prev) => (prev === batch.batch_id ? null : batch.batch_id));
  };

  const handleCancelClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setConfirmingBatchId(null);
    setConfirmError(null);
  };

  const handleConfirmDelete = async (
    event: MouseEvent<HTMLButtonElement>,
    batch: FailSampleImportBatchSummary,
  ) => {
    event.stopPropagation();
    if (!onDeleteBatch) return;
    setConfirmError(null);
    const outcome = await onDeleteBatch(batch);
    if (outcome.success) {
      setConfirmingBatchId(null);
      const index = failSampleImports.findIndex((item) => item.batch_id === batch.batch_id);
      setExiting({ batch, index: index >= 0 ? index : failSampleImports.length });
      // 下一幀才切到動畫終態樣式，確保 CSS transition 能從正常狀態播放到滑出狀態
      requestAnimationFrame(() => setExitAnimating(true));
      window.setTimeout(() => {
        setExiting(null);
        setExitAnimating(false);
      }, EXIT_ANIMATION_MS);
    } else {
      setConfirmError(outcome.message ?? '刪除失敗，請稍後再試');
    }
  };

  return (
    <section
      aria-label="已上傳檔案"
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: 14,
        border: `1px solid ${colorMode.border}`,
        borderRadius: responsive.spacing.cardRadius,
        background: colorMode.card,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <Title level={4} style={{ margin: 0, color: colorMode.textPrimary, fontSize: responsive.typography.cardTitle }}>
          已上傳檔案
        </Title>
        <Text style={{ color: colorMode.textMuted, fontSize: responsive.typography.caption }}>
          共 {total} 批
        </Text>
      </div>

      <Input
        aria-label={isNetlist ? '搜尋檔名或 test_program' : '搜尋 Lot ID、test_program 或檔名'}
        prefix={<Search size={14} style={{ color: colorMode.textMuted }} />}
        placeholder={isNetlist ? '搜尋檔名 / test_program' : '搜尋 Lot ID / test_program / 檔名'}
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        allowClear
        style={{
          marginTop: 10,
          background: colorMode.surface,
          borderColor: colorMode.border,
          color: colorMode.textPrimary,
        }}
      />

      <div ref={listContainerRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 12 }}>
        <Spin spinning={loading}>
          {isNetlist ? (
            netlistPrograms.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: colorMode.textMuted }}>尚無 Netlist 資料</span>}
              />
            ) : (
              netlistPrograms.map((program) => (
                <button
                  type="button"
                  key={program.id}
                  aria-label={`預覽 ${program.test_program}`}
                  onClick={() => onSelect({ theme: 'netlist', item: program })}
                  style={cardStyle(selectedId === program.id, colorMode)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText size={14} color={colorMode.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body }}>
                        {program.test_program}
                      </Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>檔名：{program.filename}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳時間：{formatDate(program.uploaded_at)}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳者：{formatUploader(program.uploaded_by)}</Text>
                    </div>
                  </div> 
                </button>
              ))
            )
          ) : displayList.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: colorMode.textMuted }}>尚無 Fail Sample 資料</span>}
            />
          ) : (
            displayList.map((batch) => {
              const isDeleting = deletingBatchIds.includes(batch.batch_id);
              const isConfirming = confirmingBatchId === batch.batch_id;
              const isExiting = exiting?.batch.batch_id === batch.batch_id;
              const exitStyle = isExiting
                ? {
                    opacity: exitAnimating ? 0 : 1,
                    transform: exitAnimating ? 'translateX(-16px)' : 'translateX(0)',
                    transition: 'opacity .32s ease, transform .32s ease',
                    pointerEvents: 'none' as const,
                  }
                : undefined;

              return (
                <div
                  key={batch.batch_id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(batch.batch_id, el);
                    else cardRefs.current.delete(batch.batch_id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`預覽 ${batch.lot_id}`}
                  onClick={() => handleCardClick({ theme: 'fail-sample', item: batch })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleCardClick({ theme: 'fail-sample', item: batch });
                    }
                  }}
                  style={{
                    ...cardStyle(selectedId === batch.batch_id, colorMode),
                    position: 'relative',
                    ...(isConfirming
                      ? { border: `1px solid ${colorMode.warning}`, background: colorMode.surface }
                      : null),
                    ...exitStyle,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <FileText size={14} color={colorMode.primary} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text strong style={{ color: colorMode.textPrimary, fontSize: responsive.typography.body }}>
                          {batch.lot_id}
                        </Text>
                        <Tag color={colorMode.primary}>
                          {batch.execution_mode}
                        </Tag>
                        {onDeleteBatch && (
                          <button
                            type="button"
                            title="刪除此批次"
                            aria-label={`刪除 ${batch.lot_id} 批次`}
                            disabled={isDeleting}
                            onClick={(event) => handleDeleteClick(event, batch)}
                            onMouseEnter={() => setHoveredDeleteBatchId(batch.batch_id)}
                            onMouseLeave={() => setHoveredDeleteBatchId(null)}
                            style={{
                              marginLeft: 'auto',
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 6,
                              border: `1px solid ${isConfirming ? colorMode.danger : 'transparent'}`,
                              background: isConfirming ? colorMode.dangerBg : 'transparent',
                              color: isConfirming || hoveredDeleteBatchId === batch.batch_id ? colorMode.danger : colorMode.textMuted,
                              cursor: isDeleting ? 'not-allowed' : 'pointer',
                              opacity: isDeleting ? 0.6 : 1,
                              transition: 'color .15s, background .15s, border-color .15s',
                              fontFamily: 'inherit',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <Text style={fieldStyle(colorMode.textSecondary)}>檔名：{batch.source_file || '—'}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳時間：{formatDate(batch.imported_at)}</Text>
                      <Text style={fieldStyle(colorMode.textSecondary)}>上傳者：{formatUploader(batch.uploaded_by)}</Text>
                    </div>
                  </div>

                  {onDeleteBatch && (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      role="presentation"
                      style={{
                        display: 'grid',
                        gridTemplateRows: isConfirming ? '1fr' : '0fr',
                        transition: 'grid-template-rows .26s cubic-bezier(.2,.8,.3,1)',
                        cursor: 'default',
                      }}
                    >
                      <div style={{ overflow: 'hidden', minHeight: 0 }}>
                        <div
                          style={{
                            marginTop: 9,
                            paddingTop: 10,
                            borderTop: `1px solid ${colorMode.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 7,
                            opacity: isConfirming ? 1 : 0,
                            transform: isConfirming ? 'none' : 'translateY(-4px)',
                            transition: 'opacity .2s .06s, transform .2s .06s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <TriangleAlert size={14} color={colorMode.warning} style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: colorMode.textPrimary,}}>
                                確定要刪除此 Fail Sample 批次？
                              </div>
                              <p style={{ margin: '4px 0 0', fontSize: 11.5, color: colorMode.danger, lineHeight: 1.5, }}>
                                刪除後無法復原，請確認是否執行。
                              </p>
                            </div>
                          </div>
                          
                          {confirmError && isConfirming && (
                            <p style={{ margin: 0, fontSize: 11.5, color: colorMode.danger, lineHeight: 1.5 }}>
                              {confirmError}
                            </p>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7, marginTop: 2 }}>
                            <button
                              type="button"
                              ref={(el) => {
                                if (el) cancelButtonRefs.current.set(batch.batch_id, el);
                                else cancelButtonRefs.current.delete(batch.batch_id);
                              }}
                              disabled={isDeleting}
                              onClick={handleCancelClick}
                              style={confirmActionButtonStyle(colorMode, 'default', isDeleting)}
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={(event) => void handleConfirmDelete(event, batch)}
                              style={confirmActionButtonStyle(colorMode, 'danger', isDeleting)}
                            >
                              {isDeleting ? '刪除中…' : '確定刪除'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </Spin>
      </div>

      {total > 10 && (
        <Pagination
          size="small"
          current={page}
          pageSize={10}
          total={total}
          showSizeChanger={false}
          showQuickJumper={false}
          onChange={onPageChange}
          style={{ flexShrink: 0, marginTop: 10, textAlign: 'center' }}
        />
      )}
    </section>
  );
};

export default UploadedReferenceList;
