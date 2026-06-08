import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Button, Modal, Form, Select, Input, Switch, Tag, Tooltip, Alert,
  message, Empty, Space, Row, Col,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { notificacionesApi } from '../../api/notificacionesApi';
import type { NotificacionConfig, NotificacionConfigDestino } from '../../types/notificaciones';

const MODULOS_OPCIONES = [
  { label: 'Inventario', value: 'Inventario' },
  { label: 'Compras', value: 'Compras' },
  { label: 'Facturacion/DGII', value: 'Facturacion/DGII' },
  { label: 'Contabilidad', value: 'Contabilidad' },
  { label: 'Seguridad', value: 'Seguridad' },
  { label: 'General', value: 'General' },
];

const TIPOS_OPCIONES = [
  { label: 'Alerta', value: 'Alerta' },
  { label: 'Info', value: 'Info' },
  { label: 'Error', value: 'Error' },
  { label: 'Advertencia', value: 'Advertencia' },
  { label: 'Exito', value: 'Exito' },
  { label: 'Ticket', value: 'Ticket' },
];

const DESTINO_TIPOS = [
  { label: 'Usuario', value: 'Usuario' },
  { label: 'Rol', value: 'Rol' },
];

// Componente para la fila de destinatario con select dinámico
const DestinoRow: React.FC<{
  name: number;
  restField: any;
  usuarios: any[];
  roles: any[];
  onRemove: () => void;
  form: any;
}> = ({ name, restField, usuarios, roles, onRemove, form }) => {
  const destinoTipo = Form.useWatch(['destinos', name, 'destinoTipo'], form);

  const opcionesDestino = destinoTipo === 'Rol'
    ? (roles || []).map((r: any) => ({ value: r.id, label: r.nombre }))
    : (usuarios || []).map((u: any) => ({ value: u.id, label: `${u.nombre} (${u.nombreUsuario})` }));

  return (
    <Row gutter={12} style={{ marginBottom: 8, alignItems: 'flex-start' }}>
      <Col span={8}>
        <Form.Item
          {...restField}
          name={[name, 'destinoTipo']}
          rules={[{ required: true, message: 'Obligatorio' }]}
          style={{ marginBottom: 0 }}
        >
          <Select placeholder="Tipo" options={DESTINO_TIPOS} />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          {...restField}
          name={[name, 'destinoID']}
          rules={[{ required: true, message: 'Obligatorio' }]}
          style={{ marginBottom: 0 }}
        >
          <Select
            placeholder="Seleccionar..."
            showSearch
            filterOption={(input, option) =>
              (option?.label || '').toLowerCase().includes(input.toLowerCase())
            }
            options={opcionesDestino}
            notFoundContent={destinoTipo ? 'Sin resultados' : 'Seleccione un tipo primero'}
            key={destinoTipo || 'empty'}
          />
        </Form.Item>
      </Col>
      <Col span={4}>
        <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </Col>
    </Row>
  );
};

interface ConfiguracionFormValues {
  modulo: string;
  evento: string;
  tipo: string;
  tituloTemplate?: string;
  mensajeTemplate?: string;
  activa: boolean;
  destinos: { destinoTipo: string; destinoID: number }[];
}

