import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Tag, Select, message, Spin, Empty, Typography } from 'antd';
import { notificacionesApi } from '../../api/notificacionesApi';
const { Text } = Typography;
const NotificacionSQLResultadoModal = ({ visible, configId, configNombre, onClose, }) => {
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [pageSize, setPageSize] = useState(25);
    const cargarResultado = useCallback(async () => {
        if (!visible || !configId)
            return;
        setLoading(true);
        setError(null);
        try {
            const result = await notificacionesApi.probarSQLConfig(configId);
            setFilas(result?.filas || []);
        }
        catch (err) {
            const msg = err?.response?.data?.errorMessage || 'Error al ejecutar la consulta SQL';
            setError(msg);
            message.error(msg);
        }
        finally {
            setLoading(false);
        }
    }, [visible, configId]);
    useEffect(() => {
        cargarResultado();
    }, [cargarResultado]);
    const columns = filas.length > 0
        ? Object.keys(filas[0]).map((key) => ({
            title: key,
            dataIndex: key,
            key,
            ellipsis: true,
            width: 160,
            render: (val) => {
                if (val === null || val === undefined)
                    return _jsx(Text, { type: "secondary", children: "-" });
                if (typeof val === 'boolean')
                    return _jsx(Tag, { color: val ? 'green' : 'default', children: val ? 'Sí' : 'No' });
                return String(val);
            },
        }))
        : [];
    return (_jsxs(Modal, { title: `Resultado: ${configNombre}`, open: visible, onCancel: onClose, footer: null, width: 900, children: [loading && (_jsxs("div", { style: { textAlign: 'center', padding: 40 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 12 }, className: "paces-text-secondary", children: "Ejecutando consulta..." })] })), !loading && error && (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Empty, { description: error }) })), !loading && !error && filas.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Empty, { description: "La consulta no devolvi\u00F3 resultados" }) })), !loading && !error && filas.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { style: { marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Text, { strong: true, children: filas.length }), _jsx(Text, { type: "secondary", children: " fila(s) obtenida(s)" }), _jsx("div", { style: { flex: 1 } }), _jsx(Select, { style: { width: 65 }, value: pageSize, onChange: (v) => setPageSize(v), options: [
                                    { value: 25, label: '25' },
                                    { value: 50, label: '50' },
                                    { value: 100, label: '100' },
                                ] })] }), _jsx(Table, { columns: columns, dataSource: filas.map((_, i) => ({ ..._, _rowIndex: i })), rowKey: "_rowIndex", size: "small", scroll: { x: columns.length * 160 }, pagination: {
                            pageSize,
                            showSizeChanger: false,
                            showTotal: (t, range) => `${range[0]}-${range[1]} de ${t}`,
                        } })] }))] }));
};
export default NotificacionSQLResultadoModal;
