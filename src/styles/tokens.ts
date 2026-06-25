/** 目前支援的主題模式 */
export type ThemeMode = 'dark' | 'light';

/**
 * 設計系統色彩 Token — 深海藍暗色系（Dark Theme）
 * 來源：ui-ux-design.instructions.md
 */
export const darkColors = {
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
  success: '#4CAF50',     // 成功色（綠色）
  successBg: '#0D3B2A',   // 成功背景（綠色）
  danger: '#FF5252',      // 錯誤色（紅色）
  dangerBg: '#4A1020',    // 錯誤背景（紅色）
  warning: '#FFB74D',     // 警告色（橘色）

  // 文字
  textPrimary: '#FFFFFF',   // 主要文字、標題
  textSecondary: '#90CAF9', // 次要文字、說明文字
  textMuted: '#4A6B8A',     // 輔助文字、Placeholder、Caption
  textCopyRight: '#848b92', // 版權聲明等輔助文字
} as const;

/** 向後相容別名（現有程式可繼續使用 colors） */
export const colors = darkColors;

/**
 * 設計系統色彩 Token — 淺色系（Light Theme）
 * 適用於產線人員截圖貼 PPT 的白底場景
 */
export const lightColors = {
  // 背景層次
  base: '#F0F4F8',        // 主背景
  surface: '#FFFFFF',     // 側欄 / Navbar 背景
  card: '#FFFFFF',        // 卡片 / 浮層
  border: '#D1DCE9',      // 邊線 / 分隔

  // 藍色主調（與 dark 相同的品牌色）
  primary: '#1c6bd3',
  primaryLight: '#1565C0',
  primaryMuted: '#1976D2',
  primaryGhost: '#78909C',

  // 語意色
  success: '#2E7D32',     //另一個配色 #52c41a
  successBg: '#E8F5E9',
  danger: '#D32F2F',      //另一個配色 #FF5252
  dangerBg: '#FFEBEE',
  warning: '#E65100',

  // 文字（深色文字搭配白底）
  textPrimary: '#1A2332',
  textSecondary: '#455A64',
  textMuted: '#90A4AE',
  textCopyRight: '#4A6B8A', // 版權聲明等輔助文字
} as const;

/**
 * 螢幕斷點（基於實際使用場景）
 * - Mobile: < 768px
 * - Tablet: 768px - 1024px
 * - Laptop: 1024px - 1440px（筆電 1366x768 - 1440x900）
 * - Desktop: >= 1440px（桌機 1920x1080 / 1280x720）
 */
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  laptop: 1440,
  desktop: 1920,
} as const;

export type ScreenSize = 'mobile' | 'tablet' | 'laptop' | 'desktop';

/**
 * 根據螢幕寬度判斷螢幕大小
 */
export function getScreenSize(screenWidth: number): ScreenSize {
  if (screenWidth < BREAKPOINTS.mobile) return 'mobile';
  if (screenWidth < BREAKPOINTS.tablet) return 'tablet';
  if (screenWidth < BREAKPOINTS.laptop) return 'laptop';
  return 'desktop';
}

/**
 * 字型 Token
 * 來源：ui-ux-design.instructions.md — 2.2 字型系統
 */
export const typography = {
  fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
  size: {
    pageTitle: '24px',      // 頁面主標題
    sectionTitle: '18px',   // 區塊標題
    cardTitle: '16px',      // 卡片標題
    contentTitle: '14px',   // 內容標題
    body: '12px',           // 內文
    caption: '12px',        // 輔助說明（如表格說明文字、Badge 文字）
  } as const satisfies Record<'pageTitle' | 'sectionTitle' | 'cardTitle' | 'contentTitle' | 'body' | 'caption', string>,
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  } as const,
} as const;

/** typography.size 的型別別名 — 支持任何符合結構的字型值 */
export type FontSizeTokens = Record<'pageTitle' | 'sectionTitle' | 'cardTitle' | 'contentTitle' | 'body' | 'caption', string>;

/**
 * 響應式字型大小
 * 針對不同螢幕大小提供調整
 */
export const responsiveTypography: Record<ScreenSize, FontSizeTokens> = {
  mobile: {
    pageTitle: '18px',
    sectionTitle: '14px',
    cardTitle: '12px',
    contentTitle: '11px',
    body: '15px',
    caption: '10px',
  },
  tablet: {
    pageTitle: '20px',
    sectionTitle: '16px',
    cardTitle: '13px',
    contentTitle: '12px',
    body: '14px',
    caption: '10px',
  },
  laptop: {
    pageTitle: '21px',
    sectionTitle: '17px',
    cardTitle: '14px',    
    contentTitle: '13px', 
    body: '14px',         
    caption: '11px',      
  },
  desktop: {
    pageTitle: '24px',
    sectionTitle: '18px',
    cardTitle: '16px',
    contentTitle: '14px',
    body: '12px',
    caption: '12px',
  },
};

/**
 * 間距 Token — 基礎預設（適配 Desktop）
 */
export const spacing = {
  navbarHeight: 64,
  sidebarWidth: 300,    
  rightPanelWidth: 280,
  rightPanelCollapsed: 20,
  cardRadius: 12,
  uploadZoneRadius: 14,
  /** FailSampleList table body 固定高度（px）*/
  tableScrollY: 520,
  /** ResultsPanel 容器高度（px）*/
  resultsHeight: 140,
} as const satisfies Record<'navbarHeight' | 'sidebarWidth' | 'rightPanelWidth' | 'rightPanelCollapsed' | 'cardRadius' | 'uploadZoneRadius' | 'tableScrollY' | 'resultsHeight', number>;

/** spacing 的型別別名 — 支持任何符合結構的間距值 */
export type SpacingTokens = Record<'navbarHeight' | 'sidebarWidth' | 'rightPanelWidth' | 'rightPanelCollapsed' | 'cardRadius' | 'uploadZoneRadius' | 'tableScrollY' | 'resultsHeight', number>;

/**
 * 響應式間距
 * 調整邊框/側欄寬度以適應較小的螢幕
 */
export const responsiveSpacing: Record<ScreenSize, SpacingTokens> = {
  mobile: {
    navbarHeight: 52,
    sidebarWidth: 180,
    rightPanelWidth: 180,
    rightPanelCollapsed: 15,
    cardRadius: 8,
    uploadZoneRadius: 10,
    tableScrollY: 260,
    resultsHeight: 110,
  },
  tablet: {
    navbarHeight: 56,
    sidebarWidth: 200,
    rightPanelWidth: 200,
    rightPanelCollapsed: 15,
    cardRadius: 10,
    uploadZoneRadius: 11,
    tableScrollY: 320,
    resultsHeight: 120,
  },
  laptop: {
    navbarHeight: 60,
    sidebarWidth: 230,
    rightPanelWidth: 260,
    rightPanelCollapsed: 17,
    cardRadius: 11,
    uploadZoneRadius: 12,
    tableScrollY: 360,   // 1366×768：可用約 406px，360px 保留安全緩衝
    resultsHeight: 130,
  },
  desktop: {
    navbarHeight: 64,
    sidebarWidth: 250,
    rightPanelWidth: 280,
    rightPanelCollapsed: 20,
    cardRadius: 12,
    uploadZoneRadius: 14,
    tableScrollY: 520,
    resultsHeight: 140,
  },
};

/** 全域 Token bundle，方便單一 import */
export const tokens = { colors: darkColors, typography, spacing } as const;

