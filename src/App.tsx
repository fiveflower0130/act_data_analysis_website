import { useEffect } from 'react';
import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { getAntdTheme } from './styles/antdTheme';
import useThemeStore from './stores/themeStore';
import router from './router';

function App() {
  const mode = useThemeStore((select) => select.mode);

  // 同步 body class，讓 index.css 的捲軸樣式等跟著切換
  useEffect(() => {
    document.body.classList.toggle('light-mode', mode === 'light');
  }, [mode]);

  return (
    <ConfigProvider
      theme={{
        ...getAntdTheme(mode),
        algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;

