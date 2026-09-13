import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Button, DatePicker, Dropdown, Space, Typography } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, FileExcelOutlined, FilePdfOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
const { Text } = Typography;
const ReporteToolbar = ({ onVolver, fechas, onFechasChange, onConsultar, loading, onExportarExcel, onExportarPDF, exportando, extraLeft, }) => {
    const exportMenu = {
        items: [
            ...(onExportarExcel
                ? [{ key: 'excel', icon: _jsx(FileExcelOutlined, {}), label: 'Exportar a Excel', onClick: onExportarExcel }]
                : []),
            ...(onExportarPDF
                ? [{ key: 'pdf', icon: _jsx(FilePdfOutlined, {}), label: 'Guardar como PDF', onClick: onExportarPDF }]
                : []),
        ],
    };
    const tieneExport = onExportarExcel || onExportarPDF;
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: onVolver, children: "Volver" }), _jsx("div", { style: { flex: 1 } }), extraLeft, fechas !== undefined && onFechasChange && (_jsx(RangePicker, { value: fechas, onChange: onFechasChange, format: "YYYY-MM-DD", allowClear: false })), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), onClick: onConsultar, loading: loading, children: "Consultar" }), tieneExport && (_jsx(Dropdown, { menu: exportMenu, trigger: ['click'], children: _jsx(Button, { loading: exportando, children: _jsxs(Space, { children: [_jsx(FileExcelOutlined, {}), "Exportar", _jsx(DownOutlined, {})] }) }) }))] }));
};
export default ReporteToolbar;
