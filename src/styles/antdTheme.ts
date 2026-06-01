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
    colorBgBase: colors.bgBase,
    colorBgContainer: colors.bgCard,
    colorBgElevated: colors.bgCard,
    colorBgLayout: colors.bgBase,
    colorBgSpotlight: colors.bgBorder,

    // 邊線
    colorBorder: colors.bgBorder,
    colorBorderSecondary: colors.bgBorder,

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
      bodyBg: colors.bgBase,
      headerHeight: spacing.navbarHeight,
    },
    Menu: {
      darkItemBg: colors.bgSidebar,
      darkSubMenuItemBg: colors.bgSidebar,
      darkItemSelectedBg: colors.bgBorder,
      darkItemHoverBg: colors.bgCard,
    },
    Table: {
      headerBg: '#0D1E30',
      rowHoverBg: colors.bgBorder,
      borderColor: colors.bgBorder,
    },
    Card: {
      colorBgContainer: colors.bgCard,
    },
    Input: {
      colorBgContainer: colors.bgCard,
      activeBorderColor: colors.primary,
    },
    Select: {
      colorBgContainer: colors.bgCard,
      colorBgElevated: colors.bgCard,
    },
    Button: {
      colorPrimary: colors.primary,
      algorithm: true,
    },
    Modal: {
      contentBg: colors.bgCard,
      headerBg: colors.bgCard,
    },
    Tabs: {
      inkBarColor: colors.primary,
      itemColor: colors.primaryMuted,
      itemSelectedColor: colors.textPrimary,
      itemHoverColor: colors.primaryLight,
    },
    Badge: {
      colorBgContainer: colors.bgCard,
    },
  },
};
