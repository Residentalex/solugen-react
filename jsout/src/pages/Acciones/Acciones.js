import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Table, Button, Modal, Form, Input, Select, Switch, Tag, message, Space, Tooltip, Empty, Typography, } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { accionApi } from '../../api/accionApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const Acciones = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [form] = Form.useForm();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['acciones', sucursalActiva],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return [];
            const result = await accionApi.obtenerListado(sucursalActiva);
            return result || [];
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MAccion');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const abrirNuevo = () => {
        setEditando(null);
        form.resetFields();
        setModalVisible(true);
    };
    const abrirEditar = (accion) => {
        setEditando(accion);
        form.setFieldsValue({
            codigo: accion.codigo,
            nombre: accion.nombre,
            activo: accion.activo,
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
                codigo: values.codigo,
                nombre: values.nombre,
                activo: values.activo ?? true,
            };
            if (editando) {
                await accionApi.actualizar(sucursalActiva, editando.id, payload);
                message.success('Acción actualizada correctamente');
            }
            else {
                await accionApi.crear(sucursalActiva, payload);
                message.success('Acción creada correctamente');
            }
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar acción');
        }
        finally {
            setGuardando(false);
        }
    };
    const handleEliminar = (accion) => {
        Modal.confirm({
            title: 'Eliminar Acción',
            content: `¿Está seguro que desea eliminar la acción "${accion.nombre}"?`,
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                if (sucursalActiva === undefined)
                    return;
                try {
                    await accionApi.eliminar(sucursalActiva, accion.id);
                    message.success('Acción eliminada correctamente');
                    refetch();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al eliminar acción');
                }
            },
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
    };
    const toTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = filteredData;
        const exportCols = columns.filter((col) => col.title && col.title !== 'Acciones' && col.title !== '');
        const columnHeaders = exportCols.map((col) => col.title);
        const dataRows = dataSource.map((item) => exportCols.map((col) => {
            if (col.dataIndex) {
                const val = item[col.dataIndex];
                return val != null ? String(val) : '';
            }
            return '';
        }));
        exportToExcel({
            fileName: `Acciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Acciones',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const filteredData = searchText
        ? (data || []).filter((item) => item.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
            item.nombre.toLowerCase().includes(searchText.toLowerCase()))
        : (data || []);
    const columns = [
        {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            fixed: 'left',
            width: 120,
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nombre) => _jsx(Text, { children: toTitleCase(nombre ?? '') }),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 100,
            align: 'center',
            render: (activo) => (_jsx(Tag, { color: activo ? 'green' : 'default', children: activo ? 'Activo' : 'Inactivo' })),
        },
        {
            title: 'Acciones',
            key: 'acciones',
            fixed: 'right',
            width: 100,
            render: (_, record) => (_jsxs(Space, { size: 0, children: [_jsx(Tooltip, { title: "Editar acci\u00F3n", children: _jsx(Button, { type: "link", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => abrirEditar(record) }) }), _jsx(Tooltip, { title: "Eliminar acci\u00F3n", children: _jsx(Button, { type: "link", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminar(record) }) })] })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 16 }, children: "Acciones" }), isError && (_jsx(Alert, { message: "Error al cargar acciones", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: filteredData, rowKey: "id", loading: isLoading, scroll: { x: 700 }, size: "middle", pagination: {
                            showSizeChanger: false,
                            pageSize,
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} acciones`,
                        }, locale: { emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay acciones registradas" }) }) } })] }), _jsx(Modal, { title: editando ? 'Editar Acción' : 'Nueva Acción', open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 520, okText: "Guardar", cancelText: "Cancelar", destroyOnHidden: true, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. ACC01", maxLength: 20 }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Descripci\u00F3n de la acci\u00F3n", maxLength: 80 }) }), _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", initialValue: true, children: _jsx(Switch, { checkedChildren: "Activo", unCheckedChildren: "Inactivo" }) })] }) })] }));
};
export default Acciones;
