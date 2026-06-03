/**
 * 設計系統色彩 Token
 * 來源：ui-ux-design.instructions.md — 深海藍暗色系（Deep Navy Dark Theme）
 */
export const colors = {
  // 背景層次
  base: '#0A1929',        // 主背景（原 bgBase）
  surface: '#0D1E30',     // 側欄 / Navbar 背景（原 bgSidebar）
  card: '#112240',        // 卡片 / 浮層（原 bgCard）
  border: '#1E3A5F',      // 邊線 / 分隔（原 bgBorder）

  // 藍色主調
  primary: '#1c6bd3',     // CTA 按鈕、互動重點
  primaryLight: '#42A5F5',// Active 狀態、強調文字
  primaryMuted: '#90CAF9',// Secondary 文字、Tab 未選中
  primaryGhost: '#4A6B8A',// Placeholder、Caption、Muted

  // 語意色
  success: '#4CAF50',
  successBg: '#0D3B2A',
  danger: '#FF5252',
  dangerBg: '#4A1020',
  warning: '#FFB74D',

  // 文字
  textPrimary: '#FFFFFF',
  textSecondary: '#90CAF9',
  textMuted: '#4A6B8A',
} as const;

/**
 * 字型 Token
 * 來源：ui-ux-design.instructions.md — 2.2 字型系統
 */
export const typography = {
  fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
  size: {
    pageTitle: '22px',
    sectionTitle: '18px',
    cardTitle: '15px',
    contentTitle: '13px',
    body: '12px',
    caption: '11px',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

/**
 * 間距 Token
 */
export const spacing = {
  navbarHeight: 64,
  sidebarWidth: 320,
  rightPanelWidth: 300,
  rightPanelCollapsed: 20,
  cardRadius: 12,
  uploadZoneRadius: 14,
} as const;

/** 全域 Token bundle，方便單一 import */
export const tokens = { colors, typography, spacing } as const;

