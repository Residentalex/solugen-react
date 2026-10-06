import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card, Row, Col, Button, Form, Input, InputNumber, Switch,  Tag, Space,
  message, Skeleton, Alert, Modal, Typography, Upload, Tabs,
} from 'antd';
import { Select } from '../../components/Select';
import type { UploadProps } from 'antd';
import {
  ExclamationCircleOutlined, InboxOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { productoApi } from '../../api/productoApi';
import { servicioApi } from '../../api/servicioApi';
import { recetaApi } from '../../api/recetaApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import FormularioToolbar from '../../components/FormularioToolbar';
import SeleccionarImpuestosModal from '../../components/SeleccionarImpuestosModal';
import type { ImpuestoSeleccionado } from '../../components/SeleccionarImpuestosModal';
import ProductoComponentesCard from '../../components/ProductoComponentesCard';
import ImportarComponentesModal from '../../components/ImportarComponentesModal';
import { toTitleCase, extraerMensajeError } from '../../utils/formats';
import type {
  ProductoDTO, FamiliaArticuloDTO, CategoriaArticuloDTO,
  UnidadMedidaDTO, DatosExtraProductoDTO,
} from '../../types/productos';
import type { ComponenteProductoDTO, IngredienteDTO } from '../../types/receta';
import type { TipoImpuesto } from '../../types/contabilidad';

const { Text } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

const TIPO_IMPUESTO_MAP: Record<TipoImpuesto, string> = {
  I: 'Impuesto',
  L: 'Liquidación',
  V: 'Informativo',
  R: 'Retencion',
};

/** Nombre y costo de un componente, resueltos desde el catálogo de productos. */
interface ComponenteResuelto {
  nombre: string;
  costo: number;
}

const ProductoFormulario: React.FC<{ pantalla?: 'MProducto' | 'MServicio' }> = ({ pantalla = 'MProducto' }) => {
  const esServicio = pantalla === 'MServicio';
  const basePath = esServicio ? '/MServicio' : '/MProducto';
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = codigo ? 'editar' : 'crear';
  const isCloning = !codigo && location.state?.codigoClonar;

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);

  const guardandoRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation(guardandoRef);
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ProductoDTO | null>(null);

  // Catálogos
  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaArticuloDTO[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedidaDTO[]>([]);
  const [comodines, setComodines] = useState<ProductoDTO[]>([]);

  const [requiereFechaVenc, setRequiereFechaVenc] = useState(false);

  // Modal de selección de impuestos
  const [modalImpuestosOpen, setModalImpuestosOpen] = useState(false);
  const [selectedImpuestos, setSelectedImpuestos] = useState<ImpuestoSeleccionado[]>([]);

  // Componentes / receta
  const [componentes, setComponentes] = useState<ComponenteProductoDTO[]>([]);
  const [ingredientesCargados, setIngredientesCargados] = useState<IngredienteDTO[]>([]);
  const [modalImportarComponentesOpen, setModalImportarComponentesOpen] = useState(false);
  const [resueltos, setResueltos] = useState<Record<string, ComponenteResuelto>>({});
  const resueltosRef = useRef<Set<string>>(new Set());

  // Imagen (PRODSERV.IMAGEN)
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const imagenGuardadaRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveModule(pantalla);
    return () => resetToolbar();
  }, [setActiveModule, resetToolbar, pantalla]);

  const apiArticulo = esServicio ? servicioApi : productoApi;

  const blobADataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const cargarImagenExistente = async (prodCodigo: string) => {
    try {
      const blob = await apiArticulo.obtenerImagen(sucursalProductos, prodCodigo);
      if (!blob) return;
      const dataUrl = await blobADataUrl(blob);
      imagenGuardadaRef.current = dataUrl;
      setImagePreview(dataUrl);
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al cargar la imagen del artículo'));
    }
  };

  const cargarProducto = async (prodCodigo: string, cargarImagen = false) => {
    try {
      const prod = await productoApi.obtenerDetalle(sucursalProductos, prodCodigo);
      if (!prod) {
        message.error('Producto no encontrado');
        navigate(basePath, { replace: true });
        return;
      }
      setData(prod);
      form.setFieldsValue({
        nombre: prod.nombre,
        referenciaInterna: prod.referenciaInterna,
        upc: prod.upc,
        codigoSuplidor: prod.codigoSuplidor || '',
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
        prodserv: prod.prodserv || 'P',
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
            tipo: imp.impuesto?.tipo ? (TIPO_IMPUESTO_MAP[imp.impuesto.tipo] || 'Otro') : 'Otro',
            monto: 0,
            tipoCodigo: imp.impuesto?.tipo,
            ambito: imp.impuesto?.ambito,
          }))
        );
      } else {
        setSelectedImpuestos([]);
      }

      if (cargarImagen) {
        await cargarImagenExistente(prodCodigo);
      }

      // Cargar componentes (PRODCOMP) del producto
      if (!esServicio) {
        try {
          const lista = await recetaApi.obtenerIngredientes(sucursalProductos, prodCodigo);
          setIngredientesCargados(lista);
          // Marcar como ya resueltos para no volver a consultarlos
          lista.forEach((ing) => {
            if (ing.codigo) resueltosRef.current.add(ing.codigo.toUpperCase());
          });
          setComponentes(
            lista.map((ing) => ({ codigo: ing.codigo, cantidad: ing.cantidad ?? 0 }))
          );
        } catch (err) {
          message.error(extraerMensajeError(err, 'Error al cargar los componentes del producto'));
          setIngredientesCargados([]);
          setComponentes([]);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      message.error(extraerMensajeError(err, 'Error al cargar producto'));
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatos = () =>
    Promise.all([
      familiaArticuloApi.obtenerTodo(sucursalProductos),
      categoriaArticuloApi.obtenerListado(sucursalProductos),
      unidadMedidaApi.obtenerListado(sucursalProductos),
      productoApi.obtenerComodines(sucursalProductos),
    ])
      .then(([familiasData, categoriasData, unidadesData, comodinesData]) => {
        setFamilias(familiasData || []);
        setCategorias(categoriasData || []);
        setUnidades(unidadesData || []);
        setComodines(comodinesData || []);
        setLoadingError(false);

        if (mode === 'editar' && codigo) {
          return cargarProducto(codigo, true);
        }
        if (isCloning && location.state?.codigoClonar) {
          return cargarProducto(location.state.codigoClonar);
        }
        form.setFieldsValue({
          activo: true,
          paraVender: true,
          paraComprar: true,
          precio: 0,
          ultimoCosto: 0,
          prodserv: esServicio ? 'S' : 'P',
        });
        return undefined;
      })
      .catch((err) => {
        message.error(extraerMensajeError(err, 'Error al cargar datos del formulario'));
        setLoadingError(true);
      })
      .finally(() => {
        setLoading(false);
      });

  const recargarDatos = async () => {
    setLoading(true);
    setLoadingError(false);
    await cargarDatos();
  };

  useEffect(() => {
    void cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, sucursalProductos]);

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
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

      const productoControlSelected: ProductoDTO | null = values.productoControl
        ? comodines.find((c) => c.codigo === values.productoControl)
          // El backend solo necesita el código del producto control
          || { codigo: values.productoControl } as ProductoDTO
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
        prodserv: esServicio ? 'S' : (values.prodserv || 'P'),
        requiereFechaVenc: values.requiereFechaVenc || false,
        diasVencimiento: values.requiereFechaVenc ? values.diasVencimiento : undefined,
        datosExtra,
        productoControl: productoControlSelected,
        impuestos: selectedImpuestos.length > 0
          ? selectedImpuestos
              .filter((imp) => imp.idExterno && imp.tipoCodigo && imp.ambito)
              .map((imp) => ({
              impuesto: {
                codigo: imp.codigo,
                nombre: imp.nombre,
                porcentaje: imp.porcentaje,
                tipo: imp.tipoCodigo,
                ambito: imp.ambito,
                idExterno: imp.idExterno,
              },
            }))
          : [],
      };

      const guardarImagenSeleccionada = async (codigoDestino: string) => {
        if (!imagenArchivo || !codigoDestino) return;
        try {
          await apiArticulo.guardarImagen(sucursalProductos, codigoDestino, imagenArchivo);
        } catch (err) {
          message.error(extraerMensajeError(err, 'Error al guardar la imagen del artículo'));
        }
      };

      if (mode === 'crear') {
        const creado = esServicio
          ? await servicioApi.crear(sucursalProductos, dto)
          : await productoApi.crear(sucursalProductos, dto);
        const codigoCreado = creado.codigo || values.codigo || '';
        if (!esServicio && creado.codigo) {
          await recetaApi.guardarComponentes(sucursalProductos, creado.codigo, componentes);
        }
        await guardarImagenSeleccionada(codigoCreado);
        navigationConfirmedRef.current = true;
        message.success(esServicio ? 'Servicio creado correctamente' : 'Producto creado correctamente');
        navigate(`${basePath}/` + codigoCreado, { replace: true });
      } else {
        if (esServicio) {
          await servicioApi.actualizar(sucursalProductos, dto);
        } else {
          await productoApi.actualizar(sucursalProductos, dto);
          await recetaApi.guardarComponentes(sucursalProductos, codigo, componentes);
        }
        await guardarImagenSeleccionada(codigo);
        navigationConfirmedRef.current = true;
        message.success(esServicio ? 'Servicio actualizado correctamente' : 'Producto actualizado correctamente');
        navigate(`${basePath}/` + codigo, { replace: true });
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(extraerMensajeError(err, 'Error al guardar producto'));
    } finally {
      guardandoRef.current = false;
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    if (guardandoRef.current) return;
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Sí, salir',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        navigate(basePath, { replace: true });
      },
    });
  };

  const handleImageChange: UploadProps['onChange'] = (info) => {
    if (guardandoRef.current) return;
    const file = info.fileList?.[0]?.originFileObj;
    if (file) {
      setImagenArchivo(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleQuitarImagenSeleccionada = () => {
    if (guardandoRef.current) return;
    setImagenArchivo(null);
    setImagePreview(imagenGuardadaRef.current);
  };

  // Nombres y costos de los componentes, resueltos por lote
  useEffect(() => {
    const faltantes = componentes
      .map((c) => c.codigo)
      .filter((c) => c && !resueltosRef.current.has(c.toUpperCase()));

    if (faltantes.length === 0) return;

    const unicos = Array.from(new Set(faltantes.map((c) => c.toUpperCase())));
    unicos.forEach((c) => resueltosRef.current.add(c));

    let cancelado = false;

    productoApi
      .obtenerPorListaCodigos(sucursalProductos, unicos)
      .then((lista) => {
        if (cancelado) return;
        const nuevos: Record<string, ComponenteResuelto> = {};
        (lista || []).forEach((p) => {
          if (p.codigo) nuevos[p.codigo.toUpperCase()] = { nombre: p.nombre || '', costo: p.ultimoCosto || 0 };
        });
        setResueltos((prev) => ({ ...prev, ...nuevos }));
      })
      .catch(() => {
        // Permitir reintento en el proximo cambio
        unicos.forEach((c) => resueltosRef.current.delete(c));
      });

    return () => {
      cancelado = true;
    };
  }, [componentes, sucursalProductos]);

  const nombresPorCodigo = useMemo(() => {
    const mapa: Record<string, string> = {};
    ingredientesCargados.forEach((ing) => {
      if (ing.codigo) mapa[ing.codigo.toUpperCase()] = ing.nombre || '';
    });
    Object.entries(resueltos).forEach(([codigo, info]) => {
      mapa[codigo] = info.nombre;
    });
    return mapa;
  }, [ingredientesCargados, resueltos]);

  const costosPorCodigo = useMemo(() => {
    const mapa: Record<string, number> = {};
    ingredientesCargados.forEach((ing) => {
      if (ing.codigo) mapa[ing.codigo.toUpperCase()] = ing.costo || 0;
    });
    Object.entries(resueltos).forEach(([codigo, info]) => {
      mapa[codigo] = info.costo;
    });
    return mapa;
  }, [ingredientesCargados, resueltos]);

  const handleConfirmarImportacionComponentes = useCallback((nuevos: ComponenteProductoDTO[]) => {
    // La plantilla define la composicion completa del producto
    setComponentes(nuevos);
    message.success(`${nuevos.length} componente(s) cargado(s) en la lista`);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const renderTabDatos = () => (
    <>
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
          <Col xs={24} md={12}>
            <Form.Item name="referenciaInterna" label="Referencia Interna">
              <Input placeholder="Referencia interna" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="upc" label="UPC">
              <Input placeholder="Código de barras" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item name="codigoSuplidor" label="Código Suplidor">
              <Input placeholder="Código del suplidor" />
            </Form.Item>
          </Col>
          {!esServicio && (
            <Col xs={24} md={12}>
              <Form.Item name="prodserv" label="Tipo Artículo" rules={[{ required: true, message: 'Seleccione tipo' }]}>
                <Select placeholder="Seleccionar tipo">
                  <Select.Option value="P">Producto</Select.Option>
                  <Select.Option value="S">Servicio</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          )}
        </Row>
        <Row gutter={[16, 0]}>
          <Col xs={24}>
            <Form.Item name="nota" label="Nota">
              <TextArea rows={3} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={500} showCount placeholder="Notas adicionales del artículo" />
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
          <Col xs={24} md={12} xl={8}>
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
          <Col xs={24} md={12} xl={8}>
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
          <Col xs={24} md={12} xl={8}>
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
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <Form.Item name="productoControl" label="Producto Control">
                <Select allowClear showSearch optionFilterProp="children" placeholder="Seleccionar producto control">
                  {comodines.map((c) => (
                    <Select.Option key={c.codigo || ''} value={c.codigo || ''}>
                      {c.codigo}{c.nombre ? ` - ${toTitleCase(c.nombre)}` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          )}
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
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
          )}
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
          <Col xs={24} md={8}>
            <Form.Item name="precio" label="Precio">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="ultimoCosto" label="Último Costo">
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} disabled />
            </Form.Item>
          </Col>
          {!esServicio && (
            <Col xs={24} md={8}>
              <Form.Item name="margenBeneficio" label="Margen Beneficio (%)">
                <InputNumber min={0} step={0.01} style={{ width: '100%' }} placeholder="%" />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Card>

      {/* Card 4: Imagen del Artículo */}
      <Card
        className="paces-card"
        size="small"
        title="Imagen del Artículo"
        extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">JPG o PNG, máximo 2 MB</span>}
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
            {imagenArchivo && (
              <Button
                icon={<DeleteOutlined />}
                danger
                size="small"
                disabled={saving}
                onClick={handleQuitarImagenSeleccionada}
              >
                Quitar imagen seleccionada
              </Button>
            )}
          </div>
        ) : (
          <Dragger
            name="imagen"
            multiple={false}
            showUploadList={false}
            accept="image/jpeg,image/png"
            disabled={saving}
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
              JPG o PNG
            </p>
          </Dragger>
        )}
      </Card>
    </>
  );

  const renderTabImpuestos = () => (
    <Card
      className="paces-card"
      size="small"
      title="Impuestos"
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
                <Button
                  type="link"
                  size="small"
                  danger
                  onClick={() => setSelectedImpuestos(prev => prev.filter(i => i.codigo !== imp.codigo))}
                  style={{ padding: 0, height: 'auto' }}
                >
                  <DeleteOutlined />
                </Button>
              </Space>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '24px 0', textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Sin impuestos seleccionados</Text>
        </div>
      )}
    </Card>
  );

  const renderTabComponentes = () => (
    <Card
      className="paces-card"
      size="small"
      title="Componentes / Ingredientes"
      extra={
        <span style={{ fontSize: 11 }} className="paces-text-secondary">
          Productos que componen este artículo
        </span>
      }
    >
      <ProductoComponentesCard
        codigoProducto={codigo}
        dataSource={componentes}
        onChange={setComponentes}
        onImportar={() => setModalImportarComponentesOpen(true)}
        nombresPorCodigo={nombresPorCodigo}
        costosPorCodigo={costosPorCodigo}
        disabled={saving}
      />
    </Card>
  );

  const renderTabInventario = () => (
    <>
      <Card
        className="paces-card"
        size="small"
        title="Inventario y Logística"
        extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Control de inventario y almacenamiento</span>}
        style={{ borderRadius: 12, marginBottom: 16 }}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12} xl={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="pesado" label="Pesado" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Indica si el artículo se vende por peso
              </div>
            </div>
          </Col>
          <Col xs={24} md={12} xl={8}>
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
          <Col xs={24} md={12} xl={8}>
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
          <Col xs={24} md={12} xl={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="ubicacion" label="Ubicación" style={{ marginBottom: 4 }}>
                <Input placeholder="Ubicación en almacén" />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Ubicación física en almacén
              </div>
            </div>
          </Col>
          <Col xs={24} md={12} xl={8}>
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
    </>
  );

  const renderTabConfiguracion = () => (
    <>
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
        <div className="paces-text-secondary" style={{ fontSize: 12 }}>
          Determina si el artículo está disponible
        </div>
      </Card>

      <Card
        className="paces-card"
        size="small"
        title="Configuración Adicional"
        extra={<span style={{ fontSize: 11 }} className="paces-text-secondary">Comportamiento y características del artículo</span>}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12} xl={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="paraVender" label="Para Vender" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Disponible para facturación de venta
              </div>
            </div>
          </Col>
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <div style={{ marginBottom: 16 }}>
                <Form.Item name="paraComprar" label="Para Comprar" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Disponible para órdenes de compra
                </div>
              </div>
            </Col>
          )}
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <div style={{ marginBottom: 16 }}>
                <Form.Item name="paraAlquilar" label="Para Alquilar" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Disponible para contratos de alquiler
                </div>
              </div>
            </Col>
          )}
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <div style={{ marginBottom: 16 }}>
                <Form.Item name="paraExportar" label="Para Exportar" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  El artículo puede ser exportado
                </div>
              </div>
            </Col>
          )}
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <div style={{ marginBottom: 16 }}>
                <Form.Item name="productoTerminado" label="Prod. Terminado" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  El artículo se considera producto terminado
                </div>
              </div>
            </Col>
          )}
          {!esServicio && (
            <Col xs={24} md={12} xl={8}>
              <div style={{ marginBottom: 16 }}>
                <Form.Item name="esComodin" label="Es Comodín" valuePropName="checked" style={{ marginBottom: 4 }}>
                  <Switch />
                </Form.Item>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Se usa como artículo comodín en promociones
                </div>
              </div>
            </Col>
          )}
          <Col xs={24} md={12} xl={8}>
            <div style={{ marginBottom: 16 }}>
              <Form.Item name="modificaPrecio" label="Modifica Precio" valuePropName="checked" style={{ marginBottom: 4 }}>
                <Switch />
              </Form.Item>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>
                Permite modificar el precio en los documentos
              </div>
            </div>
          </Col>
          <Col xs={24} md={12} xl={8}>
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
    </>
  );

  const renderTabAuditoria = () => {
    if (mode !== 'editar' || !data) return null;
    return (
      <Card
        className="paces-card"
        size="small"
        title="Auditoría"
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
    );
  };

  const tabItems = [
    {
      key: 'datos',
      label: 'Datos',
      children: renderTabDatos(),
    },
    {
      key: 'impuestos',
      label: `Impuestos (${selectedImpuestos.length})`,
      children: renderTabImpuestos(),
    },
    ...(!esServicio
      ? [{
          key: 'componentes',
          label: `Componentes (${componentes.length})`,
          children: renderTabComponentes(),
        }]
      : []),
    ...(!esServicio
      ? [{
          key: 'inventario',
          label: 'Inventario y Logística',
          children: renderTabInventario(),
        }]
      : []),
    {
      key: 'configuracion',
      label: 'Estado y Configuración',
      children: renderTabConfiguracion(),
    },
    ...(mode === 'editar'
      ? [{ key: 'auditoria', label: 'Auditoría', children: renderTabAuditoria() }]
      : []),
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar el formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { void recargarDatos(); }}>
              Reintentar
            </Button>
          }
        />
      )}

      <FormularioToolbar
        saving={saving}
        bloqueado={saving}
        mode={mode}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      >
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {mode === 'editar'
            ? `${esServicio ? 'Editar Servicio' : 'Editar Producto'}: ${codigo}`
            : esServicio ? 'Nuevo Servicio' : 'Nuevo Producto'}
        </h4>
      </FormularioToolbar>

      <Form form={form} layout="vertical" size="middle" disabled={saving}>
        <Tabs defaultActiveKey="datos" type="card" items={tabItems} />

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

        {!esServicio && (
          <ImportarComponentesModal
            open={modalImportarComponentesOpen}
            sucursal={sucursalProductos}
            onClose={() => setModalImportarComponentesOpen(false)}
            onConfirm={handleConfirmarImportacionComponentes}
          />
        )}
      </Form>
    </div>
  );
};

export default ProductoFormulario;

