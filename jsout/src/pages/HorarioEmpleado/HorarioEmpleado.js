import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Typography, message, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { horarioEmpleadoApi } from '../../api/horarioEmpleadoApi';
import { Sucursal } from '../../types/auth';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatDate, extraerMensajeError } from '../../utils/formats';
const { Text } = Typography;
const FILAS_POR_PAGINA = 25;
const HorarioEmpleado = () => {
    const sucursal = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalesData = useCompanyStore((s) => s.data.sucursales);
    const opcionesSucursales = (sucursalesData || []).map((s) => ({
        value: s.sucursal,
        label: s.nombre,
    }));
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [page, setPage] = useState(1);
    const [sucursalFiltro, setSucursalFiltro] = useState(sucursal);
    const [fechaInicio, setFechaInicio] = useState(dayjs());
    const [fechaFin, setFechaFin] = useState(dayjs());
    useEffect(() => {
        setActiveModule('HEMPLEADO');
        return () => {
            resetToolbar();
        };
    }, [setActiveModule, resetToolbar]);
    const fetchData = useCallback(async () => {
        if (!sucursal)
            return [];
        return await horarioEmpleadoApi.obtenerTodos(sucursal, sucursalFiltro, fechaInicio.format('YYYY-MM-DD'), fechaFin.format('YYYY-MM-DD'));
    }, [sucursal, sucursalFiltro, fechaInicio, fechaFin]);
    useEffect(() => {
        if (!sucursal)
            return;
        let cancelled = false;
        fetchData()
            .then((result) => {
            if (!cancelled)
                setData(result);
        })
            .catch((err) => {
            if (!cancelled) {
                setLoadingError(true);
                setData([]);
                message.error(extraerMensajeError(err, 'Error al cargar horarios de empleados'));
            }
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [sucursal, fetchData]);
    const handleRefresh = useCallback(() => {
        setLoading(true);
        setLoadingError(false);
        fetchData()
            .then((result) => setData(result))
            .catch((err) => {
            setLoadingError(true);
            setData([]);
            message.error(extraerMensajeError(err, 'Error al cargar horarios de empleados'));
        })
            .finally(() => setLoading(false));
    }, [fetchData]);
    const handleRowClick = useCallback((record) => {
        setSelectedRow(record);
    }, []);
    const handlePageChange = useCallback((pagina) => {
        setPage(pagina);
    }, []);
    const total = data.length;
    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 130,
            render: (fecha) => (_jsx(Text, { children: formatDate(fecha) })),
        },
        {
            title: 'Hora',
            dataIndex: 'hora',
            key: 'hora',
            width: 100,
            render: (hora) => (_jsx(Text, { children: hora })),
        },
        {
            title: 'Código',
            dataIndex: 'codigoEmpleado',
            key: 'codigoEmpleado',
            width: 100,
        },
        {
            title: 'Nombre Empleado',
            dataIndex: 'empleado',
            key: 'empleado',
            width: 280,
            render: (nombre) => (_jsx(Text, { strong: true, children: nombre })),
        },
        {
            title: 'Sucursal',
            dataIndex: 'sucursal',
            key: 'sucursal',
            width: 200,
            render: (sucursal) => (_jsx(Text, { children: sucursal || '-' })),
        },
    ];
    return (_jsx(DocumentListadoLayout, { columns: columns, data: data, rowKey: "id", loading: loading, total: total, page: page, pageSize: FILAS_POR_PAGINA, scrollX: 800, selectedRowId: selectedRow?.id, loadingError: loadingError, errorMessage: "Error al cargar horarios de empleados", onRefresh: handleRefresh, onRowClick: handleRowClick, onPageChange: handlePageChange, toolbarProps: {
            searchPlaceholder: 'Buscar empleado...',
            onSearch: () => { },
            pageSize: FILAS_POR_PAGINA,
            onPageSizeChange: () => { },
            onRefresh: handleRefresh,
            extraLeft: (_jsxs(_Fragment, { children: [_jsx(Select, { value: sucursalFiltro, onChange: (value) => setSucursalFiltro(value), style: { width: 200 }, options: opcionesSucursales }), _jsx(DatePicker.RangePicker, { value: [fechaInicio, fechaFin], onChange: (dates) => {
                            if (dates && dates[0] && dates[1]) {
                                setFechaInicio(dates[0]);
                                setFechaFin(dates[1]);
                            }
                        }, style: { marginLeft: 8 }, allowClear: false })] })),
        } }));
};
export default HorarioEmpleado;
