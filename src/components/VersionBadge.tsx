import { Typography } from 'antd';

const { Text } = Typography;

interface VersionBadgeProps {
  /** 文字顏色，預設使用輔助/muted 色調，依呼叫端主題傳入 */
  color?: string;
  /** 固定定位位置：'bottom-right'（預設）| 'bottom-left' | 'inline'（不使用 fixed，跟隨文件流） */
  position?: 'bottom-right' | 'bottom-left' | 'inline';
}

/**
 * 版本資訊標籤：顯示目前 release 版本（來自 package.json，
 * 由 vite.config.ts 透過 define 注入的 __APP_VERSION__ 全域常數）。
 * - 'bottom-right' / 'bottom-left'：fixed 定位 + pointerEvents: 'none'，不佔版面、不擋點擊
 * - 'inline'：跟隨呼叫端版面（例如緊鄰登入頁版權文字下方）
 */
const VersionBadge = ({ color, position = 'bottom-right' }: VersionBadgeProps) => {
  const content = (
    <Text style={{ color: color ?? '#848b92', fontSize: 11, letterSpacing: 0.5 }}>
      v{__APP_VERSION__}
    </Text>
  );

  if (position === 'inline') {
    return content;
  }

  return (
    <div
      style={{
        position: 'fixed',
        ...(position === 'bottom-left' ? { left: 10 } : { right: 10 }),
        bottom: 6,
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {content}
    </div>
  );
};

export default VersionBadge;
