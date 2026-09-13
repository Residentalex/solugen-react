import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space } from 'antd';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatDate } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { useAuthStore } from '../../stores/authStore';
const { Text } = Typography;
const ConciliacionBancaria = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { screenCode } = useScreenConfig('FConcil');
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: async (sucursal, desde, hasta, filas, salto, estado) => {
            const res = await conciliacionBancariaApi.obtenerVistaDocumento(sucursal, desde, hasta, filas, salto, estado);
            return {
                data: res.data.map((item) => ({ ...item, id: item.concilID })),
                total: res.total,
            };
        },
        fetchFiltrar: async (sucursal, params) => {
            const res = await conciliacionBancariaApi.filtrarDocumento(sucursal, params);
            return {
                data: res.data.map((item) => ({ ...item, id: item.concilID })),
                total: res.total,
            };
        },
        reporteUrl: () => '',
        tituloReporte: 'ConciliacionBancaria',
        tituloError: 'Error al cargar conciliaciones bancarias',
    });
    const columns = [
        {
            title: 'N° Conciliación',
            dataIndex: 'concilID',
            key: 'concilID',
            width: 140,
            fixed: 'left',
            render: (val, record) => (_jsx(Link, { to: `/FConcil/${val}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: val }) })),
        },
        {
            title: 'Cuenta',
            dataIndex: 'numeroCta',
            key: 'numeroCta',
            width: 160,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 130,
            render: (val) => _jsx(Text, { children: formatDate(val) }),
        },
        {
            title: 'Balance Bancos',
            dataIndex: 'balBancos',
            key: 'balBancos',
            width: 150,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Balance Libros',
            dataIndex: 'balLibros',
            key: 'balLibros',
            width: 150,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Diferencia',
            dataIndex: 'diferencia',
            key: 'diferencia',
            width: 150,
            align: 'right',
            render: (val) => (_jsx(Text, { strong: true, className: val !== 0 ? 'paces-text-error' : '', children: formatCurrency(val) })),
        },
        {
            title: 'Estado',
            dataIndex: 'aplicada',
            key: 'aplicada',
            width: 110,
            render: (val) => (_jsx(EstadoColumnCell, { estado: val ? 2 : 0 })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "concilID", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1200, selectedRowId: state.selectedRow?.concilID, loadingError: state.loadingError, errorMessage: "Error al cargar conciliaciones bancarias", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: (p) => actions.setPage(p), toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: [
                { value: 0, label: 'No aplicadas' },
                { value: 1, label: 'Aplicadas' },
            ],
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar por cuenta bancaria...',
            onSearch: actions.handleSearch,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate('/FConcil/nuevo'),
            onRefresh: actions.handleRefresh,
        } }));
};
export default ConciliacionBancaria;
