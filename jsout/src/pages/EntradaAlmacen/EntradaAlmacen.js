import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space, message } from 'antd';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import { useAuthStore } from '../../stores/authStore';
const { Text } = Typography;
const EntradaAlmacen = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { screenCode } = useScreenConfig('FENP');
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => entradaAlmacenApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => entradaAlmacenApi.filtrar(sucursal, params),
        reporteUrl: (sucursal, id) => `/reportes/inventario/entrada/${sucursal}/${id}`,
        imprimirUrl: (sucursal, id) => `/ENP/${sucursal}/imprimir/${id}`,
        tituloReporte: 'ENP',
        tituloError: 'Error al cargar entradas de almacén',
    });
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await entradaAlmacenApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
            const cloneData = {
                ...data,
                id: 0,
                noDocumento: '',
                estado: 0,
                asientos: [],
                logs: [],
            };
            navigate('/FENP/nuevo', { state: { cloneData } });
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
            render: (doc, record) => (_jsx(Link, { to: `/FENP/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 130,
            render: (f, record) => (_jsxs("div", { style: { lineHeight: 1.4 }, children: [_jsx("div", { style: { fontSize: 12 }, children: formatDateRaw(f) }), _jsxs("div", { style: { fontSize: 10, color: '#888' }, children: ["Recibo: ", record.fechaEntrega ? formatDateRaw(record.fechaEntrega) : '-'] })] })),
        },
        {
            title: 'Entidad',
            dataIndex: 'entidad',
            key: 'entidad',
            render: (name, record) => (_jsx(EntidadColumnCell, { name: name, diasCredito: record.diasCredito, identificacion: record.identificacion })),
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
            title: 'Orden Compra',
            dataIndex: 'ordenCompra',
            key: 'ordenCompra',
            width: 140,
            render: (oc) => _jsx(Text, { children: oc || '' }),
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 140,
            render: (ncf) => _jsx(Text, { children: ncf || '' }),
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
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo, revisado: record.revisado })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1350, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar entradas de almac\u00E9n", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar documento, NCF, concepto...',
            onSearch: actions.handleSearch,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate('/FENP/nuevo'),
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FENP/${state.selectedRow.id}/editar`),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            onRefresh: actions.handleRefresh,
        }, extraFooter: _jsxs("div", { style: { display: 'flex', gap: 16, flexWrap: 'wrap' }, children: [_jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E05252' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "0-14 d\u00EDas" })] }), _jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4A8FD4' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "15-29 d\u00EDas" })] }), _jsxs(Space, { size: 4, children: [_jsx("div", { style: { width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2BA88C' } }), _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "30+ d\u00EDas" })] })] }) }));
};
export default EntradaAlmacen;
