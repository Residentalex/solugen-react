import { jsx as _jsx } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message, Spin } from 'antd';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAuthStore } from '../../stores/authStore';
const ESTADO_OPCIONES = [
    { value: '', label: 'Todos' },
    { value: 0, label: 'Borrador' },
    { value: 1, label: 'Terminado' },
    { value: 3, label: 'Anulado' },
];
const { Text } = Typography;
const FacturaCliente = () => {
    const navigate = useNavigate();
    const { screenCode, documentCode } = useScreenConfig('FFAC');
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => facturaClienteApi.obtenerResumen(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: async (sucursal, params) => {
            const result = await facturaClienteApi.filtrar(sucursal, params);
            return {
                data: result.data.map((item) => ({
                    id: item.id,
                    fecha: item.fecha,
                    documento: item.documento,
                    cliente: item.entidad,
                    clienteIdentificacion: item.identificacion ?? '',
                    concepto: item.concepto,
                    ncf: item.ncf,
                    ncfModificado: item.ncfModificado ?? '',
                    turno: item.turno ?? '',
                    total: item.total.toString(),
                    estado: item.estado,
                    periodo: item.periodo ?? '',
                    referencia: item.referencia,
                })),
                total: result.total,
            };
        },
        reporteUrl: (sucursal, id) => `/reportes/contabilidad/factura-cliente/${sucursal}/${id}`,
        imprimirUrl: (sucursal, id) => `/FAC/${sucursal}/imprimir/${id}`,
        tituloReporte: 'FC',
        tituloError: 'Error al cargar facturas de cliente',
    });
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [clonando, setClonando] = useState(false);
    const handleClonar = async () => {
        if (!state.selectedRow)
            return;
        setClonando(true);
        try {
            const data = await facturaClienteApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
            setClonando(false);
            navigate('/FFAC/nuevo', { state: { cloneData } });
        }
        catch (err) {
            setClonando(false);
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
            render: (doc, record) => (_jsx(Link, { to: `/FFAC/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
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
            dataIndex: 'cliente',
            key: 'cliente',
            render: (name, record) => (_jsx(EntidadColumnCell, { name: name, identificacion: record.clienteIdentificacion })),
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
            render: (total) => (_jsx(Text, { strong: true, className: "paces-text-total", children: formatCurrency(Number(total)) })),
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
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    return (_jsx(Spin, { spinning: clonando, tip: "Clonando factura...", size: "large", children: _jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1370, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar facturas de cliente", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, toolbarProps: {
                showFiltros: true,
                filtros: state.filtros,
                rangoDefault,
                opcionesEstado: ESTADO_OPCIONES,
                onFiltrosAplicar: actions.handleFiltrosAplicar,
                searchPlaceholder: 'Buscar documento, NCF, concepto...',
                onSearch: actions.handleSearch,
                searchDefaultValue: state.searchText,
                pageSize: state.pageSize,
                onPageSizeChange: actions.handlePageSizeChange,
                showCrear: true,
                onCrear: () => navigate('/FFAC/nuevo'),
                showEditar: true,
                editarDisabled: !puedeEditar,
                onEditar: () => navigate(`/FFAC/${state.selectedRow.id}/editar`),
                showClonar: true,
                clonarDisabled: !state.selectedRow,
                onClonar: handleClonar,
                showImprimir: true,
                imprimirDisabled: !state.selectedRow,
                onImprimir: actions.handleImprimir,
                onRefresh: actions.handleRefresh,
            } }) }));
};
export default FacturaCliente;
