import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Select } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { documentosApi } from '../../api/documentosApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
const { Text } = Typography;
const IntegridadAsientos = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalesDisponibles = useCompanyStore((s) => s.data.sucursales);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedRow, setSelectedRow] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filtros, setFiltros] = useState({});
    const [sucursalFiltro, setSucursalFiltro] = useState(undefined);
    const [tipoDoc, setTipoDoc] = useState(undefined);
    const [documentos, setDocumentos] = useState([]);
    const rangoDefault = useMemo(() => ({
        desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
        hasta: formatDateParam(new Date()),
    }), []);
    useEffect(() => {
        documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch((err) => console.warn('Error al cargar documentos para filtro', err));
    }, [sucursalActiva]);
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const desde = filtros.desde ?? rangoDefault.desde;
            const hasta = filtros.hasta ?? rangoDefault.hasta;
            if (sucursalFiltro === -1) {
                const sucursalesIds = (sucursalesDisponibles || [])
                    .filter((s) => s.sucursal !== undefined)
                    .map((s) => s.sucursal);
                const resultados = await Promise.all(sucursalesIds.map(suc => transaccionApi.obtenerCuentasInvalidas(suc, desde, hasta, tipoDoc || undefined)
                    .catch(() => [])));
                const result = resultados.flat();
                setData(result);
            }
            else {
                const suc = sucursalFiltro ?? sucursalActiva;
                const result = await transaccionApi.obtenerCuentasInvalidas(suc, desde, hasta, tipoDoc || undefined);
                setData(result);
            }
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, sucursalFiltro, rangoDefault, filtros, tipoDoc, sucursalesDisponibles]);
    useEffect(() => {
        cargarDatos();
    }, [refreshTrigger, cargarDatos]);
    useEffect(() => {
        setActiveModule('RIntegridadAsientos');
        updateToolbar({});
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
    const handleRowClick = (record) => {
        setSelectedRow(record);
    };
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const t = searchText.toLowerCase();
        return data.filter((r) => (r.noDocumento || '').toLowerCase().includes(t) ||
            (r.nombreEntidad || '').toLowerCase().includes(t) ||
            (r.concepto?.nombre || '').toLowerCase().includes(t) ||
            (r.documento?.codigo || '').toLowerCase().includes(t));
    }, [data, searchText]);
    const columns = [
        {
            title: 'Documento',
            key: 'documento',
            width: 180,
            fixed: 'left',
            render: (_, record) => (_jsx(Link, { to: `/FAsientoContable/${record.id}`, className: "paces-doc-link", children: _jsxs(Text, { strong: true, children: [record.documento?.codigo || '', "-", record.noDocumento] }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaDocumento',
            key: 'fechaDocumento',
            width: 110,
            render: (v) => _jsx(Text, { children: formatDateRaw(v) }),
        },
        {
            title: 'Entidad',
            key: 'entidad',
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: toTitleCase(record.nombreEntidad || record.entidad?.nombre || '') })),
        },
        {
            title: 'Concepto',
            key: 'concepto',
            width: 320,
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: toTitleCase(record.concepto?.nombre || '') })),
        },
        {
            title: 'Cuenta Inválida',
            key: 'cuentaInvalida',
            width: 160,
            render: (_, record) => {
                const asiento = record.asientos?.[0];
                const noCuenta = asiento?.cuentaContable?.noCuenta || asiento?.noCuenta || '';
                return noCuenta ? (_jsx(Text, { type: "danger", children: noCuenta })) : _jsx(Text, { type: "warning", children: "\u2014" });
            },
        },
        {
            title: 'Monto',
            key: 'monto',
            width: 130,
            align: 'right',
            render: (_, record) => {
                const asiento = record.asientos?.[0];
                return _jsx(Text, { children: formatCurrency(asiento?.monto ?? 0) });
            },
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 110,
            render: (est, record) => _jsx(EstadoColumnCell, { estado: est, periodo: record.periodo }),
        },
    ];
    const docOptions = useMemo(() => documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })), [documentos]);
    return (_jsx(DocumentListadoLayout, { columns: columns, data: filteredData, rowKey: "id", loading: loading, total: filteredData.length, page: page, pageSize: pageSize, scrollX: 1100, selectedRowId: selectedRow?.id, loadingError: loadingError, errorMessage: "Error al cargar integridad de asientos", onRefresh: handleRefresh, onRowClick: handleRowClick, onPageChange: setPage, toolbarProps: {
            showFiltros: true,
            filtros,
            rangoDefault,
            opcionesEstado: [],
            onFiltrosAplicar: (nuevos) => { setFiltros(nuevos); setPage(1); },
            searchPlaceholder: 'Buscar documento, entidad...',
            onSearch: handleSearch,
            pageSize,
            onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
            onRefresh: handleRefresh,
            extraLeft: (_jsxs(_Fragment, { children: [_jsx(SucursalDocumentoSelector, { value: sucursalFiltro, onChange: (val) => { setSucursalFiltro(val); setPage(1); }, showAllOption: true }), _jsx(Select, { placeholder: "Documento", allowClear: true, showSearch: true, style: { minWidth: 280 }, value: tipoDoc, onChange: (val) => { setTipoDoc(val); setPage(1); }, options: docOptions, size: "small", filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) })] })),
        } }));
};
export default IntegridadAsientos;
