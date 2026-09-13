import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, message, Card, Button, Modal, Form, Input, InputNumber, Select, Switch, Tag, Typography, Alert, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { impuestoApi } from '../../api/impuestoApi';
import { MetodoCalculoImpuesto, AmbitoImpuesto, BaseCalculoImpuesto, TipoImpuesto, } from '../../types/contabilidad';
import { toTitleCase } from '../../utils/formats';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const TIPO_IMPUESTO_LABEL = {
    I: { label: 'Impuesto', color: 'blue' },
    L: { label: 'Liquidación', color: 'orange' },
    V: { label: 'Informativo', color: 'purple' },
    R: { label: 'Retención', color: 'red' },
};
const AMBITO_LABEL = {
    [AmbitoImpuesto.Venta]: 'Venta',
    [AmbitoImpuesto.Compra]: 'Compra',
    [AmbitoImpuesto.Ninguno]: 'Ninguno',
};
const { Text } = Typography;
const Impuestos = () => {
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const usuario = useAuthStore((s) => s.usuario);
    const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MImpuesto');
    const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
    const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;
    const [page, setPage] = useState(1);
    const [searchText, setSearchText] = useState('');
    const [pageSize, setPageSize] = useState(25);
    // Estados para crear/editar
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [cuentaModalOpen, setCuentaModalOpen] = useState(false);
    const [cuentaDisplay, setCuentaDisplay] = useState('');
    const [form] = Form.useForm();
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['impuestos', sucursalActiva, page, pageSize, searchText],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { datos: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const params = { cantidad: pageSize, salto };
            if (searchText)
                params.busqueda = searchText;
            const { items, total } = await impuestoApi.filtrar(sucursalActiva, params);
            return { datos: items, total };
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MImpuesto');
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
            fileName: `Impuestos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Impuestos',
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
        setModalVisible(true);
    };
    const abrirEditar = (item) => {
        if (!puedeEditar)
            return;
        setEditando(item);
        setModalVisible(true);
    };
    useEffect(() => {
        if (!modalVisible)
            return;
        if (editando) {
            form.setFieldsValue({
                codigo: editando.idExterno,
                nombre: editando.nombre,
                porcentaje: editando.porcentaje,
                tipo: editando.tipo,
                ambito: editando.ambito,
                metodoCalculo: editando.metodoCalculo,
                baseCalculo: editando.baseCalculo,
                noCuenta: editando.noCuenta,
                indicadorDGII: editando.indicadorDGII,
                asientos: editando.asientos,
            });
            setCuentaDisplay(editando.cuentaContable || '');
        }
        else {
            form.resetFields();
            form.setFieldsValue({
                tipo: 'I',
                ambito: AmbitoImpuesto.Ninguno,
                metodoCalculo: MetodoCalculoImpuesto.Porcentaje,
                baseCalculo: BaseCalculoImpuesto.Indefinido,
                noCuenta: '',
                asientos: true,
            });
            setCuentaDisplay('');
        }
    }, [modalVisible, editando, form]);
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            if (sucursalActiva === undefined)
                return;
            setGuardando(true);
            const payload = { ...values };
            if (editando) {
                await impuestoApi.actualizar(sucursalActiva, editando.idExterno, payload);
                message.success('Impuesto actualizado correctamente');
            }
            else {
                await impuestoApi.crear(sucursalActiva, payload);
                message.success('Impuesto creado correctamente');
            }
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar impuesto');
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
            width: 100,
            fixed: 'left',
            render: (val, record) => puedeEditar ? (_jsx(Button, { type: "link", size: "small", style: { padding: 0, fontWeight: 500 }, onClick: () => abrirEditar(record), children: val })) : (_jsx(Text, { children: val })),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 220,
            render: (val) => _jsx(Text, { children: val }),
        },
        {
            title: 'Porcentaje',
            dataIndex: 'porcentaje',
            key: 'porcentaje',
            width: 110,
            align: 'right',
            render: (val) => _jsx(Text, { children: `${(val ?? 0).toFixed(2)} %` }),
        },
        {
            title: 'Tipo',
            dataIndex: 'tipo',
            key: 'tipo',
            width: 120,
            render: (tipo) => _jsx(Text, { children: TIPO_IMPUESTO_LABEL[tipo]?.label || tipo }),
        },
        {
            title: 'Ámbito',
            dataIndex: 'ambito',
            key: 'ambito',
            width: 100,
            render: (ambito) => _jsx(Text, { children: AMBITO_LABEL[ambito] || 'Ninguno' }),
        },
        {
            title: 'Afecta Asientos',
            dataIndex: 'asientos',
            key: 'asientos',
            width: 130,
            render: (val) => (_jsx(Tag, { color: val ? 'green' : 'red', children: val ? 'Sí' : 'No' })),
        },
        {
            title: 'Cuenta Contable',
            dataIndex: 'cuentaContable',
            key: 'cuentaContable',
            width: 220,
            render: (val) => _jsx(Text, { children: toTitleCase(val ?? '') || '-' }),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar impuestos", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.datos || [], rowKey: "idExterno", loading: isLoading, scroll: { x: 1100 }, size: "middle", rowClassName: "paces-row-hover", className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay impuestos registrados" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        } })] }), _jsxs(Modal, { title: editando ? 'Editar Impuesto' : 'Nuevo Impuesto', open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 600, okText: "Guardar", cancelText: "Cancelar", children: [_jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsx(Form.Item, { name: "codigo", label: "C\u00F3digo", rules: [{ required: true, message: 'El código es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. ITBIS", maxLength: 20, disabled: !!editando }) }), _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. ITBIS 18%", maxLength: 100 }) }), _jsx(Form.Item, { name: "porcentaje", label: "Porcentaje", rules: [{ required: true, message: 'El porcentaje es obligatorio' }], children: _jsx(InputNumber, { min: 0, max: 100, step: 0.01, style: { width: '100%' }, placeholder: "0.00", addonAfter: "%" }) }), _jsx(Form.Item, { name: "tipo", label: "Tipo", rules: [{ required: true, message: 'El tipo es obligatorio' }], children: _jsxs(Select, { children: [_jsx(Select.Option, { value: "I", children: "Impuesto" }), _jsx(Select.Option, { value: "L", children: "Liquidaci\u00F3n" }), _jsx(Select.Option, { value: "V", children: "Informativo" }), _jsx(Select.Option, { value: "R", children: "Retenci\u00F3n" })] }) }), _jsx(Form.Item, { name: "ambito", label: "\u00C1mbito", children: _jsxs(Select, { children: [_jsx(Select.Option, { value: AmbitoImpuesto.Venta, children: "Venta" }), _jsx(Select.Option, { value: AmbitoImpuesto.Compra, children: "Compra" }), _jsx(Select.Option, { value: AmbitoImpuesto.Ninguno, children: "Ninguno" })] }) }), _jsx(Form.Item, { name: "metodoCalculo", label: "M\u00E9todo C\u00E1lculo", children: _jsxs(Select, { children: [_jsx(Select.Option, { value: MetodoCalculoImpuesto.Porcentaje, children: "Porcentaje" }), _jsx(Select.Option, { value: MetodoCalculoImpuesto.Fijo, children: "Fijo" })] }) }), _jsx(Form.Item, { name: "baseCalculo", label: "Base C\u00E1lculo", children: _jsxs(Select, { children: [_jsx(Select.Option, { value: BaseCalculoImpuesto.Indefinido, children: "Indefinido" }), _jsx(Select.Option, { value: BaseCalculoImpuesto.MontoNeto, children: "Monto Neto" }), _jsx(Select.Option, { value: BaseCalculoImpuesto.MontoTotal, children: "Monto Total" })] }) }), _jsx(Form.Item, { name: "noCuenta", label: "No. Cuenta Contable", children: _jsx(Input, { placeholder: " ", readOnly: true, value: cuentaDisplay, onClick: () => setCuentaModalOpen(true), suffix: _jsx(SearchOutlined, { style: { cursor: 'pointer' }, onClick: () => setCuentaModalOpen(true) }) }) }), _jsx(Form.Item, { name: "indicadorDGII", label: "Indicador DGII", children: _jsx(InputNumber, { min: 0, style: { width: '100%' }, placeholder: "0" }) }), _jsx(Form.Item, { name: "asientos", label: "Afecta Asientos", valuePropName: "checked", children: _jsx(Switch, { checkedChildren: "S\u00ED", unCheckedChildren: "No" }) })] }), _jsx(BuscarCuentaContableModal, { open: cuentaModalOpen, onClose: () => setCuentaModalOpen(false), onSelect: (cuenta) => {
                            form.setFieldsValue({ noCuenta: cuenta.noCuenta });
                            setCuentaDisplay(`${cuenta.noCuenta} - ${cuenta.nombre}`);
                        }, sucursal: sucursalActiva })] })] }));
};
export default Impuestos;
