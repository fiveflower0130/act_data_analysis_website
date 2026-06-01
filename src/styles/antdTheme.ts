import type { ThemeConfig } from 'antd';
import { colors, typography, spacing } from './tokens';

/**
 * Ant Design 5.x 主題設定
 * 對應 Deep Navy Dark Theme 設計系統
 */
export const antdTheme: ThemeConfig = {
  token: {
    // 主色
    colorPrimary: colors.primary,
    colorLink: colors.primaryLight,

    // 背景
    colorBgBase: colors.base,
    colorBgContainer: colors.card,
    colorBgElevated: colors.card,
    colorBgLayout: colors.base,
    colorBgSpotlight: colors.border,

    // 邊線
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,

    // 文字
    colorText: colors.textPrimary,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textMuted,
    colorTextQuaternary: colors.textMuted,

    // 語意色
    colorSuccess: colors.success,
    colorError: colors.danger,
    colorWarning: colors.warning,

    // 字型
    fontFamily: typography.fontFamily,
    fontSize: 12,

    // 圓角
    borderRadius: spacing.cardRadius,
    borderRadiusSM: 8,
    borderRadiusLG: spacing.uploadZoneRadius,

    // 線框
    lineWidth: 1,
  },
  components: {
    Layout: {
      headerBg: '#0D1E30',
      siderBg: '#0D1E30',
      bodyBg: colors.base,
      headerHeight: spacing.navbarHeight,
    },
    Menu: {
      darkItemBg: colors.surface,
      darkSubMenuItemBg: colors.surface,
      darkItemSelectedBg: colors.border,
      darkItemHoverBg: colors.card,
    },
    Table: {
      headerBg: '#0D1E30',
      rowHoverBg: colors.border,
      borderColor: colors.border,
    },
    Card: {
      colorBgContainer: colors.card,
    },
    Input: {
      colorBgContainer: colors.card,
      activeBorderColor: colors.primary,
    },
    Select: {
      colorBgContainer: colors.card,
      colorBgElevated: colors.card,
    },
    Button: {
      colorPrimary: colors.primary,
      algorithm: true,
    },
    Modal: {
      contentBg: colors.card,
      headerBg: colors.card,
    },
    Tabs: {
      inkBarColor: colors.primary,
      itemColor: colors.primaryMuted,
      itemSelectedColor: colors.textPrimary,
      itemHoverColor: colors.primaryLight,
    },
    Badge: {
      colorBgContainer: colors.card,
    },
  },
};
