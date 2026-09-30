import { useEffect, useState } from 'react';
import { Button, DatePicker, Drawer, Form, Input, Select, Space } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ESTADOS_ACTIVIDAD } from '../../../types/actividad';
import type {
  ActividadDTO,
  ActividadServicioDTO,
  CrearActividadRequest,
} from '../../../types/actividad';
import type { UsuarioDTO } from '../../../types/administracion';

interface FormularioActividadValues {
  titulo: string;
  descripcion?: string;
  estado: string;
  servicioId?: number;
  responsableId?: number;
  clienteCodigo?: string;
  clienteNombre?: string;
  fechaInicio?: Dayjs | null;
  fechaFin?: Dayjs | null;
}

interface DrawerFormularioActividadProps {
  abierto: boolean;
  editar: ActividadDTO | null;
  servicios: ActividadServicioDTO[];
  usuarios: UsuarioDTO[];
  // La sucursal no se elige: viaja oculta desde la sucursal activa del
  // usuario, porque SUCURSAL_ID es NOT NULL con FK a AUTH_SUCURSAL.
  sucursalActiva: number;
  onGuardar: (request: CrearActividadRequest) => Promise<void>;
  onCancelar: () => void;
}

export default function DrawerFormularioActividad(props: DrawerFormularioActividadProps) {
  const { abierto, editar, servicios, usuarios, sucursalActiva, onGuardar, onCancelar } = props;

  const [form] = Form.useForm<FormularioActividadValues>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    if (editar) {
      form.setFieldsValue({
        titulo: editar.titulo,
        descripcion: editar.descripcion ?? '',
        estado: editar.estado,
        servicioId: editar.servicioId ?? undefined,
        responsableId: editar.responsableId ?? undefined,
        clienteCodigo: editar.clienteCodigo ?? '',
        clienteNombre: editar.clienteNombre ?? '',
        fechaInicio: editar.fechaInicio ? dayjs(editar.fechaInicio) : null,
        fechaFin: editar.fechaFin ? dayjs(editar.fechaFin) : null,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ estado: 'Pendiente' });
    }
  }, [abierto, editar, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const request: CrearActividadRequest = {
        titulo: values.titulo,
        descripcion: values.descripcion || '',
        estado: values.estado || 'Pendiente',
        servicioId: values.servicioId ?? 0,
        responsableId: values.responsableId ?? 0,
        clienteCodigo: values.clienteCodigo || '',
        clienteNombre: values.clienteNombre || '',
        // El backend recibe DateTime en el cuerpo; se envia ISO.
        fechaInicio: values.fechaInicio ? values.fechaInicio.format('YYYY-MM-DDTHH:mm:ss') : '',
        fechaFin: values.fechaFin ? values.fechaFin.format('YYYY-MM-DDTHH:mm:ss') : null,
        sucursalId: sucursalActiva,
      };
      setGuardando(true);
      await onGuardar(request);
      form.resetFields();
      onCancelar();
    } catch (err) {
      // Error de validacion del formulario: AntD ya muestra los mensajes por campo.
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      // Error de API: ya fue notificado por el handler de la pagina.
    } finally {
      setGuardando(false);
    }
  };

  const serviciosActivos = servicios.filter((servicio) => servicio.activo);

  return (
    <Drawer
      title={editar ? 'Editar actividad' : 'Nueva actividad'}
      open={abierto}
      onClose={onCancelar}
      width={480}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="primary" onClick={handleOk} loading={guardando}>
            Guardar
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" size="small" disabled={guardando}>
        <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'El título es obligatorio' }]}>
          <Input placeholder="Título de la actividad" maxLength={200} />
        </Form.Item>

        <Form.Item name="descripcion" label="Descripción">
          <Input.TextArea rows={3} placeholder="Descripción opcional" />
        </Form.Item>

        <Form.Item name="estado" label="Estado" initialValue="Pendiente">
          <Select
            options={ESTADOS_ACTIVIDAD.map((estado) => ({ value: estado, label: estado }))}
          />
        </Form.Item>

        <Form.Item name="servicioId" label="Servicio">
          <Select
            allowClear
            placeholder="Seleccionar servicio"
            showSearch
            optionFilterProp="label"
            options={serviciosActivos.map((servicio) => ({ value: servicio.id, label: servicio.nombre }))}
          />
        </Form.Item>

        <Form.Item name="responsableId" label="Responsable">
          <Select
            allowClear
            placeholder="Seleccionar responsable"
            showSearch
            optionFilterProp="label"
            options={usuarios
              .filter((usuario) => usuario.activo)
              .map((usuario) => ({ value: usuario.id, label: `${usuario.nombre} (${usuario.nombreUsuario})` }))}
          />
        </Form.Item>

        <Form.Item name="clienteCodigo" label="Código de cliente">
          <Input placeholder="Código opcional" />
        </Form.Item>

        <Form.Item name="clienteNombre" label="Nombre de cliente">
          <Input placeholder="Nombre opcional" />
        </Form.Item>

        <Form.Item
          name="fechaInicio"
          label="Fecha de inicio"
          rules={[{ required: true, message: 'La fecha de inicio es obligatoria' }]}
        >
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Seleccionar inicio" />
        </Form.Item>

        <Form.Item name="fechaFin" label="Fecha de fin (opcional)">
          <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} placeholder="Opcional" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
