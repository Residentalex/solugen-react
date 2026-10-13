import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, DatePicker, Form, Input, Row,  message } from 'antd';
import { Select } from '../../components/Select';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { almacenApi } from '../../api/almacenApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';
import type { AlmacenDTO } from '../../types/entradaAlmacen';
import { toTitleCase } from '../../utils/formats';

const AlmacenFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MAlmacen');

  const [form] = Form.useForm();
  const [almacen, setAlmacen] = useState<AlmacenDTO | null>(null);
  const [cuentas, setCuentas] = useState<CuentaContableResumenDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = codigo ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nuevo Almacén' : 'Editar Almacén');

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

    cuentaContableApi
      .obtenerListado(sucursalActiva)
      .then((listado) => setCuentas(listado || []))
      .catch((err: any) =>
        message.error(err?.response?.data?.errorMessage || 'Error al cargar el catálogo de cuentas')
      );

    try {
      if (!codigo) {
        setAlmacen(null);
        form.resetFields();
        return;
      }

      const datos = await almacenApi.obtenerPorCodigo(sucursalActiva, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('El almacén no existe en esta sucursal.');
        return;
      }

      setAlmacen(datos);
      setPageTitleOverride(`Editando: ${datos.idExterno || datos.codigo} - ${toTitleCase(datos.nombre || '')}`);
      form.setFieldsValue({
        codigo: datos.idExterno || datos.codigo || '',
        nombre: datos.nombre || '',
        numeroCuenta: datos.numeroCuenta || undefined,
        fechaInicial: datos.fechaInicial ? dayjs(datos.fechaInicial) : null,
        fechaCierre: datos.fechaCierre ? dayjs(datos.fechaCierre) : null,
        contacto: datos.contacto || '',
        telefono: datos.telefono || '',
        direccion: datos.direccion || '',
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(err?.response?.data?.errorMessage || 'Error al cargar el almacén');
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalActiva, form, setPageTitleOverride]);

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
        nombre: values.nombre?.trim(),
        numeroCuenta: values.numeroCuenta || '',
        fechaInicial: values.fechaInicial ? values.fechaInicial.format('YYYY-MM-DD') : null,
        fechaCierre: values.fechaCierre ? values.fechaCierre.format('YYYY-MM-DD') : null,
        contacto: values.contacto?.trim() || '',
        telefono: values.telefono?.trim() || '',
        direccion: values.direccion?.trim() || '',
      };

      if (modo === 'crear') {
        await almacenApi.crear(sucursalActiva, { ...payload, idExterno: values.codigo?.trim() });
        message.success('Almacén creado correctamente');
      } else {
        await almacenApi.actualizar(sucursalActiva, codigo!, payload);
        message.success('Almacén actualizado correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MAlmacen', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar el almacén');
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleVolver = () => {
    if (guardando) return;
    navigationConfirmedRef.current = true;
    navigate('/MAlmacen', { replace: true });
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MAlmacen"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando almacén...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de almacén'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!almacen}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onVolver={handleVolver}
    >
      <Form form={form} layout="vertical" size="small" style={{ marginBottom: 16 }} disabled={guardando}>
        <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codigo"
                label="Código"
                tooltip={modo === 'editar' ? 'El código identifica al almacén en todos los documentos y no se puede modificar.' : undefined}
                rules={
                  modo === 'crear'
                    ? [
                        { required: true, message: 'El código es obligatorio' },
                        { max: 10, message: 'Máximo 10 caracteres' },
                      ]
                    : []
                }
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
                  { max: 60, message: 'Máximo 60 caracteres' },
                ]}
              >
                <Input placeholder="Ej: Almacén Principal Orense Plaza" maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={24} lg={16}>
              <Form.Item name="numeroCuenta" label="Cuenta Contable">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione la cuenta contable"
                  options={cuentas.map((c) => ({
                    value: c.noCuenta,
                    label: `${c.noCuenta} - ${c.nombre}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item name="fechaInicial" label="Fecha Inicial">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <Form.Item name="fechaCierre" label="Fecha Cierre">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="contacto" label="Contacto" rules={[{ max: 40, message: 'Máximo 40 caracteres' }]}>
                <Input placeholder="Ej: Encargado de inventario" maxLength={40} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="telefono" label="Teléfono" rules={[{ max: 13, message: 'Máximo 13 caracteres' }]}>
                <Input placeholder="Ej: 809-000-0000" maxLength={13} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="direccion" label="Dirección" rules={[{ max: 80, message: 'Máximo 80 caracteres' }]}>
                <Input placeholder="Ej: 4to nivel edificio Orense Plaza" maxLength={80} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default AlmacenFormulario;