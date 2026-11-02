import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Form, Input, Row, message } from 'antd';
import { Select } from '../../components/Select';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import type { CategoriaArticuloDTO, CategoriaArticuloRequestDTO, FamiliaArticuloDTO } from '../../types/productos';
import { toTitleCase } from '../../utils/formats';

const mensajeDeError = (err: any, fallback: string): string =>
  typeof err?.response?.data === 'string'
    ? err.response.data
    : err?.response?.data?.errorMessage || fallback;

const CategoriaArticuloFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MCategoria');

  const [form] = Form.useForm();
  const [categoria, setCategoria] = useState<CategoriaArticuloDTO | null>(null);
  const [categorias, setCategorias] = useState<CategoriaArticuloDTO[]>([]);
  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = codigo ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nueva Categoría' : 'Editar Categoría');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  const cargar = useCallback(async () => {
    if (sucursalProductos === undefined) return;

    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    try {
      const [listaCategorias, listaFamilias] = await Promise.all([
        categoriaArticuloApi.obtenerListado(sucursalProductos),
        familiaArticuloApi.obtenerTodo(sucursalProductos),
      ]);

      const todas = listaCategorias || [];
      setCategorias(todas);
      setFamilias(listaFamilias || []);

      if (!codigo) {
        setCategoria(null);
        form.resetFields();
        return;
      }

      const datos = await categoriaArticuloApi.obtenerPorCodigo(sucursalProductos, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('La categoría no existe en esta sucursal.');
        return;
      }

      const nombrePadre = datos.control?.nombre?.trim().toUpperCase();
      const padrePorNombre = nombrePadre
        ? todas.find((c) => c.nombre?.trim().toUpperCase() === nombrePadre)
        : undefined;

      setCategoria(datos);
      setPageTitleOverride(`Editando: ${datos.codigo || codigo} - ${toTitleCase(datos.nombre || '')}`);
      form.setFieldsValue({
        codigo: datos.codigo || codigo,
        nombre: datos.nombre || '',
        familia: datos.familia?.idExterno || undefined,
        control: datos.control?.codigo || padrePorNombre?.codigo || undefined,
      });
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeDeError(err, 'Error al cargar la categoría'));
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalProductos, form, setPageTitleOverride]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleGuardar = async () => {
    if (guardandoRef.current || sucursalProductos === undefined) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();

      const payload: CategoriaArticuloRequestDTO = {
        nombre: values.nombre?.trim(),
        control: values.control ? { codigo: values.control } : null,
        familia: values.familia ? { idExterno: values.familia } : null,
      };

      if (modo === 'crear') {
        await categoriaArticuloApi.crear(sucursalProductos, payload);
        message.success('Categoría creada correctamente');
      } else {
        await categoriaArticuloApi.actualizar(sucursalProductos, codigo!, payload);
        message.success('Categoría actualizada correctamente');
      }

      navigationConfirmedRef.current = true;
      navigate('/MCategoria', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeDeError(err, 'Error al guardar la categoría'));
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleVolver = () => {
    if (guardando) return;
    navigationConfirmedRef.current = true;
    navigate('/MCategoria', { replace: true });
  };

  const opcionesPadre = categorias
    .filter((c) => !codigo || c.codigo !== codigo)
    .map((c) => ({
      value: c.codigo as string,
      label: `${c.codigo} - ${toTitleCase(c.nombre || '')}`,
    }));

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MCategoria"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando categoría...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de categoría'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!categoria}
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
                tooltip="El código identifica a la categoría en todos los documentos y no se puede modificar."
              >
                <Input placeholder={modo === 'crear' ? 'Se generará automáticamente' : ''} maxLength={20} disabled />
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
                <Input placeholder="Ej: Bebidas" maxLength={40} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item name="familia" label="Familia">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccione la familia"
                  options={familias.map((f) => ({
                    value: f.idExterno,
                    label: f.nombre || f.idExterno || '',
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={12}>
              <Form.Item
                name="control"
                label="Categoría padre"
                tooltip="Déjelo vacío para una categoría principal."
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Categoría principal"
                  options={opcionesPadre}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default CategoriaArticuloFormulario;
