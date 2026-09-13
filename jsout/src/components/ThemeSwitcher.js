import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Popover } from 'antd';
import { BgColorsOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores/uiStore';
import { hexToRgba } from '../utils/themeUtils';
import { THEMES } from '../themes';
const themeList = [
    'light-default', 'dark-default',
    'light-ocean', 'dark-ocean',
    'light-midnight', 'dark-midnight',
    'light-rose', 'dark-rose',
    'light-amber', 'dark-amber',
    'light-genesis',
    'light-spa',
    'basic-devexpress',
];
const ThemeSwitcher = () => {
    const themeName = useUIStore((s) => s.themeName);
    const setTheme = useUIStore((s) => s.setTheme);
    const activePrimary = THEMES[themeName].primaryColor;
    const content = (_jsx("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 200 }, children: themeList.map((name) => {
            const theme = THEMES[name];
            const isActive = themeName === name;
            return (_jsxs("div", { onClick: () => setTheme(name), style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 4px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isActive ? hexToRgba(activePrimary, 0.08) : 'transparent',
                    border: isActive ? '2px solid ' + theme.primaryColor : '2px solid transparent',
                    transition: 'all 0.15s',
                }, children: [_jsx("div", { style: {
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: theme.primaryColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 14,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }, children: theme.isDark ? _jsx(MoonOutlined, {}) : _jsx(SunOutlined, {}) }), _jsx("span", { style: { fontSize: 10, color: '#666', textAlign: 'center' }, children: name === 'light-genesis' ? 'Genesis'
                            : name === 'light-spa' ? 'Spa Soft'
                                : name === 'basic-devexpress' ? 'Basic DevExpress'
                                    : name.replace('-', ' ') })] }, name));
        }) }));
    return (_jsx(Popover, { content: content, trigger: "click", placement: "bottomRight", children: _jsx("button", { className: "paces-topbar-action-btn", title: "Cambiar tema", children: _jsx(BgColorsOutlined, {}) }) }));
};
export default ThemeSwitcher;
