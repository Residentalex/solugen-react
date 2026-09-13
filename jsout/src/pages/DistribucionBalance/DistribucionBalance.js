import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
const { Text } = Typography;
const DistribucionBalance = ({ tipoEntidad }) => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';
    const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: codigoPantalla,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => distribucionBalanceApi.obtenerVista(sucursal, tipoEntidad, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => distribucionBalanceApi.filtrar(sucursal, tipoEntidad, {
            cantidad: params.cantidad,
            salto: params.salto,
            desde: params.desde,
            hasta: params.hasta,
            tipoEntidad,
            documento: params.documento,
            nCF: params.nCF,
            concepto: params.concepto,
            entidad: params.entidad,
        }),
        reporteUrl: (sucursal, id) => `/reportes/contabilidad/distribucion-balance/${sucursal}/${id}`,
        tituloReporte: 'DBA',
        tituloError: 'Error al cargar distribuciones de balance',
    });
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await distribucionBalanceApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
            navigate(`/${codigoPantalla}/nuevo`, { state: { cloneData } });
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
            render: (doc, record) => (_jsx(Link, { to: `/${codigoPantalla}/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 110,
            render: (f) => _jsx(Text, { children: formatDateRaw(f) }),
        },
        {
            title: entidadLabel,
            dataIndex: 'entidad',
            key: 'entidad',
            ellipsis: true,
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
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1170, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar distribuciones de balance", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
            showFiltros: true,
            filtros: state.filtros,
            rangoDefault,
            opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
            onFiltrosAplicar: actions.handleFiltrosAplicar,
            searchPlaceholder: 'Buscar documento, concepto...',
            onSearch: actions.handleSearch,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            showCrear: true,
            onCrear: () => navigate(`/${codigoPantalla}/nuevo`),
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/${codigoPantalla}/${state.selectedRow.id}/editar`),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            onRefresh: actions.handleRefresh,
        } }));
};
export default DistribucionBalance;
