import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Button, Card, Input, message, Empty, Modal, Select, Form, Alert, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ticketApi } from '../../api/ticketApi';
import { usuarioApi } from '../../api/usuarioApi';
import TicketThreadModal from '../../components/TicketThreadModal';
import PermissionGate from '../../components/PermissionGate';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const { TextArea } = Input;
const ESTADO_COLORS = {
    Abierto: 'blue',
    EnProceso: 'gold',
    Resuelto: 'green',
    Cerrado: 'default',
};
const PRIORIDAD_COLORS = {
    Alta: 'red',
    Normal: 'blue',
    Baja: 'green',
};
function formatFecha(iso) {
    if (!iso)
        return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-DO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
const Tickets = () => {
    const sucursal = useAuthStore((s) => s.compania);
    const usuarioID = useAuthStore((s) => s.usuario?.id);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [ticketModalID, setTicketModalID] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [crearModal, setCrearModal] = useState(false);
    const [creando, setCreando] = useState(false);
    const [form] = Form.useForm();
    const [usuarios, setUsuarios] = useState([]);
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['tickets', sucursal, usuarioID, pageSize],
        queryFn: async () => {
            if (!sucursal || !usuarioID)
                return [];
            const result = await ticketApi.obtenerPendientes(sucursal, usuarioID, pageSize);
            return result;
        },
        enabled: !!sucursal && !!usuarioID,
        placeholderData: (prev) => prev,
    });
    useEffect(() => {
        setActiveModule('MTicket');
    }, [setActiveModule]);
    useEffect(() => {
        if (sucursal) {
            usuarioApi.obtenerListado(sucursal).then(setUsuarios).catch((err) => console.warn('Error al cargar usuarios', err));
        }
    }, [sucursal]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursal);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `Tickets_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Tickets',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filtered.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleCrear = useCallback(async () => {
        if (!sucursal || !usuarioID)
            return;
        try {
            const values = await form.validateFields();
            setCreando(true);
            const request = {
                titulo: values.titulo,
                mensaje: values.mensaje,
                prioridad: values.prioridad || 'Normal',
                modulo: 'General',
                usuarioOrigenID: usuarioID,
                usuarioAsignadoID: values.usuarioAsignadoID || usuarioID,
            };
            await ticketApi.crear(sucursal, request);
            message.success('Ticket creado correctamente');
            setCrearModal(false);
            form.resetFields();
            refetch();
        }
        catch (err) {
            if (err?.errorFields)
                return;
            message.error(err?.response?.data?.errorMessage || 'Error al crear ticket');
        }
        finally {
            setCreando(false);
        }
    }, [sucursal, usuarioID, form, refetch]);
    const filtered = (data || []).filter((t) => {
        const matchTexto = !searchText ||
            t.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
            t.mensaje?.toLowerCase().includes(searchText.toLowerCase());
        const matchEstado = !filtroEstado || t.estado === filtroEstado;
        return matchTexto && matchEstado;
    });
    const columns = [
        {
            title: 'N° Ticket',
            dataIndex: 'numero',
            key: 'numero',
            width: 120,
            fixed: 'left',
            render: (numero) => (_jsx(Typography.Text, { strong: true, style: { fontFamily: 'monospace' }, children: numero || '-' })),
        },
        {
            title: 'Título',
            dataIndex: 'titulo',
            key: 'titulo',
            width: 200,
            render: (text, record) => (_jsx("a", { onClick: () => setTicketModalID(record.id), style: { fontWeight: 500 }, children: text })),
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (estado) => (_jsx(Tag, { color: ESTADO_COLORS[estado] || 'default', children: estado })),
        },
        {
            title: 'Prioridad',
            dataIndex: 'prioridad',
            key: 'prioridad',
            width: 90,
            render: (prioridad) => (_jsx(Tag, { color: PRIORIDAD_COLORS[prioridad] || 'default', children: prioridad })),
        },
        {
            title: 'Fecha',
            dataIndex: 'fechaCreacion',
            key: 'fechaCreacion',
            width: 120,
            render: (f) => (_jsx("span", { style: { fontSize: 12 }, children: formatFecha(f) })),
        },
    ];
    return (_jsxs(_Fragment, { children: [isError && (_jsx(Alert, { message: "Error al cargar tickets", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: () => refetch(), children: "Reintentar" }) })), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: (val) => setSearchText(val), pageSize: pageSize, onPageSizeChange: (v) => { setPageSize(v); }, onNuevo: () => setCrearModal(true), onReload: () => refetch(), onExportarExcel: handleExportarExcel, filtros: _jsx(Select, { placeholder: "Estado", style: { width: 140 }, allowClear: true, value: filtroEstado || undefined, onChange: (val) => setFiltroEstado(val || ""), onClear: () => setFiltroEstado(""), options: [
                                { value: "Abierto", label: "Abierto" },
                                { value: "EnProceso", label: "En Proceso" },
                                { value: "Resuelto", label: "Resuelto" },
                                { value: "Cerrado", label: "Cerrado" },
                            ] }) }), _jsx(Table, { columns: columns, dataSource: filtered, rowKey: "id", loading: isLoading, scroll: { x: 750 }, size: "middle", locale: {
                            emptyText: _jsx("div", { style: { minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Empty, { description: "No hay tickets" }) }),
                        }, pagination: {
                            showSizeChanger: false,
                            pageSize,
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
                        } })] }), _jsx(Modal, { title: "Nuevo ticket", open: crearModal, onCancel: () => { setCrearModal(false); form.resetFields(); }, onOk: handleCrear, confirmLoading: creando, okText: "Crear ticket", width: 500, children: _jsxs(Form, { form: form, layout: "vertical", size: "small", children: [_jsx(Form.Item, { name: "titulo", label: "T\u00EDtulo", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(Input, { placeholder: "Asunto del ticket" }) }), _jsx(Form.Item, { name: "mensaje", label: "Mensaje", rules: [{ required: true, message: 'Obligatorio' }], children: _jsx(TextArea, { rows: 4, placeholder: "Describe el problema..." }) }), _jsx(Form.Item, { name: "prioridad", label: "Prioridad", initialValue: "Normal", children: _jsx(Select, { options: [
                                    { label: 'Baja', value: 'Baja' },
                                    { label: 'Normal', value: 'Normal' },
                                    { label: 'Alta', value: 'Alta' },
                                ] }) }), _jsx(Form.Item, { name: "usuarioAsignadoID", label: "Asignar a", initialValue: usuarioID, children: _jsx(Select, { showSearch: true, placeholder: "Buscar usuario...", filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()), options: usuarios
                                    .filter(u => u.activo)
                                    .map(u => ({ label: `${u.nombre} (${u.nombreUsuario})`, value: u.id })) }) })] }) }), _jsx(TicketThreadModal, { open: ticketModalID !== null, ticketID: ticketModalID ?? 0, onClose: () => {
                    setTicketModalID(null);
                    refetch();
                } })] }));
};
export default Tickets;
