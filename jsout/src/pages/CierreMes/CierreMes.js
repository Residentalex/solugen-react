import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Card, Table, DatePicker, message, Typography, Button, Alert } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { cierreMesApi } from '../../api/cierreMesApi';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Title } = Typography;
const CierreMes = () => {
    const [datos, setDatos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [fechasEditadas, setFechasEditadas] = useState({});
    const [guardando, setGuardando] = useState(false);
    const cargar = async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const data = await cierreMesApi.obtenerListado();
            setDatos(data);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { cargar(); }, []);
    const handleExportarExcel = async () => {
        const sucursalActiva = useAuthStore.getState().sucursalActiva;
        const companyName = await getCompanyName(sucursalActiva);
        const exportCols = columns.filter((col) => col.title && col.title !== '');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = datos.map((item) => exportCols.map((col) => {
            const val = item[col.dataIndex];
            return val != null ? String(val) : '';
        }));
        exportToExcel({
            fileName: `CierreMes_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'CierreMes',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleFechaChange = (sucursalId, date) => {
        if (date) {
            setFechasEditadas(prev => ({ ...prev, [sucursalId]: date }));
        }
        else {
            setFechasEditadas(prev => {
                const newState = { ...prev };
                delete newState[sucursalId];
                return newState;
            });
        }
    };
    const handleGuardar = async () => {
        setGuardando(true);
        const entries = Object.entries(fechasEditadas);
        let errores = 0;
        for (const [sucursalId, date] of entries) {
            try {
                const fechaStr = date.format('YYYYMMDDHHmmss');
                await cierreMesApi.actualizarFecha(Number(sucursalId), fechaStr);
            }
            catch {
                errores++;
            }
        }
        setGuardando(false);
        if (errores === 0) {
            message.success(`${entries.length} fecha(s) actualizada(s) correctamente`);
            setFechasEditadas({});
            cargar();
        }
        else {
            message.error(`${errores} de ${entries.length} actualizaciones fallaron`);
        }
    };
    const columns = [
        {
            title: 'Sucursal',
            dataIndex: 'nombre',
            key: 'nombre',
        },
        {
            title: 'Fecha Último Cierre',
            dataIndex: 'fechaUltimoCierre',
            key: 'fechaUltimoCierre',
            render: (fecha, record) => (_jsx(DatePicker, { value: fechasEditadas[record.sucursalId] || (fecha ? dayjs(fecha) : null), onChange: (date) => handleFechaChange(record.sucursalId, date), format: "DD/MM/YYYY", style: {
                    width: 160,
                    borderColor: fechasEditadas[record.sucursalId] ? '#556ee6' : undefined,
                } })),
        },
    ];
    const cantCambios = Object.keys(fechasEditadas).length;
    return (_jsxs("div", { style: { padding: 24 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, children: [_jsx(Title, { level: 4, style: { margin: 0 }, children: "Cierre de Mes" }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), cantCambios > 0 && (_jsxs(Button, { type: "primary", onClick: handleGuardar, loading: guardando, children: ["Guardar cambios (", cantCambios, ")"] }))] }), loadingError && (_jsx(Alert, { message: "Error al cargar datos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { onClick: cargar, children: "Reintentar" }) })), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: _jsx(Table, { columns: columns, dataSource: datos, rowKey: "sucursalId", loading: loading, pagination: false, className: "paces-border-top paces-list-table", locale: { emptyText: 'No hay sucursales activas' } }) })] }));
};
export default CierreMes;
