import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6c5ffc',
          colorPrimaryHover: '#7c6ffd',
          colorPrimaryActive: '#5b4ee3',
          colorBgLayout: '#f5f6fa',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          borderRadius: 8,
          borderRadiusLG: 12,
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          colorText: '#495057',
          colorTextSecondary: '#6c757d',
          colorTextHeading: '#1e1e2d',
          colorBorder: '#e8ecf1',
          colorBorderSecondary: '#f0f2f5',
          controlHeight: 38,
          controlHeightLG: 44,
          controlHeightSM: 32,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
          boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.08)',
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemColor: '#a2a3b7',
            itemHoverBg: 'rgba(108,95,252,0.08)',
            itemHoverColor: '#ffffff',
            itemSelectedBg: 'rgba(108,95,252,0.15)',
            itemSelectedColor: '#ffffff',
            subMenuItemBg: 'transparent',
            groupTitleColor: '#6c757d',
            colorPrimary: '#6c5ffc',
            motionDurationMid: '0.15s',
          },
          Card: {
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
            boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.08)',
          },
          Button: {
            primaryShadow: '0 2px 6px rgba(108,95,252,0.25)',
          },
          Table: {
            headerBg: '#f8f9fc',
            headerColor: '#495057',
            rowHoverBg: '#f0f1ff',
            borderColor: '#e8ecf1',
          },
          Form: {
            labelColor: '#495057',
          },
          Input: {
            colorBorder: '#e2e5ec',
            hoverBorderColor: '#6c5ffc',
            activeBorderColor: '#6c5ffc',
          },
          Select: {
            colorBorder: '#e2e5ec',
          },
          Modal: {
            headerBg: '#ffffff',
            contentBg: '#ffffff',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
)
