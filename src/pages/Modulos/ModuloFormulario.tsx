import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, InputNumber, Modal, Row, Switch, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { SelectorIconoModulo } from '../../components/SelectorIconoModulo';
import { moduloApi } from '../../api/moduloApi';
import { obtenerIconoModulo } from '../../utils/iconosModulo';
import { toTitleCase } from '../../utils/formats';

const ModuloFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('Mmodulo');

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [modulo, setModulo] = useState<{ id: number; nombre: string; icono?: string | null } | null>(null);
  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = id && id !== 'nuevo' ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nuevo Módulo' : 'Editar Módulo');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  const cargar = useCallback(async () => {
    if (sucursalActiva === undefined) return;

    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    try {
      if (modo === 'crear') {
        setModulo(null);
        form.resetFields();
        return;
      }

      const modulos = await moduloApi.obtenerTodo(sucursalActiva);
      const encontrado = modulos.find((m) => m.id === Number(id));

      if (!encontrado) {
        setErrorCarga(true);
        setMensajeError('El módulo no existe.');
        return;
      }

      setModulo({ id: encontrado.id, nombre: encontrado.nombre, icono: encontrado.icono });
      form.setFieldsValue({
        codigo: encontrado.codigo || '',
        nombre: encontrado.nombre,
        orden: encontrado.orden,
        icono: encontrado.icono || undefined,
        oculto: !!encontrado.oculto,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(err?.response?.data?.errorMessage || 'Error al cargar el módulo');
    } finally {
      setLoading(false);
    }
  }, [id, modo, sucursalActiva, form]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const iconoIngresado = Form.useWatch('icono', form);
  const nombreIngresado = Form.useWatch('nombre', form);

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();

      if (modo === 'crear') {
        const result = await moduloApi.crear(sucursalActiva, values);
        message.success('Módulo creado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Mmodulo/${result.id}`, { replace: true });
      } else {
        await moduloApi.actualizar(sucursalActiva, Number(id), values);
        message.success('Módulo actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/Mmodulo/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Salir',
      cancelText: 'Seguir editando',
      onOk: () => {
        navigationConfirmedRef.current = true;
        navigate('/Mmodulo', { replace: true });
      },
    });
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/Mmodulo"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando módulo...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar el módulo'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!modulo}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onVolver={handleCancelar}
    >
      <Form form={form} layout="vertical" size="small" disabled={guardando}>
        <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[
                  { required: true, message: 'El código es obligatorio' },
                  { max: 30, message: 'Máximo 30 caracteres' },
                ]}
              >
                <Input placeholder="Ej: CONTAB" maxLength={30} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item
                name="nombre"
                label="Nombre del módulo"
                rules={[
                  { required: true, message: 'El nombre es requerido' },
                  { max: 120, message: 'Máximo 120 caracteres' },
                ]}
              >
                <Input placeholder="Ej: Contabilidad" maxLength={120} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Form.Item
                name="orden"
                label="Orden"
                rules={[{ required: true, message: 'El orden es requerido' }]}
              >
                <InputNumber min={0} max={999} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="icono"
                label="Icono del sidebar"
                tooltip="Es el icono que se muestra junto al nombre del módulo en el menú lateral. Si se deja vacío se usa el icono por defecto."
              >
                <SelectorIconoModulo />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="oculto" label="Ocultar del sidebar" valuePropName="checked">
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} lg={8}>
              <Form.Item label="Vista previa en el menú">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 12px',
                    borderRadius: 4,
                    background: '#001529',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  {obtenerIconoModulo({ nombre: nombreIngresado, icono: iconoIngresado })}
                  <span className="menu-module-label">{toTitleCase(nombreIngresado || '') || 'Nombre del módulo'}</span>
                </span>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default ModuloFormulario;