import { jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useUIStore } from '../../stores/uiStore';
const { Text } = Typography;
const DevolucionVenta = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const { screenCode, documentCode } = useScreenConfig();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    useEffect(() => {
        setActiveModule(screenCode);
    }, [setActiveModule, screenCode]);
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => devolucionVentaApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => devolucionVentaApi.filtrar(sucursal, params),
        reporteUrl: (sucursal, id) => `/reportes/facturacion/devolucion/${sucursal}/${id}`,
        imprimirUrl: (sucursal, id) => `/DEV/${sucursal}/imprimir/${id}`,
        tituloReporte: 'DV',
        tituloError: 'Error al cargar devoluciones de venta',
    });
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        try {
            const data = await devolucionVentaApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
            navigate('/FDEV/nuevo', { state: { cloneData } });
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
            render: (doc, record) => (_jsx(Link, { to: `/FDEV/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
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
            title: 'Factura',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 150,
            render: (ref) => _jsx(Text, { children: ref || '' }),
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
            title: 'Almacén',
            dataIndex: 'almacen',
            key: 'almacen',
            width: 200,
            render: (almacen) => _jsx(Text, { children: toTitleCase(almacen) || '' }),
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 150,
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
            width: 100,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1490, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar devoluciones de venta", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
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
            onCrear: () => navigate('/FDEV/nuevo'),
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FDEV/${state.selectedRow.id}/editar`),
            showClonar: true,
            clonarDisabled: !state.selectedRow,
            onClonar: handleClonar,
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            onRefresh: actions.handleRefresh,
        } }));
};
export default DevolucionVenta;
