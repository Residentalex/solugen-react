import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Tag, Button, Card, Input, message, Empty, Modal, Select, Form, Alert, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ticketApi } from '../../api/ticketApi';
import { usuarioApi } from '../../api/usuarioApi';
import TicketThreadModal from '../../components/TicketThreadModal';
import PermissionGate from '../../components/PermissionGate';
import type { TicketDTO } from '../../types/ticket';
import type { CrearTicketRequest } from '../../types/ticket';
import type { UsuarioDTO } from '../../types/administracion';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { TextArea } = Input;

const ESTADO_COLORS: Record<string, string> = {
  Abierto: 'blue',
  EnProceso: 'gold',
  Resuelto: 'green',
  Cerrado: 'default',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  Alta: 'red',
  Normal: 'blue',
  Baja: 'green',
};

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const Tickets: React.FC = () => {
  const sucursal = useAuthStore((s) => s.compania);
  const usuarioID = useAuthStore((s) => s.usuario?.id);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const [ticketModalID, setTicketModalID] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [crearModal, setCrearModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form] = Form.useForm();
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tickets', sucursal, usuarioID, pageSize],
    queryFn: async () => {
      if (!sucursal || !usuarioID) return [];
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

  const handleCrear = useCallback(async () => {
    if (!sucursal || !usuarioID) return;
    try {
      const values = await form.validateFields();
      setCreando(true);
      const request: CrearTicketRequest = {
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
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al crear ticket');
    } finally {
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

  const columns: ColumnsType<TicketDTO> = [
    {
      title: 'N° Ticket',
      dataIndex: 'numero',
      key: 'numero',
      width: 120,
      fixed: 'left',
      render: (numero: string) => (
        <Typography.Text strong style={{ fontFamily: 'monospace' }}>{numero || '-'}</Typography.Text>
      ),
    },
    {
      title: 'Título',
      dataIndex: 'titulo',
      key: 'titulo',
      width: 200,
      render: (text: string, record: TicketDTO) => (
        <a onClick={() => setTicketModalID(record.id)} style={{ fontWeight: 500 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado: string) => (
        <Tag color={ESTADO_COLORS[estado] || 'default'}>{estado}</Tag>
      ),
    },
    {
      title: 'Prioridad',
      dataIndex: 'prioridad',
      key: 'prioridad',
      width: 90,
      render: (prioridad: string) => (
        <Tag color={PRIORIDAD_COLORS[prioridad] || 'default'}>{prioridad}</Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 120,
      render: (f: string) => (
        <span style={{ fontSize: 12 }}>{formatFecha(f)}</span>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar tickets"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={(val) => setSearchText(val)}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={() => setCrearModal(true)}
          onReload={() => refetch()}
          filtros={
            <Select
              placeholder="Estado"
              style={{ width: 140 }}
              allowClear
              value={filtroEstado || undefined}
              onChange={(val) => setFiltroEstado(val || "")}
              onClear={() => setFiltroEstado("")}
              options={[
                { value: "Abierto", label: "Abierto" },
                { value: "EnProceso", label: "En Proceso" },
                { value: "Resuelto", label: "Resuelto" },
                { value: "Cerrado", label: "Cerrado" },
              ]}
            />
          }
        />
        <Table<TicketDTO>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 750 }}
          size="middle"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay tickets" /></div>,
          }}
          pagination={{
            showSizeChanger: false,
            pageSize,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
          }}
        />
      </Card>

      {/* Modal crear ticket */}
      <Modal
        title="Nuevo ticket"
        open={crearModal}
        onCancel={() => { setCrearModal(false); form.resetFields(); }}
        onOk={handleCrear}
        confirmLoading={creando}
        okText="Crear ticket"
        width={500}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Asunto del ticket" />
          </Form.Item>
          <Form.Item name="mensaje" label="Mensaje" rules={[{ required: true, message: 'Obligatorio' }]}>
            <TextArea rows={4} placeholder="Describe el problema..." />
          </Form.Item>
          <Form.Item name="prioridad" label="Prioridad" initialValue="Normal">
            <Select
              options={[
                { label: 'Baja', value: 'Baja' },
                { label: 'Normal', value: 'Normal' },
                { label: 'Alta', value: 'Alta' },
              ]}
            />
          </Form.Item>
          <Form.Item name="usuarioAsignadoID" label="Asignar a" initialValue={usuarioID}>
            <Select
              showSearch
              placeholder="Buscar usuario..."
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={usuarios
                .filter(u => u.activo)
                .map(u => ({ label: `${u.nombre} (${u.nombreUsuario})`, value: u.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <TicketThreadModal
        open={ticketModalID !== null}
        ticketID={ticketModalID ?? 0}
        onClose={() => {
          setTicketModalID(null);
          refetch();
        }}
      />
    </>
  );
};

export default Tickets;
