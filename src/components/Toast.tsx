import { useEffect, useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';

export interface ToastProps {
  /** 顯示文字；由呼叫端控制掛載／卸載（`null`/`undefined` 時不渲染） */
  message: string;
  /** 顯示時間（毫秒），預設 2600ms，到時自動呼叫 onClose */
  duration?: number;
  onClose: () => void;
}

/**
 * 全站共用的輕量 Toast（固定置底置中），用於一次性成功訊息提示。
 * 目前專案沒有既有 toast 機制，樣式依據 `reference/UI Design/Fail-Sample-Delete-handoff.md`
 * 與 `File Upload v9 (standalone).html` 的 `.toast` class 實作。
 */
const Toast = ({ message, duration = 2600, onClose }: ToastProps) => {
  const colorMode = useThemeColors();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Toast 由呼叫端以遞增的 `key` 強制重新掛載，故每次掛載時 visible 已是初始值 false，
    // 不需在 effect 內同步重設。
    const showTimer = window.setTimeout(() => setVisible(true), 10);
    const hideTimer = window.setTimeout(() => setVisible(false), duration);
    const closeTimer = window.setTimeout(onClose, duration + 200);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(closeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- message 變更即視為新的一則 toast，需重新計時
  }, [message, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        zIndex: 1000,
        background: colorMode.card,
        border: `1px solid ${colorMode.border}`,
        borderLeft: `3px solid ${colorMode.success}`,
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12.5,
        color: colorMode.textPrimary,
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
        transition: 'opacity .2s, transform .2s',
        pointerEvents: 'none',
        maxWidth: 'min(560px, 90vw)',
      }}
    >
      {message}
    </div>
  );
};

export default Toast;
