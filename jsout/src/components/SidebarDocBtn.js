import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { BookOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
const SidebarDocBtn = ({ collapsed }) => {
    const handleClick = () => {
        window.open('/documentacion', '_blank');
    };
    const content = (_jsxs("div", { className: "sidebar-footer-btn", onClick: handleClick, children: [_jsx(BookOutlined, {}), !collapsed && _jsx("span", { className: "footer-btn-text", children: "Documentaci\u00F3n" })] }));
    if (collapsed) {
        return _jsx(Tooltip, { title: "Documentaci\u00F3n", placement: "right", children: content });
    }
    return content;
};
export default SidebarDocBtn;