const Configuracion: React.FC = () => {
  const sucursal = useAuthStore((s: any) => s.compania);
  const [configs, setConfigs] = useState<NotificacionConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<NotificacionConfig | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [loadingError, setLoadingError] = useState(false);

  const cargarConfigs = useCallback(async () => {
    if (!sucursal) return;
    setLoading(true);
    try {
      const data = await notificacionesApi.obtenerConfig(sucursal);
      setConfigs(data || []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursal]);

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    cargarConfigs();
  }, [cargarConfigs]);

  const cargarUsuarios = async () => {
    try {
      const data = await notificacionesApi.obtenerUsuarios();
      setUsuarios(data || []);
    } catch {
      // Silencioso - se muestra error en el select
    }
  };

  const cargarRoles = async () => {
    try {
      const data = await notificacionesApi.obtenerRoles();
      setRoles(data || []);
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    cargarConfigs();
    cargarUsuarios();
    cargarRoles();
  }, [cargarConfigs]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ activa: true, destinos: [] });
    setModalVisible(true);
  };

  const abrirEditar = (config: NotificacionConfig) => {
    setEditando(config);
    form.setFieldsValue({
      modulo: config.modulo,
      evento: config.evento,
      tipo: config.tipo,
      tituloTemplate: config.tituloTemplate,
      mensajeTemplate: config.mensajeTemplate,
      activa: config.activa,
      destinos: (config.destinos || []).map((d) => ({
        destinoTipo: d.destinoTipo,
        destinoID: d.destinoID,
      })),
    });
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    try {
      const values: ConfiguracionFormValues = await form.validateFields();
      setGuardando(true);

      const payload: NotificacionConfig = {
        configID: editando?.configID || 0,
        modulo: values.modulo,
        evento: values.evento,
        tipo: values.tipo,
        tituloTemplate: values.tituloTemplate,
        mensajeTemplate: values.mensajeTemplate,
        activa: values.activa,
        fechaCreacion: editando?.fechaCreacion || new Date().toISOString(),
        destinos: (values.destinos || []).map((d, i) => ({
          id: editando?.destinos?.[i]?.id || 0,
          configID: editando?.configID || 0,
          destinoTipo: d.destinoTipo,
          destinoID: d.destinoID,
        })),
      };

      await notificacionesApi.guardarConfig(sucursal, payload);
      message.success('Configuración guardada correctamente');
      setModalVisible(false);
      cargarConfigs();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  };

  const getDestinoLabel = (destino: NotificacionConfigDestino): string => {
    if (destino.destinoTipo === 'Usuario') {
      const u = usuarios.find((x) => x.id === destino.destinoID);
      return u ? `${u.nombre} (${u.nombreUsuario})` : `Usuario #${destino.destinoID}`;
    }
    const r = roles.find((x) => x.id === destino.destinoID);
    return r ? r.nombre : `Rol #${destino.destinoID}`;
  };

  const columns: ColumnsType<NotificacionConfig> = [
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo',
      width: 150,
      render: (text: string) => <Tag color="blue" style={{ fontSize: 11 }}>{text}</Tag>,
    },
    {
      title: 'Evento',
      dataIndex: 'evento',
      key: 'evento',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (text: string) => {
        const colores: Record<string, string> = {
          Alerta: 'gold', Info: 'blue', Error: 'red', Advertencia: 'orange', Exito: 'green', Ticket: 'purple',
        };
        return <Tag color={colores[text] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: 'Activa',
      dataIndex: 'activa',
      key: 'activa',
      width: 80,
      render: (activa: boolean) => (
        <Tag color={activa ? 'green' : 'default'}>{activa ? 'Sí' : 'No'}</Tag>
      ),
    },
    {
      title: 'Destinatarios',
      key: 'destinos',
      width: 250,
      ellipsis: true,
      render: (_, record) => (
        <Space wrap size={4}>
          {(record.destinos || []).length === 0 && (
            <span className="paces-text-muted" style={{ fontSize: 12 }}>Sin destinatarios</span>
          )}
          {(record.destinos || []).map((d, i) => (
            <Tooltip key={i} title={d.destinoTipo}>
              <Tag color={d.destinoTipo === 'Usuario' ? 'cyan' : 'purple'} style={{ fontSize: 11 }}>
                {getDestinoLabel(d)}
              </Tag>
            </Tooltip>
          ))}
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="Editar regla">
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => abrirEditar(record)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Configuración de Notificaciones</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva Regla
        </Button>
      </div>

      {loadingError && (
        <Alert
          message="Error al cargar configuración"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={cargarConfigs} />
          </div>
        </div>
        <Table<NotificacionConfig>
          columns={columns}
          dataSource={configs}
          rowKey="configID"
          loading={loading}
          scroll={{ x: 900 }}
          size="middle"
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay reglas de notificación configuradas" /></div> }}
          pagination={false}
        />
      </Card>

      <Modal
        title={editando ? 'Editar Regla de Notificación' : 'Nueva Regla de Notificación'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleGuardar}
        confirmLoading={guardando}
        okText="Guardar"
        cancelText="Cancelar"
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="modulo" label="Módulo" rules={[{ required: true, message: 'Obligatorio' }]}>
                <Select placeholder="Seleccione módulo" options={MODULOS_OPCIONES} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="evento" label="Evento" rules={[{ required: true, message: 'Obligatorio' }]}>
                <Input placeholder="Ej: StockBajo" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Obligatorio' }]}>
                <Select placeholder="Seleccione tipo" options={TIPOS_OPCIONES} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tituloTemplate" label="Título (template)">
                <Input placeholder="Template para el título" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="mensajeTemplate" label="Mensaje (template)">
                <Input placeholder="Template para el mensaje" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="activa" label="Regla activa" valuePropName="checked">
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>

          {/* Destinatarios */}
          <Form.List name="destinos">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Destinatarios</span>
                  <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ destinoTipo: 'Usuario', destinoID: undefined })}>
                    Agregar destinatario
                  </Button>
                </div>

                {fields.length === 0 && (
                  <div className="paces-text-muted" style={{ fontSize: 13, padding: '8px 0' }}>
                    No hay destinatarios configurados
                  </div>
                )}

                {fields.map(({ key, name, ...restField }) => (
                  <DestinoRow
                    key={key}
                    name={name}
                    restField={restField}
                    usuarios={usuarios}
                    roles={roles}
                    onRemove={() => remove(name)}
                    form={form}
                  />
                ))}
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
};

export default Configuracion;
