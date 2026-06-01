import { ConfigProvider, theme } from 'antd';
import { RouterProvider } from 'react-router-dom';
import { antdTheme } from './styles/antdTheme';
import router from './router';

function App() {
  return (
    <ConfigProvider theme={{ ...antdTheme, algorithm: theme.darkAlgorithm }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  );
}

export default App;
