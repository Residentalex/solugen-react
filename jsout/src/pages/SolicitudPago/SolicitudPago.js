import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import { useScreenConfig } from '../../hooks/useScreenConfig';
const { Text } = Typography;
const SolicitudPago = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { screenCode, documentCode } = useScreenConfig();
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => solicitudPagoApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => solicitudPagoApi.filtrar(sucursal, {
            cantidad: params.cantidad,
            salto: params.salto,
            desde: params.desde,
            hasta: params.hasta,
            documento: params.documento,
            entidad: params.entidad,
            concepto: params.concepto,
        }),
        reporteUrl: (sucursal, id) => `/reportes/banco/solicitud-pago/${sucursal}/${id}`,
        tituloReporte: '',
        tituloError: 'Error al cargar solicitudes de pago',
    });
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await solicitudPagoApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
            navigate('/FSPA/nuevo', { state: { cloneData } });
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
            render: (doc, record) => (_jsx(Link, { to: `/FSPA/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc) }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDateRaw(f) }),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidad',
            key: 'entidad',
            ellipsis: true,
            render: (name, record) => (_jsx(EntidadColumnCell, { name: name, identificacion: record.identificacion })),
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            width: 250,
            ellipsis: true,
            render: (concepto) => _jsx(Text, { children: toTitleCase(concepto) || '' }),
        },
        {
            title: 'Cuenta Bancaria',
            dataIndex: 'ctaBancaria',
            key: 'ctaBancaria',
            width: 260,
            ellipsis: true,
            render: (val) => _jsx(Text, { children: val ? toTitleCase(val) : '-' }),
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
            width: 100,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1220, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar solicitudes de pago", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar documento, entidad, concepto...',
            onSearch: actions.handleSearch,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate('/FSPA/nuevo'),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FSPA/${state.selectedRow.id}/editar`),
            onRefresh: actions.handleRefresh,
        } }));
};
export default SolicitudPago;
