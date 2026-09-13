import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Button, Select, Tag, message, Empty, Alert, Card, Typography, } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { pantallaApi } from '../../api/pantallaApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const FILAS_POR_PAGINA = 25;
const Pantallas = () => {
    const navigate = useNavigate();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
    const [filtroModulo, setFiltroModulo] = useState();
    const [filtroGrupo, setFiltroGrupo] = useState();
    const [modulosCatalogo, setModulosCatalogo] = useState([]);
    const [entidadesPorPantalla, setEntidadesPorPantalla] = useState(new Map());
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['pantallas', sucursalActiva, page, pageSize, searchText, filtroModulo, filtroGrupo],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = {
                cantidad: pageSize, salto,
            };
            if (searchText)
                params.busqueda = searchText;
            if (filtroModulo !== undefined)
                params.moduloId = filtroModulo;
            if (filtroGrupo)
                params.grupo = filtroGrupo;
            const [resultados, totalCount] = await Promise.all([
                pantallaApi.filtrar(sucursalActiva, params),
                pantallaApi.obtenerTotalPantallas(sucursalActiva, {
                    busqueda: searchText || undefined,
                    moduloId: filtroModulo,
                    grupo: filtroGrupo,
                }),
            ]);
            return { datos: resultados.datos || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    const cargarEntidades = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        try {
            const result = await pantallaApi.obtenerPantallasConEntidades(sucursalActiva);
            const map = new Map();
            result.forEach(p => {
                if (p.entidades?.length)
                    map.set(p.id, p.entidades);
            });
            setEntidadesPorPantalla(map);
        }
        catch {
            // no crítico, las entidades son opcionales en el listado
        }
    }, [sucursalActiva]);
    const cargarModulos = useCallback(async () => {
        if (sucursalActiva === undefined)
            return;
        try {
            const modulos = await pantallaApi.obtenerModulos(sucursalActiva);
            setModulosCatalogo(modulos || []);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar módulos');
        }
    }, [sucursalActiva]);
    useEffect(() => {
        setActiveModule('MPantalla');
        updateToolbar({});
        cargarEntidades();
        cargarModulos();
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar, cargarEntidades, cargarModulos]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones' && c.key !== 'entidades');
        const dataSource = data?.datos || [];
        exportToExcel({
            fileName: `Pantallas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Pantallas',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: dataSource.map((item) => cols.map((col) => {
                if (col.key === 'modulo') {
                    const mods = item.modulos || [];
                    return mods.map((m) => m.nombre).join(', ');
                }
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleModuloChange = (val) => {
        setFiltroModulo(val);
        setPage(1);
    };
    const handleGrupoChange = (val) => {
        setFiltroGrupo(val);
        setPage(1);
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            fixed: 'left',
            width: 240,
            render: (val, record) => (_jsx(Link, { to: `/MPantalla/${record.id}`, className: "paces-doc-link", children: _jsx(Text, { strong: true, children: val }) })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'Módulos',
            dataIndex: 'modulos',
            key: 'modulo',
            width: 400,
            render: (modulos) => modulos && modulos.length > 0
                ? modulos.map((m) => _jsx(Tag, { style: { marginBottom: 2 }, children: m.nombre }, m.id))
                : _jsx(Tag, { style: { color: '#999' }, children: "Sin m\u00F3dulo" }),
        },
        {
            title: 'Entidad(es)',
            key: 'entidades',
            width: 240,
            render: (_, record) => {
                const ents = entidadesPorPantalla.get(record.id) || [];
                if (!ents.length)
                    return _jsx(Tag, { style: { color: '#999' }, children: "\u2014" });
                return ents.map(e => (_jsxs(Tag, { style: { marginBottom: 2 }, children: [e.entidadCodigo, e.tipoEntidad ? _jsxs(Text, { type: "secondary", children: ["/", e.tipoEntidad] }) : null] }, `${e.entidadCodigo}-${e.tipoEntidad || ''}`)));
            },
        },
        {
            title: 'Grupo',
            dataIndex: 'grupo',
            key: 'grupo',
            width: 140,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 90,
            align: 'center',
            render: (activo) => activo ? (_jsx(Tag, { color: "green", children: "Activo" })) : (_jsx(Tag, { color: "red", children: "Inactivo" })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar pantallas", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: () => navigate('/MPantalla/nuevo'), onReload: () => refetch(), onExportarExcel: handleExportarExcel, filtros: _jsxs(_Fragment, { children: [_jsx(Select, { placeholder: "M\u00F3dulo", allowClear: true, style: { width: 160 }, value: filtroModulo, onChange: handleModuloChange, children: modulosCatalogo.map((m) => (_jsx(Select.Option, { value: m.id, children: m.nombre }, m.id))) }), _jsx(Select, { placeholder: "Grupo", allowClear: true, style: { width: 160 }, value: filtroGrupo, onChange: handleGrupoChange, children: [...new Set((data?.datos || []).map((p) => p.grupo).filter(Boolean))].sort().map((g) => (_jsx(Select.Option, { value: g, children: g }, g))) })] }) }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "id", loading: isLoading, scroll: { x: 1000 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay pantallas registradas" }) }),
                        } })] })] }));
};
export default Pantallas;
