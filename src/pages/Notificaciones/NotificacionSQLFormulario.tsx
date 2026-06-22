import React, { useEffect, useState } from 'react';
import {
  Modal, Form, Input, Select, InputNumber, Switch, Button, Row, Col, message, Space,
} from 'antd';
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { notificacionesApi } from '../../api/notificacionesApi';
import { useCompanyStore } from '../../stores/companyStore';
import type { NotificacionSQLConfig, NotificacionSQLRequest } from '../../types/notificaciones';

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

interface NotificacionSQLFormularioProps {
  visible: boolean;
  editando: NotificacionSQLConfig | null;
  onClose: () => void;
  onGuardado: () => void;
}

interface DestinoFormValue {
  destinoTipo: string;
  destinoID: number | undefined;
}

interface FormValues {
  nombre: string;
  sqlConsulta: string;
  sucursalIDs?: string;
  columnaTitulo?: string;
  columnaMensaje?: string;
  tipo: string;
  activo: boolean;
  intervaloMinutos: number;
  destinos: DestinoFormValue[];
}

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

const NotificacionSQLFormulario: React.FC<NotificacionSQLFormularioProps> = ({
  visible, editando, onClose, onGuardado,
}) => {
  const [form] = Form.useForm<FormValues>();
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState<string[]>([]);

  const sucursalesData = useCompanyStore((s) => s.data.sucursales);
  const SUCURSALES_OPCIONES = (sucursalesData || [])
    .filter((s: any) => s.sucursal >= 0 && s.sucursal <= 3)
    .map((s: any) => ({ label: s.nombre, value: String(s.sucursal) }));

  useEffect(() => {
    if (visible) {
      cargarUsuarios();
      cargarRoles();

      if (editando) {
        form.setFieldsValue({
          nombre: editando.nombre,
          sqlConsulta: editando.sqlConsulta,
          sucursalIDs: editando.sucursalIDs,
          columnaTitulo: editando.columnaTitulo,
          columnaMensaje: editando.columnaMensaje,
          tipo: editando.tipo,
          activo: editando.activo,
          intervaloMinutos: editando.intervaloMinutos,
          destinos: (editando.destinos || []).map((d) => ({
            destinoTipo: d.destinoTipo,
            destinoID: d.destinoID,
          })),
        });
        setSucursalesSeleccionadas(editando.sucursalIDs?.split(',').filter(Boolean) || []);
      } else {
        form.resetFields();
        form.setFieldsValue({ activo: true, tipo: 'Info', intervaloMinutos: 5, destinos: [] });
        setSucursalesSeleccionadas([]);
      }
    }
  }, [visible, editando, form]);

  const cargarUsuarios = async () => {
    try {
      const data = await notificacionesApi.obtenerUsuarios();
      setUsuarios(data || []);
    } catch {
      // Silencioso
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

  const handleProbar = async () => {
    const sql = form.getFieldValue('sqlConsulta');
    if (!sql?.trim()) {
      message.warning('Escriba una consulta SQL primero');
      return;
    }
    setProbando(true);
    try {
      const result = editando
        ? await notificacionesApi.probarSQLConfig(editando.id)
        : await notificacionesApi.probarSQLDirecto(sql);
      message.success(`Consulta ejecutada: ${result.total} filas obtenidas`);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al ejecutar la consulta SQL');
    } finally {
      setProbando(false);
    }
  };

  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!values.nombre?.trim()) return 'El nombre es obligatorio';
    if (!values.sqlConsulta?.trim()) return 'La consulta SQL es obligatoria';
    if (!values.tipo) return 'El tipo es obligatorio';
    if (!values.intervaloMinutos || values.intervaloMinutos < 1) return 'El intervalo debe ser mayor a 0';
    if (sucursalesSeleccionadas.length === 0) return 'Seleccione al menos una sucursal destino';
    if (!values.destinos || values.destinos.length === 0) return 'Debe agregar al menos un destinatario';
    return null;
  };

  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setGuardando(true);
    try {
      const values = form.getFieldsValue();
      const req: NotificacionSQLRequest = {
        nombre: values.nombre.trim(),
        sqlConsulta: values.sqlConsulta.trim(),
        sucursalIDs: values.sucursalIDs || undefined,
        columnaTitulo: values.columnaTitulo?.trim() || undefined,
        columnaMensaje: values.columnaMensaje?.trim() || undefined,
        tipo: values.tipo,
        activo: values.activo,
        intervaloMinutos: values.intervaloMinutos,
        destinos: (values.destinos || []).map((d) => ({
          destinoTipo: d.destinoTipo,
          destinoID: d.destinoID!,
        })),
      };

      if (editando) {
        await notificacionesApi.actualizarSQLConfig(editando.id, req);
        message.success('Configuración actualizada correctamente');
      } else {
        await notificacionesApi.crearSQLConfig(req);
        message.success('Configuración creada correctamente');
      }
      onGuardado();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title={editando ? 'Editar configuración SQL' : 'Nueva configuración SQL'}
      open={visible}
      onCancel={onClose}
      onOk={handleGuardar}
      confirmLoading={guardando}
      okText="Guardar"
      cancelText="Cancelar"
      width={800}
      footer={(_, { OkBtn, CancelBtn }) => (
        <Space>
          <CancelBtn />
          {editando && (
            <Button
              icon={<PlayCircleOutlined />}
              onClick={handleProbar}
              loading={probando}
            >
              Probar SQL
            </Button>
          )}
          <OkBtn />
        </Space>
      )}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
              <Input placeholder="Ej: Productos con stock bajo" maxLength={200} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: 'Obligatorio' }]}>
              <Select placeholder="Seleccione tipo" options={TIPOS_OPCIONES} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="intervaloMinutos" label="Intervalo (minutos)" rules={[{ required: true, message: 'Obligatorio' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Sucursales destino" required>
          <Select
            mode="multiple"
            placeholder="¿En qué sucursal(es) ejecutar?"
            options={SUCURSALES_OPCIONES}
            value={sucursalesSeleccionadas}
            onChange={(values: string[]) => {
              setSucursalesSeleccionadas(values);
              form.setFieldValue('sucursalIDs', values.join(','));
            }}
          />
        </Form.Item>

        <Form.Item name="sqlConsulta" label="Consulta SQL" rules={[{ required: true, message: 'Obligatorio' }]}>
          <Input.TextArea
            placeholder="SELECT id, nombre, stock FROM Productos WHERE stock <= 5"
            rows={8}
            style={{ fontFamily: 'Consolas, monospace', fontSize: 13 }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="columnaTitulo" label="Columna Título">
              <Input placeholder="Ej: nombre" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="columnaMensaje" label="Columna Mensaje">
              <Input placeholder="Ej: stock" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="activo" label="Activo" valuePropName="checked">
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
  );
};

export default NotificacionSQLFormulario;
