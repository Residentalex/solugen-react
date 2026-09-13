import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Table, Card, Button, Modal, Descriptions, Typography, Empty } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { toTitleCase } from '../../utils/formats';
import { bancoApi } from '../../api/bancoApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Bancos = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    React.useEffect(() => {
        setActiveModule('MBanco');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['bancos', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                bancoApi.obtenerListado(sucursalActiva, params),
                bancoApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            if (col.dataIndex) {
                const val = item[col.dataIndex];
                return val != null ? String(val) : '';
            }
            return '';
        }));
        exportToExcel({
            fileName: `Bancos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Bancos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const abrirDetalle = (item) => {
        setDetalleItem(item);
        setDetalleVisible(true);
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            fixed: 'left',
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 280,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Tipo Entidad',
            dataIndex: 'tipoEntidad',
            key: 'tipoEntidad',
            width: 150,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Correo Electrónico',
            dataIndex: 'correoElectronico',
            key: 'correoElectronico',
            width: 250,
            ellipsis: true,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'ID Externo',
            dataIndex: 'idExterno',
            key: 'idExterno',
            width: 120,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar bancos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: () => navigate('/MBanco/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 900 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay bancos registrados" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsx(Modal, { title: `Detalle: ${detalleItem?.codigo || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 520, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: toTitleCase(detalleItem.nombre ?? '') }), _jsx(Descriptions.Item, { label: "Tipo Entidad", children: detalleItem.tipoEntidad || '-' }), _jsx(Descriptions.Item, { label: "Correo Electr\u00F3nico", children: detalleItem.correoElectronico || '-' }), _jsx(Descriptions.Item, { label: "ID Externo", children: detalleItem.idExterno || '-' })] })) })] }));
};
export default Bancos;
