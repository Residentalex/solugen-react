import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, message, Empty, Typography, Alert, Popconfirm, } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { documentosApi } from '../../api/documentosApi';
import { toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
const { Text } = Typography;
const Documentos = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MDocumento');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const puedeEliminar = pantallaActual?.acciones.includes('ELIMINAR') ?? false;
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['documentos', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const resultado = await documentosApi.filtrar(sucursalActiva, params);
            return { datos: resultado.datos || [], total: resultado.total ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MDocumento');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleSearch = (value) => {
        setPage(1);
        setSearchText(value);
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones' && col.title !== 'Acción');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `Documentos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Documentos',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleEliminar = async (doc) => {
        try {
            if (sucursalActiva === undefined)
                return;
            await documentosApi.eliminar(sucursalActiva, doc.id);
            message.success('Documento eliminado correctamente');
            refetch();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar documento');
        }
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            fixed: 'left',
            width: 120,
            render: (val, record) => (_jsx(Text, { style: { fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }, onClick: () => navigate(`/MDocumento/${record.id}`), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nombre) => _jsx(Text, { children: toTitleCase(nombre ?? '') }),
        },
        {
            title: 'Longitud',
            dataIndex: 'longitudCodigo',
            key: 'longitudCodigo',
            width: 100,
            align: 'center',
            render: (val) => _jsx(Text, { children: val ?? '-' }),
        },
        {
            title: 'Documento Reverso',
            dataIndex: 'documentoReverso',
            key: 'documentoReverso',
            width: 160,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        ...(puedeEditar || puedeEliminar
            ? [
                {
                    title: 'Acción',
                    key: 'accion',
                    width: 120,
                    align: 'center',
                    render: (_, record) => (_jsxs(_Fragment, { children: [puedeEditar && (_jsx(Button, { type: "link", size: "small", style: { marginRight: 8 }, onClick: () => navigate(`/MDocumento/${record.id}/editar`), children: "Editar" })), puedeEliminar && (_jsx(Popconfirm, { title: "\u00BFEliminar este documento?", onConfirm: () => handleEliminar(record), okText: "S\u00ED", cancelText: "No", children: _jsx(Button, { type: "link", danger: true, size: "small", children: "Eliminar" }) }))] })),
                },
            ]
            : []),
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar documentos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: () => navigate('/MDocumento/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "id", loading: isLoading, scroll: { x: 700 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay documentos registrados" }) }) } })] })] }));
};
export default Documentos;
