import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, Row, Switch, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { departamentoApi } from '../../api/departamentoApi';
import type { DepartamentoDTO } from '../../types/departamento';

const mensajeDeError = (err: any, fallback: string): string =>
  typeof err?.response?.data === 'string'
    ? err.response.data
    : err?.response?.data?.errorMessage || fallback;

const DepartamentoFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MDepto');

  const [form] = Form.useForm();
  const [departamento, setDepartamento] = useState<DepartamentoDTO | null>(null);
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
    setPageTitleOverride(modo === 'crear' ? 'Nuevo Departamento' : 'Editar Departamento');

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
      if (!codigo) {
        setDepartamento(null);
        form.resetFields();
        return;
      }

      const datos = await departamentoApi.obtenerPorCodigo(sucursalActiva, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('El departamento no existe en esta sucursal.');
        return;
      }

      setDepartamento(datos);
      setPageTitleOverride(`Editando: ${datos.codigo || ''} - ${datos.nombre || ''}`);
      form.setFieldsValue({
        codigo: datos.codigo || '',
        nombre: datos.nombre || '',
        activo: datos.activo ?? true,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeDeError(err, 'Error al cargar el departamento'));
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
        codigo: values.codigo?.trim(),
        nombre: values.nombre?.trim(),
        activo: values.activo ?? true,
      };

      if (modo === 'crear') {
        await departamentoApi.crear(sucursalActiva, payload);
        message.success('Departamento creado correctamente');
      } else {
        await departamentoApi.actualizar(sucursalActiva, codigo!, payload);
        message.success('Departamento actualizado correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MDepto', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeDeError(err, 'Error al guardar el departamento'));
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!codigo) return;
    setEliminando(true);
    try {
      await departamentoApi.eliminar(sucursalActiva, codigo);
      message.success('Departamento eliminado correctamente');
      navigationConfirmedRef.current = true;
      navigate('/MDepto', { replace: true });
    } catch (err: any) {
      message.error(mensajeDeError(err, 'Error al eliminar el departamento'));
    } finally {
      setEliminando(false);
    }
  };

  const handleCancelar = () => {
    navigationConfirmedRef.current = true;
    navigate('/MDepto', { replace: true });
  };

  if (errorCarga) {
    return (
      <DetalleCatalogoLayout
        titulo={modo === 'crear' ? 'Nuevo Departamento' : 'Editar Departamento'}
        onVolver={handleCancelar}
      >
        <Card>
          <p>{mensajeError}</p>
        </Card>
      </DetalleCatalogoLayout>
    );
  }

  return (
    <DetalleCatalogoLayout
      titulo={modo === 'crear' ? 'Nuevo Departamento' : 'Editar Departamento'}
      onVolver={handleCancelar}
      onGuardar={handleGuardar}
      guardando={guardando}
      onEliminar={modo === 'editar' ? handleEliminar : undefined}
      eliminando={eliminando}
    >
      <Card loading={loading}>
        <Form form={form} layout="vertical" size="small" disabled={loading}>
          <Row gutter={16}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[{ required: true, message: 'El código es requerido' }]}
              >
                <Input placeholder="Código" maxLength={20} disabled={modo === 'editar'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input placeholder="Nombre del departamento" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item name="activo" label="Activo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </DetalleCatalogoLayout>
  );
};

export default DepartamentoFormulario;
