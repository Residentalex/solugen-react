import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { cierreFiscalApi } from '../../api/cierreFiscalApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency, formatDateRaw } from '../../utils/formats';
const { Text } = Typography;
const PAGE_SIZE = 50;
const CierreFiscal = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    // Estados
    const [cierres, setCierres] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const [selectedRow, setSelectedRow] = useState(null);
    // ============================================================
    // Carga de datos
    // ============================================================
    const cargarCierres = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const data = await cierreFiscalApi.listarCierres();
            setCierres(data);
            setPage(1);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar cierres fiscales';
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Toolbar y carga inicial
    useEffect(() => {
        setActiveModule('RCIERREFISCAL');
        cargarCierres();
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar, cargarCierres]);
    // ============================================================
    // Handlers
    // ============================================================
    const handleRefresh = useCallback(() => {
        cargarCierres();
    }, [cargarCierres]);
    const handleSearch = useCallback((value) => {
        setSearchText(value);
        setPage(1);
    }, []);
    const handlePageChange = useCallback((newPage) => {
        setPage(newPage);
    }, []);
    const handlePageSizeChange = useCallback((newSize) => {
        setPageSize(newSize);
        setPage(1);
    }, []);
    const handleRowClick = useCallback((record) => {
        setSelectedRow(record);
        navigate(`/RCIERREFISCAL/${record.transacId}`, { state: { cierre: record } });
    }, [navigate]);
    // ============================================================
    // Filtrado y paginación cliente-side
    // ============================================================
    const filteredCierres = useMemo(() => {
        if (!searchText)
            return cierres;
        const q = searchText.toLowerCase();
        return cierres.filter((c) => c.numeroDocumento?.toLowerCase().includes(q));
    }, [cierres, searchText]);
    const total = filteredCierres.length;
    const paginatedData = useMemo(() => {
        return filteredCierres.slice((page - 1) * pageSize, page * pageSize);
    }, [filteredCierres, page, pageSize]);
    // ============================================================
    // Columnas
    // ============================================================
    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 130,
            render: (val, record) => (_jsx(Link, { to: `/RCIERREFISCAL/${record.transacId}`, state: { cierre: record }, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: formatDateRaw(val) }) })),
        },
        {
            title: 'No. Documento',
            dataIndex: 'numeroDocumento',
            key: 'numeroDocumento',
            width: 200,
            render: (val) => _jsx(Text, { children: val || '' }),
        },
        {
            title: 'Débitos',
            dataIndex: 'totalDebitos',
            key: 'totalDebitos',
            width: 160,
            align: 'right',
            render: (val) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val) })),
        },
        {
            title: 'Créditos',
            dataIndex: 'totalCreditos',
            key: 'totalCreditos',
            width: 160,
            align: 'right',
            render: (val) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(val) })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: paginatedData, rowKey: "transacId", loading: loading, total: total, page: page, pageSize: pageSize, scrollX: 800, selectedRowId: selectedRow?.transacId, loadingError: loadingError, errorMessage: "Error al cargar cierres fiscales", onRefresh: handleRefresh, onRowClick: handleRowClick, onPageChange: handlePageChange, toolbarProps: {
            showFiltros: false,
            searchPlaceholder: 'Buscar número de documento...',
            onSearch: handleSearch,
            pageSize,
            onPageSizeChange: handlePageSizeChange,
            showCrear: false,
            showEditar: false,
            showClonar: false,
            showImprimir: false,
            onRefresh: handleRefresh,
        } }));
};
export default CierreFiscal;
