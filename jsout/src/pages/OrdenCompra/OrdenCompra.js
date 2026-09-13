import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { Sucursal } from '../../types/auth';
import { useScreenConfig } from '../../hooks/useScreenConfig';
const { Text } = Typography;
const destino = Sucursal.Compra;
const OrdenCompra = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { screenCode, documentCode } = useScreenConfig();
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => ordenCompraApi.obtenerResumido(sucursal, destino, {
            desde,
            hasta,
            cantidad: filas,
            salto,
            estado,
        }),
        fetchFiltrar: (sucursal, params) => ordenCompraApi.filtrar(sucursal, destino, {
            cantidad: params.cantidad,
            salto: params.salto,
            documento: params.documento,
            suplidor: params.documento,
            concepto: params.concepto,
            desde: params.desde,
            hasta: params.hasta,
        }),
        reporteUrl: () => '',
        tituloReporte: '',
        tituloError: 'Error al cargar órdenes de compra',
    });
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await ordenCompraApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
            navigate('/FORC/nuevo', { state: { cloneData } });
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
        }
    };
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'noDocumento',
            key: 'noDocumento',
            width: 180,
            fixed: 'left',
            render: (doc, record) => (_jsx(Link, { to: `/FORC/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc || '-' }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaDocumento',
            key: 'fechaDocumento',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDateRaw(f) }),
        },
        {
            title: 'Suplidor',
            key: 'suplidor',
            render: (_, record) => (_jsx(Text, { children: record.suplidor?.nombre ? toTitleCase(record.suplidor.nombre) : '-' })),
        },
        {
            title: 'Concepto',
            key: 'concepto',
            width: 250,
            ellipsis: true,
            render: (_, record) => (_jsx(Text, { children: record.concepto?.nombre ? toTitleCase(record.concepto.nombre) : '-' })),
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 160,
            align: 'right',
            render: (total) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(total || 0) })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 130,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1120, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar \u00F3rdenes de compra", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar documento, suplidor...',
            onSearch: actions.handleSearch,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate('/FORC/nuevo'),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: false,
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FORC/${state.selectedRow.id}/editar`),
            onRefresh: actions.handleRefresh,
        } }));
};
export default OrdenCompra;
