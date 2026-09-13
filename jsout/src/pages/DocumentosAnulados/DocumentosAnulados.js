import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Typography, Select } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transaccionApi } from '../../api/transaccionApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatCurrency, formatDateRaw, formatDateParam, toTitleCase } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
const { Text } = Typography;
const CODIGO_PANTALLA = 'RDocumentosAnulados';
const DocumentosAnulados = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const sucursalSeguridad = useAuthStore((s) => s.usuario?.sucursalActiva);
    const pantallas = useAuthStore((s) => s.usuario?.pantallas || []);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedRow, setSelectedRow] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filtros, setFiltros] = useState({});
    const [documentos, setDocumentos] = useState([]);
    const [tipoDoc, setTipoDoc] = useState(undefined);
    const moduloID = useMemo(() => {
        const qs = searchParams.get('modulo');
        if (qs)
            return Number(qs);
        const pantalla = pantallas.find((p) => p.codigo === CODIGO_PANTALLA);
        return pantalla?.modulos?.[0]?.id;
    }, [pantallas, searchParams]);
    const rangoDefault = useMemo(() => ({
        desde: formatDateParam(new Date(Date.now() - 30 * 86400000)),
        hasta: formatDateParam(new Date()),
    }), []);
    useEffect(() => {
        if (moduloID === undefined || sucursalSeguridad === undefined)
            return;
        apiClient.get(`/Pantalla/${sucursalSeguridad}/modulo/${moduloID}/documentos`)
            .then((res) => setDocumentos(res.data.data || []))
            .catch((err) => console.warn('Error al cargar documentos para filtro', err));
    }, [sucursalSeguridad, moduloID]);
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            const desde = filtros.desde ?? rangoDefault.desde;
            const hasta = filtros.hasta ?? rangoDefault.hasta;
            const docsStr = documentos.length > 0 ? documentos.map((d) => d.codigo).join(',') : '';
            const result = await transaccionApi.obtenerAnulados(sucursalActiva, desde, hasta, tipoDoc || undefined, docsStr, page, pageSize);
            setData(result.data);
            setTotal(result.total);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, rangoDefault, filtros, tipoDoc, moduloID, documentos, page, pageSize]);
    useEffect(() => {
        cargarDatos();
    }, [refreshTrigger, cargarDatos]);
    useEffect(() => {
        setActiveModule(CODIGO_PANTALLA);
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
        return data.filter((r) => (r.documento || '').toLowerCase().includes(t) ||
            (r.entidad || '').toLowerCase().includes(t) ||
            (r.concepto || '').toLowerCase().includes(t));
    }, [data, searchText]);
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 200,
            fixed: 'left',
            render: (doc, record) => (_jsx(Link, { to: `/FAsientoContable/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (v) => _jsx(Text, { children: formatDateRaw(v) }),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidad',
            key: 'entidad',
            ellipsis: true,
            render: (v) => _jsx(Text, { children: toTitleCase(v || '') }),
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            width: 320,
            ellipsis: true,
            render: (v) => _jsx(Text, { children: toTitleCase(v || '') }),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 130,
            align: 'right',
            render: (v) => _jsx(Text, { strong: true, children: formatCurrency(v) }),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 110,
            render: (est) => _jsx(EstadoColumnCell, { estado: est }),
        },
    ];
    const docOptions = useMemo(() => documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.descripcion}` })), [documentos]);
    return (_jsx(DocumentListadoLayout, { columns: columns, data: filteredData, rowKey: "id", loading: loading, total: total, page: page, pageSize: pageSize, scrollX: 1000, selectedRowId: selectedRow?.id, loadingError: loadingError, errorMessage: "Error al cargar documentos anulados", onRefresh: handleRefresh, onRowClick: handleRowClick, onPageChange: setPage, toolbarProps: {
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
            extraLeft: (_jsx(Select, { placeholder: "Documento", allowClear: true, showSearch: true, style: { minWidth: 280 }, value: tipoDoc, onChange: (val) => { setTipoDoc(val); setPage(1); }, options: docOptions, size: "small", filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) })),
        } }));
};
export default DocumentosAnulados;
