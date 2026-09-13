import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Input, Select, Button, Typography, message, Tag, Alert, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { recetaApi } from '../../api/recetaApi';
import { formatCurrency } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
function formatDecimal(n) {
    return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toTitleCase(str) {
    if (!str)
        return str;
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const Recetas = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [productoNombre, setProductoNombre] = useState('');
    const [ingredientes, setIngredientes] = useState([]);
    const [loadingIngredientes, setLoadingIngredientes] = useState(false);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['recetas', sucursalActiva],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return [];
            const result = await recetaApi.obtenerProductosConReceta(sucursalActiva);
            return result;
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MReceta');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleSeleccionar = async (codigo, nombre) => {
        setProductoSeleccionado(codigo);
        setProductoNombre(nombre);
        setLoadingIngredientes(true);
        try {
            const result = await recetaApi.obtenerIngredientes(sucursalActiva, codigo);
            setIngredientes(result);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al consultar receta');
            setIngredientes([]);
        }
        finally {
            setLoadingIngredientes(false);
        }
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = filteredProductos;
        const exportCols = columnasProductos.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            if (col.dataIndex) {
                const val = item[col.dataIndex];
                return val != null ? String(val) : '';
            }
            return '';
        }));
        exportToExcel({
            fileName: `Recetas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Recetas',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleVolver = () => {
        setProductoSeleccionado(null);
        setProductoNombre('');
        setIngredientes([]);
    };
    const filteredProductos = (data || []).filter((p) => !searchText ||
        p.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
        p.nombre.toLowerCase().includes(searchText.toLowerCase()));
    const columnasProductos = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 150,
            render: (cod) => _jsx(Text, { strong: true, children: cod }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nom) => _jsx(Text, { children: nom }),
        },
        {
            title: 'Componentes',
            dataIndex: 'cantidadIngredientes',
            key: 'cantidadIngredientes',
            width: 130,
            align: 'center',
            render: (cant) => _jsxs(Tag, { color: "blue", children: [cant, " ingrediente", cant !== 1 ? 's' : ''] }),
        },
    ];
    const columnasIngredientes = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 150,
            render: (cod) => _jsx(Text, { strong: true, children: cod }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nom) => _jsx(Text, { children: nom }),
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 120,
            align: 'right',
            render: (cant) => _jsx(Text, { children: formatDecimal(cant ?? 0) }),
        },
        {
            title: 'Costo',
            dataIndex: 'costo',
            key: 'costo',
            width: 150,
            align: 'right',
            render: (cost) => _jsx(Text, { strong: true, children: formatCurrency(cost ?? 0) }),
        },
        {
            title: 'U.M.',
            key: 'unidadMedida',
            width: 120,
            render: (_, record) => (_jsx(Text, { children: record.unidadMedida?.codigo || record.unidadMedida?.nombre || '' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar recetas", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { styles: { body: { padding: 0 } }, className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, children: [productoSeleccionado ? (_jsx("div", { style: { padding: "16px 24px 0" }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: 16, flexWrap: "wrap" }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: handleVolver, children: "Volver" }), _jsxs(Text, { strong: true, style: { fontSize: 15 }, children: [_jsx(Tag, { color: "blue", style: { marginLeft: 4 }, children: productoSeleccionado }), toTitleCase(productoNombre)] }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: () => refetch() })] }) })) : (_jsx(CatalogoListadoToolbar, { onSearch: (val) => setSearchText(val), pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onReload: () => refetch(), onExportarExcel: handleExportarExcel })), !productoSeleccionado && (_jsx(Table, { columns: columnasProductos, dataSource: filteredProductos, rowKey: "codigo", loading: isLoading, scroll: { x: 600 }, size: "middle", pagination: {
                            pageSize,
                            showSizeChanger: false,
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
                        }, onRow: (record) => ({
                            onClick: () => handleSeleccionar(record.codigo, record.nombre),
                            style: { cursor: "pointer" },
                        }), locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay productos con receta registrados" }) }),
                        }, className: "paces-border-top paces-list-table" })), productoSeleccionado && (_jsx(Table, { columns: columnasIngredientes, dataSource: ingredientes, rowKey: "id", loading: loadingIngredientes, scroll: { x: 750 }, size: "middle", pagination: false, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay ingredientes registrados" }) }),
                        }, className: "paces-border-top paces-list-table" }))] })] }));
};
export default Recetas;
