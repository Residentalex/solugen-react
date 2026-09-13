import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Modal, Table, Input, Alert, Tag, Typography, Empty, Button } from 'antd';
import { WarningOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const ExistenciasNegativasModal = ({ open, onClose, datos, }) => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [searchText, setSearchText] = useState('');
    const searchRef = useRef(null);
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                searchRef.current?.focus?.();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);
    const datosFiltrados = useMemo(() => {
        if (!searchText)
            return datos;
        const q = searchText.toLowerCase();
        return datos.filter((d) => d.codPro.toLowerCase().includes(q) ||
            d.articulo.toLowerCase().includes(q));
    }, [datos, searchText]);
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codPro',
            key: 'codPro',
            width: 110,
            render: (val) => (_jsx(Text, { strong: true, style: { fontFamily: 'monospace', fontSize: 12 }, children: val })),
        },
        {
            title: 'Artículo',
            dataIndex: 'articulo',
            key: 'articulo',
            ellipsis: { showTitle: true },
            render: (val) => (_jsx("span", { style: { fontSize: 13 }, children: val })),
        },
        {
            title: 'Almacén',
            dataIndex: 'codAlmacen',
            key: 'codAlmacen',
            width: 90,
            align: 'center',
            render: (val) => _jsx(Tag, { style: { borderRadius: 4 }, children: val }),
            responsive: ['md'],
        },
        {
            title: 'Existencia',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 100,
            align: 'right',
            render: (val) => (_jsx(Text, { type: "danger", strong: true, children: val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) })),
        },
    ];
    const handleExportExcel = useCallback(async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const columnHeaders = ['Código', 'Artículo', 'Almacén', 'Existencia'];
        const dataRows = datos.map((d) => [
            d.codPro,
            d.articulo,
            d.codAlmacen,
            d.cantidad,
        ]);
        exportToExcel({
            companyName,
            columnHeaders,
            dataRows,
            sheetName: 'Existencias Negativas',
            columnWidths: [
                { wch: 14 },
                { wch: 50 },
                { wch: 10 },
                { wch: 12 },
            ],
        });
    }, [sucursalActiva, datos]);
    return (_jsx(Modal, { title: _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsxs("span", { children: [_jsx(WarningOutlined, { style: { color: '#f46a6a', marginRight: 8 } }), "Productos con existencia negativa", _jsx(Tag, { color: "error", style: { marginLeft: 8, borderRadius: 4 }, children: datos.length.toLocaleString('es-DO') })] }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { type: "default", size: "small", icon: _jsx(DownloadOutlined, {}), onClick: handleExportExcel }) })] }), open: open, onCancel: onClose, footer: null, width: 720, destroyOnHidden: true, children: datos.length === 0 ? (_jsx(Empty, { description: "No hay productos con existencia negativa", image: Empty.PRESENTED_IMAGE_SIMPLE })) : (_jsxs(_Fragment, { children: [_jsx(Alert, { type: "warning", showIcon: true, message: "Estos productos tienen existencia negativa y deben corregirse antes de generar el cierre.", style: { marginBottom: 12, borderRadius: 6 } }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }, children: [_jsx(Input.Search, { ref: searchRef, placeholder: "Buscar por c\u00F3digo o art\u00EDculo...", allowClear: true, style: { flex: 1 }, value: searchText, onChange: (e) => setSearchText(e.target.value), onSearch: (val) => setSearchText(val), prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsxs(Text, { type: "secondary", style: { fontSize: 12, whiteSpace: 'nowrap' }, children: [datosFiltrados.length.toLocaleString('es-DO'), " de ", datos.length.toLocaleString('es-DO'), " productos"] })] }), _jsx(Table, { dataSource: datosFiltrados, columns: columns, rowKey: "codPro", size: "small", pagination: { pageSize: 20, showSizeChanger: false, size: 'small' }, scroll: { y: 400 }, style: { borderRadius: 6 } })] })) }));
};
export default ExistenciasNegativasModal;
