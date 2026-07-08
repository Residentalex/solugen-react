import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Avatar, Card, Table, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Checkbox, Select,
  message, Form, Input, InputNumber, DatePicker, Typography, Modal, Dropdown, Alert, Skeleton, Drawer, Descriptions,
  Tooltip, Empty,
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
  CalendarOutlined,
  BarChartOutlined,
  EyeOutlined,
  ShopOutlined,
  UploadOutlined,
  SwapOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ExportOutlined,
  RollbackOutlined,
  UndoOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { productoApi } from '../../api/productoApi';
import { parametrosApi } from '../../api/parametrosApi';
import { configModuloApi } from '../../api/configModuloApi';
import { conteoApi } from '../../api/conteoApi';
import AgregarProductoGORCModal from '../../components/AgregarProductoGORCModal/AgregarProductoGORCModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import type { GeneradorOrdenCompraDTO, DetalleGeneradorDTO, SuplidorGORC } from '../../types/generadorOrc';
import type { ProductoDTO, UnidadMedidaDTO } from '../../types/productos';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import { companiaApi } from '../../api/companiaApi';
import PermissionGate from '../../components/PermissionGate';

import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { useScreenConfig } from '../../hooks/useScreenConfig';
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
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

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
        ref={searchRef}
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

// ===== BuscarPlantillaGORCModal =====
interface BuscarPlantillaGORCModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (plantilla: any) => void;
  codigoSuplidor: string;
}

