import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Table, Input, Tag, Button, message, Card, Modal, Form, Switch, Typography, Select, Alert, Row, Col, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { monedaApi } from '../../api/monedaApi';
import PermissionGate from '../../components/PermissionGate';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
const ORIGEN_OPTIONS = [
    { label: 'Débito', value: 0 },
    { label: 'Crédito', value: 1 },
    { label: 'Desconocido', value: 2 },
];
const { Text } = Typography;
function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
const CuentasContables = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const updateToolbar = useUIStore((s) => s.updateToolbar);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [filtro, setFiltro] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selectedRow, setSelectedRow] = useState(null);
    // Estados para crear/editar
    const [modalVisible, setModalVisible] = useState(false);
    const [editando, setEditando] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [form] = Form.useForm();
    // Opciones para selects del modal
    const [tipos, setTipos] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [monedas, setMonedas] = useState([]);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['cuentasContables', sucursalActiva, page, pageSize, filtro],
        queryFn: async () => {
            if (sucursalActiva === undefined)
                return { data: [], total: 0 };
            const salto = (page - 1) * pageSize;
            const result = await cuentaContableApi.obtenerListadoPaginado(sucursalActiva, pageSize, salto, filtro);
            setSelectedRow((actual) => actual ? result.data.find((item) => item.noCuenta === actual.noCuenta) ?? null : null);
            return result;
        },
        enabled: sucursalActiva !== undefined,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MCuentaContable');
        updateToolbar({});
        return () => resetToolbar();
    }, [setActiveModule, updateToolbar, resetToolbar]);
    // Cargar opciones de catálogo cuando se abre el modal
    useEffect(() => {
        if (!modalVisible || sucursalActiva === undefined)
            return;
        cuentaContableApi.obtenerTipos(sucursalActiva)
            .then(setTipos)
            .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos de cuenta'));
        cuentaContableApi.obtenerGrupos(sucursalActiva)
            .then(setGrupos)
            .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos'));
        monedaApi.obtenerListado(sucursalActiva)
            .then(setMonedas)
            .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas'));
    }, [modalVisible, sucursalActiva]);
    // Manejar navegación desde detalle (Editar)
    useEffect(() => {
        const noCuentaEditar = location.state?.editarNoCuenta;
        if (noCuentaEditar && sucursalActiva !== undefined) {
            const encontrada = (data?.data || []).find(c => c.noCuenta === noCuentaEditar);
            if (encontrada) {
                abrirEdicion(encontrada);
            }
            else {
                cuentaContableApi.obtenerPorId(sucursalActiva, noCuentaEditar)
                    .then(cta => abrirEdicion(cta))
                    .catch(() => message.error('Error al cargar cuenta para editar'));
            }
            window.history.replaceState({}, document.title);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state]);
    const abrirNuevo = () => {
        setEditando(null);
        form.resetFields();
        setModalVisible(true);
    };
    const abrirEdicion = (cuenta) => {
        setEditando(cuenta);
        form.setFieldsValue({
            noCuenta: cuenta.noCuenta,
            nombre: cuenta.nombre,
            nota: cuenta.nota || '',
            activo: cuenta.activo === 'Sí',
            origen: cuenta.origen === 'Débito' ? 0 : 1,
            utilizaCentroCosto: cuenta.utilizaCentroCosto === 'Sí',
            tipoCuentaCodigo: cuenta.tipoCuentaId || undefined,
            grupoCodigo: cuenta.grupoCodigo || undefined,
            monedaCodigo: cuenta.monedaCodigo || undefined,
            cuentaControlNo: cuenta.cuentaControlNo || undefined,
            cuentaPrimaNo: cuenta.cuentaPrimaNo || undefined,
        });
        setModalVisible(true);
    };
    const guardar = async () => {
        try {
            const values = await form.validateFields();
            if (sucursalActiva === undefined)
                return;
            setGuardando(true);
            if (editando) {
                await cuentaContableApi.actualizar(sucursalActiva, editando.noCuenta, values);
                message.success('Cuenta contable actualizada correctamente');
            }
            else {
                await cuentaContableApi.crear(sucursalActiva, values);
                message.success('Cuenta contable creada correctamente');
            }
            setModalVisible(false);
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
        }
        finally {
            setGuardando(false);
        }
    };
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const dataSource = data?.data || [];
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
            fileName: `CuentasContables_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'CuentasContables',
            companyName,
            columnHeaders,
            dataRows,
        });
    };
    const handleSearch = (value) => {
        setFiltro(value);
        setPage(1);
    };
    const columns = [
        {
            title: 'No. Cuenta',
            dataIndex: 'noCuenta',
            key: 'noCuenta',
            width: 140,
            fixed: 'left',
            render: (val) => _jsx(Link, { to: '/MCuentaContable/' + val, className: "paces-doc-link", style: { fontFamily: 'monospace' }, children: _jsx(Text, { strong: true, children: val }) }),
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            width: 280,
            render: (val) => _jsx(Text, { strong: true, children: toTitleCase(val ?? '') }),
        },
        {
            title: 'Tipo Cuenta',
            dataIndex: 'tipoCuenta',
            key: 'tipoCuenta',
            width: 160,
            render: (val) => val ? _jsx(Tag, { style: { fontSize: 11 }, children: val }) : '-',
        },
        {
            title: 'Grupo',
            dataIndex: 'grupoNombre',
            key: 'grupoNombre',
            width: 160,
            ellipsis: true,
            render: (val) => val
                ? _jsx(Tag, { color: "geekblue", style: { fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }, children: val })
                : '-',
        },
        {
            title: 'Moneda',
            dataIndex: 'monedaCodigo',
            key: 'monedaCodigo',
            width: 90,
            render: (val) => _jsx(Text, { children: val || '-' }),
        },
        {
            title: 'Origen',
            dataIndex: 'origen',
            key: 'origen',
            width: 100,
            render: (val) => _jsx(Text, { children: val || 'Desconocido' }),
        },
        {
            title: 'Activo',
            dataIndex: 'activo',
            key: 'activo',
            width: 80,
            render: (val) => (_jsx(Tag, { color: val === 'Sí' ? 'green' : 'default', children: val === 'Sí' ? 'Activo' : 'Inactivo' })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { title: "Error al cargar cuentas contables", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); setPage(1); }, onNuevo: abrirNuevo, onReload: () => refetch(), onExportarExcel: handleExportarExcel }), _jsx(Table, { columns: columns, dataSource: data?.data || [], rowKey: "noCuenta", loading: isLoading, scroll: { x: 1100 }, size: "middle", rowClassName: (record) => selectedRow?.noCuenta === record.noCuenta ? 'paces-row-selected' : 'paces-row-hover', className: "paces-border-top paces-list-table", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(Empty, { description: "No hay cuentas contables registradas" }) }),
                        }, pagination: {
                            current: page,
                            pageSize,
                            total: data?.total || 0,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, onRow: (record) => ({
                            onClick: () => setSelectedRow(record),
                            style: { cursor: 'pointer' },
                        }), onChange: (pagination) => {
                            setPage(pagination.current || 1);
                        } })] }), _jsx(Modal, { title: editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable', open: modalVisible, onCancel: () => setModalVisible(false), onOk: guardar, confirmLoading: guardando, width: 640, okText: "Guardar", cancelText: "Cancelar", children: _jsxs(Form, { form: form, layout: "vertical", style: { marginTop: 16 }, children: [_jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "noCuenta", label: "No. Cuenta", rules: [{ required: true, message: 'El número de cuenta es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. 1.01.01", maxLength: 20, disabled: !!editando }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "nombre", label: "Nombre", rules: [{ required: true, message: 'El nombre es obligatorio' }], children: _jsx(Input, { placeholder: "Ej. Caja General", maxLength: 150 }) }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "tipoCuentaCodigo", label: "Tipo Cuenta", rules: [{ required: true, message: 'Seleccione un tipo de cuenta' }], children: _jsx(Select, { placeholder: "Seleccionar tipo", showSearch: true, optionFilterProp: "label", options: tipos.map(t => ({ label: t.nombre, value: t.idExterno })) }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "grupoCodigo", label: "Grupo", rules: [{ required: true, message: 'Seleccione un grupo' }], children: _jsx(Select, { placeholder: "Seleccionar grupo", showSearch: true, optionFilterProp: "label", options: grupos.map(g => ({ label: g.nombre, value: g.codigo })) }) }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "monedaCodigo", label: "Moneda", rules: [{ required: true, message: 'Seleccione una moneda' }], children: _jsx(Select, { placeholder: "Seleccionar moneda", showSearch: true, optionFilterProp: "label", options: monedas.map(m => ({ label: `${m.nombre} (${m.codigo})`, value: m.codigo })) }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "origen", label: "Origen", rules: [{ required: true, message: 'Seleccione el origen' }], children: _jsx(Select, { placeholder: "Seleccionar origen", options: ORIGEN_OPTIONS }) }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "cuentaControlNo", label: "Cuenta Control", children: _jsx(Input, { placeholder: "No. cuenta control", maxLength: 20 }) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "cuentaPrimaNo", label: "Cuenta Prima", children: _jsx(Input, { placeholder: "No. cuenta prima", maxLength: 20 }) }) })] }), _jsxs(Row, { gutter: 16, children: [_jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "utilizaCentroCosto", label: "Centro Costo", valuePropName: "checked", children: _jsx(Switch, {}) }) }), _jsx(Col, { span: 12, children: _jsx(Form.Item, { name: "activo", label: "Activo", valuePropName: "checked", children: _jsx(Switch, {}) }) })] }), _jsx(Form.Item, { name: "nota", label: "Nota", children: _jsx(Input.TextArea, { rows: 3, placeholder: "Nota opcional", maxLength: 500 }) })] }) })] }));
};
export default CuentasContables;
