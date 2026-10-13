import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, Row, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { Select } from '../../components/Select';
import { posicionApi } from '../../api/posicionApi';
import { departamentoApi } from '../../api/departamentoApi';
import type { PosicionDTO } from '../../types/posicion';

const mensajeDeError = (err: any, fallback: string): string =>
  typeof err?.response?.data === 'string'
    ? err.response.data
    : err?.response?.data?.errorMessage || fallback;

const PosicionFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MPosicion');

  const [form] = Form.useForm();
  const [posicion, setPosicion] = useState<PosicionDTO | null>(null);
  const [departamentos, setDepartamentos] = useState<{ value: string; label: string }[]>([]);
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
    setPageTitleOverride(modo === 'crear' ? 'Nueva Posición' : 'Editar Posición');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  useEffect(() => {
    if (sucursalActiva === undefined) return;
    let activo = true;
    departamentoApi
      .obtenerListado(sucursalActiva)
      .then((lista) => {
        if (!activo) return;
        setDepartamentos(
          (lista ?? []).map((d) => ({
            value: (d.codigo || '').trim(),
            label: d.nombre || (d.codigo || '').trim(),
          }))
        );
      })
      .catch(() => {
        if (!activo) return;
        setDepartamentos([]);
      });
    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  const cargar = useCallback(async () => {
    if (sucursalActiva === undefined) return;

    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    try {
      if (!codigo) {
        setPosicion(null);
        form.resetFields();
        return;
      }

      const datos = await posicionApi.obtenerPorCodigo(sucursalActiva, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('La posición no existe en esta sucursal.');
        return;
      }

      setPosicion(datos);
      setPageTitleOverride(`Editando: ${datos.codigo || ''} - ${datos.nombre || ''}`);
      form.setFieldsValue({
        codigo: datos.codigo || '',
        nombre: datos.nombre || '',
        depto: (datos.depto || '').trim() || undefined,
        codSet: datos.codSet || '',
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeDeError(err, 'Error al cargar la posición'));
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
        depto: values.depto?.trim() || null,
        codSet: values.codSet?.trim() || null,
      };

      if (modo === 'crear') {
        await posicionApi.crear(sucursalActiva, payload);
        message.success('Posición creada correctamente');
      } else {
        await posicionApi.actualizar(sucursalActiva, codigo!, payload);
        message.success('Posición actualizada correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MPosicion', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeDeError(err, 'Error al guardar la posición'));
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    if (!codigo) return;
    setEliminando(true);
    try {
      await posicionApi.eliminar(sucursalActiva, codigo);
      message.success('Posición eliminada correctamente');
      navigationConfirmedRef.current = true;
      navigate('/MPosicion', { replace: true });
    } catch (err: any) {
      message.error(mensajeDeError(err, 'Error al eliminar la posición'));
    } finally {
      setEliminando(false);
    }
  };

  const handleCancelar = () => {
    navigationConfirmedRef.current = true;
    navigate('/MPosicion', { replace: true });
  };

  if (errorCarga) {
    return (
      <DetalleCatalogoLayout
        titulo={modo === 'crear' ? 'Nueva Posición' : 'Editar Posición'}
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
      titulo={modo === 'crear' ? 'Nueva Posición' : 'Editar Posición'}
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
                <Input placeholder="Código" maxLength={10} disabled={modo === 'editar'} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={16}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input placeholder="Nombre de la posición" maxLength={40} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="depto" label="Departamento">
                <Select
                  allowClear
                  showSearch
                  placeholder="Seleccione un departamento"
                  optionFilterProp="label"
                  options={departamentos}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Form.Item name="codSet" label="Código Set">
                <Input placeholder="Código Set (opcional)" maxLength={10} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>
    </DetalleCatalogoLayout>
  );
};

export default PosicionFormulario;