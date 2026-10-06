import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, Modal, Row,  message } from 'antd';
import { Select } from '../../components/Select';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { marcaApi } from '../../api/marcaApi';
import { proveedorApi } from '../../api/proveedorApi';
import type { MarcaDTO } from '../../types/marca';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import { toTitleCase } from '../../utils/formats';

const mensajeDeError = (err: any, fallback: string): string =>
  typeof err?.response?.data === 'string'
    ? err.response.data
    : err?.response?.data?.errorMessage || fallback;

const MarcaFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MMarca');

  const [form] = Form.useForm();
  const [marca, setMarca] = useState<MarcaDTO | null>(null);
  const [proveedores, setProveedores] = useState<SuplidorDTO[]>([]);
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
    setPageTitleOverride(modo === 'crear' ? 'Nueva Marca' : 'Editar Marca');

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

    proveedorApi
      .obtenerListado(sucursalActiva)
      .then((listado) => setProveedores(listado || []))
      .catch((err: any) => message.error(mensajeDeError(err, 'Error al cargar el catálogo de proveedores')));

    try {
      if (!codigo) {
        setMarca(null);
        form.resetFields();
        return;
      }

      const datos = await marcaApi.obtenerPorCodigo(sucursalActiva, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('La marca no existe en esta sucursal.');
        return;
      }

      setMarca(datos);
      setPageTitleOverride(`Editando: ${datos.idExterno || codigo} - ${toTitleCase(datos.nombre || '')}`);
      form.setFieldsValue({
        codigo: datos.idExterno || codigo || '',
        nombre: datos.nombre || '',
        proveedor: datos.proveedor || undefined,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeDeError(err, 'Error al cargar la marca'));
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
        proveedor: values.proveedor || '',
      };

      if (modo === 'crear') {
        await marcaApi.crear(sucursalActiva, payload);
        message.success('Marca creada correctamente');
      } else {
        await marcaApi.actualizar(sucursalActiva, codigo!, payload);
        message.success('Marca actualizada correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MMarca', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeDeError(err, 'Error al guardar la marca'));
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleEliminar = () => {
    if (guardandoRef.current || eliminando) return;
    Modal.confirm({
      title: 'Eliminar Marca',
      content: `¿Está seguro que desea eliminar la marca "${marca?.nombre || codigo}"?`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (guardandoRef.current) return;
        guardandoRef.current = true;
        setEliminando(true);
        try {
          await marcaApi.eliminar(sucursalActiva, codigo!);
          message.success('Marca eliminada correctamente');
          navigationConfirmedRef.current = true;
          navigate('/MMarca', { replace: true });
        } catch (err: any) {
          message.error(mensajeDeError(err, 'Error al eliminar la marca'));
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
    navigate('/MMarca', { replace: true });
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MMarca"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando marca...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de marca'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!marca}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onEliminar={modo === 'editar' ? handleEliminar : undefined}
      eliminando={eliminando}
      onVolver={handleVolver}
    >
      <Form form={form} layout="vertical" size="small" style={{ marginBottom: 16 }} disabled={guardando || eliminando}>
        <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="codigo"
                label="Código"
                tooltip="El código identifica a la marca en todos los documentos y no se puede modificar."
              >
                <Input
                  placeholder={modo === 'crear' ? 'Se generará automáticamente' : ''}
                  maxLength={10}
                  disabled
                />
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
                <Input placeholder="Ej: Solugen" maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={24} lg={16}>
              <Form.Item name="proveedor" label="Proveedor">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione el proveedor"
                  options={proveedores.map((p) => ({
                    value: p.codigo,
                    label: `${p.codigo} - ${p.nombre}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default MarcaFormulario;
