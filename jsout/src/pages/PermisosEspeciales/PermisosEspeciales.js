import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Button, Card, Modal, Form, Input, Select, Switch, Tag, message, Descriptions, Spin, Alert, Typography, Empty, } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { Text } = Typography;
const PermisosEspeciales = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const securitySucursal = useAuthStore((s) => s.securitySucursal);
    const [searchText, setSearchText] = useState('');
    const [selectedRow, setSelectedRow] = useState(null);
    // Modal crear/editar
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [form] = Form.useForm();
    // Modal detalle
    const [detalleVisible, setDetalleVisible] = useState(false);
    const [detalleItem, setDetalleItem] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['permisosEspeciales'],
        queryFn: async () => {
            const result = await permisoEspecialApi.obtenerListado(securitySucursal);
            return result || [];
        },
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MPermiso');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    const filteredData = useMemo(() => {
        const list = data || [];
        if (!searchText)
            return list;
        const term = searchText.toLowerCase();
        return list.filter((p) => p.codigo.toLowerCase().includes(term) ||
            (p.nombre && p.nombre.toLowerCase().includes(term)));
    }, [data, searchText]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(securitySucursal);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `PermisosEspeciales_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Permisos Especiales',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filteredData.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setSelectedRow(null);
    };
    const abrirNuevo = () => {
        setEditando(null);
        form.resetFields();
        form.setFieldsValue({ activo: true });
        setModalVisible(true);
    };
    const abrirEditar = (permiso) => {
        setEditando(permiso);
        form.setFieldsValue({
            codigo: permiso.codigo,
            nombre: permiso.nombre || '',
            activo: permiso.activo,
            tipoValor: permiso.tipoValor || 'BOOLEANO',
        });
        setModalVisible(true);
    };
    const abrirDetalle = async (permiso) => {
        setDetalleItem(permiso);
        setDetalleVisible(true);
        setCargandoDetalle(true);
        try {
            const completo = await permisoEspecialApi.obtenerPorId(securitySucursal, permiso.id);
            setDetalleItem(completo);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle del permiso');
        }
        finally {
            setCargandoDetalle(false);
        }
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            setGuardando(true);
            const payload = {
                id: editando?.id || 0,
                codigo: values.codigo,
                nombre: values.nombre || undefined,
                activo: values.activo ?? true,
                tipoValor: values.tipoValor || 'BOOLEANO',
            };
            if (editando) {
                await permisoEspecialApi.actualizar(securitySucursal, payload);
                message.success('Permiso actualizado correctamente');
            }
            else {
                await permisoEspecialApi.crear(securitySucursal, payload);
                message.success('Permiso creado correctamente');
            }
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar permiso');
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
            width: 200,
            render: (val, record) => (_jsx(Text, { strong: true, className: "paces-doc-link", style: { cursor: 'pointer' }, onClick: () => abrirDetalle(record), children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (nombre) => _jsx(Text, { children: nombre || '-' }),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 100,
            align: 'center',
            render: (activo) => activo ? (_jsx(Tag, { color: "green", children: "Activo" })) : (_jsx(Tag, { color: "red", children: "Inactivo" })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar permisos especiales", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: 25, onPageSizeChange: (v) => { }, ocultarPageSize: true, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { className: "paces-border-top paces-list-table", columns: columns, dataSource: filteredData, rowKey: "id", loading: isLoading, scroll: { x: 800 }, size: "middle", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay permisos especiales registrados" }) }),
                        }, rowClassName: (record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                            onClick: () => setSelectedRow(record),
                            onDoubleClick: () => abrirDetalle(record),
                        }), pagination: {
                            showTotal: (total) => `${total} registros`,
                            pageSize: 25,
                        } })] }), _jsx(Modal, { title: editando ? 'Editar Permiso' : 'Nuevo Permiso', open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 520, okText: "Guardar", cancelText: "Cancelar", destroyOnHidden: true, children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. PERMISO_ESPECIAL", maxLength: 50 }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", children: _jsx(Input, { placeholder: "Nombre descriptivo del permiso", maxLength: 200 }) }), _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", initialValue: true, children: _jsx(Switch, {}) }), _jsx(Form.Item, { name: "tipoValor", label: "Tipo de valor", initialValue: "BOOLEANO", children: _jsxs(Select, { children: [_jsx(Select.Option, { value: "BOOLEANO", children: "BOOLEANO" }), _jsx(Select.Option, { value: "NUMERICO", children: "NUM\u00C9RICO" })] }) })] }) }), _jsx(Modal, { title: `Detalle: ${detalleItem?.codigo || ''}`, open: detalleVisible, onCancel: () => setDetalleVisible(false), footer: detalleItem ? [
                    _jsx(Button, { type: "primary", onClick: () => { setDetalleVisible(false); abrirEditar(detalleItem); }, children: "Editar" }, "editar"),
                ] : null, width: 520, children: _jsx(Spin, { spinning: cargandoDetalle, children: detalleItem && (_jsxs(Descriptions, { column: 1, bordered: true, size: "small", style: { marginTop: 16 }, children: [_jsx(Descriptions.Item, { label: "C\u00F3digo", children: detalleItem.codigo }), _jsx(Descriptions.Item, { label: "Nombre", children: detalleItem.nombre || '-' }), _jsx(Descriptions.Item, { label: "Activo", children: _jsx(Tag, { color: detalleItem.activo ? 'green' : 'red', children: detalleItem.activo ? 'Activo' : 'Inactivo' }) })] })) }) })] }));
};
export default PermisosEspeciales;
