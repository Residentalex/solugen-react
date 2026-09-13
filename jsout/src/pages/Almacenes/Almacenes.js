import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { useNavigate } from 'react-router-dom';
import { Alert, Card, Table, Button, Modal, Descriptions, Typography, Empty } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { almacenApi } from '../../api/almacenApi';
import { toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Almacenes = () => {
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
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['almacenes', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                almacenApi.filtrar(sucursalActiva, params),
                almacenApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MAlmacen');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
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
            fileName: `Almacenes_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Almacenes',
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
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { fontFamily: 'monospace', cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: val || '-' })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (val) => _jsx(Text, { strong: true, children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Cuenta Contable',
            dataIndex: 'cuentaContable',
            key: 'cuentaContable',
            width: 160,
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: val || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar almacenes", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: () => navigate('/MAlmacen/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "codigo", loading: isLoading, scroll: { x: 500 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: searchText
                                    ? _jsx(Empty, { description: "Sin resultados para la b\u00FAsqueda" })
                                    : _jsx(Empty, { description: "No hay almacenes configurados" }) })
                        } })] }), _jsx(Modal, { title: `Detalle: ${detalleItem?.nombre || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: null, width: 520, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: detalleItem.nombre }), _jsx(Descriptions.Item, { label: "Cuenta Contable", children: _jsx(Text, { style: { fontFamily: 'monospace' }, children: detalleItem.cuentaContable || '-' }) }), _jsx(Descriptions.Item, { label: "ID Externo", children: detalleItem.idExterno || '-' }), _jsx(Descriptions.Item, { label: "Fecha Inicial", children: detalleItem.fechaInicial ? new Date(detalleItem.fechaInicial).toLocaleDateString('es-DO') : '-' }), _jsx(Descriptions.Item, { label: "Fecha Cierre", children: detalleItem.fechaCierre ? new Date(detalleItem.fechaCierre).toLocaleDateString('es-DO') : '-' })] })) })] }));
};
export default Almacenes;
