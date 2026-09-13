import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Typography, Alert, Empty, Space, Popconfirm, message } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { denominacionApi } from '../../api/denominacionApi';
import { DeleteOutlined } from '@ant-design/icons';
import { toTitleCase, formatNumber } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import DenominacionFormulario from './DenominacionFormulario';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Denominaciones = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'FDenominacion');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [formularioVisible, setFormularioVisible] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['denominaciones', sucursalActiva],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return [];
            return denominacionApi.listarTodo(sucursalActiva);
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    const datos = data ?? [];
    const datosFiltrados = useMemo(() => {
        if (!searchText)
            return datos;
        const q = searchText.toLowerCase();
        return datos.filter((d) => {
            const tipoTexto = d.tipo === 'B' ? 'billete' : 'moneda';
            return (d.descripcion.toLowerCase().includes(q) ||
                d.valor.toString().includes(q) ||
                tipoTexto.includes(q));
        });
    }, [datos, searchText]);
    useEffect(() => {
        setActiveModule('FDenominacion');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = datosFiltrados;
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
            fileName: `Denominaciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Denominaciones',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const abrirNuevo = () => {
        setEditItem(null);
        setFormularioVisible(true);
    };
    const abrirEditar = (item) => {
        if (!puedeEditar)
            return;
        setEditItem(item);
        setFormularioVisible(true);
    };
    const handleGuardar = () => {
        refetch();
    };
    const handleEliminar = async (id) => {
        setEliminandoId(id);
        try {
            await denominacionApi.eliminar(sucursalActiva, id);
            message.success('Denominación eliminada correctamente');
            refetch();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar denominación');
        }
        finally {
            setEliminandoId(null);
        }
    };
    const columns = [
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            width: 280,
            fixed: 'left',
            render: (val, record) => puedeEditar ? (_jsx(Button, { type: "link", size: "small", style: { padding: 0, fontWeight: 500, height: 'auto' }, onClick: () => abrirEditar(record), children: toTitleCase(val) })) : (_jsx(Text, { children: toTitleCase(val) })),
        },
        {
            title: 'Valor',
            dataIndex: 'valor',
            key: 'valor',
            width: 150,
            align: 'right',
            render: (val) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatNumber(val) })),
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 110,
            align: 'center',
            render: (tipo) => (_jsx(Tag, { color: tipo === 'B' ? 'blue' : 'green', children: tipo === 'B' ? 'Billete' : 'Moneda' })),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 100,
            align: 'center',
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'red', children: activo ? 'Sí' : 'No' })),
        },
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 80,
            align: 'center',
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: '',
            key: 'acciones',
            width: 60,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (_jsx(Space, { size: 0, children: _jsx(Popconfirm, { title: "Eliminar denominaci\u00F3n", description: `¿Estás seguro de eliminar ${record.descripcion}?`, onConfirm: () => handleEliminar(record.id), okText: "Eliminar", cancelText: "Cancelar", okButtonProps: { danger: true }, children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), loading: eliminandoId === record.id }) }) })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar denominaciones", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, placeholder: "Buscar por descripci\u00F3n...", pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: datosFiltrados, rowKey: (record) => record.id ?? 0, loading: isLoading, scroll: { x: 800 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: datosFiltrados.length,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: (_jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: searchText
                                    ? _jsx(Empty, { description: "Sin resultados para la b\u00FAsqueda" })
                                    : _jsx(Empty, { description: "No hay denominaciones registradas" }) })),
                        } })] }), _jsx(DenominacionFormulario, { visible: formularioVisible, editItem: editItem, onClose: () => setFormularioVisible(false), onSaved: handleGuardar })] }));
};
export default Denominaciones;
