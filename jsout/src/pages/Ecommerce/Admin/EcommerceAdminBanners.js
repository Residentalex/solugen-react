import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Card, Modal, Form, Input, InputNumber, Switch, Typography, Tooltip, message, Popconfirm, } from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
import { useAuthStore } from '../../../stores/authStore';
import PermissionGate from '../../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../../utils/exportToExcel';
const { Text } = Typography;
const EcommerceAdminBanners = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form] = Form.useForm();
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones' && c.key !== 'imagenUrl');
        exportToExcel({
            fileName: `Banners_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Banners',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: data.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const result = await ecommerceApi.adminObtenerBanners();
            setData(result);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar banners');
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        cargar();
    }, [cargar]);
    const openCrear = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };
    const openEditar = (record) => {
        setEditing(record);
        form.setFieldsValue({
            titulo: record.titulo,
            descripcion: record.descripcion,
            imagenUrl: record.imagenUrl,
            ctaTexto: record.ctaTexto,
            ctaLink: record.ctaLink,
            orden: record.orden,
            activo: record.activo,
        });
        setModalOpen(true);
    };
    const handleGuardar = async () => {
        const values = await form.validateFields();
        try {
            if (editing) {
                await ecommerceApi.adminActualizarBanner(editing.id, values);
                message.success('Banner actualizado');
            }
            else {
                await ecommerceApi.adminCrearBanner(values);
                message.success('Banner creado');
            }
            setModalOpen(false);
            cargar();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al guardar');
        }
    };
    const handleEliminar = async (id) => {
        try {
            await ecommerceApi.adminEliminarBanner(id);
            message.success('Banner eliminado');
            cargar();
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
    };
    const columns = [
        {
            title: 'Imagen',
            dataIndex: 'imagenUrl',
            key: 'imagenUrl',
            width: 100,
            render: (url) => url ? (_jsx("img", { src: url, alt: "banner", style: { width: 80, height: 48, objectFit: 'cover', borderRadius: 4 } })) : (_jsx(Text, { type: "secondary", children: "Sin imagen" })),
        },
        {
            title: 'Título',
            dataIndex: 'titulo',
            key: 'titulo',
            render: (val) => _jsx(Text, { strong: true, children: val }),
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion',
            ellipsis: true,
            render: (val) => _jsx(Text, { type: "secondary", children: val || '-' }),
        },
        {
            title: 'CTA',
            dataIndex: 'ctaTexto',
            key: 'ctaTexto',
            width: 120,
            render: (val, record) => (_jsxs("div", { children: [_jsx(Text, { children: val || '-' }), record.ctaLink && (_jsx("div", { children: _jsx(Text, { type: "secondary", style: { fontSize: 11 }, children: record.ctaLink }) }))] })),
        },
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 80,
            align: 'center',
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 80,
            align: 'center',
            render: (val) => (_jsx("span", { style: { color: val ? '#34c38f' : '#f46a6a', fontWeight: 600 }, children: val ? 'Sí' : 'No' })),
        },
        {
            title: '',
            key: 'acciones',
            width: 100,
            fixed: 'right',
            render: (_, record) => (_jsxs("div", { style: { display: 'flex', gap: 4 }, children: [_jsx(Tooltip, { title: "Editar", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => openEditar(record) }) }), _jsx(Popconfirm, { title: "\u00BFEliminar banner?", onConfirm: () => handleEliminar(record.id), okText: "Eliminar", cancelText: "Cancelar", children: _jsx(Tooltip, { title: "Eliminar", children: _jsx(Button, { type: "text", size: "small", danger: true, icon: _jsx(DeleteOutlined, {}) }) }) })] })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("div", { style: { flex: 1 } }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: openCrear, children: "Nuevo Banner" }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargar })] }) }), _jsx(Table, { columns: columns, dataSource: data, rowKey: "id", loading: loading, size: "middle", className: "paces-border-top paces-list-table", rowClassName: "paces-row-hover", pagination: { showTotal: (t) => `${t} registros` } })] }), _jsx(Modal, { title: editing ? 'Editar Banner' : 'Nuevo Banner', open: modalOpen, onOk: handleGuardar, onCancel: () => setModalOpen(false), okText: "Guardar", cancelText: "Cancelar", width: 600, children: _jsxs(Form, { form: form, layout: "vertical", children: [_jsx(Form.Item, { name: "titulo", label: "T\u00EDtulo", rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }), _jsx(Form.Item, { name: "descripcion", label: "Descripci\u00F3n", children: _jsx(Input.TextArea, { rows: 2 }) }), _jsx(Form.Item, { name: "imagenUrl", label: "URL de Imagen", rules: [{ required: true, message: 'Requerido' }], children: _jsx(Input, {}) }), form.getFieldValue('imagenUrl') && (_jsx("div", { style: { marginBottom: 16 }, children: _jsx("img", { src: form.getFieldValue('imagenUrl'), alt: "Preview", style: { maxWidth: '100%', maxHeight: 120, borderRadius: 4, objectFit: 'cover' } }) })), _jsx(Form.Item, { name: "ctaTexto", label: "Texto CTA", children: _jsx(Input, { placeholder: "Ej: Comprar ahora" }) }), _jsx(Form.Item, { name: "ctaLink", label: "Link CTA", children: _jsx(Input, { placeholder: "Ej: /store/ofertas" }) }), _jsx(Form.Item, { name: "orden", label: "Orden", rules: [{ required: true, message: 'Requerido' }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0 }) }), editing && (_jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", children: _jsx(Switch, {}) }))] }) })] }));
};
export default EcommerceAdminBanners;
