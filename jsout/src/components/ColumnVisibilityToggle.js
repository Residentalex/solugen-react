import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Button, Checkbox, Popover } from 'antd';
import { TableOutlined } from '@ant-design/icons';
const ColumnVisibilityToggle = ({ columns, visibleKeys, onChange, iconOnly, }) => {
    const [open, setOpen] = useState(false);
    const allVisible = columns.length > 0 && columns.every((col) => visibleKeys.includes(col.key));
    const someVisible = !allVisible && visibleKeys.length > 0;
    const content = (_jsxs("div", { style: { width: 200, padding: 4 }, children: [_jsx(Checkbox, { indeterminate: someVisible, checked: allVisible, onChange: (e) => {
                    if (e.target.checked) {
                        onChange(columns.map((col) => col.key));
                    }
                    else {
                        onChange([]);
                    }
                }, style: { marginBottom: 8, fontWeight: 600 }, children: "Todas" }), _jsx("div", { style: { borderTop: '1px solid #f0f0f0', marginBottom: 8 } }), columns.map((col) => (_jsx("div", { style: { marginBottom: 4 }, children: _jsx(Checkbox, { checked: visibleKeys.includes(col.key), onChange: (e) => {
                        if (e.target.checked) {
                            onChange([...visibleKeys, col.key]);
                        }
                        else {
                            onChange(visibleKeys.filter((k) => k !== col.key));
                        }
                    }, children: col.label }) }, col.key)))] }));
    return (_jsx(Popover, { open: open, onOpenChange: setOpen, trigger: "click", placement: "bottomRight", content: content, children: _jsx(Button, { icon: _jsx(TableOutlined, {}), children: iconOnly ? '' : 'Columnas' }) }));
};
export default ColumnVisibilityToggle;
