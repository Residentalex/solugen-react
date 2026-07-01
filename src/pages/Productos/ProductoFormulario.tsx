import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Button, Form, Input, InputNumber, Switch, Select, Tag, Table, Space,
  message, Spin, Alert, Modal, Typography, Grid, Upload,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, ExclamationCircleOutlined, InboxOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { productoApi } from '../../api/productoApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import FormularioToolbar from '../../components/FormularioToolbar';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import { toTitleCase } from '../../utils/formats';
import type {
  ProductoDTO, FamiliaArticuloDTO, CategoriaArticuloDTO,
  UnidadMedidaDTO, DatosExtraProductoDTO, ImpuestoProductoDTO,
} from '../../types/productos';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const TIPO_IMPUESTO_MAP: Record<number, string> = {
  0: 'Exento',
  1: 'Gravado',
  2: 'No Gravado',
};

const AMBITO_IMPUESTO_MAP: Record<number, string> = {
  0: 'Venta',
  1: 'Compra',
  2: 'Ambos',
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

const ProductoFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const mode = codigo ? 'editar' : 'crear';

  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);

  const navigationConfirmedRef = useFormularioNavigation();
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProductoDTO | null>(null);

  // Catálogos
  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaArticuloDTO[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaDTO[]>([]);
  const [comodines, setComodines] = useState<any[]>([]);

  const [requiereFechaVenc, setRequiereFechaVenc] = useState(false);

  // Modal de selección de impuestos
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
  const [selectedImpuestos, setSelectedImpuestos] = useState<ImpuestoSeleccionado[]>([]);

  // Imagen (local UI only)
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isMobile = !screens.md; // <768px

  useEffect(() => {
    setActiveModule('MProducto');
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, sucursalProductos]);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [familiasData, categoriasData, unidadesData, comodinesData] = await Promise.all([
        familiaArticuloApi.obtenerTodo(sucursalProductos),
        categoriaArticuloApi.obtenerListado(sucursalProductos),
        unidadMedidaApi.obtenerListado(sucursalProductos),
        productoApi.obtenerComodines(sucursalProductos),
      ]);
      setFamilias(familiasData || []);
      setCategorias(categoriasData || []);
      setUnidades(unidadesData || []);
      setComodines(comodinesData || []);

      if (mode === 'editar' && codigo) {
        await cargarProducto(codigo);
      } else {
        form.setFieldsValue({
          activo: true,
          paraVender: true,
          paraComprar: true,
          precio: 0,
          ultimoCosto: 0,
        });
        setLoading(false);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos del formulario');
      setLoadingError(true);
      setLoading(false);
    }
  };

  const cargarProducto = async (prodCodigo: string) => {
    try {
      const prod = await productoApi.obtenerDetalle(sucursalProductos, prodCodigo);
      if (!prod) {
        message.error('Producto no encontrado');
        navigate('/MProducto');
        return;
      }
      setData(prod);
      form.setFieldsValue({
        nombre: prod.nombre,
        referenciaInterna: prod.referenciaInterna,
        upc: prod.upc,
        codigoSuplidor: (prod as any)?.codigoSuplidor || '',
        precio: prod.precio,
        ultimoCosto: prod.ultimoCosto,
        familia: prod.familia?.idExterno || undefined,
        categoria: prod.categoria?.codigo || prod.categoria?.idExterno || undefined,
        unidadMedida: prod.unidadMedida?.idExterno ?? undefined,
        unidadMedidaCompra: prod.datosExtra?.unidadMedidaCompra?.idExterno ?? undefined,
        nota: prod.nota,
        paraVender: prod.paraVender,
        paraComprar: prod.paraComprar,
        pesado: prod.pesado || false,
        activo: prod.activo,
        modificaPrecio: prod.modificaPrecio || false,
        modificaDescripcion: prod.modificaDescripcion || false,
        requiereFechaVenc: prod.requiereFechaVenc || false,
        diasVencimiento: prod.diasVencimiento,
        codigoControl: prod.datosExtra?.codigoControl || '',
        ubicacion: prod.datosExtra?.ubicacion || '',
        margenBeneficio: prod.datosExtra?.margenBeneficio ?? null,
        garantia: prod.datosExtra?.garantia ?? null,
        paraAlquilar: prod.datosExtra?.paraAlquilar || false,
        paraExportar: prod.datosExtra?.paraExportar || false,
        productoTerminado: prod.datosExtra?.productoTerminado || false,
        esComodin: prod.datosExtra?.esComodin || false,
        productoControl: prod.productoControl?.codigo || undefined,
      });
      setRequiereFechaVenc(prod.requiereFechaVenc || false);

      // Convertir impuestos del producto al formato del modal
      if (prod.impuestos?.length) {
        setSelectedImpuestos(
          prod.impuestos.map((imp) => ({
            codigo: imp.impuesto?.codigo || '',
            idExterno: imp.impuesto?.idExterno || '',
            nombre: imp.impuesto?.nombre || '',
            porcentaje: imp.impuesto?.porcentaje || 0,
            tipo: 'Impuesto',
            monto: 0,
          }))
        );
      } else {
        setSelectedImpuestos([]);
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError') return;
      message.error(err?.response?.data?.errorMessage || 'Error al cargar producto');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();

      if (values.precio < 0) {
        message.error('El precio debe ser mayor o igual a 0');
        return;
      }
      if (values.requiereFechaVenc && (!values.diasVencimiento || values.diasVencimiento <= 0)) {
        message.error('Debe especificar días de vencimiento cuando requiere fecha de vencimiento');
        return;
      }

      setSaving(true);

      const familiaSelected = values.familia
        ? familias.find((f) => f.idExterno === values.familia) || { idExterno: values.familia }
        : null;

      const categoriaSelected = values.categoria
        ? categorias.find((c) => c.codigo === values.categoria || c.idExterno === values.categoria)
          || { codigo: values.categoria }
        : null;

      const unidadSelected = values.unidadMedida
        ? unidades.find((u) => u.idExterno === values.unidadMedida) || null
        : null;

      const unidadMedidaCompraSelected = values.unidadMedidaCompra
        ? unidades.find((u) => u.idExterno === values.unidadMedidaCompra) || null
        : null;

      const productoControlSelected = values.productoControl
        ? comodines.find((c: any) => c.codigo === values.productoControl)
          || { codigo: values.productoControl }
        : null;

      const datosExtra: DatosExtraProductoDTO = {
        codigoControl: values.codigoControl || undefined,
        ubicacion: values.ubicacion || undefined,
        margenBeneficio: values.margenBeneficio ?? undefined,
        garantia: values.garantia ?? undefined,
        paraAlquilar: values.paraAlquilar || false,
        paraExportar: values.paraExportar || false,
        productoTerminado: values.productoTerminado || false,
        esComodin: values.esComodin || false,
        unidadMedidaCompra: unidadMedidaCompraSelected,
      };

      const dto: ProductoDTO = {
        codigo: codigo || values.codigo || '',
        idExterno: codigo || values.codigo || undefined,
        nombre: values.nombre,
        precio: values.precio || 0,
        referenciaInterna: values.referenciaInterna || '',
        upc: values.upc || '',
        codigoSuplidor: values.codigoSuplidor || '',
        familia: familiaSelected,
        categoria: categoriaSelected,
        unidadMedida: unidadSelected,
        nota: values.nota || '',
        paraVender: values.paraVender ?? true,
        paraComprar: values.paraComprar ?? true,
        activo: values.activo ?? true,
        pesado: values.pesado || false,
        ultimoCosto: data?.ultimoCosto || 0,
        modificaPrecio: values.modificaPrecio || false,
        modificaDescripcion: values.modificaDescripcion || false,
        requiereFechaVenc: values.requiereFechaVenc || false,
        diasVencimiento: values.requiereFechaVenc ? values.diasVencimiento : undefined,
        datosExtra,
        productoControl: productoControlSelected,
        impuestos: selectedImpuestos.length > 0
          ? selectedImpuestos
              .filter((imp) => imp.idExterno)
              .map((imp) => ({
              impuesto: {
                codigo: imp.codigo,
                nombre: imp.nombre,
                porcentaje: imp.porcentaje,
                tipo: 1 as any,
                ambito: 0 as any,
                idExterno: imp.idExterno,
              },
            }))
          : [],
      } as ProductoDTO & { codigoSuplidor?: string };

      if (mode === 'crear') {
        const creado = await productoApi.crear(sucursalProductos, dto);
        navigationConfirmedRef.current = true;
        message.success('Producto creado correctamente');
        navigate('/MProducto/' + (creado.codigo || values.codigo));
      } else {
        await productoApi.actualizar(sucursalProductos, dto);
        navigationConfirmedRef.current = true;
        message.success('Producto actualizado correctamente');
        navigate('/MProducto/' + codigo);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Sí, salir',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        navigate('/MProducto');
      },
    });
  };

  const handleImageChange = (info: any) => {
    const file = info.fileList?.[0]?.originFileObj;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">
          Cargando formulario...
        </div>
      </div>
    );
  }

  const impuestoColumns = [
    {
      title: 'Nombre', key: 'nombre',
      render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.nombre ? toTitleCase(r.impuesto.nombre) : '-',
    },
    {
      title: 'Porcentaje (%)', key: 'porcentaje', width: 130, align: 'right' as const,
      render: (_: any, r: ImpuestoProductoDTO) =>
        r.impuesto?.porcentaje !== undefined ? formatNumber(r.impuesto.porcentaje) : '-',
    },
    {
      title: 'Tipo', key: 'tipo', width: 120,
      render: (_: any, r: ImpuestoProductoDTO) =>
        r.impuesto?.tipo !== undefined
          ? (TIPO_IMPUESTO_MAP[r.impuesto.tipo] || `Tipo ${r.impuesto.tipo}`)
          : '-',
    },
    {
      title: 'Ámbito', key: 'ambito', width: 100,
      render: (_: any, r: ImpuestoProductoDTO) =>
        r.impuesto?.ambito !== undefined
          ? (AMBITO_IMPUESTO_MAP[r.impuesto.ambito] || `Ámbito ${r.impuesto.ambito}`)
          : '-',
    },
  ];

  const renderRightPanel = () => (
    <>
      {/* Card: Estado */}
      <Card
        className="paces-card"
        size="small"
        title="Estado"
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Form.Item name="activo" valuePropName="checked" style={{ marginBottom: 8 }}>
          <Switch
            checkedChildren="Activo"
            unCheckedChildren="Inactivo"
            style={{ width: 120 }}
          />
        </Form.Item>
        <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
          Determina si el artículo está disponible
        </div>
      </Card>

      {/* Card: Inventario y Logística */}
      <Card
        className="paces-card"
        size="small"
        title="Inventario y Logística"
        extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Control de inventario y almacenamiento</span>}
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="pesado" label="Pesado" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Indica si el artículo se vende por peso
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item
                name="requiereFechaVenc"
                label="Requiere Fecha Venc."
                valuePropName="checked"
                style={{ marginBottom: 4 }}
              >
                <Switch onChange={(checked) => setRequiereFechaVenc(checked)} />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Controla si el artículo requiere registrar fecha de vencimiento
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            {requiereFechaVenc && (
              <div style={{ marginBottom: 16 }}>
                <Form.Item
                  name="diasVencimiento"
                  label="Días de Vencimiento"
                  style={{ marginBottom: 4 }}
                  rules={[{ required: true, message: 'Debe especificar los días de vencimiento' }]}
                >
                  <InputNumber min={1} step={1} style={{ width: '100%' }} placeholder="Días" />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Días antes del vencimiento del artículo
                </div>
              </div>
            )}
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="ubicacion" label="Ubicación" style={{ marginBottom: 4 }}>
                <Input placeholder="Ubicación en almacén" />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Ubicación física en almacén
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="garantia" label="Garantía (días)" style={{ marginBottom: 4 }}>
                <InputNumber min={0} step={1} style={{ width: '100%' }} placeholder="Días" />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Período de garantía en días
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Card: Configuración Adicional */}
      <Card
        className="paces-card"
        size="small"
        title="Configuración Adicional"
        extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Comportamiento y características del artículo</span>}
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="paraVender" label="Para Vender" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Disponible para facturación de venta
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="paraComprar" label="Para Comprar" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Disponible para órdenes de compra
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="paraAlquilar" label="Para Alquilar" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Disponible para contratos de alquiler
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="paraExportar" label="Para Exportar" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                El artículo puede ser exportado
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="productoTerminado" label="Prod. Terminado" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                El artículo se considera producto terminado
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="esComodin" label="Es Comodín" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Se usa como artículo comodín en promociones
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="modificaPrecio" label="Modifica Precio" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Permite modificar el precio en los documentos
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="modificaDescripcion" label="Modifica Descripción" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Permite modificar la descripción en documentos
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Card: Impuestos */}
      <Card
        className="paces-card"
        size="small"
        title="Impuestos"
        style={{ borderRadius: 12, marginBottom: 16 }}
        extra={
          <Button type="link" size="small" onClick={() => setModalImpuestosOpen(true)}>
            {selectedImpuestos.length > 0
              ? `Seleccionados (${selectedImpuestos.length})`
              : 'Seleccionar'}
          </Button>
        }
      >
        {selectedImpuestos.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedImpuestos.map((imp) => (
              <div
                key={imp.codigo}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  background: 'var(--paces-topbar-search-bg)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--paces-text)' }}>{toTitleCase(imp.nombre)}</span>
                <Space size={4}>
                  <Tag>{imp.porcentaje}%</Tag>
                </Space>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '12px 0', textAlign: 'center' }} className="paces-text-secondary">
            <Text type="secondary">Sin impuestos seleccionados</Text>
          </div>
        )}
      </Card>

      {/* Card: Auditoría (solo edición) */}
      {mode === 'editar' && data && (
        <Card
          className="paces-card"
          size="small"
          title="Auditoría"
          style={{ borderRadius: 12, marginBottom: 16 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div className="paces-text-secondary" style={{ fontSize: 11 }}>Fecha de creación</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                {data.fechaCreacion
                  ? new Date(data.fechaCreacion).toLocaleDateString('es-DO', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '-'}
              </div>
            </div>
            <div>
              <div className="paces-text-secondary" style={{ fontSize: 11 }}>Código</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{data.codigo}</div>
            </div>
          </div>
        </Card>
      )}
    </>
  );

  const rightPanelContent = renderRightPanel();

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar el formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); cargarTodo(); }}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Toolbar con FormularioToolbar */}
      <FormularioToolbar
        saving={saving}
        mode={mode}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      >
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {mode === 'editar' ? `Editar Producto: ${codigo}` : 'Nuevo Producto'}
        </h4>
      </FormularioToolbar>

      <Form form={form} layout="vertical" size="middle">
        <Row gutter={16}>
          {/* ========== COLUMNA IZQUIERDA ========== */}
          <Col xs={24} md={14} xl={17}>
            {/* Card 1: Información General */}
            <Card
              className="paces-card"
              size="small"
              title="Información General"
              extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Datos básicos del artículo</span>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24}>
                  <Form.Item
                    name="nombre"
                    label="Nombre"
                    rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                  >
                    <Input placeholder="Nombre del producto" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="referenciaInterna" label="Referencia Interna">
                    <Input placeholder="Referencia interna" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="upc" label="UPC">
                    <Input placeholder="Código de barras" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="codigoSuplidor" label="Código Suplidor">
                    <Input placeholder="Código del suplidor" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[16, 0]}>
                <Col xs={24}>
                  <Form.Item name="nota" label="Nota">
                    <TextArea rows={3} placeholder="Notas adicionales del artículo" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Card 2: Clasificación */}
            <Card
              className="paces-card"
              size="small"
              title="Clasificación"
              extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Organización y categorización del artículo</span>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="familia" label="Familia">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar familia">
                      {familias.map((f) => (
                        <Select.Option key={f.idExterno || ''} value={f.idExterno || ''}>
                          {f.nombre ? toTitleCase(f.nombre) : f.idExterno}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="categoria" label="Categoría">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar categoría">
                      {categorias.map((c) => (
                        <Select.Option key={c.codigo || c.idExterno || ''} value={c.codigo || c.idExterno || ''}>
                          {c.nombre ? toTitleCase(c.nombre) : c.codigo}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="unidadMedida" label="Unidad de Medida">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar unidad">
                      {unidades.map((u) => (
                        <Select.Option key={u.idExterno ?? ''} value={u.idExterno ?? ''}>
                          {u.nombre ? toTitleCase(u.nombre) : String(u.idExterno ?? '')}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="productoControl" label="Producto Control">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar producto control">
                      {comodines.map((c: any) => (
                        <Select.Option key={c.codigo || ''} value={c.codigo || ''}>
                          {c.codigo}{c.nombre ? ` - ${toTitleCase(c.nombre)}` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="unidadMedidaCompra" label="Unidad Medida Compra">
                    <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar unidad de compra">
                      {unidades.map((u) => (
                        <Select.Option key={u.idExterno ?? ''} value={u.idExterno ?? ''}>
                          {u.nombre ? toTitleCase(u.nombre) : String(u.idExterno ?? '')}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Card 3: Precios y Costos */}
            <Card
              className="paces-card"
              size="small"
              title="Precios y Costos"
              extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Información financiera del artículo</span>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="precio" label="Precio">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="ultimoCosto" label="Último Costo">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Form.Item name="margenBeneficio" label="Margen Beneficio (%)">
                    <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="%" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Card 4: Imagen del Artículo */}
            <Card
              className="paces-card"
              size="small"
              title="Imagen del Artículo"
              extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Arrastre una imagen o haga clic para seleccionar</span>}
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              {imagePreview ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 12 }}
                  />
                  <br />
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    size="small"
                    onClick={handleRemoveImage}
                  >
                    Eliminar imagen
                  </Button>
                </div>
              ) : (
                <Dragger
                  name="imagen"
                  multiple={false}
                  showUploadList={false}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  style={{ background: 'var(--paces-topbar-search-bg)', borderRadius: 8 }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: 'var(--paces-primary)', fontSize: 48 }} />
                  </p>
                  <p className="ant-upload-text" style={{ color: 'var(--paces-text)' }}>
                    Haga clic o arrastre una imagen aquí
                  </p>
                  <p className="ant-upload-hint" style={{ color: 'var(--paces-text-secondary)' }}>
                    PNG, JPG o WebP
                  </p>
                </Dragger>
              )}
            </Card>
          </Col>

          {/* ========== COLUMNA DERECHA ========== */}
          {!isMobile && (
            <Col xs={0} md={10} xl={7}>
              {rightPanelContent}
            </Col>
          )}
        </Row>

        <SeleccionarImpuestosModal
          open={modalImpuestosOpen}
          onClose={() => setModalImpuestosOpen(false)}
          onConfirm={(items) => {
            setSelectedImpuestos(items);
            setModalImpuestosOpen(false);
          }}
          sucursal={sucursalProductos}
          existentes={selectedImpuestos}
        />
      </Form>

      {/* Mobile: contenido del panel derecho debajo */}
      {isMobile && (
        <div style={{ marginTop: 0 }}>
          {rightPanelContent}
        </div>
      )}
    </div>
  );
};

export default ProductoFormulario;
