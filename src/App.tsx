import { ConfigProvider, theme } from 'antd';
import { antdTheme } from './styles/antdTheme';

function App() {
  return (
    <ConfigProvider theme={{ ...antdTheme, algorithm: theme.darkAlgorithm }}>
      {/* Router 與頁面結構將在下一階段建立 */}
      <div style={{ height: '100vh', background: '#0A1929', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#90CAF9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>ACT Failure Analysis System</div>
          <div style={{ fontSize: 13, marginTop: 8, color: '#42A5F5' }}>設計系統載入成功 — 即將建立頁面結構</div>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;
