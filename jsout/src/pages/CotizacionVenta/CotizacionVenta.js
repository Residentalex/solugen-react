import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { cotizacionVentaApi } from '../../api/cotizacionVentaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAuthStore } from '../../stores/authStore';
const { Text } = Typography;
const CotizacionVenta = () => {
    const navigate = useNavigate();
    const { screenCode, documentCode } = useScreenConfig('FCotizacion');
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => cotizacionVentaApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => cotizacionVentaApi.filtrar(sucursal, params),
        reporteUrl: (sucursal, id) => `/reportes/facturacion/cotizacionVenta/${sucursal}/${id}`,
        tituloReporte: 'Cotizacion',
        tituloError: 'Error al cargar cotizaciones',
    });
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await cotizacionVentaApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
            const cloneData = {
                ...data,
                id: 0,
                noDocumento: '',
                ncf: '',
                ncfModificado: '',
                estado: 0,
                asientos: [],
                logs: [],
            };
            navigate('/FCotizacion/nuevo', { state: { cloneData } });
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
        }
    };
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 180,
            fixed: 'left',
            render: (doc, record) => (_jsx(Link, { to: `/FCotizacion/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDateRaw(f) }),
        },
        {
            title: 'Cliente',
            dataIndex: 'entidad',
            key: 'entidad',
            render: (name, record) => (_jsx(EntidadColumnCell, { name: name, identificacion: record.identificacion })),
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            width: 280,
            ellipsis: true,
            render: (concepto) => _jsx(Text, { children: toTitleCase(concepto) || '' }),
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
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 150,
            render: (ncf) => _jsx(Text, { children: ncf || '' }),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: Number(estado), periodo: record.periodo })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1370, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar cotizaciones", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar documento, concepto, cliente...',
            onSearch: actions.handleSearch,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate('/FCotizacion/nuevo'),
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FCotizacion/${state.selectedRow.id}/editar`),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            onRefresh: actions.handleRefresh,
        } }));
};
export default CotizacionVenta;
