import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import './index.css'
import App from './App'
import { useUIStore } from './stores/uiStore'
import type { ThemeName } from './stores/uiStore'
import { THEMES, getIsDarkFromTheme } from './themes'

function getThemeConfig(themeName: ThemeName) {
  const t = THEMES[themeName];
  const isDark = t.isDark;
  const shadows = isDark
    ? {
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2), 0 1px 2px 0 rgba(0,0,0,0.15)',
        boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.3)',
      }
    : {
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)',
        boxShadowSecondary: '0 4px 16px 0 rgba(0,0,0,0.08)',
      };

  const baseToken = {
    colorPrimary: t.primaryColor,
    colorPrimaryHover: t.primaryHover,
    colorPrimaryActive: t.primaryActive,
    colorBgLayout: t.bgLayout,
    colorBgContainer: t.bgContainer,
    colorBgElevated: t.bgElevated,
    borderRadius: 8,
    borderRadiusLG: 12,
    fontFamily: "'Google Sans', 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    colorText: t.text,
    colorTextSecondary: t.textSecondary,
    colorTextHeading: t.textHeading,
    colorBorder: t.border,
    colorBorderSecondary: t.borderSecondary,
    controlHeight: 38,
    controlHeightLG: 44,
    controlHeightSM: 32,
    ...shadows,
  };

  const baseComponents = {
    Menu: {
      itemBg: 'transparent',
      itemColor: t.text,
      itemHoverBg: t.hoverBg,
      itemHoverColor: isDark ? '#ffffff' : t.primaryColor,
      itemSelectedBg: t.selectedBg,
      itemSelectedColor: isDark ? '#ffffff' : t.primaryColor,
      subMenuItemBg: 'transparent',
      groupTitleColor: t.textSecondary,
      colorPrimary: t.primaryColor,
      motionDurationMid: '0.15s',
    },
    Card: {
      boxShadow: shadows.boxShadow,
      boxShadowSecondary: shadows.boxShadowSecondary,
    },
    Button: {
      primaryShadow: t.primaryShadow,
    },
    Table: {
      headerBg: isDark ? t.bgElevated : '#f8f9fc',
      headerColor: t.text,
      rowHoverBg: t.hoverBg,
      borderColor: t.border,
      cellFontSize: t.tableCellFontSize,
      cellFontSizeMD: t.tableCellFontSize,
    },
    Form: {
      labelColor: t.text,
    },
    Input: {
      colorBorder: isDark ? t.border : '#e2e5ec',
      hoverBorderColor: t.primaryColor,
      activeBorderColor: t.primaryColor,
    },
    Select: {
      colorBorder: isDark ? t.border : '#e2e5ec',
    },
    Modal: {
      headerBg: t.bgContainer,
      contentBg: t.bgContainer,
    },
  };

  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: baseToken,
    components: baseComponents,
  };
}

function AppWrapper() {
  const themeName = useUIStore((s) => s.themeName);

  useEffect(() => {
    // Remove all existing theme-* classes from body
    const classes = document.body.className.split(' ').filter((c) => c.length > 0);
    classes.forEach((cls) => {
      if (cls.startsWith('theme-')) {
        document.body.classList.remove(cls);
      }
    });
    // Add current theme class
    document.body.classList.add(`theme-${themeName}`);

    // Sincronizar .dark-mode para compatibilidad con CSS legacy
    if (getIsDarkFromTheme(themeName)) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [themeName]);

  return (
    <ConfigProvider theme={getThemeConfig(themeName)}>
      <App />
    </ConfigProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
)
