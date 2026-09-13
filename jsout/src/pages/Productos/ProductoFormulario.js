import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Select, Tag, Table, Space, message, Spin, Alert, Modal, Typography, Grid, Upload, } from 'antd';
import { SaveOutlined, CloseOutlined, ExclamationCircleOutlined, InboxOutlined, DeleteOutlined, } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { productoApi } from '../../api/productoApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import FormularioToolbar from '../../components/FormularioToolbar';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import { toTitleCase } from '../../utils/formats';
const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;
const TIPO_IMPUESTO_MAP = {
    0: 'Exento',
    1: 'Gravado',
    2: 'No Gravado',
};
const AMBITO_IMPUESTO_MAP = {
    0: 'Venta',
    1: 'Compra',
    2: 'Ambos',
};
function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
const ProductoFormulario = () => {
    const { codigo } = useParams();
    const navigate = useNavigate();
    const mode = codigo ? 'editar' : 'crear';
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
    const navigationConfirmedRef = useFormularioNavigation();
    const [form] = Form.useForm();
    const screens = Grid.useBreakpoint();
    const [loading, setLoading] = useState(true);
    const [loadingError, setLoadingError] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState(null);
    // Catálogos
    const [familias, setFamilias] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [unidades, setUnidades] = useState([]);
    const [comodines, setComodines] = useState([]);
    const [requiereFechaVenc, setRequiereFechaVenc] = useState(false);
    // Modal de selección de impuestos
    const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
    const [selectedImpuestos, setSelectedImpuestos] = useState([]);
    // Imagen (local UI only)
    const [imagePreview, setImagePreview] = useState(null);
    const isMobile = !screens.md; // <768px
    useEffect(() => {
        setActiveModule('MProducto');
        return () => resetToolbar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setActiveModule, resetToolbar]);
    useEffect(() => {
        cargarTodo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codigo, sucursalProductos]);
    const cargarTodo = async () => {
        setLoading(true);
        try {
            const [familiasData, categoriasData, unidadesData, comodinesData] = await Promise.all([
                familiaArticuloApi.obtenerTodo(sucursalProductos),
                categoriaArticuloApi.obtenerListado(sucursalProductos),
                unidadMedidaApi.obtenerListado(sucursalProductos),
                productoApi.obtenerComodines(sucursalProductos),
            ]);
            setFamilias(familiasData || []);
            setCategorias(categoriasData || []);
            setUnidades(unidadesData || []);
            setComodines(comodinesData || []);
            if (mode === 'editar' && codigo) {
                await cargarProducto(codigo);
            }
            else {
                form.setFieldsValue({
                    activo: true,
                    paraVender: true,
                    paraComprar: true,
                    precio: 0,
                    ultimoCosto: 0,
                });
                setLoading(false);
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar datos del formulario');
            setLoadingError(true);
            setLoading(false);
        }
    };
    const cargarProducto = async (prodCodigo) => {
        try {
            const prod = await productoApi.obtenerDetalle(sucursalProductos, prodCodigo);
            if (!prod) {
                message.error('Producto no encontrado');
                navigate('/MProducto', { replace: true });
                return;
            }
            setData(prod);
            form.setFieldsValue({
                nombre: prod.nombre,
                referenciaInterna: prod.referenciaInterna,
                upc: prod.upc,
                codigoSuplidor: prod?.codigoSuplidor || '',
                precio: prod.precio,
                ultimoCosto: prod.ultimoCosto,
                familia: prod.familia?.idExterno || undefined,
                categoria: prod.categoria?.codigo || prod.categoria?.idExterno || undefined,
                unidadMedida: prod.unidadMedida?.idExterno ?? undefined,
                unidadMedidaCompra: prod.datosExtra?.unidadMedidaCompra?.idExterno ?? undefined,
                nota: prod.nota,
                paraVender: prod.paraVender,
                paraComprar: prod.paraComprar,
                pesado: prod.pesado || false,
                activo: prod.activo,
                modificaPrecio: prod.modificaPrecio || false,
                modificaDescripcion: prod.modificaDescripcion || false,
                requiereFechaVenc: prod.requiereFechaVenc || false,
                diasVencimiento: prod.diasVencimiento,
                codigoControl: prod.datosExtra?.codigoControl || '',
                ubicacion: prod.datosExtra?.ubicacion || '',
                margenBeneficio: prod.datosExtra?.margenBeneficio ?? null,
                garantia: prod.datosExtra?.garantia ?? null,
                paraAlquilar: prod.datosExtra?.paraAlquilar || false,
                paraExportar: prod.datosExtra?.paraExportar || false,
                productoTerminado: prod.datosExtra?.productoTerminado || false,
                esComodin: prod.datosExtra?.esComodin || false,
                productoControl: prod.productoControl?.codigo || undefined,
            });
            setRequiereFechaVenc(prod.requiereFechaVenc || false);
            // Convertir impuestos del producto al formato del modal
            if (prod.impuestos?.length) {
                setSelectedImpuestos(prod.impuestos.map((imp) => ({
                    codigo: imp.impuesto?.codigo || '',
                    idExterno: imp.impuesto?.idExterno || '',
                    nombre: imp.impuesto?.nombre || '',
                    porcentaje: imp.impuesto?.porcentaje || 0,
                    tipo: 'Impuesto',
                    monto: 0,
                })));
            }
            else {
                setSelectedImpuestos([]);
            }
        }
        catch (err) {
            if (err?.name === 'CanceledError')
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al cargar producto');
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    };
    const handleGuardar = async () => {
        try {
            const values = await form.validateFields();
            if (values.precio < 0) {
                message.error('El precio debe ser mayor o igual a 0');
                return;
            }
            if (values.requiereFechaVenc && (!values.diasVencimiento || values.diasVencimiento <= 0)) {
                message.error('Debe especificar días de vencimiento cuando requiere fecha de vencimiento');
                return;
            }
            setSaving(true);
            const familiaSelected = values.familia
                ? familias.find((f) => f.idExterno === values.familia) || { idExterno: values.familia }
                : null;
            const categoriaSelected = values.categoria
                ? categorias.find((c) => c.codigo === values.categoria || c.idExterno === values.categoria)
                    || { codigo: values.categoria }
                : null;
            const unidadSelected = values.unidadMedida
                ? unidades.find((u) => u.idExterno === values.unidadMedida) || null
                : null;
            const unidadMedidaCompraSelected = values.unidadMedidaCompra
                ? unidades.find((u) => u.idExterno === values.unidadMedidaCompra) || null
                : null;
            const productoControlSelected = values.productoControl
                ? comodines.find((c) => c.codigo === values.productoControl)
                    || { codigo: values.productoControl }
                : null;
            const datosExtra = {
                codigoControl: values.codigoControl || undefined,
                ubicacion: values.ubicacion || undefined,
                margenBeneficio: values.margenBeneficio ?? undefined,
                garantia: values.garantia ?? undefined,
                paraAlquilar: values.paraAlquilar || false,
                paraExportar: values.paraExportar || false,
                productoTerminado: values.productoTerminado || false,
                esComodin: values.esComodin || false,
                unidadMedidaCompra: unidadMedidaCompraSelected,
            };
            const dto = {
                codigo: codigo || values.codigo || '',
                idExterno: codigo || values.codigo || undefined,
                nombre: values.nombre,
                precio: values.precio || 0,
                referenciaInterna: values.referenciaInterna || '',
                upc: values.upc || '',
                codigoSuplidor: values.codigoSuplidor || '',
                familia: familiaSelected,
                categoria: categoriaSelected,
                unidadMedida: unidadSelected,
                nota: values.nota || '',
                paraVender: values.paraVender ?? true,
                paraComprar: values.paraComprar ?? true,
                activo: values.activo ?? true,
                pesado: values.pesado || false,
                ultimoCosto: data?.ultimoCosto || 0,
                modificaPrecio: values.modificaPrecio || false,
                modificaDescripcion: values.modificaDescripcion || false,
                requiereFechaVenc: values.requiereFechaVenc || false,
                diasVencimiento: values.requiereFechaVenc ? values.diasVencimiento : undefined,
                datosExtra,
                productoControl: productoControlSelected,
                impuestos: selectedImpuestos.length > 0
                    ? selectedImpuestos
                        .filter((imp) => imp.idExterno)
                        .map((imp) => ({
                        impuesto: {
                            codigo: imp.codigo,
                            nombre: imp.nombre,
                            porcentaje: imp.porcentaje,
                            tipo: 1,
                            ambito: 0,
                            idExterno: imp.idExterno,
                        },
                    }))
                    : [],
            };
            if (mode === 'crear') {
                const creado = await productoApi.crear(sucursalProductos, dto);
                navigationConfirmedRef.current = true;
                message.success('Producto creado correctamente');
                navigate('/MProducto/' + (creado.codigo || values.codigo), { replace: true });
            }
            else {
                await productoApi.actualizar(sucursalProductos, dto);
                navigationConfirmedRef.current = true;
                message.success('Producto actualizado correctamente');
                navigate('/MProducto/' + codigo, { replace: true });
            }
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar producto');
        }
        finally {
            setSaving(false);
        }
    };
    const handleCancelar = () => {
        Modal.confirm({
            title: 'Cancelar',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
            okText: 'Sí, salir',
            cancelText: 'No, continuar editando',
            okButtonProps: { danger: true },
            onOk: () => {
                navigationConfirmedRef.current = true;
                navigate('/MProducto', { replace: true });
            },
        });
    };
    const handleImageChange = (info) => {
        const file = info.fileList?.[0]?.originFileObj;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result);
            reader.readAsDataURL(file);
        }
        else {
            setImagePreview(null);
        }
    };
    const handleRemoveImage = () => {
        setImagePreview(null);
    };
    if (loading) {
        return (_jsxs("div", { style: { textAlign: 'center', padding: 80 }, children: [_jsx(Spin, { size: "large" }), _jsx("div", { style: { marginTop: 16 }, className: "paces-text-secondary", children: "Cargando formulario..." })] }));
    }
    const impuestoColumns = [
        {
            title: 'Nombre', key: 'nombre',
            render: (_, r) => r.impuesto?.nombre ? toTitleCase(r.impuesto.nombre) : '-',
        },
        {
            title: 'Porcentaje (%)', key: 'porcentaje', width: 130, align: 'right',
            render: (_, r) => r.impuesto?.porcentaje !== undefined ? formatNumber(r.impuesto.porcentaje) : '-',
        },
        {
            title: 'Tipo', key: 'tipo', width: 120,
            render: (_, r) => r.impuesto?.tipo !== undefined
                ? (TIPO_IMPUESTO_MAP[r.impuesto.tipo] || `Tipo ${r.impuesto.tipo}`)
                : '-',
        },
        {
            title: 'Ámbito', key: 'ambito', width: 100,
            render: (_, r) => r.impuesto?.ambito !== undefined
                ? (AMBITO_IMPUESTO_MAP[r.impuesto.ambito] || `Ámbito ${r.impuesto.ambito}`)
                : '-',
        },
    ];
    const renderRightPanel = () => (_jsxs(_Fragment, { children: [_jsxs(Card, { className: "paces-card", size: "small", title: "Estado", style: { borderRadius: 12, marginBottom: 16 }, children: [_jsx(Form.Item, { name: "activo", valuePropName: "checked", style: { marginBottom: 8 }, children: _jsx(Switch, { checkedChildren: "Activo", unCheckedChildren: "Inactivo", style: { width: 120 } }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12, marginTop: 4 }, children: "Determina si el art\u00EDculo est\u00E1 disponible" })] }), _jsx(Card, { className: "paces-card", size: "small", title: "Inventario y Log\u00EDstica", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Control de inventario y almacenamiento" }), style: { borderRadius: 12, marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "pesado", label: "Pesado", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Indica si el art\u00EDculo se vende por peso" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "requiereFechaVenc", label: "Requiere Fecha Venc.", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, { onChange: (checked) => setRequiereFechaVenc(checked) }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Controla si el art\u00EDculo requiere registrar fecha de vencimiento" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: requiereFechaVenc && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "diasVencimiento", label: "D\u00EDas de Vencimiento", style: { marginBottom: 4 }, rules: [{ required: true, message: 'Debe especificar los días de vencimiento' }], children: _jsx(InputNumber, { min: 1, step: 1, style: { width: '100%' }, placeholder: "D\u00EDas" }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "D\u00EDas antes del vencimiento del art\u00EDculo" })] })) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "ubicacion", label: "Ubicaci\u00F3n", style: { marginBottom: 4 }, children: _jsx(Input, { placeholder: "Ubicaci\u00F3n en almac\u00E9n" }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Ubicaci\u00F3n f\u00EDsica en almac\u00E9n" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "garantia", label: "Garant\u00EDa (d\u00EDas)", style: { marginBottom: 4 }, children: _jsx(InputNumber, { min: 0, step: 1, style: { width: '100%' }, placeholder: "D\u00EDas" }) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Per\u00EDodo de garant\u00EDa en d\u00EDas" })] }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "Configuraci\u00F3n Adicional", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Comportamiento y caracter\u00EDsticas del art\u00EDculo" }), style: { borderRadius: 12, marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "paraVender", label: "Para Vender", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Disponible para facturaci\u00F3n de venta" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "paraComprar", label: "Para Comprar", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Disponible para \u00F3rdenes de compra" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "paraAlquilar", label: "Para Alquilar", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Disponible para contratos de alquiler" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "paraExportar", label: "Para Exportar", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "El art\u00EDculo puede ser exportado" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "productoTerminado", label: "Prod. Terminado", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "El art\u00EDculo se considera producto terminado" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "esComodin", label: "Es Comod\u00EDn", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Se usa como art\u00EDculo comod\u00EDn en promociones" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "modificaPrecio", label: "Modifica Precio", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Permite modificar el precio en los documentos" })] }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx(Form.Item, { name: "modificaDescripcion", label: "Modifica Descripci\u00F3n", valuePropName: "checked", style: { marginBottom: 4 }, children: _jsx(Switch, {}) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 12 }, children: "Permite modificar la descripci\u00F3n en documentos" })] }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "Impuestos", style: { borderRadius: 12, marginBottom: 16 }, extra: _jsx(Button, { type: "link", size: "small", onClick: () => setModalImpuestosOpen(true), children: selectedImpuestos.length > 0
                        ? `Seleccionados (${selectedImpuestos.length})`
                        : 'Seleccionar' }), children: selectedImpuestos.length > 0 ? (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: selectedImpuestos.map((imp) => (_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            background: 'var(--paces-topbar-search-bg)',
                            borderRadius: 6,
                            fontSize: 12,
                        }, children: [_jsx("span", { style: { color: 'var(--paces-text)' }, children: toTitleCase(imp.nombre) }), _jsx(Space, { size: 4, children: _jsxs(Tag, { children: [imp.porcentaje, "%"] }) })] }, imp.codigo))) })) : (_jsx("div", { style: { padding: '12px 0', textAlign: 'center' }, className: "paces-text-secondary", children: _jsx(Text, { type: "secondary", children: "Sin impuestos seleccionados" }) })) }), mode === 'editar' && data && (_jsx(Card, { className: "paces-card", size: "small", title: "Auditor\u00EDa", style: { borderRadius: 12, marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "Fecha de creaci\u00F3n" }), _jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: data.fechaCreacion
                                        ? new Date(data.fechaCreacion).toLocaleDateString('es-DO', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })
                                        : '-' })] }), _jsxs("div", { children: [_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: "C\u00F3digo" }), _jsx("div", { style: { fontSize: 13, fontWeight: 500 }, children: data.codigo })] })] }) }))] }));
    const rightPanelContent = renderRightPanel();
    return (_jsxs("div", { children: [loadingError && (_jsx(Alert, { message: "Error al cargar el formulario", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => { setLoadingError(false); cargarTodo(); }, children: "Reintentar" }) })), _jsx(FormularioToolbar, { saving: saving, mode: mode, onGuardar: handleGuardar, onCancelar: handleCancelar, children: _jsx("h4", { style: { margin: 0, fontSize: 18, fontWeight: 600 }, children: mode === 'editar' ? `Editar Producto: ${codigo}` : 'Nuevo Producto' }) }), _jsxs(Form, { form: form, layout: "vertical", size: "middle", children: [_jsxs(Row, { gutter: 16, children: [_jsxs(Col, { xs: 24, md: 14, xl: 17, children: [_jsxs(Card, { className: "paces-card", size: "small", title: "Informaci\u00F3n General", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Datos b\u00E1sicos del art\u00EDculo" }), style: { borderRadius: 12, marginBottom: 16 }, children: [_jsx(Row, { gutter: [16, 0], children: _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Nombre del producto" }) }) }) }), _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "referenciaInterna", label: "Referencia Interna", children: _jsx(Input, { placeholder: "Referencia interna" }) }) }), _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "upc", label: "UPC", children: _jsx(Input, { placeholder: "C\u00F3digo de barras" }) }) })] }), _jsx(Row, { gutter: [16, 0], children: _jsx(Col, { xs: 24, sm: 12, children: _jsx(Form.Item, { name: "codigoSuplidor", label: "C\u00F3digo Suplidor", children: _jsx(Input, { placeholder: "C\u00F3digo del suplidor" }) }) }) }), _jsx(Row, { gutter: [16, 0], children: _jsx(Col, { xs: 24, children: _jsx(Form.Item, { name: "nota", label: "Nota", children: _jsx(TextArea, { rows: 3, placeholder: "Notas adicionales del art\u00EDculo" }) }) }) })] }), _jsx(Card, { className: "paces-card", size: "small", title: "Clasificaci\u00F3n", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Organizaci\u00F3n y categorizaci\u00F3n del art\u00EDculo" }), style: { borderRadius: 12, marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "familia", label: "Familia", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccionar familia", children: familias.map((f) => (_jsx(Select.Option, { value: f.idExterno || '', children: f.nombre ? toTitleCase(f.nombre) : f.idExterno }, f.idExterno || ''))) }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "categoria", label: "Categor\u00EDa", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccionar categor\u00EDa", children: categorias.map((c) => (_jsx(Select.Option, { value: c.codigo || c.idExterno || '', children: c.nombre ? toTitleCase(c.nombre) : c.codigo }, c.codigo || c.idExterno || ''))) }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "unidadMedida", label: "Unidad de Medida", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccionar unidad", children: unidades.map((u) => (_jsx(Select.Option, { value: u.idExterno ?? '', children: u.nombre ? toTitleCase(u.nombre) : String(u.idExterno ?? '') }, u.idExterno ?? ''))) }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "productoControl", label: "Producto Control", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccionar producto control", children: comodines.map((c) => (_jsxs(Select.Option, { value: c.codigo || '', children: [c.codigo, c.nombre ? ` - ${toTitleCase(c.nombre)}` : ''] }, c.codigo || ''))) }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "unidadMedidaCompra", label: "Unidad Medida Compra", children: _jsx(Select, { allowClear: true, showSearch: true, optionFilterProp: "children", placeholder: "Seleccionar unidad de compra", children: unidades.map((u) => (_jsx(Select.Option, { value: u.idExterno ?? '', children: u.nombre ? toTitleCase(u.nombre) : String(u.idExterno ?? '') }, u.idExterno ?? ''))) }) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "Precios y Costos", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Informaci\u00F3n financiera del art\u00EDculo" }), style: { borderRadius: 12, marginBottom: 16 }, children: _jsxs(Row, { gutter: [16, 0], children: [_jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "precio", label: "Precio", children: _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' } }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "ultimoCosto", label: "\u00DAltimo Costo", children: _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' }, disabled: true }) }) }), _jsx(Col, { xs: 24, sm: 12, md: 8, children: _jsx(Form.Item, { name: "margenBeneficio", label: "Margen Beneficio (%)", children: _jsx(InputNumber, { min: 0, step: 0.01, style: { width: '100%' }, placeholder: "%" }) }) })] }) }), _jsx(Card, { className: "paces-card", size: "small", title: "Imagen del Art\u00EDculo", extra: _jsx("span", { style: { fontSize: 11 }, className: "paces-text-secondary", children: "Arrastre una imagen o haga clic para seleccionar" }), style: { borderRadius: 12, marginBottom: 16 }, children: imagePreview ? (_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("img", { src: imagePreview, alt: "Preview", style: { maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 12 } }), _jsx("br", {}), _jsx(Button, { icon: _jsx(DeleteOutlined, {}), danger: true, size: "small", onClick: handleRemoveImage, children: "Eliminar imagen" })] })) : (_jsxs(Dragger, { name: "imagen", multiple: false, showUploadList: false, accept: "image/png,image/jpeg,image/webp", onChange: handleImageChange, style: { background: 'var(--paces-topbar-search-bg)', borderRadius: 8 }, children: [_jsx("p", { className: "ant-upload-drag-icon", children: _jsx(InboxOutlined, { style: { color: 'var(--paces-primary)', fontSize: 48 } }) }), _jsx("p", { className: "ant-upload-text", style: { color: 'var(--paces-text)' }, children: "Haga clic o arrastre una imagen aqu\u00ED" }), _jsx("p", { className: "ant-upload-hint", style: { color: 'var(--paces-text-secondary)' }, children: "PNG, JPG o WebP" })] })) })] }), !isMobile && (_jsx(Col, { xs: 0, md: 10, xl: 7, children: rightPanelContent }))] }), _jsx(SeleccionarImpuestosModal, { open: modalImpuestosOpen, onClose: () => setModalImpuestosOpen(false), onConfirm: (items) => {
                            setSelectedImpuestos(items);
                            setModalImpuestosOpen(false);
                        }, sucursal: sucursalProductos, existentes: selectedImpuestos })] }), isMobile && (_jsx("div", { style: { marginTop: 0 }, children: rightPanelContent }))] }));
};
export default ProductoFormulario;
