import { darkColors, lightColors } from '../styles/tokens';
import useThemeStore from '../stores/themeStore';

/**
 * 根據目前主題模式回傳對應的 color token 集合。
 * 元件中請使用此 hook 取代直接引用 tokens.colors，
 * 以確保 Light/Dark 切換時自動更新。
 */
export const useThemeColors = () => {
  const mode = useThemeStore((select) => select.mode);
  return mode === 'dark' ? darkColors : lightColors;
};
