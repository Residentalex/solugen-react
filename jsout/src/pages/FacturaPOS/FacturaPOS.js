import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Alert, Select, Input } from 'antd';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
const { Text } = Typography;
const ESTADO_OPCIONES = [
    { value: '', label: 'Todos' },
    { value: 'Borrador', label: 'Borrador' },
    { value: 'Terminado', label: 'Terminado' },
    { value: 'Anulado', label: 'Anulado' },
];
const CAMPOS_BUSQUEDA = [
    { value: 'documento', label: 'Documento' },
    { value: 'ncf', label: 'NCF' },
    { value: 'cliente', label: 'Cliente' },
    { value: 'turno', label: 'Turno' },
];
const FacturaPOS = () => {
    const navigate = useNavigate();
    const { screenCode } = useScreenConfig();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [campoBusqueda, setCampoBusqueda] = useState('documento');
    const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado({
        modulo: screenCode,
        fetchVista: (sucursal, desde, hasta, filas, salto, estado) => facturaPOSApi.obtenerResumen(sucursal, desde, hasta, filas, salto, estado),
        fetchFiltrar: (sucursal, params) => {
            const valor = params.documento || '';
            const base = { cantidad: params.cantidad, salto: params.salto, desde: params.desde, hasta: params.hasta };
            switch (campoBusqueda) {
                case 'documento': return facturaPOSApi.buscarPorDocumento(sucursal, { ...base, documento: valor });
                case 'ncf': return facturaPOSApi.buscarPorNCF(sucursal, { ...base, nCF: valor });
                case 'turno': return facturaPOSApi.buscarPorTurno(sucursal, { ...base, turno: valor });
                case 'cliente': return facturaPOSApi.buscarPorCliente(sucursal, { ...base, cliente: valor });
                default: return facturaPOSApi.buscarPorDocumento(sucursal, { ...base, documento: valor });
            }
        },
        reporteUrl: (sucursal, id) => `/reportes/facturacion/pos/${sucursal}/${id}`,
        imprimirUrl: (sucursal, id) => `/PV/${sucursal}/imprimir/${id}`,
        tituloReporte: 'POS',
        tituloError: 'Error al cargar facturas POS',
    });
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 180,
            fixed: 'left',
            render: (doc, record) => (_jsx(Link, { to: `/FPV/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: doc }) })),
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
            title: 'Almacén',
            dataIndex: 'almacen',
            key: 'almacen',
            width: 200,
            render: (alm) => _jsx(Text, { children: toTitleCase(alm) || '' }),
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 150,
            render: (ncf) => _jsx(Text, { children: ncf || '' }),
        },
        {
            title: 'Turno',
            dataIndex: 'turno',
            key: 'turno',
            width: 100,
            render: (turno) => _jsx(Text, { children: turno || '' }),
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
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (estado, record) => (_jsx(EstadoColumnCell, { estado: estado, periodo: record.periodo })),
        },
    ];
    const customEmptyText = undefined;
    return (_jsx(DocumentListadoLayout, { columns: columns, data: state.data, rowKey: "id", loading: state.loading, total: state.total, page: state.page, pageSize: state.pageSize, scrollX: 1520, selectedRowId: state.selectedRow?.id, loadingError: state.loadingError, errorMessage: "Error al cargar facturas POS", onRefresh: actions.handleRefresh, onRowClick: actions.handleRowClick, onPageChange: actions.goToPage, emptyText: customEmptyText, toolbarProps: {
            opcionesEstado: ESTADO_OPCIONES,
            ocultarSearch: true,
            searchDefaultValue: state.searchText,
            pageSize: state.pageSize,
            onPageSizeChange: actions.handlePageSizeChange,
            extraLeft: (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(Select, { value: campoBusqueda, onChange: setCampoBusqueda, style: { width: 120 }, size: "middle", options: CAMPOS_BUSQUEDA }), _jsx(Input.Search, { placeholder: "Buscar...", allowClear: true, onSearch: (val) => actions.handleSearch(val), onKeyDown: (e) => {
                            if (e.key === 'Escape') {
                                e.target.blur();
                                actions.handleSearch('');
                            }
                        }, style: { width: 260 } })] })),
            showCrear: true,
            onCrear: () => navigate('/FPV/nuevo'),
            showEditar: true,
            editarDisabled: !puedeEditar,
            onEditar: () => navigate(`/FPV/${state.selectedRow.id}/editar`),
            showImprimir: true,
            imprimirDisabled: !state.selectedRow,
            onImprimir: actions.handleImprimir,
            onRefresh: actions.handleRefresh,
        } }));
};
export default FacturaPOS;
