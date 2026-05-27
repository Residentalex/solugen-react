import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, Button, Card, Input, message, Empty, Modal, Select, Form, Alert } from 'antd';
import { ReloadOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ticketApi } from '../../api/ticketApi';
import TicketThreadModal from '../../components/TicketThreadModal';
import PermissionGate from '../../components/PermissionGate';
import type { TicketDTO } from '../../types/ticket';
import type { CrearTicketRequest } from '../../types/ticket';

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

  const [tickets, setTickets] = useState<TicketDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [ticketModalID, setTicketModalID] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [crearModal, setCrearModal] = useState(false);
  const [creando, setCreando] = useState(false);
  const [form] = Form.useForm();
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('MTicket');
  }, [setActiveModule]);

  const cargarTickets = useCallback(async () => {
    if (!sucursal || !usuarioID) return;
    setLoading(true);
    try {
      const data = await ticketApi.obtenerPendientes(sucursal, usuarioID);
      setTickets(data);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar tickets');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursal, usuarioID]);

  useEffect(() => {
    cargarTickets();
  }, [cargarTickets]);

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
      cargarTickets();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al crear ticket');
    } finally {
      setCreando(false);
    }
  }, [sucursal, usuarioID, form, cargarTickets]);

  const filtered = searchText
    ? tickets.filter((t) =>
        t.titulo.toLowerCase().includes(searchText.toLowerCase()) ||
        t.mensaje?.toLowerCase().includes(searchText.toLowerCase())
      )
    : tickets;

  const columns: ColumnsType<TicketDTO> = [
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
      {loadingError && (
        <Alert
          title="Error al cargar tickets"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); cargarTickets(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar ticket..."
              allowClear
              onSearch={(val) => setSearchText(val)}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCrearModal(true)}>
                Nuevo
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={() => { setLoadingError(false); cargarTickets(); }} />
          </div>
        </div>
        <Table<TicketDTO>
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          scroll={{ x: 600 }}
          size="middle"
          locale={{
            emptyText: <Empty description="No hay tickets" />,
          }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
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
          <Form.Item name="usuarioAsignadoID" label="Asignar a (ID de usuario)" initialValue={usuarioID}>
            <Input type="number" min={1} placeholder="ID del usuario" />
          </Form.Item>
        </Form>
      </Modal>

      <TicketThreadModal
        open={ticketModalID !== null}
        ticketID={ticketModalID ?? 0}
        onClose={() => {
          setTicketModalID(null);
          cargarTickets();
        }}
      />
    </>
  );
};

export default Tickets;
