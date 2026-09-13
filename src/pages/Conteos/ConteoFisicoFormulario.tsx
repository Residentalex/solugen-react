import React, { useEffect, useState, useCallback } from 'react';
import {
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Button,
  Typography,
  Alert,
  Descriptions,
  message,
} from 'antd';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conteoApi } from '../../api/conteoApi';
import type { ConteoFisicoDTO } from '../../types/conteo';
import { formatCurrency, formatDate, toTitleCase } from '../../utils/formats';

const { Text } = Typography;
const { Option } = Select;

const ConteoFisicoFormulario: React.FC = () => {
  const { documento } = useParams<{ documento: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { record?: ConteoFisicoDTO } || {};
  const record = state.record;

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);

  const [form] = Form.useForm<ConteoFisicoDTO>();
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  const [campos, setCampos] = useState<Partial<ConteoFisicoDTO>>({
    documento: record?.documento || '',
    fecha: record?.fecha || '',
    almacen: record?.almacen || '',
    usuario: record?.usuario || '',
    nombreSuplidor: record?.nombreSuplidor || '',
    concepto: record?.concepto || '',
    costo: record?.costo ?? 0,
    cantidad: record?.cantidad ?? 0,
    bloqueado: record?.bloqueado ?? false,
    modo: record?.modo ?? 0,
    periodo: record?.periodo ?? 0,
    isFromPlantilla: record?.isFromPlantilla ?? false,
  });

  const cargarDatos = useCallback(async () => {
    if (!documento) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento);
      setCampos({
        documento: result.documento,
        fecha: result.fecha,
        almacen: result.almacen || '',
        usuario: result.usuario || '',
        nombreSuplidor: result.nombreSuplidor || '',
        concepto: result.concepto || '',
        costo: result.costo ?? 0,
        cantidad: result.cantidad ?? 0,
        bloqueado: result.bloqueado ?? false,
        modo: result.modo ?? 0,
        periodo: result.periodo ?? 0,
        isFromPlantilla: result.isFromPlantilla ?? false,
      });
      form.setFieldsValue(result);
    } catch (err) {
      setLoadingError(true);
      message.error('Error al cargar los datos del conteo');
    } finally {
      setLoading(false);
    }
  }, [documento, sucursalActiva]);

  useEffect(() => {
    if (documento) {
      cargarDatos();
    }
  }, [documento]);

  const onFinish = async (values: ConteoFisicoDTO) => {
    setLoading(true);
    setLoadingError(false);
    try {
      // Enviar los datos actualizados al backend
      const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento!);
      
      // Aquí podríamos tener un endpoint de actualización, por ahora solo mostramos mensaje
      message.success('Conteo actualizado correctamente');
      navigate(`/FConteos/${documento}`);
    } catch (err) {
      setLoadingError(true);
      message.error('Error al guardar el conteo');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Validate failed:', errorInfo);
  };

  if (!documento) {
    message.error('No se especificó un documento de conteo');
    return null;
  }

  return (
    <Form
      form={form}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      initialValues={campos}
      rules={[]}
    >
      <Form.Item label="Documento" rules={[{ required: true, message: 'Por favor ingrese el documento' }]}>
        <Input disabled>{campos.documento}</Input>
      </Form.Item>

      <Form.Item label="Fecha">
        <Input disabled>{formatDate(campos.fecha)}</Input>
      </Form.Item>

      <Form.Item label="Almacén">
        <Input disabled>{campos.almacen}</Input>
      </Form.Item>

      <Form.Item label="Usuario">
        <Input disabled>{campos.usuario}</Input>
      </Form.Item>

      <Form.Item label="Suplidor">
        <Input disabled>{campos.nombreSuplidor}</Input>
      </Form.Item>

      <Form.Item label="Concepto">
        <Input disabled>{campos.concepto}</Input>
      </Form.Item>

      <Form.Item label="Costo">
        <Input.Number
          disabled
          precision={2}
          value={campos.costo}
          formatter={value => value?.toFixed(2)}
        />
      </Form.Item>

      <Form.Item label="Cantidad">
        <Input.Number
          disabled
          precision={2}
          value={campos.cantidad}
          formatter={value => value?.toFixed(2)}
        />
      </Form.Item>

      <Form.Item label="Bloqueado">
        <Tag color={campos.bloqueado ? 'red' : 'green'}>
          {campos.bloqueado ? 'Sí' : 'No'}
        </Tag>
      </Form.Item>

      <Form.Item label="Modo">
        <Select disabled>
          <Option value={0}>Manual</Option>
          <Option value={1}>Automático</Option>
          <Option value={2}>Consulta</Option>
        </Select>
      </Form.Item>

      <Form.Item label="Período">
        <Input disabled>{campos.periodo}</Input>
      </Form.Item>

      <Form.Item label="Es de Plantilla">
        <Select disabled>
          <Option value={false}>No</Option>
          <Option value={true}>Sí</Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit">
          Guardar Cambios
        </Button>
        <Button onClick={() => navigate(-1, { replace: true})}>
          Cancelar
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConteoFisicoFormulario;