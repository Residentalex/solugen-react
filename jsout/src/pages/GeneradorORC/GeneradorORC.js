import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Tag, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { apiClient } from '../../api/client';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
const { Text } = Typography;
const ESTADO_MAP_ORC = {
    0: { label: 'Borrador', color: 'default' },
    1: { label: 'Generado', color: 'success' },
    2: { label: 'Procesado', color: 'processing' },
    3: { label: 'Anulado', color: 'error' },
};
const ESTADO_OPCIONES_ORC = [
    { value: 0, label: 'Borrador' },
    { value: 1, label: 'Generado' },
    { value: 3, label: 'Anulado' },
];
const GeneradorORC = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchText, setSearchText] = useState('');
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [loadingError, setLoadingError] = useState(false);
    const [filtros, setFiltros] = useState({});
    const [selectedRow, setSelectedRow] = useState(null);
    const rangoDefault = useMemo(() => ({
        desde: '20000101000000',
        hasta: '20991231000000',
    }), []);
    const cargarDatos = useCallback(async (pagina, filas, busqueda) => {
        setLoading(true);
        try {
            let desde = filtros.desde ?? rangoDefault.desde;
            let hasta = filtros.hasta ?? rangoDefault.hasta;
            let resultados;
            if (busqueda.length > 2) {
                if (!filtros.desde)
                    desde = '19000101000000';
                if (!filtros.hasta)
                    hasta = '20991231235959';
                resultados = await generadorOrcApi.filtrar(sucursalActiva, {
                    cantidad: filas,
                    salto: (pagina - 1) * filas,
                    desde,
                    hasta,
                    documento: busqueda,
                    ...(filtros.estado !== undefined ? { estado: filtros.estado } : {}),
                });
            }
            else {
                resultados = await generadorOrcApi.obtenerVista(sucursalActiva, desde, hasta, filas, (pagina - 1) * filas, busqueda, filtros.estado);
            }
            setData(resultados);
            setTotal(resultados.length < filas ? (pagina - 1) * filas + resultados.length : pagina * filas + 1);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, filtros, rangoDefault]);
    useEffect(() => {
        cargarDatos(page, pageSize, searchText);
    }, [page, pageSize, searchText, refreshTrigger, filtros, cargarDatos]);
    useEffect(() => {
        setActiveModule('FGORC');
        updateToolbar({ editar: false, anular: false });
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        setLoadingError(false);
        setRefreshTrigger((n) => n + 1);
    };
    const columns = [
        {
            title: 'Número',
            dataIndex: 'numero',
            key: 'numero',
            width: 160,
            fixed: 'left',
            render: (num, record) => (_jsx(Link, { to: `/FGORC/${record.idExterno}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: num }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDateRaw(f) }),
        },
        {
            title: 'Suplidor',
            key: 'suplidor',
            render: (_, record) => (_jsx(Text, { children: record.suplidor ? toTitleCase(record.suplidor.nombre) : '-' })),
        },
        {
            title: 'Almacén',
            dataIndex: 'almacen',
            key: 'almacen',
            width: 200,
            ellipsis: true,
            render: (alm) => _jsx(Text, { children: toTitleCase(alm) || '' }),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 160,
            align: 'right',
            render: (total) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(total) })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 130,
            render: (estado) => {
                const info = ESTADO_MAP_ORC[estado] || { label: 'Desconocido', color: 'default' };
                return _jsx(Tag, { color: info.color, children: info.label });
            },
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: data, rowKey: "idExterno", loading: loading, total: total, page: page, pageSize: pageSize, scrollX: 920, loadingError: loadingError, errorMessage: "Error al cargar generadores ORC", onRefresh: handleRefresh, onPageChange: setPage, onRowClick: (record) => setSelectedRow(record), selectedRowId: selectedRow?.idExterno, toolbarProps: {
            showFiltros: true,
            filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_ORC,
            onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
            searchPlaceholder: 'Buscar número o suplidor...',
            onSearch: handleSearch,
            pageSize,
            onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
            showCrear: true,
            onCrear: () => navigate('/FGORC/nuevo'),
            showEditar: true,
            editarDisabled: !selectedRow,
            onEditar: () => selectedRow && navigate(`/FGORC/${selectedRow.idExterno}/editar`),
            showImprimir: true,
            imprimirDisabled: !selectedRow,
            onImprimir: async () => {
                if (!selectedRow)
                    return;
                try {
                    const res = await apiClient.get(`/ReporteGeneradorOrdenCompra/${sucursalActiva}/${selectedRow.idExterno}`, {
                        responseType: 'blob',
                    });
                    const url = URL.createObjectURL(res.data);
                    setPdfPreview({ url, title: `GORC-${selectedRow.numero}` });
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al generar el reporte');
                }
            },
            onRefresh: handleRefresh,
        } }));
};
export default GeneradorORC;
