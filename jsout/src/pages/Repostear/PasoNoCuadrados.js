import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { DatePicker, Select, Button, Table, Typography, Space, message, Badge } from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import { transaccionApi, formatDateParam } from '../../api/transaccionApi';
import { useUIStore } from '../../stores/uiStore';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const { RangePicker } = DatePicker;
const TIPOS_DOCUMENTO = [
    { value: 'ENP', label: 'ENP - Entrada de Almacén' },
    { value: 'SAP', label: 'SAP - Salida de Almacén' },
    { value: 'FAC', label: 'FAC - Factura a Cliente' },
    { value: 'DEV', label: 'DEV - Devolución de Venta' },
    { value: 'DVC', label: 'DVC - Devolución de Compra' },
    { value: 'RDE', label: 'RDE - Factura de Suplidor' },
    { value: 'TRA', label: 'TRA - Transferencia' },
    { value: 'DEP', label: 'DEP - Documento Bancario' },
    { value: 'EDI', label: 'EDI - Entrada de Diario' },
];
const PasoNoCuadrados = ({ sucursal, tipoDoc, fechaDesde, fechaHasta, documentos, seleccionados, onTipoDocChange, onFechasChange, onDocumentosChange, onSeleccionChange, }) => {
    const [loading, setLoading] = useState(false);
    const primaryColor = useUIStore((s) => s.primaryColor);
    const handleBuscar = async () => {
        if (!fechaDesde || !fechaHasta) {
            message.warning('Seleccione un rango de fechas');
            return;
        }
        setLoading(true);
        try {
            const docs = await transaccionApi.obtenerNoCuadrados(sucursal, fechaDesde, fechaHasta, tipoDoc || undefined);
            onDocumentosChange(docs);
            onSeleccionChange([]);
            if (docs.length === 0) {
                message.info('No se encontraron documentos con asientos no cuadrados');
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al buscar documentos');
        }
        finally {
            setLoading(false);
        }
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursal?.id ?? 0);
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = documentos.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `NoCuadrados_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'NoCuadrados',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const noCuadradosCount = documentos.filter((d) => Math.abs(d.debitos - d.creditos) > 0.01).length;
    const columns = [
        {
            title: 'Documento',
            dataIndex: 'noDocumento',
            key: 'noDocumento',
            width: 150,
        },
        {
            title: 'Tipo',
            key: 'tipoDoc',
            width: 80,
            render: (_, r) => r.documento?.codigo || '-',
        },
        {
            title: 'Entidad',
            dataIndex: 'nombreEntidad',
            key: 'nombreEntidad',
            width: 200,
            render: (v) => v || '-',
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            align: 'right',
            render: (v) => new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
            }).format(v),
        },
        {
            title: 'Débitos',
            dataIndex: 'debitos',
            key: 'debitos',
            width: 120,
            align: 'right',
            render: (v) => new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
            }).format(v),
        },
        {
            title: 'Créditos',
            dataIndex: 'creditos',
            key: 'creditos',
            width: 120,
            align: 'right',
            render: (v) => new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
            }).format(v),
        },
        {
            title: 'Diferencia',
            key: 'diferencia',
            width: 120,
            align: 'right',
            render: (_, r) => {
                const diff = Math.abs(r.debitos - r.creditos);
                if (diff > 0.01) {
                    return (_jsx(Badge, { count: new Intl.NumberFormat('es-DO', {
                            style: 'currency',
                            currency: getMonedaSucursalActiva().codigo,
                        }).format(diff), style: { backgroundColor: '#ff4d4f', fontSize: 11 }, overflowCount: 999999 }));
                }
                return (_jsx(Badge, { count: "0.00", style: { backgroundColor: '#52c41a', fontSize: 11 }, overflowCount: 999999 }));
            },
        },
    ];
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    color: primaryColor,
                    fontWeight: 500,
                }, children: "Busque documentos con asientos no cuadrados" }), _jsx("div", { className: "repostear-filters-panel", children: _jsxs(Space, { wrap: true, size: 12, children: [_jsx(Select, { placeholder: "Tipo de documento (opcional)", value: tipoDoc || undefined, onChange: onTipoDocChange, allowClear: true, style: { width: 280 }, options: TIPOS_DOCUMENTO }), _jsx(RangePicker, { onChange: (dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    const desde = formatDateParam(dates[0].toDate());
                                    const hasta = formatDateParam(dates[1].toDate());
                                    onFechasChange(desde, hasta);
                                }
                            } }), _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), onClick: handleBuscar, loading: loading, children: "Buscar" }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) })] }) }), documentos.length > 0 && (_jsxs("div", { className: "repostear-summary", children: [_jsxs("span", { children: [_jsx(Text, { strong: true, children: documentos.length }), " documentos encontrados"] }), _jsxs("span", { children: [_jsx(Text, { strong: true, style: { color: noCuadradosCount > 0 ? '#ff4d4f' : '#52c41a' }, children: noCuadradosCount }), " no cuadrados"] }), seleccionados.length > 0 && (_jsxs("span", { children: [_jsx(Badge, { count: seleccionados.length, style: { backgroundColor: primaryColor } }), ' ', "seleccionados"] }))] })), _jsx(Table, { rowKey: "id", columns: columns, dataSource: documentos, loading: loading, size: "small", pagination: { pageSize: 50 }, rowSelection: {
                    type: 'checkbox',
                    selectedRowKeys: seleccionados.map((s) => s.id),
                    onChange: (_, rows) => onSeleccionChange(rows),
                }, scroll: { x: 900 }, className: "repostear-striped-table" }), seleccionados.length > 0 && (_jsxs(Text, { type: "secondary", style: { marginTop: 8, display: 'block' }, children: [seleccionados.length, " documento(s) seleccionado(s)"] }))] }));
};
export default PasoNoCuadrados;
