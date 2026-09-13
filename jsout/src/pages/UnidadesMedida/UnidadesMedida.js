import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Button, Modal, Form, Input, InputNumber, message, Typography, Alert, Empty } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const UnidadesMedida = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MMedida');
    const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [modalVisible, setModalVisible] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [form] = Form.useForm();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['unidadesMedida', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const [resultados, totalCount] = await Promise.all([
                unidadMedidaApi.filtrar(sucursalActiva, params),
                unidadMedidaApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
            ]);
            return { datos: resultados || [], total: totalCount ?? 0 };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MUnidadMedida');
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
            fileName: `UnidadesMedida_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'UnidadesMedida',
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
        form.resetFields();
        form.setFieldsValue({ factor: 1 });
        setModalVisible(true);
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            if (sucursalActiva === undefined)
                return;
            setGuardando(true);
            const payload = {
                nombre: values.nombre,
                codigo: values.codigo,
                factor: values.factor ?? 1,
                idExterno: 0,
            };
            await unidadMedidaApi.crear(sucursalActiva, payload);
            message.success('Unidad de medida creada correctamente');
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar unidad de medida');
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
            width: 120,
            fixed: 'left',
            render: (val) => _jsx(Text, { strong: true, children: val || '-' }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 260,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Factor',
            dataIndex: 'factor',
            key: 'factor',
            width: 120,
            align: 'right',
            render: (val) => _jsx(Text, { children: (val ?? 1).toFixed(4) }),
        },
        {
            title: 'ID Externo',
            dataIndex: 'idExterno',
            key: 'idExterno',
            width: 120,
            render: (val) => _jsx(Text, { children: val ?? '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar unidades de medida", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: (r) => r.codigo || r.nombre || '', loading: isLoading, scroll: { x: 700 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay unidades de medida registradas" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsx(Modal, { title: "Nueva Unidad de Medida", open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 480, okText: "Guardar", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. UNI", maxLength: 20 }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Unidad", maxLength: 50 }) }), _jsx(Form.Item, { name: "factor", label: "Factor", rules: [{ required: true, message: 'El factor es obligatorio' }], initialValue: 1, children: _jsx(InputNumber, { min: 0, step: 0.0001, precision: 4, style: { width: '100%' }, placeholder: "1.0000" }) })] }) })] }));
};
export default UnidadesMedida;
