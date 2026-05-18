import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import './index.css'
import App from './App'
import { useUIStore } from './stores/uiStore'

function getThemeConfig(isDarkMode: boolean) {
  if (isDarkMode) {
    return {
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#556ee6',
        colorPrimaryHover: '#6c7ff0',
        colorPrimaryActive: '#4458d3',
        colorBgLayout: '#1e1e2d',
        colorBgContainer: '#2d2d44',
        colorBgElevated: '#2d2d44',
        borderRadius: 8,
        borderRadiusLG: 12,
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        colorText: '#a2a3b7',
        colorTextSecondary: '#6c757d',
        colorTextHeading: '#ffffff',
        colorBorder: '#3d3d5c',
        colorBorderSecondary: '#2d2d44',
        controlHeight: 38,
        controlHeightLG: 44,
        controlHeightSM: 32,
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px 0 rgba(0,0,0,0.15)',
        boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.3)',
      },
      components: {
        Menu: {
          itemBg: 'transparent',
          itemColor: '#a2a3b7',
          itemHoverBg: 'rgba(85,110,230,0.12)',
          itemHoverColor: '#ffffff',
          itemSelectedBg: 'rgba(85,110,230,0.15)',
          itemSelectedColor: '#ffffff',
          subMenuItemBg: 'transparent',
          groupTitleColor: '#6c757d',
          colorPrimary: '#556ee6',
          motionDurationMid: '0.15s',
        },
        Card: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px 0 rgba(0,0,0,0.15)',
          boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.3)',
        },
        Button: {
          primaryShadow: '0 2px 6px rgba(85,110,230,0.25)',
        },
        Table: {
          headerBg: '#2d2d44',
          headerColor: '#a2a3b7',
          rowHoverBg: 'rgba(85,110,230,0.08)',
          borderColor: '#3d3d5c',
        },
        Form: {
          labelColor: '#a2a3b7',
        },
        Input: {
          colorBorder: '#3d3d5c',
          hoverBorderColor: '#556ee6',
          activeBorderColor: '#556ee6',
        },
        Select: {
          colorBorder: '#3d3d5c',
        },
        Modal: {
          headerBg: '#2d2d44',
          contentBg: '#2d2d44',
        },
      },
    };
  }

  return {
    algorithm: theme.defaultAlgorithm,
    token: {
      colorPrimary: '#556ee6',
      colorPrimaryHover: '#6c7ff0',
      colorPrimaryActive: '#4458d3',
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
        itemColor: '#495057',
        itemHoverBg: 'rgba(85,110,230,0.08)',
        itemHoverColor: '#556ee6',
        itemSelectedBg: 'rgba(85,110,230,0.12)',
        itemSelectedColor: '#556ee6',
        subMenuItemBg: 'transparent',
        groupTitleColor: '#6c757d',
        colorPrimary: '#556ee6',
        motionDurationMid: '0.15s',
      },
      Card: {
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.08)',
      },
      Button: {
        primaryShadow: '0 2px 6px rgba(85,110,230,0.25)',
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
        hoverBorderColor: '#556ee6',
        activeBorderColor: '#556ee6',
      },
      Select: {
        colorBorder: '#e2e5ec',
      },
      Modal: {
        headerBg: '#ffffff',
        contentBg: '#ffffff',
      },
    },
  };
}

function AppWrapper() {
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  return (
    <ConfigProvider theme={getThemeConfig(isDarkMode)}>
      <App />
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
)
