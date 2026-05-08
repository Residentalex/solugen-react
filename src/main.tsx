import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#556ee6',
          colorBgLayout: '#f8f9fa',
          colorBgContainer: '#ffffff',
          borderRadius: 6,
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          colorText: '#495057',
          colorTextSecondary: '#6c757d',
          colorBorder: '#e9ecef',
          controlHeight: 36,
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemColor: '#6c757d',
            itemHoverBg: '#f1f3f5',
            itemHoverColor: '#556ee6',
            itemSelectedBg: '#eef0fc',
            itemSelectedColor: '#556ee6',
            subMenuItemBg: 'transparent',
            groupTitleColor: '#6c757d',
            colorPrimary: '#556ee6',
            motionDurationMid: '0.15s',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
