import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';
const GuidePopover = ({ title, description, targetElement, open, onClose, }) => {
    useEffect(() => {
        if (!open)
            return;
        const handleClickOutside = (e) => {
            if (targetElement && !targetElement.contains(e.target) && !e.target.closest('.ant-popover')) {
                onClose();
            }
        };
        const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
    }, [open, onClose, targetElement]);
    if (!targetElement)
        return null;
    const rect = targetElement.getBoundingClientRect();
    return createPortal(_jsx(Popover, { open: open, onOpenChange: (visible) => { if (!visible)
            onClose(); }, content: _jsxs("div", { style: { maxWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }, children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 6, fontSize: 14 }, children: title }), description] }), placement: "top", trigger: [], rootClassName: "guide-popover", children: _jsx("span", { style: {
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                pointerEvents: 'none',
                zIndex: -1,
            } }) }), document.body);
};
export default GuidePopover;
