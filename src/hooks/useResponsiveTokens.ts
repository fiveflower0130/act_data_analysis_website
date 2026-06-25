import { useEffect, useState } from "react";
import { 
    getScreenSize, 
    responsiveSpacing, 
    responsiveTypography, 
    type ScreenSize 
} from "../styles/tokens";

interface ResponsiveTokens {
  screenSize: ScreenSize;
  typography: typeof responsiveTypography[ScreenSize];
  spacing: typeof responsiveSpacing[ScreenSize];
  /** 快速判斷用輔助布林值 */
  isMobile: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  isDesktop: boolean;
}

/**
 * Hook：獲取針對當前螢幕大小的響應式 tokens
 * 會在視窗大小改變時自動更新
 */
export function useResponsiveTokens(): ResponsiveTokens {
  const [screenSize, setScreenSize] = useState<ScreenSize>(() => {
    return getScreenSize(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize(getScreenSize(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    screenSize,
    typography: responsiveTypography[screenSize],
    spacing: responsiveSpacing[screenSize],
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isLaptop: screenSize === 'laptop',
    isDesktop: screenSize === 'desktop',
  };
}
export default useResponsiveTokens;