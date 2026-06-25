import type { ThemeConfig } from 'antd';
import { darkColors, lightColors, typography, spacing } from './tokens';
import type { ThemeMode } from './tokens';

/** 根據主題模式產生對應的 Ant Design ThemeConfig */
export function getAntdTheme(mode: ThemeMode): ThemeConfig {
  const colorMode = mode === 'dark' ? darkColors : lightColors;

  return {
    token: {
      // 主色
      colorPrimary: colorMode.primary,
      colorLink: colorMode.primaryLight,

      // 背景
      colorBgBase: colorMode.base,
      colorBgContainer: colorMode.card,
      colorBgElevated: colorMode.card,
      colorBgLayout: colorMode.base,
      colorBgSpotlight: colorMode.border,

      // 邊線
      colorBorder: colorMode.border,
      colorBorderSecondary: colorMode.border,

      // 文字
      colorText: colorMode.textPrimary,
      colorTextSecondary: colorMode.textSecondary,
      colorTextTertiary: colorMode.textMuted,
      colorTextQuaternary: colorMode.textMuted,

      // 語意色
      colorSuccess: colorMode.success,
      colorError: colorMode.danger,
      colorWarning: colorMode.warning,

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
        headerBg: colorMode.surface,
        siderBg: colorMode.surface,
        bodyBg: colorMode.base,
        headerHeight: spacing.navbarHeight,
      },
      Menu: {
        darkItemBg: colorMode.surface,
        darkSubMenuItemBg: colorMode.surface,
        darkItemSelectedBg: colorMode.border,
        darkItemHoverBg: colorMode.card,
      },
      Table: {
        headerBg: colorMode.surface,
        rowHoverBg: colorMode.border,
        borderColor: colorMode.border,
      },
      Card: {
        colorBgContainer: colorMode.card,
      },
      Input: {
        colorBgContainer: colorMode.card,
        activeBorderColor: colorMode.primary,
      },
      Select: {
        colorBgContainer: colorMode.card,
        colorBgElevated: colorMode.card,
      },
      Button: {
        colorPrimary: colorMode.primary,
        algorithm: true,
      },
      Modal: {
        contentBg: colorMode.card,
        headerBg: colorMode.card,
      },
      Tabs: {
        inkBarColor: colorMode.primary,
        itemColor: colorMode.primaryMuted,
        itemSelectedColor: colorMode.textPrimary,
        itemHoverColor: colorMode.primaryLight,
      },
      Badge: {
        colorBgContainer: colorMode.card,
      },
    },
  };
}

/** 向後相容：預設匯出 dark theme config */
export const antdTheme: ThemeConfig = getAntdTheme('dark');

