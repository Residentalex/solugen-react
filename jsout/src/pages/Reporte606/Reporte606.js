import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Spin, Input, Button, Space, message, Alert, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { reporte606Api } from '../../api/reporte606Api';
import ReporteToolbar from '../../components/ReporteToolbar';
import FiltrosDocumento from '../../components/FiltrosDocumento/FiltrosDocumento';
import { formatCurrency, formatDateRaw, formatDateParam, parseDateRaw, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import dayjs from 'dayjs';
const { Text } = Typography;
const Reporte606 = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [exportando, setExportando] = useState(false);
    const rangoDefault = useMemo(() => ({
        desde: formatDateParam(dayjs().startOf('month').toDate()),
        hasta: formatDateParam(dayjs().toDate()),
    }), []);
    const [filtros, setFiltros] = useState({});
    const [searchText, setSearchText] = useState('');
    useEffect(() => {
        setActiveModule('R606');
    }, [setActiveModule]);
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const desde = filtros.desde ?? rangoDefault.desde;
            const hasta = filtros.hasta ?? rangoDefault.hasta;
            const res = await reporte606Api.obtenerListado(sucursalActiva, dayjs(desde, 'YYYYMMDDHHmmss'), dayjs(hasta, 'YYYYMMDDHHmmss'));
            setData(res || []);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar el Reporte 606';
            message.error(msg);
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva, filtros, rangoDefault]);
    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);
    /* ───── Filtro local ───── */
    const filteredData = useMemo(() => {
        if (!searchText)
            return data;
        const t = searchText.toLowerCase();
        return data.filter((r) => (r.documento || '').toLowerCase().includes(t) ||
            (r.razonSocial || '').toLowerCase().includes(t) ||
            (r.rnc || '').toLowerCase().includes(t) ||
            (r.ncf || '').toLowerCase().includes(t));
    }, [data, searchText]);
    /* ───── Totales ───── */
    const totalFacturado = filteredData.reduce((sum, r) => sum + (r.totalFacturado || 0), 0);
    const totalItbis = filteredData.reduce((sum, r) => sum + (r.itbisFacturado || 0), 0);
    const totalGeneral = filteredData.reduce((sum, r) => sum + (r.totalFacturado || 0) + (r.itbisFacturado || 0), 0);
    /* ───── Exportar Excel ───── */
    const handleExportarExcel = useCallback(async () => {
        if (filteredData.length === 0) {
            message.warning('No hay datos para exportar');
            return;
        }
        setExportando(true);
        try {
            const companyName = await getCompanyName(sucursalActiva);
            const columnHeaders = [
                'Línea', 'RNC/Cédula', 'Tipo ID', 'Clasificación', 'NCF', 'NCF Modificado',
                'Fecha Comprobante Año/Mes', 'Fecha Comprobante Día', 'Fecha Pago Año/Mes', 'Fecha Pago Día', 'Monto Servicio', 'Monto Bienes',
                'Total Facturado', 'ITBIS Facturado', 'ITBIS Retenido', 'ITBIS Proporcional',
                'ITBIS al Costo', 'ITBIS por Adelantar', 'ITBIS Percibido',
                'Tipo Retención ISR', 'Monto Retención Renta', 'ISR Percibido',
                'ISC', 'Otros Impuestos', 'Propina Legal', 'Forma de Pago',
                'Razón Social', 'Documento',
            ];
            const dataRows = filteredData.map((item) => [
                item.linea,
                item.rnc,
                item.tipoID,
                item.clasCgncf,
                item.ncf,
                item.ncfModificado || '',
                (() => { const d = parseDateRaw(item.fechaComprobante); return d ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}` : ''; })(),
                (() => { const d = parseDateRaw(item.fechaComprobante); return d ? String(d.getDate()).padStart(2, '0') : ''; })(),
                (() => { const d = parseDateRaw(item.fechaPago); return d ? `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}` : ''; })(),
                (() => { const d = parseDateRaw(item.fechaPago); return d ? String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0') : ''; })(),
                item.montoServicio,
                item.montoBienes,
                item.totalFacturado,
                item.itbisFacturado,
                item.itbisRetenido,
                item.itbisProporcional,
                item.itbisCostos,
                item.itbisAdelantar,
                item.itbisPercibido,
                item.tipoRetencionISR,
                item.montoRetencionRenta,
                item.isrPercibido,
                item.isc,
                item.otrosImpuestos,
                item.propinaLegal,
                item.formaPago,
                item.razonSocial,
                item.documento,
            ]);
            exportToExcel({
                companyName,
                columnHeaders,
                dataRows,
                sheetName: 'Reporte606',
                columnWidths: columnHeaders.map(() => ({ wch: 18 })),
            });
            message.success('Reporte exportado exitosamente');
        }
        finally {
            setExportando(false);
        }
    }, [sucursalActiva, filteredData]);
    /* ───── Columnas ───── */
    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fechaComprobante',
            key: 'fechaComprobante',
            width: 100,
            render: (v) => formatDateRaw(v),
        },
        {
            title: 'Documento',
            dataIndex: 'documento',
            key: 'documento',
            width: 170,
            render: (v) => _jsx("a", { className: "paces-doc-link", children: v || '-' }),
        },
        {
            title: 'Suplidor',
            dataIndex: 'razonSocial',
            key: 'razonSocial',
            width: 200,
            ellipsis: true,
            render: (v) => toTitleCase(v || ''),
        },
        {
            title: 'RNC',
            dataIndex: 'rnc',
            key: 'rnc',
            width: 130,
        },
        {
            title: 'NCF',
            dataIndex: 'ncf',
            key: 'ncf',
            width: 170,
        },
        {
            title: 'Sub Total',
            dataIndex: 'totalFacturado',
            key: 'totalFacturado',
            width: 120,
            align: 'right',
            render: (v) => formatCurrency(v || 0),
        },
        {
            title: 'Impuestos',
            dataIndex: 'itbisFacturado',
            key: 'itbisFacturado',
            width: 120,
            align: 'right',
            render: (v) => formatCurrency(v || 0),
        },
        {
            title: 'Total',
            key: 'total',
            width: 120,
            align: 'right',
            render: (_, record) => (_jsx(Text, { strong: true, children: formatCurrency((record.totalFacturado || 0) + (record.itbisFacturado || 0)) })),
        },
    ];
    return (_jsxs("div", { children: [_jsx(ReporteToolbar, { onVolver: () => navigate('/'), onConsultar: cargarDatos, loading: loading, onExportarExcel: handleExportarExcel, exportando: exportando, extraLeft: _jsx(FiltrosDocumento, { filtros: filtros, onAplicar: (nuevos) => { setFiltros(nuevos); }, opcionesEstado: [], rangoDefault: rangoDefault }) }), loadingError && (_jsx(Alert, { message: "Error al cargar el reporte", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: cargarDatos, children: "Reintentar" }) })), _jsxs(Spin, { spinning: loading, children: [_jsx(Card, { className: "paces-card", size: "small", title: _jsx("span", { style: { fontSize: 16, fontWeight: 600 }, children: "Resumen" }), style: { marginBottom: 16 }, children: _jsxs(Space, { size: 24, wrap: true, children: [_jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total documentos: " }), _jsx(Text, { strong: true, children: filteredData.length })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total facturado: " }), _jsx(Text, { strong: true, children: formatCurrency(totalFacturado) })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total ITBIS: " }), _jsx(Text, { strong: true, children: formatCurrency(totalItbis) })] }), _jsxs("div", { children: [_jsx("span", { className: "paces-text-secondary", children: "Total general: " }), _jsx(Text, { strong: true, children: formatCurrency(totalGeneral) })] })] }) }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsx(Input.Search, { placeholder: "Buscar documento, suplidor...", allowClear: true, onSearch: (val) => setSearchText(val), style: { width: 400, marginBottom: 16 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }) }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: filteredData, columns: columns, rowKey: "linea", size: "small", pagination: { pageSize: 20, showTotal: (t) => `${t} registros` }, scroll: { x: 1200 } })] })] })] }));
};
export default Reporte606;
