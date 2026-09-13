import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Select, Popover, Button } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { empleadoApi } from '../../api/empleadoApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import EntidadImagen from '../../components/EntidadImagen';
import { toTitleCase } from '../../utils/formats';
const { Text } = Typography;
function letraInicial(nombre) {
    return (nombre || '?').charAt(0).toUpperCase();
}
const FILAS_POR_PAGINA = 25;
const Empleados = () => {
    const navigate = useNavigate();
    const sucursal = useAuthStore((s) => s.compania);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filtroDepartamento, setFiltroDepartamento] = useState('');
    const [filtroPosicion, setFiltroPosicion] = useState('');
    const [filtroActivo, setFiltroActivo] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    useEffect(() => {
        setActiveModule('MEMP');
    }, [setActiveModule]);
    const cargar = useCallback(async (pagina, filas, busqueda) => {
        if (!sucursal)
            return;
        setLoading(true);
        setLoadingError(false);
        try {
            const salto = (pagina - 1) * filas;
            const result = await empleadoApi.obtenerListado(sucursal, busqueda, filas, salto);
            setData(result.datos);
            setTotal(result.total);
        }
        catch {
            setLoadingError(true);
            setData([]);
            setTotal(0);
        }
        finally {
            setLoading(false);
        }
    }, [sucursal]);
    useEffect(() => {
        cargar(page, pageSize, searchText);
    }, [cargar, page, pageSize, searchText]);
    const handleSearch = useCallback((val) => {
        setSearchText(val);
        setPage(1);
    }, []);
    const handlePageChange = useCallback((pagina) => {
        setPage(pagina);
    }, []);
    const handleRefresh = useCallback(() => {
        cargar(page, pageSize, searchText);
    }, [cargar, page, pageSize, searchText]);
    const handleNuevo = useCallback(() => {
        navigate('/MEMP/nuevo');
    }, [navigate]);
    const columns = [
        {
            title: 'Empleado',
            key: 'empleado',
            width: 280,
            fixed: 'left',
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx(EntidadImagen, { tipo: "EMPLEADO", codigo: record.codigo, fallback: letraInicial(record.nombre), size: 34 }), _jsxs("div", { children: [_jsx(Text, { strong: true, style: { fontSize: 13, lineHeight: 1.3 }, children: record.codigo }), _jsx("br", {}), _jsx(Text, { type: "secondary", style: { lineHeight: 1.3 }, children: toTitleCase(record.nombre) })] })] })),
        },
        {
            title: 'Cédula',
            key: 'identificacion',
            width: 130,
            render: (_, record) => record.identificacion || '-',
        },
        {
            title: 'Departamento',
            key: 'departamento',
            width: 160,
            render: (_, record) => record.departamento?.nombre || '-',
        },
        {
            title: 'Cargo',
            key: 'posicion',
            width: 160,
            render: (_, record) => record.posicion?.nombre || '-',
        },
    ];
    const contentFiltros = (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }, children: [_jsx(Select, { placeholder: "Departamento", style: { width: '100%' }, allowClear: true, value: filtroDepartamento || undefined, onChange: (val) => setFiltroDepartamento(val || ''), onClear: () => setFiltroDepartamento('') }), _jsx(Select, { placeholder: "Cargo", style: { width: '100%' }, allowClear: true, value: filtroPosicion || undefined, onChange: (val) => setFiltroPosicion(val || ''), onClear: () => setFiltroPosicion('') }), _jsx(Select, { placeholder: "Estado", style: { width: '100%' }, allowClear: true, value: filtroActivo || undefined, onChange: (val) => setFiltroActivo(val || ''), onClear: () => setFiltroActivo(''), options: [
                    { value: 'activos', label: 'Solo activos' },
                    { value: 'inactivos', label: 'Solo inactivos' },
                ] })] }));
    return (_jsx(DocumentListadoLayout, { columns: columns, data: data, rowKey: "codigo", loading: loading, total: total, page: page, pageSize: pageSize, scrollX: 800, loadingError: loadingError, errorMessage: "Error al cargar empleados", onRefresh: handleRefresh, onRowClick: (record) => navigate(`/MEMP/${record.codigo}`), onPageChange: handlePageChange, toolbarProps: {
            searchPlaceholder: 'Buscar empleado...',
            onSearch: handleSearch,
            pageSize,
            onPageSizeChange: (v) => { setPageSize(v); setPage(1); },
            onRefresh: handleRefresh,
            showCrear: true,
            onCrear: handleNuevo,
            extraLeft: (_jsx(Popover, { title: "Filtros", trigger: "click", placement: "bottomLeft", content: contentFiltros, children: _jsx(Button, { icon: _jsx(FilterOutlined, {}), children: "Filtros" }) })),
        } }));
};
export default Empleados;
