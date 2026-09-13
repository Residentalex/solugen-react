import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Select } from 'antd';
const PageSizeSelect = ({ value, onChange }) => {
    return (_jsx(Select, { style: { width: 65 }, value: value, onChange: onChange, options: [
            { value: 25, label: '25' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
        ] }));
};
export default PageSizeSelect;
