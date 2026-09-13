import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Input, Select, Button, message, Pagination, Skeleton, Empty, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, BankOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cuentaBancariaApi } from '../../api/cuentaBancariaApi';
import CuentaBancariaCard from './CuentaBancariaCard';
import './CuentasBancarias.css';
/* ===== Skeleton grid ===== */
function renderSkeletonGrid() {
    return (_jsx(Row, { gutter: [16, 16], children: Array.from({ length: 8 }).map((_, i) => (_jsx(Col, { xs: 24, sm: 12, lg: 8, xxl: 6, children: _jsxs("div", { className: "cuenta-card-skeleton", children: [_jsx("div", { className: "cuenta-card-skeleton-header", children: _jsx(Skeleton.Input, { active: true, style: { width: 160, height: 18 } }) }), _jsx("div", { style: { padding: '12px 16px', background: '#fff' }, children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 } }) })] }) }, i))) }));
}
/* ===== Component ===== */
const CuentasBancarias = () => {
    /* ---- Hooks FIRST (before any early return) ---- */
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    /* ---- Data loading ---- */
    const cargarDatos = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const result = await cuentaBancariaApi.obtenerListado(sucursalActiva);
            setData(result || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva]);
    /* ---- Lifecycle ---- */
    useEffect(() => {
        setActiveModule('MCuentaBanco');
        updateToolbar({});
        cargarDatos();
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);
    /* ---- Handlers ---- */
    const handleSearch = (value) => {
        setSearchText(value);
        setCurrentPage(1);
    };
    const handleRefresh = () => {
        setSearchText('');
        setCurrentPage(1);
        cargarDatos();
    };
    const handlePageSizeChange = (value) => {
        setPageSize(value);
        setCurrentPage(1);
    };
    const handleNavigate = (codigo) => {
        navigate('/FTransBanco', { state: { cuentaCodigo: codigo } });
    };
    /* ---- Client-side filter ---- */
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const lower = searchText.toLowerCase();
        return data.filter((item) => item.codigo?.toLowerCase().includes(lower) ||
            item.nombre?.toLowerCase().includes(lower) ||
            item.noCuenta?.toLowerCase().includes(lower) ||
            item.banco?.toLowerCase().includes(lower));
    }, [data, searchText]);
    /* ---- Pagination ---- */
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage, pageSize]);
    // Reset to page 1 if current page exceeds available pages
    useEffect(() => {
        const maxPage = Math.ceil(filteredData.length / pageSize) || 1;
        if (currentPage > maxPage) {
            setCurrentPage(1);
        }
    }, [filteredData, pageSize, currentPage]);
    /* ---- Derived display states ---- */
    const isEmpty = !loading && !loadingError && data.length === 0;
    const isEmptySearch = !loading && !loadingError && data.length > 0 && filteredData.length === 0 && !!searchText;
    const hasContent = !loading && !loadingError && filteredData.length > 0;
    const showPagination = hasContent && filteredData.length > pageSize;
    /* ===== Render ===== */
    return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar por c\u00F3digo, nombre o cuenta...", allowClear: true, onSearch: handleSearch, onKeyDown: (e) => {
                                if (e.key === 'Escape') {
                                    e.target.blur();
                                    handleSearch('');
                                }
                            }, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: handlePageSizeChange, options: [
                                { value: 25, label: '25' },
                                { value: 50, label: '50' },
                                { value: 100, label: '100' },
                            ] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), children: "Nuevo" }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsxs("div", { style: { padding: '0 24px 16px' }, children: [loadingError && (_jsx(Alert, { message: "Error al cargar cuentas bancarias", description: "No se pudieron cargar las cuentas bancarias. Verifique la conexi\u00F3n e intente de nuevo.", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), loading && !loadingError && renderSkeletonGrid(), isEmpty && (_jsx("div", { style: { padding: '48px 0', textAlign: 'center' }, children: _jsx(Empty, { image: _jsx(BankOutlined, { className: "cuenta-empty-icon" }), description: "No hay cuentas bancarias registradas", children: _jsx(PermissionGate, { accion: "CREAR", children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), children: "Nueva cuenta" }) }) }) })), isEmptySearch && (_jsx("div", { style: { padding: '48px 0', textAlign: 'center' }, children: _jsx(Empty, { description: "No se encontraron cuentas con ese criterio", children: _jsx(Button, { onClick: () => handleSearch(''), children: "Limpiar b\u00FAsqueda" }) }) })), hasContent && (_jsxs(_Fragment, { children: [_jsx(Row, { gutter: [16, 16], children: paginatedData.map((cuenta, i) => (_jsx(Col, { xs: 24, sm: 12, lg: 8, xxl: 6, children: _jsx(CuentaBancariaCard, { cuenta: cuenta, onClick: () => handleNavigate(cuenta.codigo), index: i }) }, cuenta.codigo))) }), showPagination && (_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 16 }, children: _jsx(Pagination, { current: currentPage, pageSize: pageSize, total: filteredData.length, onChange: (page) => setCurrentPage(page), showSizeChanger: false, showTotal: (total) => `${total} registros` }) }))] }))] })] }));
};
export default CuentasBancarias;
