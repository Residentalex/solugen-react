import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, Modal, Row, Switch, message } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { sucursalApi } from '../../api/sucursalApi';
import type { SucursalCatalogoDTO } from '../../types/sucursal';
import { toTitleCase } from '../../utils/formats';

const mensajeDeError = (err: any, fallback: string): string =>
  typeof err?.response?.data === 'string'
    ? err.response.data
    : err?.response?.data?.errorMessage || fallback;

const SucursalFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MSucursal');

  const [form] = Form.useForm();
  const [sucursal, setSucursal] = useState<SucursalCatalogoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = codigo ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nueva Sucursal' : 'Editar Sucursal');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    try {
      if (!codigo) {
        setSucursal(null);
        form.resetFields();
        return;
      }

      const datos = await sucursalApi.obtenerPorCodigo(codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('La sucursal no existe.');
        return;
      }

      setSucursal(datos);
      setPageTitleOverride(`Editando: ${datos.codigo || codigo} - ${toTitleCase(datos.nombre || '')}`);
      form.setFieldsValue({
        codigo: datos.codigo || codigo || '',
        nombre: datos.nombre || '',
        direccion: datos.direccion || '',
        gerente: datos.gerente || '',
        codalm: datos.codalm || '',
        valseg: datos.valseg || '',
        codger: datos.codger || '',
        activo: datos.activo ?? true,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeDeError(err, 'Error al cargar la sucursal'));
    } finally {
      setLoading(false);
    }
  }, [codigo, form, setPageTitleOverride]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();

      const payload = {
        codigo: values.codigo?.trim(),
        nombre: values.nombre?.trim(),
        direccion: values.direccion?.trim() || '',
        gerente: values.gerente?.trim() || '',
        codalm: values.codalm?.trim() || '',
        valseg: values.valseg?.trim() || '',
        codger: values.codger?.trim() || '',
        activo: values.activo ?? true,
      };

      if (modo === 'crear') {
        await sucursalApi.crear(payload);
        message.success('Sucursal creada correctamente');
      } else {
        await sucursalApi.actualizar(codigo!, payload);
        message.success('Sucursal actualizada correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MSucursal', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeDeError(err, 'Error al guardar la sucursal'));
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleEliminar = () => {
    if (guardandoRef.current || eliminando) return;
    Modal.confirm({
      title: 'Eliminar Sucursal',
      content: `¿Está seguro que desea eliminar la sucursal "${sucursal?.nombre || codigo}"?`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (guardandoRef.current) return;
        guardandoRef.current = true;
        setEliminando(true);
        try {
          await sucursalApi.eliminar(codigo!);
          message.success('Sucursal eliminada correctamente');
          navigationConfirmedRef.current = true;
          navigate('/MSucursal', { replace: true });
        } catch (err: any) {
          message.error(mensajeDeError(err, 'Error al eliminar la sucursal'));
        } finally {
          guardandoRef.current = false;
          setEliminando(false);
        }
      },
    });
  };

  const handleVolver = () => {
    if (guardando || eliminando) return;
    navigationConfirmedRef.current = true;
    navigate('/MSucursal', { replace: true });
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MSucursal"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando sucursal...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de sucursal'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!sucursal}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onEliminar={modo === 'editar' ? handleEliminar : undefined}
      eliminando={eliminando}
      onVolver={handleVolver}
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
        style={{ marginBottom: 16 }}
        disabled={guardando || eliminando}
        initialValues={{ activo: true }}
      >
        <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[
                  { required: true, message: 'El código es obligatorio' },
                  { max: 10, message: 'Máximo 10 caracteres' },
                ]}
              >
                <Input placeholder="Ej: 001" maxLength={10} disabled={modo === 'editar'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={16}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[
                  { required: true, message: 'El nombre es obligatorio' },
                  { max: 40, message: 'Máximo 40 caracteres' },
                ]}
              >
                <Input placeholder="Ej: Sucursal Centro" maxLength={40} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item
                name="direccion"
                label="Dirección"
                rules={[{ max: 60, message: 'Máximo 60 caracteres' }]}
              >
                <Input placeholder="Dirección" maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item
                name="gerente"
                label="Gerente"
                rules={[{ max: 40, message: 'Máximo 40 caracteres' }]}
              >
                <Input placeholder="Nombre del gerente" maxLength={40} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codalm"
                label="Almacén"
                rules={[{ max: 10, message: 'Máximo 10 caracteres' }]}
              >
                <Input placeholder="Almacén" maxLength={10} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="valseg"
                label="Valseg"
                rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}
              >
                <Input placeholder="Valseg" maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codger"
                label="Código Gerente"
                rules={[{ max: 10, message: 'Máximo 10 caracteres' }]}
              >
                <Input placeholder="Código gerente" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="activo" label="Activo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default SucursalFormulario;
