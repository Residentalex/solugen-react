import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Button, Card, Switch, Modal, Form, InputNumber, Select, Typography, Tooltip, message, } from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, PictureOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { ecommerceApi } from '../../../api/ecommerceApi';
import { formatCurrency } from '../../../utils/formats';
import { useAuthStore } from '../../../stores/authStore';
import PermissionGate from '../../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../../utils/exportToExcel';
const { Text } = Typography;
const EcommerceAdminProductos = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [searchText, setSearchText] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('');
    const [catalogoFiltro, setCatalogoFiltro] = useState('todos');
    const [destacadoFiltro, setDestacadoFiltro] = useState('todos');
    const [categorias, setCategorias] = useState([]);
    const [selectedProducto, setSelectedProducto] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [precioOfertaForm] = Form.useForm();
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadProducto, setUploadProducto] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const cargarCategorias = useCallback(async () => {
        try {
            const cats = await ecommerceApi.adminObtenerCategorias();
            setCategorias(cats.filter((c) => c.activo));
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías');
        }
    }, []);
    const cargarProductos = useCallback(async () => {
        setLoading(true);
        try {
            const params = { pagina: page, tamano: pageSize };
            if (searchText)
                params.buscar = searchText;
            if (categoriaFiltro)
                params.categoria = categoriaFiltro;
            if (catalogoFiltro !== 'todos')
                params.enCatalogo = catalogoFiltro === 'si';
            if (destacadoFiltro !== 'todos')
                params.destacado = destacadoFiltro === 'si';
            const result = await ecommerceApi.adminObtenerProductos(params);
            setData(result.items);
            setTotal(result.total);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar productos');
        }
        finally {
            setLoading(false);
        }
    }, [page, pageSize, searchText, categoriaFiltro, catalogoFiltro, destacadoFiltro]);
    useEffect(() => {
        cargarCategorias();
    }, [cargarCategorias]);
    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones' && c.dataIndex !== 'imagenUrl');
        exportToExcel({
            fileName: `ProductosEcommerce_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Productos Ecommerce',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: data.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (value) => {
        setSearchText(value);
        setPage(1);
    };
    const handleRefresh = () => {
        setPage(1);
        cargarProductos();
    };
    const handleToggleCatalogo = async (record) => {
        try {
            await ecommerceApi.adminToggleCatalogo(record.id, !record.enCatalogo);
            setData((prev) => prev.map((p) => (p.id === record.id ? { ...p, enCatalogo: !p.enCatalogo } : p)));
            message.success('Estado actualizado');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
        }
    };
    const handleToggleDestacado = async (record) => {
        try {
            await ecommerceApi.adminToggleDestacado(record.id, !record.destacado);
            setData((prev) => prev.map((p) => (p.id === record.id ? { ...p, destacado: !p.destacado } : p)));
            message.success('Estado actualizado');
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
        }
    };
    const openPrecioOferta = (record) => {
        setSelectedProducto(record);
        precioOfertaForm.setFieldsValue({ precioOferta: record.precioOferta });
        setModalOpen(true);
    };
    const handleGuardarPrecioOferta = async () => {
        const values = await precioOfertaForm.validateFields();
        if (!selectedProducto)
            return;
        try {
            await ecommerceApi.adminActualizarPrecioOferta(selectedProducto.id, values.precioOferta ?? null);
            setData((prev) => prev.map((p) => (p.id === selectedProducto.id ? { ...p, precioOferta: values.precioOferta ?? null } : p)));
            message.success('Precio de oferta actualizado');
            setModalOpen(false);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al actualizar precio');
        }
    };
    const openUploadModal = (record) => {
        setUploadProducto(record);
        setUploadFile(null);
        setUploadPreview('');
        setUploadModalOpen(true);
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        setUploadFile(file);
        setUploadPreview(URL.createObjectURL(file));
    };
    const handleUpload = async () => {
        if (!uploadFile || !uploadProducto)
            return;
        setUploading(true);
        try {
            const result = await ecommerceApi.adminSubirImagen(uploadProducto.id, uploadFile);
            setData((prev) => prev.map((p) => (p.id === uploadProducto.id ? { ...p, imagenUrl: result.imagenUrl } : p)));
            message.success('Imagen subida correctamente');
            setUploadModalOpen(false);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al subir imagen');
        }
        finally {
            setUploading(false);
        }
    };
    const columns = [
        {
            title: 'Imagen',
            dataIndex: 'imagenUrl',
            key: 'imagenUrl',
            width: 120,
            render: (val, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [val ? (_jsx("img", { src: val, style: { width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }, alt: "producto" })) : (_jsx("div", { style: { width: 40, height: 40, borderRadius: 8, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }, children: _jsx(PictureOutlined, {}) })), _jsx(Tooltip, { title: "Subir imagen", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(UploadOutlined, {}), onClick: () => openUploadModal(record) }) })] })),
        },
        {
            title: 'Código',
            dataIndex: 'codPro',
            key: 'codPro',
            width: 120,
            fixed: 'left',
            render: (val) => _jsx(Text, { style: { fontFamily: 'monospace' }, children: val }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'Categoría',
            dataIndex: 'categoriaNombre',
            key: 'categoriaNombre',
            width: 140,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Precio Base',
            dataIndex: 'precioBase',
            key: 'precioBase',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Precio Venta',
            dataIndex: 'precioVenta',
            key: 'precioVenta',
            width: 130,
            align: 'right',
            render: (val) => _jsx(Text, { children: formatCurrency(val) }),
        },
        {
            title: 'Precio Oferta',
            dataIndex: 'precioOferta',
            key: 'precioOferta',
            width: 130,
            align: 'right',
            render: (val, record) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }, children: [_jsx(Text, { style: { color: val ? '#34c38f' : undefined }, children: val ? formatCurrency(val) : '-' }), _jsx(Tooltip, { title: "Editar precio oferta", children: _jsx(Button, { type: "text", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => openPrecioOferta(record) }) })] })),
        },
        {
            title: 'Existencia',
            dataIndex: 'existencia',
            key: 'existencia',
            width: 100,
            align: 'right',
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'En Catálogo',
            dataIndex: 'enCatalogo',
            key: 'enCatalogo',
            width: 110,
            align: 'center',
            render: (val, record) => (_jsx(Switch, { size: "small", checked: val, onChange: () => handleToggleCatalogo(record) })),
        },
        {
            title: 'Destacado',
            dataIndex: 'destacado',
            key: 'destacado',
            width: 100,
            align: 'center',
            render: (val, record) => (_jsx(Switch, { size: "small", checked: val, onChange: () => handleToggleDestacado(record) })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Input.Search, { placeholder: "Buscar producto...", allowClear: true, onSearch: handleSearch, style: { width: 400 }, prefix: _jsx(SearchOutlined, { className: "paces-text-icon" }) }), _jsx(Select, { placeholder: "Categor\u00EDa", allowClear: true, style: { width: 180 }, value: categoriaFiltro || undefined, onChange: (v) => { setCategoriaFiltro(v || ''); setPage(1); }, options: categorias.map((c) => ({ value: c.nombre, label: c.nombre })) }), _jsx(Select, { placeholder: "En Cat\u00E1logo", style: { width: 140 }, value: catalogoFiltro, onChange: (v) => { setCatalogoFiltro(v); setPage(1); }, options: [
                                        { value: 'todos', label: 'Todos' },
                                        { value: 'si', label: 'Sí' },
                                        { value: 'no', label: 'No' },
                                    ] }), _jsx(Select, { placeholder: "Destacado", style: { width: 140 }, value: destacadoFiltro, onChange: (v) => { setDestacadoFiltro(v); setPage(1); }, options: [
                                        { value: 'todos', label: 'Todos' },
                                        { value: 'si', label: 'Sí' },
                                        { value: 'no', label: 'No' },
                                    ] }), _jsx("div", { style: { flex: 1 } }), _jsx(PermissionGate, { accion: "EXPORTAR", children: _jsx(Button, { icon: _jsx(FileExcelOutlined, {}), onClick: handleExportarExcel }) }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: handleRefresh })] }) }), _jsx(Table, { columns: columns, dataSource: data, rowKey: "id", loading: loading, size: "middle", scroll: { x: 1400 }, className: "paces-border-top paces-list-table", rowClassName: "paces-row-hover", pagination: {
                            current: page,
                            pageSize,
                            total,
                            onChange: (p, ps) => {
                                if (ps !== pageSize) {
                                    setPageSize(ps || 25);
                                    setPage(1);
                                }
                                else {
                                    setPage(p);
                                }
                            },
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsx(Modal, { title: `Editar Precio Oferta - ${selectedProducto?.nombre ?? ''}`, open: modalOpen, onOk: handleGuardarPrecioOferta, onCancel: () => setModalOpen(false), okText: "Guardar", cancelText: "Cancelar", children: _jsx(Form, { form: precioOfertaForm, layout: "vertical", children: _jsx(Form.Item, { name: "precioOferta", label: "Precio de Oferta", rules: [{ required: false }], children: _jsx(InputNumber, { style: { width: '100%' }, min: 0, precision: 2, prefix: "$", placeholder: "Dejar vac\u00EDo para quitar oferta" }) }) }) }), _jsx(Modal, { title: `Subir Imagen - ${uploadProducto?.nombre ?? ''}`, open: uploadModalOpen, onCancel: () => setUploadModalOpen(false), footer: null, destroyOnHidden: true, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }, children: [_jsx("input", { type: "file", accept: "image/*", onChange: handleFileChange }), uploadPreview && (_jsx("img", { src: uploadPreview, style: { maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }, alt: "preview" })), _jsx(Button, { type: "primary", icon: _jsx(UploadOutlined, {}), loading: uploading, onClick: handleUpload, disabled: !uploadFile, children: "Subir" })] }) })] }));
};
export default EcommerceAdminProductos;
