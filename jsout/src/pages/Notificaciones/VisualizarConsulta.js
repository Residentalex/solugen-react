import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Alert, Typography, message, Tag, Select, Empty } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { notificacionesApi } from '../../api/notificacionesApi';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const VisualizarConsulta = () => {
    const { configID } = useParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [filas, setFilas] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const cargarDatos = async () => {
        if (!configID)
            return;
        setLoading(true);
        setError('');
        try {
            const result = await notificacionesApi.ejecutarSQLConfig(parseInt(configID));
            setFilas(result.filas);
            setTotal(result.total);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al ejecutar consulta';
            setError(msg);
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        cargarDatos();
    }, [configID]);
    const columnas = filas.length > 0
        ? Object.keys(filas[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            ellipsis: true,
            render: (val) => val !== null && val !== undefined ? String(val) : '-',
        }))
        : [];
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columnas.length > 0
            ? columnas.map((c) => ({ title: c.title, key: c.key }))
            : [];
        exportToExcel({
            fileName: `ConsultaSQL_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Resultado Consulta',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filas.map((item) => cols.map((col) => {
                const val = item[col.key];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(-1), children: "Volver" }), _jsx(Typography.Title, { level: 4, style: { margin: 0, flex: 1 }, children: "Resultado de consulta SQL" }), _jsxs(Tag, { children: [total, " filas"] }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => setPageSize(v), options: [
                            { value: 25, label: '25' },
                            { value: 50, label: '50' },
                            { value: 100, label: '100' },
                        ] }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarDatos, loading: loading, children: "Recargar" })] }), error && (_jsx(Alert, { message: "Error", description: error, type: "error", showIcon: true, style: { marginBottom: 16 }, closable: true })), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, styles: { body: { padding: 0 } }, children: _jsx(Table, { columns: columnas, dataSource: filas, rowKey: (_, i) => String(i), loading: loading, scroll: { x: 'max-content' }, size: "middle", locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay datos" }) }) }, pagination: {
                        pageSize,
                        showSizeChanger: false,
                        showTotal: (t, range) => `${range[0]}-${range[1]} de ${t}`,
                    } }) })] }));
};
export default VisualizarConsulta;
