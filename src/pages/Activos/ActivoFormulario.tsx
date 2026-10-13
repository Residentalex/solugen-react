import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Switch,
  message,
} from 'antd';
import { Select } from '../../components/Select';
import { ExclamationCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import PermissionGate from '../../components/PermissionGate';
import { activoApi } from '../../api/activoApi';
import type { ActivoDTO, ActivoCatalogosDTO, CrearActivoRequest } from '../../types/activo';
import { crearFormatterMoneda, crearParserMoneda, toTitleCase } from '../../utils/formats';

const ActivoFormulario: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('mActivos');

  const [form] = Form.useForm();
  const [data, setData] = useState<ActivoDTO | null>(null);
  const [catalogos, setCatalogos] = useState<ActivoCatalogosDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = id ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nuevo Activo Fijo' : 'Editar Activo Fijo');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    activoApi
      .catalogos()
      .then((res) => setCatalogos(res))
      .catch((err: any) =>
        message.error(err?.response?.data?.errorMessage || 'Error al cargar los catálogos de activos')
      );

    try {
      if (modo === 'crear') {
        setData(null);
        form.setFieldsValue({ fechaAdq: dayjs() });
        return;
      }

      if (!id) {
        setErrorCarga(true);
        setMensajeError('El identificador del activo es inválido.');
        return;
      }

      const activo = await activoApi.obtenerPorId(id);

      if (!activo) {
        setErrorCarga(true);
        setMensajeError('El activo no existe.');
        return;
      }

      setData(activo);
      setPageTitleOverride(`${activo.codigo || ''} - ${toTitleCase(activo.descripcion || '')}`);
      form.setFieldsValue({
        codigo: activo.codigo || '',
        descripcion: activo.descripcion || '',
        fechaAdq: activo.fechaAdq ? dayjs(activo.fechaAdq) : dayjs(),
        clasific: activo.clasific || undefined,
        tipo: activo.tipo || undefined,
        ubicacion: activo.ubicacion || undefined,
        noSerie: activo.noSerie || '',
        referencia: activo.referencia || '',
        documento: activo.documento || '',
        edificio: !!activo.edificio,
        noGenDepr: !!activo.noGenDepr,
        ctaActivo: activo.ctaActivo || '',
        ctaGasto: activo.ctaGasto || '',
        ctaDeprAcum: activo.ctaDeprAcum || '',
        vidaUtil: activo.vidaUtil ?? 0,
        tasa: activo.tasa ?? 0,
        valorAdq: activo.valorAdq ?? 0,
        ajustes: activo.ajustes ?? 0,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(err?.response?.data?.errorMessage || 'Error al cargar el activo');
    } finally {
      setLoading(false);
    }
  }, [id, modo, form, setPageTitleOverride]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();

      const payload: CrearActivoRequest = {
        codigo: modo === 'editar' ? (data?.codigo ?? '') : (values.codigo ?? '').trim(),
        descripcion: (values.descripcion ?? '').trim(),
        fechaAdq: values.fechaAdq
          ? values.fechaAdq.format('YYYY-MM-DDTHH:mm:ss')
          : dayjs().format('YYYY-MM-DDTHH:mm:ss'),
        clasific: values.clasific || '',
        tipo: values.tipo || '',
        ubicacion: values.ubicacion || '',
        noSerie: (values.noSerie ?? '').trim(),
        referencia: (values.referencia ?? '').trim(),
        documento: (values.documento ?? '').trim(),
        edificio: !!values.edificio,
        noGenDepr: !!values.noGenDepr,
        ctaActivo: (values.ctaActivo ?? '').trim(),
        ctaGasto: (values.ctaGasto ?? '').trim(),
        ctaDeprAcum: (values.ctaDeprAcum ?? '').trim(),
        vidaUtil: Number(values.vidaUtil ?? 0),
        tasa: Number(values.tasa ?? 0),
        valorAdq: Number(values.valorAdq ?? 0),
        ajustes: Number(values.ajustes ?? 0),
      };

      if (modo === 'crear') {
        await activoApi.crear(payload);
        message.success('Activo fijo creado correctamente');
      } else {
        await activoApi.actualizar(id!, payload);
        message.success('Activo fijo actualizado correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/mactivos', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar el activo');
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleVolver = () => {
    if (guardando) return;
    navigationConfirmedRef.current = true;
    navigate('/mactivos', { replace: true });
  };

  const handleRetirar = () => {
    if (!id || guardandoRef.current) return;
    Modal.confirm({
      title: 'Retirar activo',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea retirar este activo fijo? Dejará de estar activo en el sistema.',
      okText: 'Sí, retirar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await activoApi.eliminar(id);
          message.success('Activo retirado correctamente');
          navigationConfirmedRef.current = true;
          navigate('/mactivos', { replace: true });
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al retirar el activo');
        }
      },
    });
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/mactivos"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando activo...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de activo'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!data}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onVolver={handleVolver}
      extraActions={
        modo === 'editar' && data && !data.retirado ? (
          <PermissionGate accion="ANULAR">
            <Button danger icon={<StopOutlined />} onClick={handleRetirar} disabled={guardando}>
              Retirar
            </Button>
          </PermissionGate>
        ) : null
      }
    >
      <Form form={form} layout="vertical" size="small" disabled={guardando}>
        <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[
                  { required: true, message: 'El código es obligatorio' },
                  { max: 20, message: 'Máximo 20 caracteres' },
                ]}
              >
                <Input placeholder="Ej: ACT-0001" maxLength={20} disabled={modo === 'editar'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={16}>
              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[
                  { required: true, message: 'La descripción es obligatoria' },
                  { max: 100, message: 'Máximo 100 caracteres' },
                ]}
              >
                <Input placeholder="Ej: Camioneta Toyota Hilux" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="fechaAdq"
                label="Fecha Adquisición"
                rules={[{ required: true, message: 'La fecha de adquisición es obligatoria' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="clasific" label="Clasificación">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione la clasificación"
                  options={(catalogos?.clasificaciones ?? []).map((c) => ({
                    value: c.codigo,
                    label: `${c.codigo} - ${toTitleCase(c.descripcion)}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="tipo" label="Tipo">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione el tipo"
                  options={(catalogos?.tipos ?? []).map((c) => ({
                    value: c.codigo,
                    label: `${c.codigo} - ${toTitleCase(c.descripcion)}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="ubicacion" label="Ubicación">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione la ubicación"
                  options={(catalogos?.ubicaciones ?? []).map((c) => ({
                    value: c.codigo,
                    label: `${c.codigo} - ${toTitleCase(c.descripcion)}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="noSerie" label="No. Serie" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input placeholder="Número de serie" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="referencia" label="Referencia" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input placeholder="Referencia" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="documento" label="Documento" rules={[{ max: 10, message: 'Máximo 10 caracteres' }]}>
                <Input placeholder="Documento de adquisición" maxLength={10} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="edificio" label="Edificio" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="noGenDepr" label="No Generar Depreciación" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Contable y Depreciación" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="ctaActivo" label="Cuenta Activo" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input placeholder="Cuenta de activo" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="ctaGasto" label="Cuenta Gasto" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input placeholder="Cuenta de gasto" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="ctaDeprAcum" label="Cuenta Dep. Acumulada" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input placeholder="Cuenta de depreciación acumulada" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="vidaUtil" label="Vida Útil">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="tasa" label="Tasa">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="valorAdq" label="Valor Adquisición">
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item name="ajustes" label="Ajustes">
                <InputNumber
                  min={0}
                  step={0.01}
                  style={{ width: '100%' }}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Dep. Acumulada">
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  value={data?.deprAcum ?? 0}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Dep. Mensual">
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  value={data?.deprMens ?? 0}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Periodo Dep.">
                <InputNumber style={{ width: '100%' }} disabled value={data?.periodDep ?? 0} precision={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Depre. Acum. V">
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  value={data?.depreAcumV ?? 0}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label="Depr. Mens. V">
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  value={data?.deprMensV ?? 0}
                  formatter={crearFormatterMoneda()}
                  parser={crearParserMoneda()}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default ActivoFormulario;
