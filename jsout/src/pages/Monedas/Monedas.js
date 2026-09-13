import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Modal, Form, Input, InputNumber, message, Empty, Typography, Alert, } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { monedaApi } from '../../api/monedaApi';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Monedas = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MMoneda');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [form] = Form.useForm();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['monedas', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const { items, total } = await monedaApi.filtrar(sucursalActiva, params);
            return { datos: items, total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MMoneda');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.datos || [];
        const exportCols = columns.filter((col) => col.title && col.title !== '' && col.title !== 'Acciones');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            if (col.dataIndex) {
                const val = item[col.dataIndex];
                return val != null ? String(val) : '';
            }
            return '';
        }));
        exportToExcel({
            fileName: `Monedas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Monedas',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setPage(1);
        setSearchText(value);
    };
    const abrirNuevo = () => {
        if (!puedeCrear)
            return;
        setEditando(null);
        form.resetFields();
        setModalVisible(true);
    };
    const abrirEditar = (moneda) => {
        if (!puedeEditar)
            return;
        setEditando(moneda);
        form.setFieldsValue({
            nombre: moneda.nombre,
            simbolo: moneda.simbolo,
            codigo: moneda.codigo,
            tasa: moneda.tasa,
        });
        setModalVisible(true);
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            if (sucursalActiva === undefined)
                return;
            setGuardando(true);
            const payload = {
                id: editando?.id || 0,
                nombre: values.nombre,
                simbolo: values.simbolo,
                codigo: values.codigo,
                tasa: values.tasa ?? 1,
            };
            if (editando) {
                await monedaApi.actualizar(sucursalActiva, editando.id, payload);
                message.success('Moneda actualizada correctamente');
            }
            else {
                await monedaApi.crear(sucursalActiva, payload);
                message.success('Moneda creada correctamente');
            }
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar moneda');
        }
        finally {
            setGuardando(false);
        }
    };
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            fixed: 'left',
            width: 120,
            render: (val, record) => puedeEditar ? (_jsx(Button, { type: "link", size: "small", style: { padding: 0, fontWeight: 500 }, onClick: () => abrirEditar(record), children: val })) : (_jsx(Text, { children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nombre) => _jsx(Text, { children: toTitleCase(nombre ?? '') }),
        },
        {
            title: 'Símbolo',
            dataIndex: 'simbolo',
            key: 'simbolo',
            width: 100,
            align: 'center',
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'Tasa',
            dataIndex: 'tasa',
            key: 'tasa',
            width: 120,
            align: 'right',
            render: (tasa) => _jsx(Text, { children: tasa?.toFixed(2) }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar monedas", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "id", loading: isLoading, scroll: { x: 700 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay monedas registradas" }) }) } })] }), _jsx(Modal, { title: editando ? 'Editar Moneda' : 'Nueva Moneda', open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 520, okText: "Guardar", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Pesos Dominicanos", maxLength: 40 }) }), _jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. DOP", maxLength: 10 }) }), _jsx(Form.Item, { name: "simbolo", label: "S\u00EDmbolo", rules: [{ required: true, message: 'El símbolo es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. RD$", maxLength: 3 }) }), _jsx(Form.Item, { name: "tasa", label: "Tasa", rules: [{ required: true, message: 'La tasa es obligatoria' }], initialValue: 1, children: _jsx(InputNumber, { min: 0, step: 0.01, precision: 2, style: { width: '100%' }, placeholder: "1.00" }) })] }) })] }));
};
export default Monedas;
