import { useState } from 'react';
import {
  App as AppAntd,
  Button,
  Card,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { actividadApi } from '../../api/actividadApi';
import { extraerMensajeError } from '../../utils/formats';
import type { ActividadServicioDTO } from '../../types/actividad';

// Catalogo de tipos de servicio (ACTIVIDADES_SERVICIO).
// Tabla global de Consolidado: no cuelga de sucursal y no tiene permisos
// (misma decision que el resto del modulo de Actividades).
//
// El color se edita con ColorPicker de AntD y se manda como '#RRGGBB',
// que es el formato que valida el backend.

const COLOR_POR_DEFECTO = '#556ee6';

interface ValoresServicio {
  nombre: string;
  codigo?: string;
  // ColorPicker con value/onChange de tipo string: el form guarda '#RRGGBB'.
  color?: string;
  orden?: number;
  activo?: boolean;
}

export default function ServiciosActividadPage() {
  const { message } = AppAntd.useApp();
  const queryClient = useQueryClient();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<ActividadServicioDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm<ValoresServicio>();

  const serviciosQuery = useQuery({
    queryKey: ['actividades', 'servicios'],
    queryFn: () => actividadApi.obtenerServicios(),
  });

  const servicios = serviciosQuery.data ?? [];
  const cargando = serviciosQuery.isLoading;
  const error = serviciosQuery.isError
    ? extraerMensajeError(serviciosQuery.error, 'Error al cargar los tipos de servicio')
    : null;

  const recargar = () => {
    // El calendario usa el mismo catalogo para pintar las tarjetas:
    // hay que invalidar el grupo completo.
    queryClient.invalidateQueries({ queryKey: ['actividades'] });
  };

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ color: COLOR_POR_DEFECTO });
    setModalAbierto(true);
  };

  const abrirEdicion = (servicio: ActividadServicioDTO) => {
    setEditando(servicio);
    form.resetFields();
    form.setFieldsValue({
      nombre: servicio.nombre,
      codigo: servicio.codigo,
      color: servicio.color ?? COLOR_POR_DEFECTO,
      orden: servicio.orden,
      activo: servicio.activo,
    });
    setModalAbierto(true);
  };

  const handleGuardar = async () => {
    try {
      const valores = await form.validateFields();
      setGuardando(true);

      const color = (valores.color || COLOR_POR_DEFECTO).toUpperCase();

      if (editando) {
        await actividadApi.actualizarServicio(editando.id, {
          nombre: valores.nombre,
          codigo: valores.codigo || '',
          color,
          orden: valores.orden ?? 0,
          activo: valores.activo ?? true,
        });
        message.success('Tipo de servicio actualizado');
      } else {
        await actividadApi.crearServicio({
          nombre: valores.nombre,
          codigo: valores.codigo || '',
          color,
          orden: valores.orden ?? 0,
        });
        message.success('Tipo de servicio creado');
      }

      setModalAbierto(false);
      recargar();
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(extraerMensajeError(err, 'Error al guardar el tipo de servicio'));
    } finally {
      setGuardando(false);
    }
  };

  const handleAlternarActivo = async (servicio: ActividadServicioDTO) => {
    try {
      await actividadApi.actualizarServicio(servicio.id, {
        nombre: servicio.nombre,
        codigo: servicio.codigo,
        color: servicio.color ?? COLOR_POR_DEFECTO.toUpperCase(),
        orden: servicio.orden,
        activo: !servicio.activo,
      });
      message.success(servicio.activo ? 'Tipo de servicio desactivado' : 'Tipo de servicio reactivado');
      recargar();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al cambiar el estado del tipo de servicio'));
    }
  };

  const handleBaja = async (servicio: ActividadServicioDTO) => {
    try {
      await actividadApi.bajaServicio(servicio.id);
      message.success('Tipo de servicio desactivado');
      recargar();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al desactivar el tipo de servicio'));
    }
  };

  const columnas = [
    {
      title: 'Color',
      key: 'color',
      width: 80,
      render: (_: unknown, servicio: ActividadServicioDTO) => (
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 18,
            height: 18,
            borderRadius: 4,
            background: servicio.color ?? COLOR_POR_DEFECTO,
            border: '1px solid rgba(0,0,0,0.15)',
          }}
        />
      ),
    },
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Orden', dataIndex: 'orden', key: 'orden', width: 90 },
    {
      title: 'Estado',
      key: 'activo',
      width: 110,
      render: (_: unknown, servicio: ActividadServicioDTO) =>
        servicio.activo ? <Tag color="success">Activo</Tag> : <Tag>Inactivo</Tag>,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 200,
      render: (_: unknown, servicio: ActividadServicioDTO) => (
        <Space size={4}>
          <Button size="small" onClick={() => abrirEdicion(servicio)}>
            Editar
          </Button>
          {servicio.activo ? (
            <Button size="small" danger onClick={() => handleBaja(servicio)}>
              Desactivar
            </Button>
          ) : (
            <Button size="small" onClick={() => handleAlternarActivo(servicio)}>
              Reactivar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Tipos de servicio
          </Typography.Title>
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
            Nuevo tipo de servicio
          </Button>
          <Button icon={<ReloadOutlined />} onClick={recargar} aria-label="Recargar" />
        </div>
      </div>

      {error ? (
        <div style={{ padding: 16 }}>
          <Typography.Text type="danger">{error}</Typography.Text>
        </div>
      ) : (
        <Table
          className="paces-border-top paces-list-table"
          rowKey="id"
          loading={cargando}
          dataSource={servicios}
          columns={columnas}
          pagination={{ showTotal: (t) => `${t} registros` }}
        />
      )}

      <Modal
        title={editando ? 'Editar tipo de servicio' : 'Nuevo tipo de servicio'}
        open={modalAbierto}
        onOk={handleGuardar}
        onCancel={() => setModalAbierto(false)}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        width={480}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" size="small" disabled={guardando}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
            <Input placeholder="Mantenimiento" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="codigo"
            label="Código"
            extra="Opcional. Si lo dejas vacío se genera del nombre."
          >
            <Input placeholder="MANT" maxLength={20} />
          </Form.Item>

          <Form.Item name="color" label="Color" extra="Se usa para pintar las tarjetas en el calendario.">
            <ColorPicker showText format="hex" />
          </Form.Item>

          <Form.Item name="orden" label="Orden" extra="Si lo dejas en 0 el tipo se agrega al final.">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {editando && (
            <Form.Item
              name="activo"
              label="Activo"
              valuePropName="checked"
              extra="Un tipo inactivo no aparece en el selector del formulario, pero las actividades viejas lo conservan."
            >
              <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}