const BuscarPlantillaGORCModal: React.FC<BuscarPlantillaGORCModalProps> = ({ open, onClose, onSelect, codigoSuplidor }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conteoApi.obtenerPlantillas(sucursalActiva, codigoSuplidor);
      setData(Array.isArray(res) ? res : []);
    } catch {
      message.error('Error al cargar plantillas');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, codigoSuplidor]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.trim().toLowerCase();
    return data.filter((r) => r.codigo?.toLowerCase().includes(term));
  }, [data, search]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 150 },
    { title: 'Suplidor', dataIndex: 'suplidor', key: 'suplidor', ellipsis: true,
      render: (v: string) => toTitleCase(v || '') },
  ];

  return (
    <Modal title="Buscar Plantilla de Conteo" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Input.Search
        placeholder="Buscar por código..."
        allowClear
        onSearch={(val) => setSearch(val)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={filtered}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

// ===== SeleccionarConteosModal =====
interface SeleccionarConteosModalProps {
  open: boolean;
  onClose: () => void;
  conteos: any[];
  onConfirm: (selectedIds: React.Key[]) => void;
}

const SeleccionarConteosModal: React.FC<SeleccionarConteosModalProps> = ({ open, onClose, conteos, onConfirm }) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (open) setSelectedRowKeys([]);
  }, [open]);

  const getKey = (r: any) => r.idExterno || r.inventid || r.id;
  const getSucursal = (r: any) => r.compania?.prefijo || r.compania?.centroCosto || `suc-${r.sucursal}`;

  const sucursalesSeleccionadas = conteos
    .filter((c) => selectedRowKeys.includes(getKey(c)))
    .map(getSucursal);

  const columnas = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 120,
      render: (_: any, r: any) => r.noinvent || r.documento || '-' },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 95,
      render: (v: string) => formatDate(v) },
    { title: 'Almacén', key: 'codalm', width: 120,
      render: (_: any, r: any) => toTitleCase(r.almacen || '') || r.codigoAlmacen || '-' },
    { title: 'Sucursal', key: 'codsuc', width: 90,
      render: (_: any, r: any) => getSucursal(r) },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      const sucsNuevas = conteos
        .filter((c) => keys.includes(getKey(c)))
        .map(getSucursal);
      const sucDuplicada = sucsNuevas.some((a) =>
        sucsNuevas.filter((x) => x === a).length > 1
      );
      if (sucDuplicada) return;
      setSelectedRowKeys(keys);
    },
    getCheckboxProps: (record: any) => {
      const suc = getSucursal(record);
      const yaSeleccionado = sucursalesSeleccionadas.includes(suc) && !selectedRowKeys.includes(getKey(record));
      return { disabled: yaSeleccionado };
    },
  };

  return (
    <Modal
      title="Seleccionar conteos físicos"
      open={open}
      onCancel={onClose}
      width={800}
      destroyOnHidden
      okText="Cargar seleccionados"
      onOk={() => onConfirm(selectedRowKeys)}
      okButtonProps={{ disabled: selectedRowKeys.length === 0 }}
    >
      <p style={{ marginBottom: 12 }} className="paces-text-secondary">
        Seleccione uno o más conteos físicos (máximo uno por almacén) para cargar sus productos.
      </p>
      <Table
        dataSource={conteos}
        columns={columnas}
        rowKey={(r) => r.idExterno || r.inventid || r.id}
        rowSelection={rowSelection}

        size="small"
        pagination={false}
        scroll={{ y: 400 }}
      />
    </Modal>
  );
};

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
  const { screenCode, documentCode } = useScreenConfig('FGORC');
  const isLarge = screens.xxl === true;
  const unidadBase = useCompanyStore((s) => s.data.unidadBase) as UnidadMedidaDTO | null;

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

  // Cargar factor de redondeo desde configuracion por modulo
  useEffect(() => {
    configModuloApi.obtenerPorClave(sucursalActiva, 'GORC', 'FACTOR_REDONDEO')
      .then((cfg) => {
        if (cfg?.valor) {
          const parsed = parseInt(cfg.valor, 10);
          setFactorRedondeo(!isNaN(parsed) && parsed > 0 ? parsed : 5);
        }
      })
      .catch(() => {
        console.warn('[GORC] No se pudo obtener FACTOR_REDONDEO, usando default 5');
      });
  }, [sucursalActiva]);

  const [suplidorModalOpen, setSuplidorModalOpen] = useState(false);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [modosCargaModalOpen, setModosCargaModalOpen] = useState(false);
  const [plantillaModalOpen, setPlantillaModalOpen] = useState(false);
  const [seleccionarConteosOpen, setSeleccionarConteosOpen] = useState(false);
  const [conteosPlantilla, setConteosPlantilla] = useState<any[]>([]);

  const [detalleSearch, setDetalleSearch] = useState('');
  const [redondeoComercial, setRedondeoComercial] = useState(false);
  const [modoDescuento, setModoDescuento] = useState<'porcentaje' | 'pesos'>('porcentaje');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [medidasCache, setMedidasCache] = useState<UnidadMedidaDTO[]>([]);
  const [conteoDetallesData, setConteoDetallesData] = useState<any[] | null>(null);
  const [maestroDetallesData, setMaestroDetallesData] = useState<any[] | null>(null);
  const [codigoInput, setCodigoInput] = useState('');

  // Selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Análisis / monitor
  const [analisisOpen, setAnalisisOpen] = useState(false);
  const [analisisDetalle, setAnalisisDetalle] = useState<DetalleGeneradorDTO | null>(null);
  const [analisisData, setAnalisisData] = useState<Array<{
    sucursal: number;
    sucursalNombre: string;
    codigo: string;
    nombre: string;
    fecha: string;
    documento: string;
    cantidad: number;
    resumen?: { ventasSinComponentes: number; ventasConComponentes: number; salidas: number; devolucionesCompra: number; devolucionesVenta: number };
  }>>([]);
  const [analisisLoading, setAnalisisLoading] = useState(false);
  const [analisisError, setAnalisisError] = useState(false);
  const [analisisResumenLoading, setAnalisisResumenLoading] = useState(false);

  // Modal movimientos
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState<string>('');
  const [movimientosData, setMovimientosData] = useState<Array<{
    transacid: number;
    tipoDocumento: string;
    fecha: string;
    documento: string;
    cantidad: number;
    descripcion: string;
  }>>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  useEffect(() => {
    if (!analisisOpen || !analisisDetalle) return;

    const SUCURSALES = [
      { id: 0, nombre: 'OP' },
      { id: 1, nombre: 'HR' },
      { id: 2, nombre: 'VH' },
    ];

    setAnalisisData([]);
    setAnalisisLoading(true);
    setAnalisisError(false);

    // Fase 1: 3 llamadas paralelas (una por sucursal)
    Promise.allSettled(
      SUCURSALES.map((s) =>
        entradaAlmacenApi.obtenerUltimasEntradasPorSucursal(s.id, analisisDetalle.codigo)
          .then((data) => {
            if (data && data.length > 0) {
              const item = data[0];
              return { ...item, sucursal: s.id, sucursalNombre: s.nombre };
            }
            return { sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0 };
          })
          .catch(() => ({
            sucursal: s.id, sucursalNombre: s.nombre, codigo: analisisDetalle.codigo, nombre: '', fecha: null as any, documento: '', cantidad: 0
          }))
      )
    ).then((results) => {
      const datos = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter((d): d is NonNullable<typeof d> => d !== null);
      setAnalisisData(datos);
      setAnalisisLoading(false);

      // Fase 2: resumen movimientos para las que sí tienen fecha
      const conDatos = datos.filter((d) => d?.fecha);
      if (conDatos.length > 0) {
        setAnalisisResumenLoading(true);
        Promise.allSettled(
          conDatos.map((item) =>
            entradaAlmacenApi.obtenerResumenMovimientosPosteriores(
              item.sucursal, analisisDetalle.codigo, dayjs(item.fecha).format('YYYYMMDDHHmmss'), item.sucursal
            )
            .then((resumen) => ({ sucursal: item.sucursal, resumen }))
            .catch(() => ({ sucursal: item.sucursal, resumen: null }))
          )
        ).then((res) => {
          setAnalisisData((prev) =>
            prev.map((item) => {
              const found = res.find(
                (r) => r.status === 'fulfilled' && r.value?.sucursal === item?.sucursal
              );
              return found?.status === 'fulfilled' && found.value?.resumen
                ? { ...item, resumen: found.value.resumen }
                : item;
            })
          );
          setAnalisisResumenLoading(false);
        });
      }
    }).catch(() => {
      setAnalisisError(true);
      setAnalisisLoading(false);
    });
  }, [analisisOpen, analisisDetalle]);

  const editValuesRef = useRef<Record<string, number>>({});
  const navigationConfirmedRef = useFormularioNavigation();
  const codigoInputRef = useRef<HTMLInputElement>(null);
  const selectedSuplidorRef = useRef(selectedSuplidor);
  const plantillaDetallesRef = useRef<Map<string, any>>(new Map());
  useEffect(() => { selectedSuplidorRef.current = selectedSuplidor; }, [selectedSuplidor]);

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
    setActiveModule(screenCode);
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
          notas: res.notas || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FGORC', { replace: true });
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
        navigate('/FGORC', { replace: true });
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
      redondeo: redondeoComercial,
      total: Math.round(total * 100) / 100,
      creadoPor: null,
      validadoPor: null,
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
        navigate(`/FGORC/${result.idExterno}`, { replace: true });
      } else {
        await generadorOrcApi.actualizar(sucursalActiva, dto);
        message.success('Generador ORC actualizado correctamente');
        navigationConfirmedRef.current = true;
        navigate(`/FGORC/${id}`, { replace: true });
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
    const suplidor = selectedSuplidorRef.current;
    if (!suplidor) {
      message.warning('Seleccione un suplidor primero');
      setCargandoMaestro(false);
      return;
    }
    setCargandoMaestro(true);
    try {
      const productos = await productoApi.obtenerProductosPorSuplidor(sucursalActiva, suplidor.codigo);

      if (!productos || productos.length === 0) {
        message.info('No se encontraron productos para este suplidor.');
        setDetalles([]);
        return;
      }

      const codigos = productos.map((p) => p.codigo);

      let datosAnteriores: any[] = [];
      try {
        datosAnteriores = await generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos);
      } catch {}

      const mapDatosAnteriores = new Map<string, any>();
      (datosAnteriores || []).forEach((d) => {
        if (d.codigo) mapDatosAnteriores.set(d.codigo, d);
      });

      // Construir datos enriquecidos (para guardar en memoria si da NO)
      const todosProductosMaestro = productos.map((prod: ProductoDTO) => {
        const hist = mapDatosAnteriores.get(prod.codigo);
        const impuestoCompra =
          (prod.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
        return {
          codigo: prod.codigo,
          articulo: prod.nombre || '',
          referencia: prod.referenciaInterna || '',
          _costo: hist?.costo ?? prod.ultimoCosto ?? 0,
          _margen: hist?.margen ?? 0,
          _precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
          _ultimaCompraFecha: hist?.fecha ?? undefined,
          _porcentajeDescuento: hist?.porcientoDescuento ?? 0,
          _impuesto: impuestoCompra,
          _medida: prod.unidadMedida ? { ...prod.unidadMedida } : unidadBase || null,
          ultimoCosto: hist?.costo ?? prod.ultimoCosto ?? 0,
          medida: prod.unidadMedida ? { ...prod.unidadMedida } : unidadBase || null,
        };
      });

      // Modal de confirmación
      const shouldLoad = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'Cargar productos del maestro',
          icon: <ExclamationCircleOutlined />,
          content: `¿Desea cargar los ${todosProductosMaestro.length} productos del suplidor ${toTitleCase(suplidor.nombre)}?`,
          okText: 'Sí',
          cancelText: 'No',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (shouldLoad) {
        // Cargar directo en la tabla
        const filas: DetalleGeneradorDTO[] = productos.map((prod: ProductoDTO) => {
          const hist = mapDatosAnteriores.get(prod.codigo);
          const impuestoCompra =
            (prod.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
          return {
            codigo: prod.codigo,
            referencia: prod.referenciaInterna || '',
            producto: prod.nombre || '',
            medida: prod.unidadMedida ? { ...prod.unidadMedida } : unidadBase || null,
            impuesto: impuestoCompra,
            cantidades: { OP: 0, HR: 0, VH: 0 },
            cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
            existencias: { OP: 0, HR: 0, VH: 0 },
            existenciasFisicas: { OP: 0, HR: 0, VH: 0 },
            costo: hist?.costo ?? prod.ultimoCosto ?? 0,
            ultimaCompraFecha: hist?.fecha ?? undefined,
            margen: hist?.margen ?? 0,
            precioSugerido: hist?.precioSugerido ?? prod.precio ?? 0,
            subTotal: 0,
            porcentajeDescuento: hist?.porcientoDescuento ?? 0,
            descuento: 0,
            impuestos: 0,
            total: 0,
          };
        });

        setDetalles(filas.map((f) => calcularFilaGORC(f)));
        setLoadVersion((v) => v + 1);
        message.success(`${filas.length} productos cargados del maestro`);
      } else {
        // Guardar en memoria
        setMaestroDetallesData(todosProductosMaestro);
        message.info(`${todosProductosMaestro.length} productos del suplidor guardados en memoria.`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar productos del maestro');
      message.error(msg);
    } finally {
      setCargandoMaestro(false);
    }
  }, [sucursalActiva, unidadBase]);

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
        } else if (campo === 'descuento') {
          const cantTotal = Object.values(actualizado.cantidades || {}).reduce((s, v) => s + (v || 0), 0);
          const subTotal = Math.round((cantTotal * (actualizado.costo || 0)) * 100) / 100;
          actualizado.porcentajeDescuento = subTotal > 0 ? (valor / subTotal) * 100 : 0;
        } else {
          (actualizado as any)[campo] = valor;
        }

        // Recalcular precio sugerido: costo unitario × (1 + margen/100)
        if (campo === 'costo' || campo === 'margen') {
          const factor = actualizado.medida?.factor || 1;
          const costoUnitario = (actualizado.costo || 0) / factor;
          const margen = actualizado.margen || 0;
          actualizado.precioSugerido = Math.round(costoUnitario * (1 + margen / 100) * 100) / 100;
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
        medida: producto.medida || unidadBase || null,
        impuesto: producto.impuesto || null,
        cantidades: { OP: 0, HR: 0, VH: 0 },
        cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
        existencias: { OP: 0, HR: 0, VH: 0 },
        existenciasFisicas: producto.existenciasFisicas ?? { OP: 0, HR: 0, VH: 0 },
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

  // ===== Código rápido (Enter para buscar producto) =====
  const handleCodigoEnter = async () => {
    const codigo = codigoInput.trim();
    if (!codigo) return;
    if (!selectedSuplidor) {
      message.warning('Seleccione un suplidor primero');
      return;
    }
    try {
      const producto = await productoApi.obtenerPorCodigo(sucursalActiva, codigo);
      if (!producto) {
        message.error(`Producto ${codigo} no encontrado`);
        setCodigoInput('');
        codigoInputRef.current?.focus();
        return;
      }

      // Obtener existencias reales por sucursal usando el prefijo de cada compañía
      const fechaStr = dayjs().format('YYYYMMDDHHmmss');
      const existenciasFisicas: Record<string, number> = { OP: 0, HR: 0, VH: 0 };
      const columnasValidas = ['OP', 'HR', 'VH'];

      try {
        const companias = await companiaApi.obtenerTodas(sucursalActiva);

        const companiasFiltradas = (companias || []).filter(
          (c: any) => c.prefijo && columnasValidas.includes(c.prefijo)
        );

        if (companiasFiltradas.length > 0) {
          const resultados = await Promise.allSettled(
            companiasFiltradas.map((c: any) => {
              return generadorOrcApi.obtenerExistencias(c.sucursal ?? 0, [codigo], fechaStr)
                .then((res) => {
                  return {
                    prefijo: c.prefijo as string,
                    total: (res || []).reduce((sum, item) => sum + (item.cantidad || 0), 0)
                  };
                })
            })
          );

          resultados.forEach((r) => {
            if (r.status === 'fulfilled' && r.value) {
              existenciasFisicas[r.value.prefijo] = r.value.total;
            }
          });
        }

      } catch (e) {
        // Silencioso - el error ya se maneja externamente
      }

      // Construir objeto compatible con handleProductoSeleccionado
      const impuestoCompra = (producto.impuestos || []).find((i) => i.impuesto?.ambito === "Compra")?.impuesto || null;
      const productoCompacto = {
        codigo: producto.codigo,
        referencia: producto.referencia || '',
        articulo: producto.nombre || '',
        medida: producto.unidadMedida
          ? { id: Number(producto.unidadMedida.idExterno) ?? 0, nombre: producto.unidadMedida.nombre || '' }
          : null,
        impuesto: impuestoCompra
          ? {
              nombre: impuestoCompra.nombre || '',
              porcentaje: impuestoCompra.porcentaje || 0,
              codigo: impuestoCompra.codigo || '',
              idExterno: impuestoCompra.idExterno || '',
            }
          : null,
        costo: producto.ultimoCosto || 0,
        margen: 0,
        precioSugerido: producto.precio || 0,
        existenciasFisicas,
      };

      Modal.confirm({
        title: 'Producto encontrado',
        icon: <ExclamationCircleOutlined />,
        content: `¿Agregar ${producto.nombre || ''} (${codigo})?`,
        okText: 'Agregar',
        cancelText: 'Cancelar',
        onOk: () => {
          handleProductoSeleccionado(productoCompacto);
          setCodigoInput('');
          setTimeout(() => codigoInputRef.current?.focus(), 100);
        },
        onCancel: () => {
          setCodigoInput('');
          setTimeout(() => codigoInputRef.current?.focus(), 100);
        },
      });
    } catch {
      message.error(`Producto ${codigo} no encontrado`);
      setCodigoInput('');
      codigoInputRef.current?.focus();
    }
  };

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

  const handleCargarConteoCache = useCallback(() => {
    if (!conteoDetallesData || conteoDetallesData.length === 0) {
      message.info('No hay productos de conteo en memoria. Cargue una plantilla primero.');
      return;
    }
    const filas: DetalleGeneradorDTO[] = conteoDetallesData.map((d: any) => ({
      codigo: d.codigo || '',
      referencia: d.referencia || '',
      producto: d.articulo || '',
      medida: d._medida || d.medida || unidadBase || null,
      impuesto: d._impuesto || null,
      cantidades: { OP: 0, HR: 0, VH: 0 },
      cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
      existencias: { OP: 0, HR: 0, VH: 0 },
      existenciasFisicas: {
        OP: d._cantidadesPorPrefijo?.OP || 0,
        HR: d._cantidadesPorPrefijo?.HR || 0,
        VH: d._cantidadesPorPrefijo?.VH || 0,
      },
      costo: d._costo || 0,
      ultimaCompraFecha: d._ultimaCompraFecha || undefined,
      margen: d._margen || 0,
      precioSugerido: d._precioSugerido || 0,
      subTotal: 0,
      porcentajeDescuento: d._porcentajeDescuento || 0,
      descuento: 0,
      impuestos: 0,
      total: 0,
    }));
    setDetalles((prev) => [...prev, ...filas.map((f) => calcularFilaGORC(f))]);
    setLoadVersion((v) => v + 1);
    message.success(`${filas.length} productos cargados desde memoria`);
  }, [conteoDetallesData]);

  const handleCargarPlantilla = useCallback(() => {
    if (!selectedSuplidor) {
      message.warning('Seleccione un suplidor primero');
      return;
    }
    setPlantillaModalOpen(true);
  }, [selectedSuplidor]);

  const handlePlantillaSeleccionada = useCallback(async (plantilla: any) => {
    if (!selectedSuplidor) return;
    setCargandoMaestro(true);
    try {
      const response = await conteoApi.obtenerPorPlantilla(sucursalActiva, plantilla.codigo);
      const conteos = Array.isArray(response) ? response : [];

      if (conteos.length === 0) {
        try {
          const plantillaData = await conteoApi.obtenerPlantilla(sucursalActiva, plantilla.codigo || plantilla.id);
          const detallesPlantilla = plantillaData?.detalles;
          const mapPlantilla = new Map<string, any>();
          detallesPlantilla?.forEach((d: any) => {
            if (d.codigo) mapPlantilla.set(d.codigo, d);
          });
          plantillaDetallesRef.current = mapPlantilla;
          if (detallesPlantilla && detallesPlantilla.length > 0) {
            const codigos = [...new Set(detallesPlantilla.map((d: any) => d.codigo).filter(Boolean))];
            let mapDatosAnteriores = new Map<string, any>();
            let mapImpuestos = new Map<string, any>();
            let mapMedidasFallback = new Map<string, UnidadMedidaDTO>();
            if (codigos.length > 0) {
              try {
                const [datosAnteriores, productos] = await Promise.all([
                  generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos),
                  productoApi.obtenerPorListaCodigos(sucursalActiva, codigos),
                ]);
                (datosAnteriores || []).forEach((d: any) => {
                  if (d.codigo) mapDatosAnteriores.set(d.codigo, d);
                });
                (productos || []).forEach((p: any) => {
                  const impuestoCompra = (p.impuestos || []).find((i: any) => i.impuesto?.ambito === "Compra")?.impuesto || null;
                  if (impuestoCompra) mapImpuestos.set(p.codigo, impuestoCompra);
                  if (p.unidadMedida) {
                    mapMedidasFallback.set(p.codigo, {
                      nombre: p.unidadMedida.nombre || '',
                      codigo: p.unidadMedida.codigo || '',
                      factor: p.unidadMedida.factor ?? 0,
                      idExterno: p.unidadMedida.idExterno ?? 0,
                    });
                  }
                });
              } catch {}
            }

            const filas: DetalleGeneradorDTO[] = detallesPlantilla.map((d: any) => {
              const hist = mapDatosAnteriores.get(d.codigo);
              return {
                codigo: d.codigo || '',
                referencia: d.referencia || '',
                producto: d.producto || d.DESCRIPCION || '',
                medida: d.presentacion
                  ? { nombre: d.presentacion, codigo: '', factor: 1, idExterno: d.presentacionID || 0 }
                  : mapMedidasFallback.get(d.codigo) || unidadBase || null,
                impuesto: mapImpuestos.get(d.codigo) || null,
                cantidades: { OP: 0, HR: 0, VH: 0 },
                cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
                existencias: { OP: 0, HR: 0, VH: 0 },
              existenciasFisicas: {
                OP: (p as any)._cantidadesPorPrefijo?.OP || 0,
                HR: (p as any)._cantidadesPorPrefijo?.HR || 0,
                VH: (p as any)._cantidadesPorPrefijo?.VH || 0,
              },
                costo: hist?.costo ?? 0,
                ultimaCompraFecha: hist?.fecha ?? undefined,
                margen: hist?.margen ?? 0,
                precioSugerido: hist?.precioSugerido ?? 0,
                subTotal: 0,
                porcentajeDescuento: 0,
                descuento: 0,
                impuestos: 0,
                total: 0,
              };
            });

            setConteoDetallesData(detallesPlantilla);

            const shouldLoad = await new Promise<boolean>((resolve) => {
              Modal.confirm({
                title: 'Cargar productos de la plantilla',
                content: `No hay conteos recientes. ¿Desea cargar los ${filas.length} productos definidos en la plantilla?`,
                okText: 'Sí',
                cancelText: 'No',
                onOk: () => resolve(true),
                onCancel: () => resolve(false),
              });
            });

            if (shouldLoad) {
              setDetalles(filas.map((f) => calcularFilaGORC(f)));
              setLoadVersion((v) => v + 1);
              message.success(`${filas.length} productos cargados de la plantilla`);
            } else {
              message.info('Productos de plantilla guardados en memoria.');
            }
            return;
          }
        } catch {}

        message.info('No se encontraron conteos físicos para esta plantilla en los últimos 15 días.');
        setConteosPlantilla([]);
        return;
      }

      setConteosPlantilla(conteos);
      setSeleccionarConteosOpen(true);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al cargar conteos de la plantilla');
      message.error(msg);
    } finally {
      setCargandoMaestro(false);
    }
  }, [sucursalActiva, selectedSuplidor]);

  const handleConteosSeleccionados = useCallback(async (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return;
    setCargandoMaestro(true);
    try {
      const todosDetalles: any[] = [];

      for (const key of selectedKeys) {
        const id = Number(key);
        if (isNaN(id)) continue;
        const conteo = await conteoApi.obtenerPorId(sucursalActiva, id);
        if (conteo && conteo.detalles) {
          const prefijoConteo = conteo.compania?.prefijo || '';
          console.log('[GORC] Conteo ID:', id, 'prefijo:', prefijoConteo, 'detalles:', conteo.detalles?.length);
          for (const d of conteo.detalles) {
            const idx = todosDetalles.findIndex((item: any) => item.codigo === d.codigo);
            if (idx === -1) {
              // Nuevo producto: inicializar _cantidadesPorPrefijo
              todosDetalles.push({
                ...d,
                _cantidadesPorPrefijo: prefijoConteo ? { [prefijoConteo]: d.cantidad || 0 } : {},
              });
            } else {
              // Ya existe: acumular cantidad por prefijo
              if (prefijoConteo && d.cantidad) {
                todosDetalles[idx]._cantidadesPorPrefijo = todosDetalles[idx]._cantidadesPorPrefijo || {};
                todosDetalles[idx]._cantidadesPorPrefijo[prefijoConteo] =
                  (todosDetalles[idx]._cantidadesPorPrefijo[prefijoConteo] || 0) + d.cantidad;
              }
            }
          }
        }
      }

      if (todosDetalles.length === 0) {
        message.info('No se encontraron productos en los conteos seleccionados.');
        setConteoDetallesData(null);
        return;
      }

      const codigos = [...new Set(todosDetalles.map((d: any) => d.codigo).filter(Boolean))];
      let mapDatosAnteriores = new Map<string, any>();
      let mapImpuestos = new Map<string, any>();
      let mapMedidas = new Map<string, UnidadMedidaDTO>();
      if (codigos.length > 0) {
        try {
          const [datosAnteriores, productos] = await Promise.all([
            generadorOrcApi.obtenerDatosAnteriores(sucursalActiva, codigos),
            productoApi.obtenerPorListaCodigos(sucursalActiva, codigos),
          ]);
          (datosAnteriores || []).forEach((d: any) => {
            if (d.codigo) mapDatosAnteriores.set(d.codigo, d);
          });
          (productos || []).forEach((p: any) => {
            const impuestoCompra = (p.impuestos || []).find((i: any) => i.impuesto?.ambito === "Compra")?.impuesto || null;
            if (impuestoCompra) mapImpuestos.set(p.codigo, impuestoCompra);
            if (p.unidadMedida) {
              mapMedidas.set(p.codigo, {
                nombre: p.unidadMedida.nombre || '',
                codigo: p.unidadMedida.codigo || '',
                factor: p.unidadMedida.factor ?? 0,
                idExterno: p.unidadMedida.idExterno ?? 0,
              });
            }
          });
        } catch {}
      }

      // Enriquecer detalles con datos anteriores ANTES de guardar en memoria
      const todosDetallesEnriquecidos = todosDetalles.map((d: any) => {
        const hist = mapDatosAnteriores.get(d.codigo);
        const detallePlantilla = plantillaDetallesRef.current.get(d.codigo);
        return {
          ...d,
          _costo: hist?.costo ?? d.ultimoCosto ?? d.costo ?? 0,
          _margen: hist?.margen ?? 0,
          _precioSugerido: hist?.precioSugerido ?? 0,
          _ultimaCompraFecha: hist?.fecha ?? undefined,
          _porcentajeDescuento: hist?.porcientoDescuento ?? 0,
          _impuesto: mapImpuestos.get(d.codigo) || null,
          _medida: detallePlantilla?.presentacion
            ? { nombre: detallePlantilla.presentacion, codigo: '', factor: 1, idExterno: detallePlantilla.presentacionID || 0 }
            : d.medida || mapMedidas.get(d.codigo) || unidadBase || null,
        };
      });

      setConteoDetallesData(todosDetallesEnriquecidos);

      const shouldLoad = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: 'Cargar productos del conteo',
          content: `¿Desea cargar los ${todosDetallesEnriquecidos.length} productos de los conteos físicos?`,
          okText: 'Sí',
          cancelText: 'No',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (shouldLoad) {
        const filas: DetalleGeneradorDTO[] = todosDetallesEnriquecidos.map((d: any) => ({
          codigo: d.codigo || '',
          referencia: d.referencia || '',
          producto: d.articulo || d.descripcion || '',
          medida: d._medida,
          impuesto: d._impuesto,
          cantidades: { OP: 0, HR: 0, VH: 0 },
          cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
          existencias: { OP: 0, HR: 0, VH: 0 },
          existenciasFisicas: {
            OP: d._cantidadesPorPrefijo?.OP || 0,
            HR: d._cantidadesPorPrefijo?.HR || 0,
            VH: d._cantidadesPorPrefijo?.VH || 0,
          },
          costo: d._costo,
          ultimaCompraFecha: d._ultimaCompraFecha,
          margen: d._margen,
          precioSugerido: d._precioSugerido,
          subTotal: 0,
          porcentajeDescuento: d._porcentajeDescuento,
          descuento: 0,
          impuestos: 0,
          total: 0,
        }));

        setDetalles(filas.map((f) => calcularFilaGORC(f)));
        setLoadVersion((v) => v + 1);
        message.success(`${filas.length} productos cargados de los conteos`);
      } else {
        message.info('Productos de conteos guardados en memoria.');
      }
    } catch (err: any) {
      console.error('[GORC] Error en handleConteosSeleccionados:', err);
      const msg = extraerMensajeError(err, 'Error al cargar detalles de conteos');
      message.error(msg);
    } finally {
      setCargandoMaestro(false);
    }
  }, [sucursalActiva]);

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
        form.setFieldsValue({ fecha: fechaVal, notas: res.notas || '' });
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al recargar');
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode]);

  // ===== Handler Ver Movimientos =====
  const handleVerMovimientos = useCallback(async (item: typeof analisisData[0]) => {
    if (!analisisDetalle) return;
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        analisisDetalle.codigo,
        dayjs(item.fecha).format('YYYYMMDDHHmmss'),
        item.sucursal
      );
      setMovimientosData(data ?? []);
    } catch {
      message.error('Error al cargar movimientos');
      setMovimientosData([]);
    } finally {
      setMovimientosLoading(false);
    }
  }, [sucursalActiva, analisisDetalle]);

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

    const SUC_COLORS_BG: Record<string, string> = {
      OP: '#e6f7e6',  // verde muy claro
      HR: '#e6f0fa',  // azul muy claro
      VH: '#fff3e6',  // naranja muy claro
    };

    const sucursalGroup = (suc: string) => ({
      title: <div style={{ textAlign: 'center' }}>{suc}</div>,
      className: SUC_COLORS[suc] || '',
      children: [
        {
          title: 'Cant.',
          key: `${suc}_cant`,
          width: 90,
          align: 'right' as const,
          onCell: () => ({
            style: { verticalAlign: 'top', backgroundColor: SUC_COLORS_BG[suc] || 'transparent' },
          }),
          render: (_: any, record: DetalleGeneradorDTO) => {
            const refKey = `${record.codigo}_cant_${suc}`;
            return (
              <div>
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
                <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: '18px', textAlign: 'right' }}>
                  Conteo: <strong>{formatNumber(record.existenciasFisicas?.[suc] ?? 0)}</strong>
                </div>
              </div>
            );
          },
        },
      ],
    });

    return [
      // Columna Artículo (unifica código + producto + referencia, fija izquierda)
      {
        title: 'Artículo',
        key: 'articulo',
        width: 280,
        fixed: 'left' as const,
        onCell: () => ({ style: { verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' } }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            {selectionMode && (
              <Checkbox
                checked={selectedRowKeys.includes(record.codigo)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRowKeys((prev) => [...prev, record.codigo]);
                  } else {
                    setSelectedRowKeys((prev) => prev.filter((k) => k !== record.codigo));
                  }
                }}
                style={{ marginTop: 3 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 12, wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>{toTitleCase(record.producto || '')}</div>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5 }}>
                <span>{record.codigo}</span>
                {record.codigo && record.referencia && <span>{' | '}</span>}
                {record.referencia && <span>{record.referencia}</span>}
              </div>
            </div>
            {!selectionMode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <PermissionGate permisoEspecial="pe_ver_analisis_compra">
                  <EyeOutlined
                    style={{ cursor: 'pointer', marginTop: 2, color: 'var(--paces-primary)', fontSize: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnalisisDetalle(record);
                      setAnalisisOpen(true);
                    }}
                  />
                </PermissionGate>
                {record.ultimaCompraFecha && (
                  (() => {
                    const diffDias = dayjs().diff(dayjs(record.ultimaCompraFecha), 'day');
                    if (diffDias > 30) {
                      return (
                        <Tooltip title={`Última compra: ${formatDate(record.ultimaCompraFecha)} (${diffDias} días)`}>
                          <ClockCircleOutlined
                            style={{ color: '#fa8c16', cursor: 'pointer', marginTop: 2, fontSize: 14 }}
                          />
                        </Tooltip>
                      );
                    }
                    return null;
                  })()
                )}
              </div>
            )}
          </div>
        ),
      },
      // Medida
      {
        title: 'Medida',
        key: 'medida',
        width: 110,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <div>
            <Select
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              size="small"
              style={{ width: '100%' }}
              value={record.medida?.idExterno || unidadBase?.idExterno || undefined}
              placeholder="Seleccionar"
              onChange={(val) => {
                const medida = medidasCache.find((m) => m.idExterno === val);
                if (medida) {
                  setDetalles((prev) =>
                    prev.map((d) =>
                      d.codigo === record.codigo
                        ? { ...d, medida: { ...medida } }
                        : d
                    )
                  );
                }
              }}
              options={medidasCache.map((m) => ({
                value: m.idExterno ?? 0,
                label: toTitleCase(m.nombre || ''),
              }))}
            />
            {record.medida?.factor && record.medida.factor > 1 && (
              <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: '18px', marginTop: 2 }}>
                factor: {record.medida.factor}
              </div>
            )}
          </div>
        ),
      },
      // Costo
      {
        title: 'Costo',
        key: 'costo',
        width: 85,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: DetalleGeneradorDTO) => {
          const factor = record.medida?.factor || 1;
          const costoUnitario = factor > 1 ? (record.costo || 0) / factor : record.costo || 0;
          return (
            <div>
              <InputNumber
                size="small"
                style={{ width: '100%' }}
                styles={{ input: { textAlign: 'right' } }}
                min={0}
                precision={2}
                controls={false}
                key={`${record.codigo}_costo_${loadVersion}`}
                defaultValue={record.costo ?? 0}
                onChange={(val) => { editValuesRef.current[`${record.codigo}_costo`] = val ?? 0; }}
                onBlur={() => {
                  const val = editValuesRef.current[`${record.codigo}_costo`] ?? record.costo ?? 0;
                  handleCeldaCommit(record.codigo, 'costo', val);
                }}
                onPressEnter={() => {
                  const val = editValuesRef.current[`${record.codigo}_costo`] ?? record.costo ?? 0;
                  handleCeldaCommit(record.codigo, 'costo', val);
                }}
              />
              {factor > 1 && (
                <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: '18px', textAlign: 'right', marginTop: 2 }}>
                  {formatNumber(costoUnitario)} c/u
                </div>
              )}
            </div>
          );
        },
        shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
          record.costo !== prev.costo,
      },
      // Margen %
      {
        title: 'Margen %',
        key: 'margen',
        width: 90,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            precision={2}
            controls={false}
            key={`${record.codigo}_margen_${loadVersion}`}
            defaultValue={record.margen ?? 0}
            onChange={(val) => { editValuesRef.current[`${record.codigo}_margen`] = val ?? 0; }}
            onBlur={() => {
              const val = editValuesRef.current[`${record.codigo}_margen`] ?? record.margen ?? 0;
              handleCeldaCommit(record.codigo, 'margen', val);
            }}
            onPressEnter={() => {
              const val = editValuesRef.current[`${record.codigo}_margen`] ?? record.margen ?? 0;
              handleCeldaCommit(record.codigo, 'margen', val);
            }}
          />
        ),
        shouldCellUpdate: (record: DetalleGeneradorDTO, prev: DetalleGeneradorDTO) =>
          record.margen !== prev.margen,
      },
      // P. Sugerido
      {
        title: 'Precio',
        key: 'precioSugerido',
        width: 80,
        align: 'right' as const,
        onCell: () => ({ style: { verticalAlign: 'top' } }),
        render: (_: any, record: DetalleGeneradorDTO) => (
          <Text style={{ fontSize: 12 }}>{formatNumber(record.precioSugerido || 0)}</Text>
        ),
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
            width: 90,
            align: 'right' as const,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text style={{ fontSize: 12 }}>{formatNumber(record.subTotal || 0)}</Text>
            ),
          },
          {
            title: 'Descuento',
            key: 'descuento',
            width: 100,
            align: 'right' as const,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_: any, record: DetalleGeneradorDTO) =>
              modoDescuento === 'porcentaje' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <InputNumber
                      size="small"
                      style={{ width: '100%' }}
                      styles={{ input: { textAlign: 'right' } }}
                      min={0}
                      max={100}
                      precision={2}
                      controls={false}
                      key={`${record.codigo}_pct_${modoDescuento}`}
                      defaultValue={record.porcentajeDescuento ?? 0}
                      onChange={(val) => { editValuesRef.current[`${record.codigo}_desc`] = val ?? 0; }}
                      onBlur={() => {
                        const val = editValuesRef.current[`${record.codigo}_desc`] ?? record.porcentajeDescuento ?? 0;
                        handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                      }}
                      onPressEnter={() => {
                        const val = editValuesRef.current[`${record.codigo}_desc`] ?? record.porcentajeDescuento ?? 0;
                        handleCeldaCommit(record.codigo, 'porcentajeDescuento', val);
                      }}
                    />
                    <div
                      onClick={() => setModoDescuento('pesos')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#f5f5f5', border: '1px solid #d9d9d9', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 12, color: '#8c8c8c', userSelect: 'none' }}
                    >
                      %
                    </div>
                  </div>
                  <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
                    {formatNumber(record.descuento || 0)}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <InputNumber
                      size="small"
                      style={{ width: '100%' }}
                      styles={{ input: { textAlign: 'right' } }}
                      min={0}
                      precision={2}
                      controls={false}
                      key={`${record.codigo}_pesos_${modoDescuento}`}
                      defaultValue={record.descuento ?? 0}
                      onChange={(val) => { editValuesRef.current[`${record.codigo}_desc_pesos`] = val ?? 0; }}
                      onBlur={() => {
                        const val = editValuesRef.current[`${record.codigo}_desc_pesos`] ?? record.descuento ?? 0;
                        handleCeldaCommit(record.codigo, 'descuento', val);
                      }}
                      onPressEnter={() => {
                        const val = editValuesRef.current[`${record.codigo}_desc_pesos`] ?? record.descuento ?? 0;
                        handleCeldaCommit(record.codigo, 'descuento', val);
                      }}
                    />
                    <div
                      onClick={() => setModoDescuento('porcentaje')}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, background: '#f5f5f5', border: '1px solid #d9d9d9', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 12, color: '#8c8c8c', userSelect: 'none' }}
                    >
                      $
                    </div>
                  </div>
                  <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
                    {(record.porcentajeDescuento || 0).toFixed(2)}%
                  </div>
                </div>
              ),
          },
          {
            title: 'Impuesto',
            key: 'impuestos',
            width: 100,
            align: 'right' as const,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_: any, record: DetalleGeneradorDTO) => (
              <div style={{ textAlign: 'right' }}>
                <Text style={{ fontSize: 12 }}>{formatNumber(record.impuestos || 0)}</Text>
                {record.impuesto?.nombre && (
                  <div className="paces-text-secondary" style={{ fontSize: 10, lineHeight: '16px' }}>
                    {record.impuesto.nombre}
                  </div>
                )}
              </div>
            ),
          },
          {
            title: 'Total',
            key: 'total',
            width: 110,
            align: 'right' as const,
            onCell: () => ({ style: { verticalAlign: 'top' } }),
            render: (_: any, record: DetalleGeneradorDTO) => (
              <Text strong style={{ fontSize: 12, color: 'var(--paces-primary)' }}>
                {formatNumber(record.total || 0)}
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
  }, [loadVersion, handleCeldaCommit, handleEliminarDetalle, modoDescuento, selectionMode, selectedRowKeys]);

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
    <Card className="paces-card" size="small" title="Datos Generales" extra={<EstadoTag estado={estado} periodo={data?.periodo} />} style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Form.Item name="fecha" rules={[{ required: true, message: 'Campo requerido' }]}>
              <FloatingField label="Fecha" required>
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
              </FloatingField>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={16}>
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
            <Form.Item style={{ marginBottom: 0 }}>
              <Checkbox
                checked={redondeoComercial}
                onChange={(e) => setRedondeoComercial(e.target.checked)}
              >
                Redondeo Comercial
              </Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Form>
        </Col>
        <Col xs={24} xxl={6}>
          <TotalesCard
            subTotal={totalesGenerales.subTotal}
            descuento={totalesGenerales.descuento}
            impuestos={totalesGenerales.impuestos}
            total={totalesGenerales.total}
            hideTitle
          />
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
      style={{ marginBottom: 24 }}
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
        {selectedSuplidor && (
          <Input
            ref={codigoInputRef}
            placeholder="Código + Enter"
            style={{ width: 180, marginLeft: 'auto' }}
            value={codigoInput}
            onChange={(e) => setCodigoInput(e.target.value)}
            onPressEnter={handleCodigoEnter}
            disabled={!selectedSuplidor}
            size="small"
          />
        )}
        {selectionMode && selectedRowKeys.length > 0 && (
          <Button
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => {
              Modal.confirm({
                title: `¿Eliminar ${selectedRowKeys.length} producto(s)?`,
                icon: <ExclamationCircleOutlined />,
                content: 'Los productos seleccionados serán eliminados de la tabla.',
                okText: 'Sí, eliminar',
                okButtonProps: { danger: true },
                cancelText: 'Cancelar',
                onOk: () => {
                  setDetalles((prev) => prev.filter((d) => !selectedRowKeys.includes(d.codigo)));
                  setSelectedRowKeys([]);
                  setSelectionMode(false);
                },
              });
            }}
          >
            Eliminar seleccionados ({selectedRowKeys.length})
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
            onRow={() => ({})}
            summary={() => {
              const COLS_ANTES_TOTALES = 8; // articulo(0) + medida(1) + costo(2) + margen(3) + p.sugerido(4) + OP(5) + HR(6) + VH(7)
              return (
                <Table.Summary fixed="bottom">
                  <Table.Summary.Row style={{ fontWeight: 600, backgroundColor: '#fafafa' }}>
                    <Table.Summary.Cell index={0} colSpan={COLS_ANTES_TOTALES}>
                      <Text strong style={{ paddingLeft: 8 }}>Totales</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES} align="right">
                      <Text strong>{formatNumber(totalesGenerales.subTotal)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 1} align="right">
                      <Text>{formatNumber(totalesGenerales.descuento)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 2} align="right">
                      <Text>{formatNumber(totalesGenerales.impuestos)}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 3} align="right">
                      <Text strong style={{ color: 'var(--paces-primary)', fontSize: 13 }}>
                        {formatCurrency(totalesGenerales.total)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={COLS_ANTES_TOTALES + 4} />
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
                <Input
                  ref={codigoInputRef}
                  placeholder="Código + Enter"
                  style={{ width: 180 }}
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  onPressEnter={handleCodigoEnter}
                  size="small"
                />
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

      <AgregarProductoGORCModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelectProducto={(producto) => {
          handleProductoSeleccionado(producto);
          setProductoModalOpen(false);
        }}
        onSelectConteos={(productos) => {
          const filas = productos.map((p) => {
            const yaExiste = detalles.some((d) => d.codigo === p.codigo);
            if (yaExiste) return null;
            return {
              codigo: p.codigo,
              referencia: p.referencia || '',
              producto: p.articulo || '',
              medida: (p as any)._medida || p.medida || unidadBase || null,
              impuesto: (p as any)._impuesto || p.impuesto || null,
              cantidades: { OP: 0, HR: 0, VH: 0 },
              cantidadesBonificadas: { OP: 0, HR: 0, VH: 0 },
              existencias: { OP: 0, HR: 0, VH: 0 },
              existenciasFisicas: {
                OP: (p as any)._cantidadesPorPrefijo?.OP || 0,
                HR: (p as any)._cantidadesPorPrefijo?.HR || 0,
                VH: (p as any)._cantidadesPorPrefijo?.VH || 0,
              },
              costo: (p as any)._costo || p.costo || 0,
              ultimaCompraFecha: (p as any)._ultimaCompraFecha || undefined,
              margen: (p as any)._margen || 0,
              precioSugerido: (p as any)._precioSugerido || p.precio || 0,
              subTotal: 0,
              porcentajeDescuento: (p as any)._porcentajeDescuento || 0,
              descuento: 0,
              impuestos: 0,
              total: 0,
            } as DetalleGeneradorDTO;
          }).filter(Boolean) as DetalleGeneradorDTO[];

          setDetalles((prev) => [...prev, ...filas.map((f) => calcularFilaGORC(f))]);
          setLoadVersion((v) => v + 1);
          message.success(`${filas.length} productos agregados`);
          setProductoModalOpen(false);
        }}
        conteoDetallesData={conteoDetallesData}
        maestroDetallesData={maestroDetallesData}
      />

      <ModosCargaModal
        open={modosCargaModalOpen}
        onClose={() => setModosCargaModalOpen(false)}
        onSeleccionarMaestro={handleCargarMaestro}
        onSeleccionarPlantilla={handleCargarPlantilla}
      />

      <BuscarPlantillaGORCModal
        open={plantillaModalOpen}
        onClose={() => setPlantillaModalOpen(false)}
        onSelect={handlePlantillaSeleccionada}
        codigoSuplidor={selectedSuplidor?.codigo || ''}
      />

      <SeleccionarConteosModal
        open={seleccionarConteosOpen}
        onClose={() => setSeleccionarConteosOpen(false)}
        conteos={conteosPlantilla}
        onConfirm={(keys) => {
          setSeleccionarConteosOpen(false);
          handleConteosSeleccionados(keys);
        }}
      />

      {/* ===== Monitor de Análisis (Drawer) ===== */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined style={{ color: 'var(--paces-primary)' }} />
            <span style={{ fontWeight: 600 }}>Análisis de Producto</span>
          </Space>
        }
        placement="right"
        width={520}
        open={analisisOpen}
        onClose={() => setAnalisisOpen(false)}
      >
        {analisisDetalle && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* SECCIÓN A — Identidad del producto */}
            <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
              <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
                {(analisisDetalle?.producto || '?')[0].toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(analisisDetalle?.producto || '')}</Typography.Title>
                <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Código: {analisisDetalle?.codigo}
                  {analisisDetalle?.referencia ? <span> · Ref: {analisisDetalle.referencia}</span> : ''}
                  {analisisDetalle?.medida?.nombre ? <span> · Medida: {analisisDetalle.medida.nombre}</span> : ''}
                </Typography.Text>
              </div>
            </Space>
            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* SECCIÓN B — Última Entrada por sucursal */}
            {analisisError ? (
              <Alert type="error" message="Error al cargar datos" style={{ marginBottom: 16 }}
                action={<Button size="small" onClick={() => { setAnalisisOpen(false); setTimeout(() => setAnalisisOpen(true), 100); }}><ReloadOutlined />Reintentar</Button>} />
            ) : analisisLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: 16 }} />
            ) : analisisData.length > 0 ? (
              <>
              {analisisData.some((d) => d.resumen) && (
                <Card
                  className="paces-card"
                  size="small"
                  style={{
                    borderRadius: 6,
                    border: '1px solid #d9d9d9',
                    borderTop: '3px solid #556ee6',
                    background: 'rgba(85,110,230,0.04)',
                    marginBottom: 12,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }}>
                    📊 Resumen total
                  </Typography.Text>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                    {(() => {
                      const totales = analisisData.reduce(
                        (acc, item) => {
                          const r = item.resumen;
                          if (!r) return acc;
                          return {
                            ventasSinComponentes: acc.ventasSinComponentes + (r.ventasSinComponentes || 0),
                            ventasConComponentes: acc.ventasConComponentes + (r.ventasConComponentes || 0),
                            salidas: acc.salidas + (r.salidas || 0),
                            devCompra: acc.devCompra + (r.devolucionesCompra || 0),
                            devVenta: acc.devVenta + (r.devolucionesVenta || 0),
                          };
                        },
                        { ventasSinComponentes: 0, ventasConComponentes: 0, salidas: 0, devCompra: 0, devVenta: 0 }
                      );
                      return [
                        { label: 'Ventas (sin comp.)', value: totales.ventasSinComponentes },
                        { label: 'Ventas (con comp.)', value: totales.ventasConComponentes },
                        { label: 'Salidas', value: totales.salidas },
                        { label: 'Dev. Compra', value: totales.devCompra },
                        { label: 'Dev. Venta', value: totales.devVenta },
                      ].map((kpi) => (
                        <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                          <Typography.Text strong style={{ fontSize: 14, color: '#556ee6' }}>
                            {formatNumber(kpi.value)}
                          </Typography.Text>
                        </div>
                      ));
                    })()}
                  </div>
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analisisData.map((item) => {
                  const SUCURSAL_COLORS: Record<number, { color: string; bg: string }> = {
                    0: { color: '#1677ff', bg: 'rgba(22,119,255,0.06)' },
                    1: { color: '#52c41a', bg: 'rgba(82,196,26,0.06)' },
                    2: { color: '#fa8c16', bg: 'rgba(250,140,22,0.06)' },
                  };
                  const style = SUCURSAL_COLORS[item.sucursal] || { color: '#556ee6', bg: 'rgba(85,110,230,0.06)' };
                  const sinRegistro = !item.fecha;

                  return (
                    <Card
                      key={item.sucursal}
                      className="paces-card"
                      size="small"
                      style={{
                        borderRadius: 6,
                        border: '1px solid #f0f0f0',
                        borderTop: `3px solid ${style.color}`,
                        background: style.bg,
                      }}
                    >
                      {/* Header: nombre sucursal */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space>
                          <ShopOutlined style={{ color: style.color, fontSize: 15 }} />
                          <Typography.Text strong style={{ fontSize: 13, color: style.color }}>{item.sucursalNombre}</Typography.Text>
                          {sinRegistro && <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Sin compras</Tag>}
                        </Space>
                        {!sinRegistro && (
                          <Button
                            type="link"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleVerMovimientos(item)}
                            style={{ fontSize: 12 }}
                          >
                            Ver movimientos →
                          </Button>
                        )}
                      </div>

                      {!sinRegistro ? (
                        <>
                          {/* BLOQUE 1: Última compra */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📦 Última compra  <Typography.Text strong style={{ fontSize: 13, color: '#556ee6' }}>{item.fecha ? formatDate(item.fecha) : '-'}</Typography.Text>
                            </Typography.Text>
                            <div style={{ marginTop: 8 }}>
                              <Typography.Text style={{ fontSize: 12, color: '#8c8c8c', marginRight: 8 }}>
                                {item.documento}
                              </Typography.Text>
                              <Tag color="blue" style={{ fontSize: 11 }}>{formatNumber(item.cantidad)}</Tag>
                            </div>
                          </div>

                          {/* Divider punteado */}
                          <div style={{ borderTop: '1px dashed #e8e8e8', marginBottom: 10 }} />

                          {/* BLOQUE 2: Movimientos posteriores */}
                          <div style={{ marginBottom: 10 }}>
                            <Typography.Text strong style={{ fontSize: 12, color: '#262626', display: 'block', marginBottom: 6 }}>
                              📊 Movimientos posteriores
                            </Typography.Text>

                            {/* Grid 2x2 de KPIs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginBottom: 6 }}>
                              {[
                                { label: 'Ventas (sin comp.)', value: item.resumen?.ventasSinComponentes },
                                { label: 'Ventas (con comp.)', value: item.resumen?.ventasConComponentes },
                                { label: 'Salidas', value: item.resumen?.salidas },
                                { label: 'Dev. Compra', value: item.resumen?.devolucionesCompra },
                                { label: 'Dev. Venta', value: item.resumen?.devolucionesVenta },
                              ].map((kpi) => (
                                <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                                  {kpi.value !== undefined ? (
                                    <Typography.Text strong style={{ fontSize: 14, color: style.color }}>
                                      {formatNumber(kpi.value)}
                                    </Typography.Text>
                                  ) : analisisResumenLoading ? (
                                    <Skeleton.Input active size="small" style={{ width: 30, height: 16 }} />
                                  ) : (
                                    <Typography.Text style={{ fontSize: 13 }}>0</Typography.Text>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Última venta */}
                            {item.resumen?.ultimaVentaFecha && (
                              <div style={{ background: 'rgba(85,110,230,0.04)', borderRadius: 4, padding: '6px 8px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography.Text style={{ fontSize: 11, color: '#595959' }}>
                                  🕐 Última venta: {formatDate(item.resumen.ultimaVentaFecha)}
                                </Typography.Text>
                                <Typography.Text style={{ fontSize: 11, color: '#8c8c8c', fontStyle: 'italic' }}>
                                  {(() => {
                                    const diffDias = dayjs(item.resumen!.ultimaVentaFecha).diff(dayjs(item.fecha), 'day');
                                    if (diffDias === 0) return 'hoy';
                                    if (diffDias === 1) return 'hace 1 día';
                                    if (diffDias < 30) return `hace ${diffDias} días`;
                                    const diffMeses = Math.floor(diffDias / 30);
                                    if (diffMeses === 1) return 'hace 1 mes';
                                    if (diffMeses < 12) return `hace ${diffMeses} meses`;
                                    const diffAnios = Math.floor(diffDias / 365);
                                    if (diffAnios === 1) return 'hace 1 año';
                                    return `hace ${diffAnios} años`;
                                  })()}
                                </Typography.Text>
                              </div>
                            )}
                          </div>


                        </>
                      ) : (
                        <Typography.Text className="paces-text-secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                          No hay registros de compra para esta sucursal.
                        </Typography.Text>
                      )}
                    </Card>
                  );
                })}
              </div>


            </>
            ) : (
              <Alert type="info" message="No se encontraron entradas para este producto" style={{ marginBottom: 16 }} />
            )}

            {/* SECCIÓN C — Costos y Precio */}
            <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c' }}>Costos y Precio</Divider>
            <div style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }}>
              <Row gutter={0}>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Costo</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: 'var(--paces-primary)' }}>
                    {formatNumber(analisisDetalle?.costo || 0)}
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Margen %</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16, color: (analisisDetalle?.margen || 0) > 0 ? '#34c38f' : '#ff4d4f' }}>
                    {(analisisDetalle?.margen || 0).toFixed(2)}%
                  </Typography.Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Precio</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {formatNumber(analisisDetalle?.precioSugerido || 0)}
                  </Typography.Text>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>

      {/* ===== Modal de Movimientos Posteriores ===== */}
      <Modal
        title={`Movimientos posteriores — ${movimientosSucursal} — ${analisisDetalle?.codigo || ''}`}
        open={movimientosModalOpen}
        onCancel={() => setMovimientosModalOpen(false)}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Table
          dataSource={movimientosData}
          rowKey="transacid"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          loading={movimientosLoading}
          locale={{ emptyText: <Empty description="No hay movimientos posteriores" /> }}
          columns={[
            { title: 'Fecha', dataIndex: 'fecha', width: 110, render: (v: string) => formatDate(v) },
            { title: 'Documento', dataIndex: 'documento', width: 160, ellipsis: true },
            { title: 'Cantidad', dataIndex: 'cantidad', width: 90, align: 'right' as const, render: (v: number) => formatNumber(v) },
          ]}
          scroll={{ x: 600 }}
        />
      </Modal>
    </div>
  );
};

export default GeneradorORCFormulario;

