import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Spin, Button, Space, Row, Col, Divider, Grid,
  message, Form, Input, InputNumber, DatePicker, Typography, Modal, Dropdown, Alert, Skeleton, Tooltip, Drawer, Descriptions,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ShoppingCartOutlined,
  DownloadOutlined,
  SyncOutlined,
  DatabaseOutlined,
  IdcardOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO, SuplidorGORC } from '../../types/generadorOrc';
import type { ProductoDTO, UnidadMedidaDTO } from '../../types/productos';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency, formatNumber, toTitleCase, formatDate, parseDateRaw, toISOFormat, extraerMensajeError } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;

const SUCURSALES = ['OP', 'HR', 'VH'];



// ===== Cálculo de fila GORC =====
function calcularFilaGORC(fila: DetalleGeneradorDTO): DetalleGeneradorDTO {
  const cantTotal = Object.values(fila.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const pctImp = fila.impuesto?.porcentaje ?? 0;

  const subTotal = Math.round(cantTotal * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const base = subTotal - descuento;
  const impuestos = Math.round(base * (pctImp / 100) * 100) / 100;
  const total = Math.round((base + impuestos) * 100) / 100;

  return { ...fila, subTotal, descuento, impuestos, total };
}

function filaVaciaGORC(): DetalleGeneradorDTO {
  return {
    codigo: '',
    referencia: '',
    producto: '',
    medida: null,
    impuesto: null,
    cantidades: { OP: 0, HR: 0, VH: 0 },
    cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
    existencias: { OP: 0, HR: 0, VH: 0 },
    existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
    costo: 0,
    margen: 0,
    precioSugerido: 0,
    subTotal: 0,
    porcentajeDescuento: 0,
    descuento: 0,
    impuestos: 0,
    total: 0,
  };
}

function redondearAlFactor(precio: number, factor: number): number {
  if (!factor || factor <= 0) return precio;
  return Math.ceil(precio / factor) * factor;
}



// ===== BuscarSuplidorModal =====
interface BuscarSuplidorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (suplidor: SuplidorGORC) => void;
  sucursal: number;
}

const BuscarSuplidorModal: React.FC<BuscarSuplidorModalProps> = ({ open, onClose, onSelect, sucursal }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const cargar = useCallback(async (filtro?: string) => {
    setLoading(true);
    try {
      const { proveedorApi } = await import('../../api/proveedorApi');
      const res = await proveedorApi.filtrar(sucursal, filtro || undefined, filtro || undefined);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error('Error al cargar suplidores');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sucursal]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v || '') },
    { title: 'RNC', dataIndex: 'identificacion', key: 'rnc', width: 140 },
  ];

  return (
    <Modal title="Buscar Suplidor" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={(val) => { setSearch(val); cargar(val); }}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={data}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => {
            const suplidor: SuplidorGORC = {
              idExterno: record.idExterno || record.codigo || '',
              codigo: record.codigo || '',
              nombre: record.nombre || '',
              diasCredito: record.diasCredito || 0,
              rnc: record.identificacion || '',
              identificacion: record.identificacion || '',
              telefono: record.telefono || '',
              direccion: record.direccion || '',
            };
            onSelect(suplidor);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== ModosCargaModal =====
interface ModosCargaModalProps {
  open: boolean;
  onClose: () => void;
  onSeleccionarMaestro: () => void;
  onSeleccionarPlantilla: () => void;
}

const ModosCargaModal: React.FC<ModosCargaModalProps> = ({ open, onClose, onSeleccionarMaestro, onSeleccionarPlantilla }) => (
  <Modal title="Cargar productos" open={open} onCancel={onClose} footer={null} width={500} destroyOnHidden>
    <Row gutter={[16, 16]}>
      <Col span={12}>
        <Card
          hoverable
          onClick={() => { onSeleccionarMaestro(); onClose(); }}
          style={{ textAlign: 'center', cursor: 'pointer' }}
        >
          <DatabaseOutlined style={{ fontSize: 36, color: 'var(--paces-primary)', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Maestro</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
            Cargar todos los productos del suplidor con datos anteriores
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card
          hoverable
          onClick={() => { onSeleccionarPlantilla(); onClose(); }}
          style={{ textAlign: 'center', cursor: 'pointer' }}
        >
          <ShoppingCartOutlined style={{ fontSize: 36, color: 'var(--paces-primary)', marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Plantilla</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginTop: 4 }}>
            Cargar desde una plantilla o conteo físico
          </div>
        </Card>
      </Col>
    </Row>
  </Modal>
);

// ===== Componente principal =====
const GeneradorORCFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const isLarge = screens.xxl === true;

  // ===== Estados =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cargandoMaestro, setCargandoMaestro] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);

  const [data, setData] = useState<GeneradorOrdenCompraDTO | null>(null);
  const [detalles, setDetalles] = useState<DetalleGeneradorDTO[]>([]);

  const [selectedSuplidor, setSelectedSuplidor] = useState<SuplidorGORC | null>(null);
  const [suplidorSearchText, setSuplidorSearchText] = useState('');

  const [fechaCierreContable, setFechaCierreContable] = useState<dayjs.Dayjs | null>(null);
  const [factorRedondeo, setFactorRedondeo] = useState<number>(5);

  const [suplidorModalOpen, setSuplidorModalOpen] = useState(false);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [modosCargaModalOpen, setModosCargaModalOpen] = useState(false);

  const [detalleSearch, setDetalleSearch] = useState('');
  const [redondeoComercial, setRedondeoComercial] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);

  // Análisis / monitor
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [analisisDetalle, setAnalisisDetalle] = useState<DetalleGeneradorDTO | null>(null);

  const editValuesRef = useRef<Record<string, number>>({});
  const navigationConfirmedRef = useFormularioNavigation();

  const [form] = Form.useForm();

  // ===== Cierre contable =====
  useEffect(() => {
    parametrosApi.obtenerFechaCierre(sucursalActiva)
      .then((fecha) => setFechaCierreContable(dayjs(fecha)))
      .catch(() => {});
    parametrosApi.obtenerFechaCierreInventario(sucursalActiva)
      .then((fecha) => {
        if (fecha) setFechaCierreContable(dayjs(fecha));
      })
      .catch(() => {});
  }, [sucursalActiva]);

  // ===== Carga inicial y título =====
  useEffect(() => {
    setActiveModule('FGORC');
    const pageTitle = mode === 'crear' ? 'Nuevo Generador ORC' : 'Editar Generador ORC';
    setPageTitleOverride(pageTitle);

    unidadMedidaApi.obtenerListado(sucursalActiva).then(setMedidasCache).catch(() => {});

    if (mode === 'crear') {
      form.setFieldsValue({ fecha: dayjs() });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);

  // ===== Cargar datos si es edición =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    generadorOrcApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`GORC-${res.numero} — Editar`);
        const detallesMapeados = (res.detalles || []).map((d) => calcularFilaGORC(d));
        setDetalles(detallesMapeados);
        setLoadVersion((v) => v + 1);

        if (res.suplidor) {
          setSelectedSuplidor(res.suplidor);
          setSuplidorSearchText(toTitleCase(res.suplidor.nombre));
        }

        const fechaVal = res.fecha ? dayjs(res.fecha) : null;
        form.setFieldsValue({
          fecha: fechaVal,
          numero: res.numero || '',
          notas: res.notas || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FGORC');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  // ===== Handlers de navegación =====
  const handleCancelar = () => {
    Modal.confirm({
      title: '¿Descartar cambios?',
      icon: <ExclamationCircleOutlined />,
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Sí, descartar',
      cancelText: 'Continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        navigate('/FGORC');
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    if (!selectedSuplidor) return 'Debe seleccionar un suplidor antes de guardar.';
    if (detalles.length === 0) return 'Debe agregar al menos un producto al generador.';
    const tieneCantidad = detalles.some((d) => {
      const total = Object.values(d.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
      return total > 0;
    });
    if (!tieneCantidad) return 'Al menos un producto debe tener una cantidad mayor a cero.';
    const fecha = form.getFieldValue('fecha');
    if (!fecha) return 'La fecha del documento es requerida.';
    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): GeneradorOrdenCompraDTO => {
    const values = form.getFieldsValue();
    const base = data || ({} as GeneradorOrdenCompraDTO);

    const fechaDoc = values.fecha
      ? (typeof values.fecha === 'object' && (values.fecha as dayjs.Dayjs).toDate
        ? toISOFormat((values.fecha as dayjs.Dayjs).toDate())
        : values.fecha)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const totalImp = detalles.reduce((s, d) => s + (d.impuestos || 0), 0);
    const total = detalles.reduce((s, d) => s + (d.total || 0), 0);

    return {
      idExterno: base.idExterno || '',
      numero: base.numero || '',
      fecha: fechaDoc,
      suplidor: selectedSuplidor,
      almacen: base.almacen || '',
      notas: values.notas || '',
      estado: base.estado || 0,
      subTotal: Math.round(totalSub * 100) / 100,
      descuento: Math.round(totalDesc * 100) / 100,
      impuestos: Math.round(totalImp * 100) / 100,
      redondeo: redondeoComercial ? 1 : 0,
      total: Math.round(total * 100) / 100,
      creadoPor: base.creadoPor || '',
      validadoPor: base.validadoPor || '',
      logs: base.logs || [],
      detalles: detalles.map((d) => calcularFilaGORC(d)),
    };
  };

  // ===== Guardar =====
  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const result = await generadorOrcApi.crear(sucursalActiva, dto);
        message.success('Generador ORC creado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/FGORC/${result.idExterno}`);
      } else {
        await generadorOrcApi.actualizar(sucursalActiva, dto);
        message.success('Generador ORC actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/FGORC/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handler de suplidor =====
  const handleSuplidorSelect = (suplidor: SuplidorGORC) => {
    if (detalles.length > 0) {
      Modal.confirm({
        title: 'Cambiar suplidor',
        icon: <ExclamationCircleOutlined />,
        content: `Al cambiar el suplidor a "${toTitleCase(suplidor.nombre)}", los productos actuales serán eliminados. ¿Desea continuar?`,
        okText: 'Sí, cambiar',
        cancelText: 'Cancelar',
        okButtonProps: { danger: true },
        onOk: () => {
          setSelectedSuplidor(suplidor);
          setSuplidorSearchText(toTitleCase(suplidor.nombre));
          form.setFieldsValue({ suplidorCodigo: suplidor.codigo });
          setDetalles([]);
          // Preguntar modo de carga
          setModosCargaModalOpen(true);
        },
      });
    } else {
      setSelectedSuplidor(suplidor);
      setSuplidorSearchText(toTitleCase(suplidor.nombre));
      form.setFieldsValue({ suplidorCodigo: suplidor.codigo });
      // Si no hay detalles, abrir directamente el modal de carga
      setModosCargaModalOpen(true);
    }
  };

  const handleCargarMaestro = useCallback(async () => {
    if (!selectedSuplidor) {
      message.warning('Seleccione un suplidor primero');
      return;
    }

    setCargandoMaestro(true);
    try {
      // 1. Obtener productos del suplidor
      const productos = await productoApi.obtenerProductosPorSuplidor(sucursalActiva, selectedSuplidor.codigo);

      if (!productos || productos.length === 0) {
        message.info('No se encontraron productos para este suplidor.');
        setDetalles([]);
        return;
      }

      // 2. Obtener códigos de productos
      const codigos = productos.map((p) => p.codigo);

      // 3. Obtener datos anteriores (costos, márgenes)
      let datosAnteriores: any[] = [];
      try {
        datosAnteriores = await generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos);
      } catch {
        // Si falla datos anteriores, continuamos sin ellos
      }

      const mapDatosAnteriores = new Map<string, any>();
      (datosAnteriores || []).forEach((d) => {
        if (d.codigo) mapDatosAnteriores.set(d.codigo, d);
      });

      // 4. Construir filas
      const filas: DetalleGeneradorDTO[] = productos.map((prod: ProductoDTO) => {
        const hist = mapDatosAnteriores.get(prod.codigo);
        const impuestoCompra =
          (prod.impuestos || []).find((i) => i.impuesto?.ambito === 0)?.impuesto || null;

        return {
          codigo: prod.codigo,
          referencia: prod.referenciaInterna || '',
          producto: prod.nombre || '',
          medida: prod.unidadMedida
            ? { id: prod.unidadMedida.idExterno ?? 0, nombre: prod.unidadMedida.nombre || '' }
            : null,
          impuesto: impuestoCompra,
          cantidades: { OP: 0, HR: 0, VH: 0 },
          cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
          existencias: { OP: 0, HR: 0, VH: 0 },
          existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
          costo: hist?.costo ?? prod.ultimoCosto ?? 0,
          margen: hist?.margen ?? 0,
          precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
          subTotal: 0,
          porcentajeDescuento: (hist?.porcientoDescuento ?? 0) / 100,
          descuento: 0,
          impuestos: 0,
          total: 0,
        };
      });

      setDetalles(filas.map((f) => calcularFilaGORC(f)));
      setLoadVersion((v) => v + 1);
      message.success(`${filas.length} productos cargados del maestro`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar maestro');
      message.error(msg);
    } finally {
      setCargandoMaestro(false);
    }
  }, [selectedSuplidor, sucursalActiva]);

  const handleCargarPlantilla = useCallback(() => {
    message.info('Funcionalidad de carga por plantilla próximamente.');
  }, []);

  // ===== Handler de detalle =====
  const handleCeldaCommit = useCallback((rowCodigo: string, campo: string, valor: number) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.codigo !== rowCodigo) return d;
        let actualizado = { ...d };

        if (campo.startsWith('cantidades.')) {
          const suc = campo.split('.')[1];
          actualizado = {
            ...actualizado,
            cantidades: { ...(actualizado.cantidades || {}), [suc]: valor },
          };
        } else if (campo.startsWith('cantidadesBonificadas.')) {
          const suc = campo.split('.')[1];
          actualizado = {
            ...actualizado,
            cantidadesBonificadas: { ...(actualizado.cantidadesBonificadas || {}), [suc]: valor },
          };
        } else {
          (actualizado as any)[campo] = valor;
        }

        return calcularFilaGORC(actualizado);
      })
    );
  }, []);

  const handleEliminarDetalle = useCallback((codigo: string) => {
    const filaEliminada = detalles.find((d) => d.codigo === codigo);
    const indexEliminado = detalles.findIndex((d) => d.codigo === codigo);
    if (!filaEliminada) return;

    setDetalles((prev) => prev.filter((d) => d.codigo !== codigo));

    const key = `undo_${codigo}`;
    message.open({
      key,
      type: 'info',
      content: (
        <span>
          Producto eliminado.{' '}
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              setDetalles((prev) => {
                const nueva = [...prev];
                nueva.splice(indexEliminado, 0, filaEliminada);
                return nueva;
              });
              message.destroy(key);
            }}
          >
            Deshacer
          </Button>
        </span>
      ),
      duration: 5,
    });
  }, [detalles]);

  const handleAgregarProducto = () => {
    setProductoModalOpen(true);
  };

  const handleProductoSeleccionado = useCallback(
    (producto: any) => {
      const yaExiste = detalles.some((d) => d.codigo === producto.codigo);
      if (yaExiste) {
        message.warning(`${producto.codigo} ya está en la tabla`);
        return;
      }

      const nuevaFila: DetalleGeneradorDTO = {
        codigo: producto.codigo,
        referencia: producto.referencia || '',
        producto: producto.articulo || '',
        medida: producto.medida || null,
        impuesto: producto.impuesto || null,
        cantidades: { OP: 0, HR: 0, VH: 0 },
        cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
        existencias: { OP: 0, HR: 0, VH: 0 },
        existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
        costo: producto.costo || 0,
        margen: producto.margen || 0,
        precioSugerido: producto.precioSugerido || 0,
        subTotal: 0,
        porcentajeDescuento: 0,
        descuento: 0,
        impuestos: 0,
        total: 0,
      };

      setDetalles((prev) => [...prev, nuevaFila]);
      setProductoModalOpen(false);
      message.success(`${toTitleCase(producto.articulo || '')} agregado`);
    },
    [detalles]
  );

  const handleRecalcularPrecios = useCallback(() => {
    setRecalculando(true);
    setDetalles((prev) =>
      prev.map((d) => ({
        ...d,
        precioSugerido: redondearAlFactor(d.costo * (1 + (d.margen || 0) / 100), factorRedondeo),
      }))
    );
    setRecalculando(false);
    message.success('Precios sugeridos recalculados');
  }, [factorRedondeo]);

  // ===== Refresh =====
  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    generadorOrcApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        const detallesMapeados = (res.detalles || []).map((d) => calcularFilaGORC(d));
        setDetalles(detallesMapeados);
        setLoadVersion((v) => v + 1);
        if (res.suplidor) {
          setSelectedSuplidor(res.suplidor);
          setSuplidorSearchText(toTitleCase(res.suplidor.nombre));
        }
        const fechaVal = res.fecha ? dayjs(res.fecha) : null;
        form.setFieldsValue({ fecha: fechaVal, numero: res.numero || '', notas: res.notas || '' });
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al recargar');
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Totales derivados =====
  const totalesGenerales = useMemo(() => ({
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    impuestos: detalles.reduce((s, d) => s + (d.impuestos || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  }), [detalles]);

  // ===== Detalles filtrados =====
  const detallesFiltrados = useMemo(
    () =>
      detalleSearch
        ? detalles.filter((d) => {
            const q = detalleSearch.toLowerCase();
            return (
              (d.codigo || '').toLowerCase().includes(q) ||
              (d.producto || '').toLowerCase().includes(q) ||
              (d.referencia || '').toLowerCase().includes(q)
            );
          })
        : detalles,
    [detalles, detalleSearch]
  );

  // ===== Columnas de la tabla =====
  const detalleColumns = useMemo(() => {
    const SUC_COLORS: Record<string, string> = {
      OP: 'gorc-band-op',
      HR: 'gorc-band-hr',
      VH: 'gorc-band-vh',
    };

    const sucursalGroup = (suc: string) => ({
      title: suc,
      className: SUC_COLORS[suc] || '',
      children: [
        {
          title: 'Cant.',
          key: `${suc}_cant`,
          width: 80,
          align: 'right' as const,
          render: (_: any, record: DetalleGeneradorDTO) => {
            const refKey = `${record.codigo}_cant_${suc}`;
            return (
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                precision={0}
                controls={false}
                key={`${record.codigo}_${suc}_cant_${loadVersion}`}
                defaultValue={record.cantidades?.[suc] ?? 0}
                onChange={(val) => { editValuesRef.current[refKey] = val ?? 0; }}
                onBlur={() => {
                  const val = editValuesRef.current[refKey] ?? record.cantidades?.[suc] ?? 0;
                  handleCeldaCommit(record.codigo, `cantidades.${suc}`, val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[refKey] ?? record.cantidades?.[suc] ?? 0;
                  handleCeldaCommit(record.codigo, `cantidades.${suc}`, val);
                }}
              />
            );
          },
          shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
            record.cantidades?.[suc] !== prev.cantidades?.[suc],
        },
        {
          title: 'Bonif.',
          key: `${suc}_bonif`,
          width: 75,
          align: 'right' as const,
          render: (_: any, record: DetalleGeneradorDTO) => {
            const refKey = `${record.codigo}_bonif_${suc}`;
            return (
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                precision={0}
                controls={false}
                key={`${record.codigo}_${suc}_bonif_${loadVersion}`}
                defaultValue={record.cantidadesBonificadas?.[suc] ?? 0}
                onChange={(val) => { editValuesRef.current[refKey] = val ?? 0; }}
                onBlur={() => {
                  const val = editValuesRef.current[refKey] ?? record.cantidadesBonificadas?.[suc] ?? 0;
                  handleCeldaCommit(record.codigo, `cantidadesBonificadas.${suc}`, val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[refKey] ?? record.cantidadesBonificadas?.[suc] ?? 0;
                  handleCeldaCommit(record.codigo, `cantidadesBonificadas.${suc}`, val);
                }}
              />
            );
          },
          shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
            record.cantidadesBonificadas?.[suc] !== prev.cantidadesBonificadas?.[suc],
        },
        {
          title: 'Exist.',
          key: `${suc}_exist`,
          width: 75,
          align: 'right' as const,
          responsive: ['sm', 'md', 'lg'] as any,
          render: (_: any, record: DetalleGeneradorDTO) => (
            <span className="gorc-cell-readonly">{record.existencias?.[suc] ?? 0}</span>
          ),
          shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
            record.existencias?.[suc] !== prev.existencias?.[suc],
        },
        {
          title: 'Conteo',
          key: `${suc}_conteo`,
          width: 75,
          align: 'right' as const,
          responsive: ['sm', 'md', 'lg'] as any,
          render: (_: any, record: DetalleGeneradorDTO) => (
            <span className="gorc-cell-readonly">{record.existenciasFisicas?.[suc] ?? 0}</span>
          ),
          shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
            record.existenciasFisicas?.[suc] !== prev.existenciasFisicas?.[suc],
        },
      ],
    });

    return [
      // Columna de código (fija izquierda)
      {
        title: 'Código',
        key: 'codigo',
        width: 90,
        fixed: 'left' as const,
        ellipsis: true,
        render: (_: any, record: DetalleGeneradorDTO) => (
          <Text style={{ fontSize: 12 }}>{record.codigo}</Text>
        ),
      },
      // Grupo Información
      {
        title: 'Información',
        className: 'gorc-band-info',
        children: [
          {
            title: 'Producto',
            key: 'producto',
            width: 200,
            ellipsis: true,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Tooltip title={record.producto}>
                <Text style={{ fontSize: 12 }}>{toTitleCase(record.producto || '')}</Text>
              </Tooltip>
            ),
          },
          {
            title: 'Referencia',
            key: 'referencia',
            width: 110,
            ellipsis: true,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }} className="paces-text-secondary">{record.referencia || '-'}</Text>
            ),
          },
          {
            title: 'Medida',
            key: 'medida',
            width: 100,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{record.medida?.nombre || '-'}</Text>
            ),
          },
          {
            title: 'Costo',
            key: 'costo',
            width: 90,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatCurrency(record.costo || 0)}</Text>
            ),
          },
          {
            title: 'Margen %',
            key: 'margen',
            width: 80,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{(record.margen || 0).toFixed(2)}%</Text>
            ),
          },
          {
            title: 'P. Sugerido',
            key: 'precioSugerido',
            width: 100,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatCurrency(record.precioSugerido || 0)}</Text>
            ),
          },
        ],
      },
      // Grupos por sucursal
      sucursalGroup('OP'),
      sucursalGroup('HR'),
      sucursalGroup('VH'),
      // Grupo Totales
      {
        title: 'Totales',
        className: 'gorc-band-totales',
        children: [
          {
            title: 'SubTotal',
            key: 'subTotal',
            width: 110,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatCurrency(record.subTotal || 0)}</Text>
            ),
          },
          {
            title: '% Desc.',
            key: 'porcentajeDescuento',
            width: 80,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => {
              const refKey = `${record.codigo}_pctDesc`;
              return (
                <InputNumber
                  size="small"
                  style={{ width: '100%' }}
                  styles={{ input: { textAlign: 'right' } }}
                  min={0}
                  max={100}
                  precision={2}
                  controls={false}
                  key={`${record.codigo}_pctDesc_${loadVersion}`}
                  defaultValue={record.porcentajeDescuento ?? 0}
                  onChange={(val) => { editValuesRef.current[refKey] = val ?? 0; }}
                  onBlur={() => {
                    const val = editValuesRef.current[refKey] ?? record.porcentajeDescuento ?? 0;
                    handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                  }}
                  onPressEnter={() => {
                    const val = editValuesRef.current[refKey] ?? record.porcentajeDescuento ?? 0;
                    handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                  }}
                />
              );
            },
            shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
              record.porcentajeDescuento !== prev.porcentajeDescuento,
          },
          {
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatCurrency(record.descuento || 0)}</Text>
            ),
          },
          {
            title: 'Impuesto',
            key: 'impuestos',
            width: 100,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatCurrency(record.impuestos || 0)}</Text>
            ),
          },
          {
            title: 'Total',
            key: 'total',
            width: 110,
            align: 'right' as const,
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text strong style={{ fontSize: 12, color: 'var(--paces-primary)' }}>
                {formatCurrency(record.total || 0)}
              </Text>
            ),
          },
        ],
      },
      // Columna acciones (fija derecha)
      {
        title: '',
        key: 'acciones',
        width: 44,
        fixed: 'right' as const,
        render: (_: any, record: DetalleGeneradorDTO) => (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'eliminar',
                  label: 'Eliminar',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleEliminarDetalle(record.codigo),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        ),
      },
    ];
  }, [loadVersion, handleCeldaCommit, handleEliminarDetalle]);

  // ===== Skeleton loading =====
  if (loading) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
          <Skeleton.Button active style={{ width: 100 }} />
          <Skeleton.Button active style={{ width: 90 }} />
        </div>
        <Row gutter={16}>
          <Col xxl={24}>
            <Card className="paces-card" size="small" style={{ marginBottom: 16 }}>
              <Skeleton active paragraph={{ rows: 2 }} />
            </Card>
            <Card className="paces-card" size="small">
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          </Row>
      </div>
    );
  }

  // ===== Estado =====
  const estado = data?.estado ?? 0;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[estado] || { label: 'Borrador', color: 'default' };

  // ===== Toolbar =====

  // ===== Encabezado =====
  const renderEncabezado = () => (
    <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Campo requerido' }]}>
              <DatePicker
                format="YYYY-MM-DD"
                style={{ width: '100%' }}
                disabledDate={(current) => {
                  if (!current) return false;
                  if (fechaCierreContable && current.isBefore(fechaCierreContable, 'day')) return true;
                  if (current.isAfter(dayjs().add(1, 'day'), 'day')) return true;
                  return false;
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Form.Item name="numero" label="N° Documento">
              <Input placeholder="Autogenerado" readOnly />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={12}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
              <div style={{ flex: 1 }}>
                <FloatingField label="Suplidor" required externalValue={suplidorSearchText}>
                  <Input placeholder=" " value={suplidorSearchText} readOnly />
                </FloatingField>
              </div>
              <Button icon={<SearchOutlined />} onClick={() => setSuplidorModalOpen(true)} />
            </div>
            <Form.Item name="suplidorCodigo" hidden><Input /></Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="redondeo" valuePropName="checked">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="redondeo-chk"
                  checked={redondeoComercial}
                  onChange={(e) => setRedondeoComercial(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <label htmlFor="redondeo-chk" style={{ cursor: 'pointer', margin: 0 }}>
                  Redondeo Comercial
                </label>
              </div>
            </Form.Item>
          </Col>
        </Row>
      </Form>
        </Col>
        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totales.subTotal}
              descuento={totales.descuento}
              impuestos={totales.impuestos}
              total={totales.total}
              hideTitle
            />
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Tabla de detalles =====
  const renderDetalles = () => (
    <Card
      className="paces-card"
      size="small"
      title={`Productos (${detalles.length})`}
      style={{ marginBottom: 16 }}
    >
      {/* Botones de acción sobre la tabla */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarProducto} size="small">
          Agregar producto
        </Button>
        {selectedSuplidor && (
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setModosCargaModalOpen(true)}
            loading={cargandoMaestro}
            size="small"
          >
            Cargar Maestro / Plantilla
          </Button>
        )}
        <div style={{ flex: 1 }} />
        <Input.Search
          placeholder="Buscar detalle..."
          allowClear
          style={{ maxWidth: 250 }}
          onSearch={(value) => setDetalleSearch(value)}
          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
        />
      </div>

      {detalles.length > 0 ? (
        <div className="gorc-table">
          <Table<DetalleGeneradorDTO>
            dataSource={detallesFiltrados}
            columns={detalleColumns}
            rowKey="codigo"
            size="small"
            pagination={false}
            scroll={{ x: 1920, y: 'calc(100vh - 480px)' }}
            onRow={(record) => ({
              style: { cursor: 'pointer' },
              onClick: () => {
                setAnalisisDetalle(record);
                setAnalisisOpen(true);
              },
            })}
            summary={() => {
              const COLS_ANTES_TOTALES = 1 + 6 + 4 + 4 + 4; // codigo + info(6) + op(4) + hr(4) + vh(4) = 19
              return (
                <Table.Summary fixed="bottom">
                  <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                    <Table.Summary.Cell index={0} colSpan={COLS_ANTES_TOTALES}>
                      <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES} align="right">
                      <Text strong>{formatCurrency(totalesGenerales.subTotal)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 1} align="right">
                      <span className="paces-text-secondary">—</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 2} align="right">
                      <Text>{formatCurrency(totalesGenerales.descuento)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 3} align="right">
                      <Text>{formatCurrency(totalesGenerales.impuestos)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 4} align="right">
                      <Text strong style={{ color: 'var(--paces-primary)', fontSize: 13 }}>
                        {formatCurrency(totalesGenerales.total)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 5} />
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <ShoppingCartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: '#595959' }}>
            No hay productos en este generador
          </div>
          {selectedSuplidor ? (
            <>
              <div className="paces-text-secondary" style={{ fontSize: 13 }}>
                Usa "Cargar Maestro/Plantilla" para cargar productos del suplidor,
                o "Agregar producto" para añadir uno a uno.
              </div>
              <Space>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => setModosCargaModalOpen(true)}
                >
                  Cargar Maestro / Plantilla
                </Button>
                <Button icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
                  Agregar producto
                </Button>
              </Space>
            </>
          ) : (
            <div className="paces-text-secondary" style={{ fontSize: 13 }}>
              Primero selecciona un suplidor para cargar productos.
            </div>
          )}
        </div>
      )}

      {/* Alerta de productos sin costo */}
      {detalles.length > 0 && detalles.some((d) => d.costo === 0) && (
        <Alert
          message={`${detalles.filter((d) => d.costo === 0).length} productos sin costo anterior`}
          description="Estos productos no tienen historial de compra con este suplidor. Ingrese el costo manualmente."
          type="warning"
          showIcon
          closable
          style={{ marginTop: 12 }}
        />
      )}
    </Card>
  );

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar saving={saving} estado={estado} onGuardar={handleGuardar} onCancelar={handleCancelar} />

      {loadingError && (
        <Alert
          message="Error al cargar el documento"
          description="No se pudo obtener la información del generador. Verifique su conexión e intente nuevamente."
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={handleRefresh}>Reintentar</Button>}
        />
      )}
      {renderEncabezado()}

      {isLarge ? (
        /* === DESKTOP ≥ lg === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderDetalles()}
          </Col>
          </Row>
      ) : (
        /* === MOBILE < lg === */
        <div>
          {renderDetalles()}
          </div>
      )}

      {/* ===== Modales ===== */}
      <BuscarSuplidorModal
        open={suplidorModalOpen}
        onClose={() => setSuplidorModalOpen(false)}
        onSelect={handleSuplidorSelect}
        sucursal={sucursalActiva}
      />

      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleProductoSeleccionado}
        mode="inventario"
      />

      <ModosCargaModal
        open={modosCargaModalOpen}
        onClose={() => setModosCargaModalOpen(false)}
        onSeleccionarMaestro={handleCargarMaestro}
        onSeleccionarPlantilla={handleCargarPlantilla}
      />

      {/* ===== Monitor de Análisis (Drawer) ===== */}
      <Drawer
        title={
          <span>
            Análisis:{' '}
            <Text strong>{analisisDetalle?.codigo}</Text>
            {analisisDetalle?.producto ? ` — ${toTitleCase(analisisDetalle.producto)}` : ''}
          </span>
        }
        placement="right"
        width={520}
        open={analisisOpen}
        onClose={() => setAnalisisOpen(false)}
      >
        {analisisDetalle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Datos del producto */}
            <Card className="paces-card" size="small" title="Producto">
              <Descriptions column={1} size="small" styles={{ label: { fontWeight: 500 } }}>
                <Descriptions.Item label="Código">{analisisDetalle.codigo}</Descriptions.Item>
                <Descriptions.Item label="Producto">
                  {toTitleCase(analisisDetalle.producto || '')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia">
                  {analisisDetalle.referencia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Medida">
                  {analisisDetalle.medida?.nombre || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Costos y precios */}
            <Card className="paces-card" size="small" title="Costos y Precios">
              <Descriptions column={1} size="small" styles={{ label: { fontWeight: 500 } }}>
                <Descriptions.Item label="Costo">
                  <Text strong>{formatCurrency(analisisDetalle.costo || 0)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Margen">
                  {(analisisDetalle.margen || 0).toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="Precio Sugerido">
                  {formatCurrency(analisisDetalle.precioSugerido || 0)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Existencias por sucursal */}
            <Card className="paces-card" size="small" title="Existencias por Sucursal">
              <Table
                dataSource={[...SUCURSALES]}
                rowKey={(s) => s}
                size="small"
                pagination={false}
                columns={[
                  { title: 'Sucursal', dataIndex: 'item', key: 'sucursal', width: 80,
                    render: (_: any, __: any, idx: number) => SUCURSALES[idx] },
                  { title: 'Cantidad', key: 'cant', width: 90, align: 'right' as const,
                    render: (_: any, suc: string) => formatNumber(analisisDetalle.cantidades?.[suc] ?? 0) },
                  { title: 'Bonificación', key: 'bonif', width: 100, align: 'right' as const,
                    render: (_: any, suc: string) => formatNumber(analisisDetalle.cantidadesBonificadas?.[suc] ?? 0) },
                  { title: 'Existencia', key: 'exist', width: 90, align: 'right' as const,
                    render: (_: any, suc: string) => formatNumber(analisisDetalle.existencias?.[suc] ?? 0) },
                  { title: 'Conteo', key: 'conteo', width: 80, align: 'right' as const,
                    render: (_: any, suc: string) => formatNumber(analisisDetalle.existenciasFisicas?.[suc] ?? 0) },
                ]}
              />
            </Card>

            {/* Totales del detalle */}
            <Card className="paces-card" size="small" title="Totales">
              <Descriptions column={1} size="small" styles={{ label: { fontWeight: 500 } }}>
                <Descriptions.Item label="SubTotal">
                  {formatCurrency(analisisDetalle.subTotal || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="% Descuento">
                  {(analisisDetalle.porcentajeDescuento || 0).toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="Descuento">
                  {formatCurrency(analisisDetalle.descuento || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="Impuesto">
                  {formatCurrency(analisisDetalle.impuestos || 0)}
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                  <Text strong style={{ color: 'var(--paces-primary)' }}>
                    {formatCurrency(analisisDetalle.total || 0)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default GeneradorORCFormulario;
