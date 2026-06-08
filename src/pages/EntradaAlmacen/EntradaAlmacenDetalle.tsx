import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Dropdown, Modal, DatePicker, Typography, Tooltip, Descriptions, Alert, App, Badge, Empty
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LockFilled,
  FileTextOutlined,
  FileSearchOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { transaccionApi } from '../../api/transaccionApi';
import { facturaSuplidorApi } from '../../api/facturaSuplidorApi';
import { productoApi } from '../../api/productoApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import PermissionGate from '../../components/PermissionGate';
import DetalleToolbar from '../../components/DetalleToolbar';
import ErrorDetalle from '../../components/ErrorDetalle';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import type { EntradaAlmacenDTO, AsientoContableDTO, SuplidorDTO, EntidadDTO } from '../../types/entradaAlmacen';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';

const { Text } = Typography;

const EntradaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<EntradaAlmacenDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [fechaVencimientoModal, setFechaVencimientoModal] = useState<{ open: boolean; detalleId: number }>({ open: false, detalleId: 0 });
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [tienePagos, setTienePagos] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [ocDetallesData, setOcDetallesData] = useState<any[]>([]);
  const [ocLoading, setOcLoading] = useState(false);
  const [devolucionesData, setDevolucionesData] = useState<any[]>([]);
const [facturaData, setFacturaData] = useState<any>(null);
const [documentosRelacionados, setDocumentosRelacionados] = React.useState<DocumentoRelacionDTO[]>([]);
const [modalAnularOpen, setModalAnularOpen] = useState(false);
const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
const [vencimientoPendientes, setVencimientoPendientes] = useState<{ id: number; codigo: string; articulo: string }[]>([]);
const [vencimientoModalOpen, setVencimientoModalOpen] = useState(false);
const [vencimientoFechas, setVencimientoFechas] = useState<Record<number, dayjs.Dayjs>>({});

  const { message, modal } = App.useApp();

  // Cargar detalles de la OC por separado cuando se tenga el id
  useEffect(() => {
    if (!data?.ordenCompra?.id) return;
    if (ocDetallesData.length > 0) return;
    setOcLoading(true);
    ordenCompraApi.obtenerPorId(Sucursal.Compra, data.ordenCompra.id)
      .then((oc: any) => {
        if (oc.detalles?.length) setOcDetallesData(oc.detalles);
      })
      .catch(() => message.warning('No se pudieron cargar los detalles de la OC'))
      .finally(() => setOcLoading(false));
  }, [data?.ordenCompra?.id]);

  // Cargar documentos relacionados desde DOCUMENTOS_RELACION
  React.useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id, sucursalActiva)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        message.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id, sucursalActiva]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setFacturaData(null);
    setLoadingError(false);
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        console.log('[DEBUG handleRefresh] logs recibidos:', res?.logs);
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        if (res.ordenCompra?.id) {
          ordenCompraApi.obtenerPorId(Sucursal.Compra, res.ordenCompra.id)
            .then((oc: any) => setOcDetallesData(oc.detalles || []))
            .catch(() => {});
        }
        devolucionCompraApi.obtenerPorIdEntrada(sucursalActiva, parseInt(id))
          .then((dvcs) => setDevolucionesData(dvcs))
          .catch(() => {});
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id), sucursalActiva)
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => message.warning('No se pudieron cargar los documentos relacionados'));
        // Cargar factura RDE si el concepto genera una
        if (res.concepto?.docAGenerar === 'RDE') {
          facturaSuplidorApi.obtenerPorDocumento(Sucursal.Consolidado, res.noDocumento)
            .then((factura) => setFacturaData(factura))
            .catch(() => {});
        } else {
          setFacturaData(null);
        }
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await entradaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch (err: any) {
      message.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  const handleFechaVencimiento = (date: dayjs.Dayjs | null) => {
    if (fechaVencimientoModal.detalleId) {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          detalles: prev.detalles.map((d) => {
            if (d.id !== fechaVencimientoModal.detalleId) return d;
            return { ...d, fechaVencimiento: date ? date.format('YYYY-MM-DD') : undefined };
          }),
        };
      });
    }
    setFechaVencimientoModal({ open: false, detalleId: 0 });
  };
  const screens = Grid.useBreakpoint();

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detalles || []);

  useEffect(() => {
    setActiveModule('FENP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setFacturaData(null);
    setLoading(true);
    entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        if (res.ordenCompra?.id) {
          ordenCompraApi.obtenerPorId(Sucursal.Compra, res.ordenCompra.id)
            .then((oc: any) => setOcDetallesData(oc.detalles || []))
            .catch(() => {});
        }
        // Cargar devoluciones asociadas
        devolucionCompraApi.obtenerPorIdEntrada(sucursalActiva, parseInt(id))
          .then((dvcs) => setDevolucionesData(dvcs))
          .catch((err) => {
            const msg = err?.response?.data?.errorMessage || 'Error al cargar devoluciones';
            message.warning(msg);
          });
        // Cargar factura RDE si el concepto genera una
        if (res.concepto?.docAGenerar === 'RDE') {
          facturaSuplidorApi.obtenerPorDocumento(Sucursal.Consolidado, res.noDocumento)
            .then((factura) => setFacturaData(factura))
            .catch(() => {
              // Silencioso - puede no existir si la ENP no se ha posteado
            });
        } else {
          setFacturaData(null);
        }
        // Verificar si tiene factura escaneada
        entradaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
        // Cargar transacciones/pagos asociados
        transaccionApi.obtenerAsociadasInventario(sucursalActiva, parseInt(id))
          .then((transacciones) => setTienePagos(transacciones.length > 0))
          .catch(() => setTienePagos(false));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  // Función lookup: para cada detalle de entrada, obtiene el total devuelto
  // Primero por idExterno (id del detalle de entrada), luego por codigo+costo
  const obtenerDevueltoPorDetalle = React.useMemo(() => {
    const porIdExterno: Record<number, number> = {};
    const porCodigoCosto: Record<string, number> = {};

    for (const dvc of devolucionesData) {
      if (!dvc.detalles) continue;
      for (const det of dvc.detalles) {
        const factor = Number(det.medida?.factor) || 1;
        const devuelto = Number(det.devuelto || 0) * factor;

        if (det.idExterno) {
          porIdExterno[det.idExterno] = (porIdExterno[det.idExterno] || 0) + devuelto;
        } else {
          const key = `${det.codigo || ''}`;
          porCodigoCosto[key] = (porCodigoCosto[key] || 0) + devuelto;
        }
      }
    }

    return (entradaDetalle: any): number => {
      // 1. Intentar por idExterno
      if (porIdExterno[entradaDetalle.id]) {
        return porIdExterno[entradaDetalle.id];
      }
      // 2. Fallback por codigo + costo
      const key = `${entradaDetalle.codigo || ''}`;
      return porCodigoCosto[key] || 0;
    };
  }, [devolucionesData]);

  const tienePermisoFDVC = React.useMemo(() => {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const pantalla = usuario.pantallas.find(
      (p) => p.codigo?.toUpperCase() === 'FDVC'
    );
    return pantalla?.acciones.includes('VISUALIZAR') ?? false;
  }, []);

  const tienePermisoFRDE = React.useMemo(() => {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const pantalla = usuario.pantallas.find(
      (p) => p.codigo?.toUpperCase() === 'FRDE'
    );
    return pantalla?.acciones.includes('VISUALIZAR') ?? false;
  }, []);

  const tienePermisoDESAPLICAR = React.useMemo(() => {
    const usuario = useAuthStore.getState().usuario;
    if (!usuario) return false;
    const pantalla = usuario.pantallas.find(
      (p) => p.codigo?.toUpperCase() === 'FENP'
    );
    return pantalla?.acciones.includes('DESAPLICAR') ?? false;
  }, []);

  const tieneDetalleConAumentoPrecio = React.useMemo(() => {
    return (data?.detalles || []).some((d) => (d.familia?.aumentoPrecioMaximo ?? 0) > 0);
  }, [data?.detalles]);

  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return <ErrorDetalle rutaVolver="/FENP" onRecargar={handleRefresh} />;
  }
  if (!data) return null;

  const isLarge = screens.xxl === true;

  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  const detalleColumns = [
    {
      title: 'Código',
      key: 'codigo',
      width: 100,
      fixed: 'left' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{record.codigo || '-'}</span>
            {(() => {
              const fechaVencida = record.fechaVencimiento ? new Date(record.fechaVencimiento) < new Date() : false;
              const tieneCoincidencia = ocDetallesData.some((d: any) =>
                d.codigo === record.codigo
                && (Math.abs(Number(d.costo) - Number(record.costo)) <= 1 || Number(record.cantidadBonificable) !== 0)
                && Number(d.medida?.factor || 1) === Number(record.medida?.factor || 1)
                && !d.nota?.trim()
              );
              const ocMatch = ocDetallesData.length > 0
                && (tieneCoincidencia || Number(record.cantidadBonificable) > 0)
                && (!record.tieneVencimiento || record.fechaVencimiento)
                && !fechaVencida;

              if (ocDetallesData.length === 0) return null;

              if (ocMatch) {
                return (
                  <Tooltip title="Coincide con OC">
                    <CheckCircleOutlined style={{ color: '#34c38f', fontSize: 12 }} />
                  </Tooltip>
                );
              }

              let motivo = 'No coincide con la OC';
              const detalleOC = ocDetallesData.find((d: any) => d.codigo === record.codigo);
              if (!detalleOC) {
                motivo = 'Código no encontrado en la OC';
              } else if (record.tieneVencimiento && !record.fechaVencimiento) {
                motivo = 'Requiere fecha de vencimiento';
              } else if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date()) {
                motivo = 'Fecha de vencimiento vencida';
              } else if (detalleOC.nota?.trim()) {
                motivo = `OC tiene nota: ${detalleOC.nota}`;
              } else if (Number(detalleOC.medida?.factor || 1) !== Number(record.medida?.factor || 1)) {
                motivo = `Factor OC: ${detalleOC.medida?.factor || 1} | ENP: ${record.medida?.factor || 1}`;
              } else if (Number(record.cantidadBonificable) === 0 && Math.abs(Number(detalleOC.costo) - Number(record.costo)) > 1) {
                motivo = `Costo OC: ${formatNumber(detalleOC.costo)} | ENP: ${formatNumber(record.costo)}`;
              }

              return (
                <Tooltip title={motivo}>
                  <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 12 }} />
                </Tooltip>
              );
            })()}
          </div>
          {record.referencia && (
            <Tooltip title={record.referencia}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {record.referencia}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{toTitleCase(record.articulo || '')}</span>
          </div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
            {record.familia?.nombre ? <Tag style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>{toTitleCase(record.familia.nombre)}</Tag> : null}
            {record.fechaVencimiento && <span>V: {formatDate(record.fechaVencimiento)}</span>}
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: any) => {
        const enpFactor = Number(record.medida?.factor) || 1;
        const totalEnBase = (record.cantidad || 0) * enpFactor;
        const totalDevuelto = obtenerDevueltoPorDetalle(record);
        const saldo = totalEnBase - totalDevuelto;
        const tieneDevolucion = totalDevuelto > 0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div>
              {tieneDevolucion ? (
                <div>
                  <span style={{ textDecoration: 'line-through', color: '#ff4d4f', marginRight: 8 }}>
                    {formatNumber(record.cantidad || 0)}
                  </span>
                  <span style={{ color: '#34c38f', fontWeight: 600, fontSize: 13 }}>
                    {formatNumber(saldo / enpFactor)}
                  </span>
                </div>
              ) : (
                <div>{formatNumber(record.cantidad || 0)}</div>
              )}
            </div>
            <Tooltip title={record.medida?.nombre || ''}>
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right', marginTop: 'auto', minHeight: 17, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {record.medida?.nombre || ''}
              </div>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 110,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => {
        const costoBase = Number(record.costo) || 0;
        const pctDesc = Number(record.porcentajeDescuento) || 0;
        const factor = Number(record.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div>{formatNumber(costoBase)}</div>
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999', marginTop: 'auto' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div>{formatNumber(record.porcentajeDescuento || 0)}%</div>
          <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 'auto' }}>
            {formatNumber(record.descuento || 0)}
          </div>
        </div>
      ),
    },
    {
      title: 'Impuestos',
      key: 'impuestos',
      width: 140,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      responsive: ['lg' as const, 'xl' as const, 'xxl' as const],
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.impuestos || 0)}</div>
          {record.impuesto?.nombre && (
            <Tooltip title={record.impuesto.nombre}>
              <div className="paces-text-secondary" style={{ fontSize: 12, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {toTitleCase(record.impuesto.nombre)}
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top', paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5, marginTop: 'auto' }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await entradaAlmacenApi.desaplicar(origen, documento);
      message.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      handleRefresh();
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAplicar = async () => {
    if (!id) return;

    // Verificación temprana del scanner (solo obligatorio si tiene Orden de Compra)
    if (tieneScan === false && data?.ordenCompra?.noDocumento) {
      message.warning('Debe escanear la factura antes de aplicar.');
      return;
    }

    // Si el usuario tiene permiso DESAPLICAR y hay detalles con aumento configurado,
    // mostrar confirmación antes de aplicar
    if (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio) {
      const confirmed = await new Promise<boolean>((resolve) => {
        modal.confirm({
          title: 'Advertencia de sobreprecio',
          icon: <ExclamationCircleOutlined />,
          content: 'Hay productos cuyo costo podría superar el porcentaje de aumento máximo permitido de su familia. ¿Desea continuar aplicando?',
          okText: 'Sí, aplicar',
          cancelText: 'No, cancelar',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmed) return;
      // La ejecución continúa al final tras validación de vencimiento
    }

    // ===== Validar fechas de vencimiento (solo si tiene OrdenCompra) =====
    if (data?.ordenCompra?.noDocumento && data.detalles?.length) {
      try {
        const codigos = data.detalles.map((d) => d.codigo).filter(Boolean) as string[];
        const codigosConVencimiento = await productoApi.obtenerProductosVencimiento(Sucursal.Compra, codigos);

        if (codigosConVencimiento.length > 0) {
          // Filtrar detalles que tienen vencimiento pero no tienen fecha
          const pendientes = data.detalles
            .filter((d) => codigosConVencimiento.includes(d.codigo) && !d.fechaVencimiento)
            .map((d) => ({ id: d.id, codigo: d.codigo, articulo: d.articulo }));

          if (pendientes.length > 0) {
            setVencimientoPendientes(pendientes);
            setVencimientoFechas({});
            setVencimientoModalOpen(true);
            return; // Esperar a que el usuario complete las fechas
          }
        }
      } catch (err: any) {
        const msg = err?.response?.data?.errorMessage || 'Error al validar fechas de vencimiento';
        message.warning(msg);
        // No bloquear la aplicación si falla la consulta de vencimiento
      }
    }

    // Flujo normal (sin bloqueos)
    setOperacionTitulo(`Aplicando ENP-${data?.noDocumento || id}`);
    const confirmarSP = (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio);
    operacion.ejecutar(
      `/ENP/${sucursalActiva}/aplicar/${id}${confirmarSP ? '?confirmarSobrePrecio=true' : ''}`,
      handleRefresh
    );
  };

  const handleVencimientoConfirm = () => {
    // Actualizar las fechas en los detalles
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        detalles: prev.detalles.map((d) => {
          const fecha = vencimientoFechas[d.id];
          if (!fecha) return d;
          return { ...d, fechaVencimiento: fecha.format('YYYY-MM-DD') };
        }),
      };
    });
    setVencimientoModalOpen(false);
    setVencimientoPendientes([]);
    setVencimientoFechas({});

    // Continuar con la aplicación (disparar el operacion.ejecutar)
    setOperacionTitulo(`Aplicando ENP-${data?.noDocumento || id}`);
    const confirmarSP = (tienePermisoDESAPLICAR && tieneDetalleConAumentoPrecio);
    operacion.ejecutar(
      `/ENP/${sucursalActiva}/aplicar/${id}${confirmarSP ? '?confirmarSobrePrecio=true' : ''}`,
      handleRefresh
    );
  };

  const handleAnularConfirm = async (dataAnular: { fecha: string; motivo: string }) => {
    if (!data) return;
    setSaving(true);
    try {
      const dto = {
        ...data,
        fechaDocumento: dataAnular.fecha,
        nota: `${data.nota || ''} Documento anulado por: ${dataAnular.motivo}.`,
      };
      await entradaAlmacenApi.anular(sucursalActiva, dto);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    if (data.concepto?.noAsientos) {
      message.info('El concepto no genera asientos contables.');
      return;
    }
    // Seguridad: si no está en estado Aplicado (Validado=1), aplicar primero (como en desktop)
    if (data.estado !== 1) {
      message.info('Debe aplicar el documento antes de postear.');
      return;
    }
    setOperacionTitulo(`Posteando ENP-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/ENP/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await entradaAlmacenApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await entradaAlmacenApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await entradaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  function extraerMensajeError(err: any, fallback: string): string {
    const data = err?.response?.data;
    if (!data) return fallback;
    if (data.errorMessage) return data.errorMessage;
    if (data.errors && typeof data.errors === 'object') {
      const mensajes: string[] = [];
      for (const key of Object.keys(data.errors)) {
        const val = data.errors[key];
        if (Array.isArray(val)) mensajes.push(...val);
        else if (typeof val === 'string') mensajes.push(val);
      }
      if (mensajes.length > 0) return mensajes.join('; ');
    }
    return fallback;
  }

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de entrada de almacén"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      <DetalleToolbar
        modulo="FENP"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion.loading}
        onVolver={() => navigate('/FENP')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.post('/reportes/inventario/entrada', { ...data, facturaAsociada: facturaData }, {
              responseType: 'blob',
            });
            const blobUrl = URL.createObjectURL(res.data);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            setTimeout(() => {
              iframe.contentWindow?.print();
              setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(blobUrl);
              }, 30000);
            }, 2000);
          } catch {
            message.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FENP/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={tienePagos ? undefined : async () => setModalAnularOpen(true)}
        onPostear={data.concepto?.noAsientos ? undefined : handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={tienePagos ? undefined : async () => setModalDesaplicarOpen(true)}
        onReversar={handleReversar}
        extraButtons={
          data.estado === 1 ? (
            <PermissionGate codigoPantalla="FDVC" accion="CREAR">
              <Button icon={<RollbackOutlined />} onClick={() => navigate('/FDVC/nuevo', { state: { entradaId: data?.id } })}>
                Devolver
              </Button>
            </PermissionGate>
          ) : undefined
        }
      />
      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Space>
                  {esCerrado && (
                    <Tooltip title="Período contable cerrado">
                      <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                    </Tooltip>
                  )}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  {tieneScan === true && (
                    <Tooltip title="Ver factura escaneada">
                      <Tag
                        icon={<FileTextOutlined />}
                        color="success"
                        style={{ cursor: 'pointer' }}
                        onClick={handleVerScanner}
                      />
                    </Tooltip>
                  )}
                  {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions
                bordered
                size="small"
                column={3}
                styles={{ content: { background: 'transparent' } }}
              >
                <Descriptions.Item label="Orden Compra:">
                  {data.ordenCompra?.noDocumento || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {toTitleCase(data.concepto?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="NCF:">
                  {data.ncf || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Doc.:">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor:">
                  {toTitleCase(data.suplidor?.nombre || data.entidad?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">
                  {data.referencia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Recibo:">
                  {data.fechaEntrega ? formatDate(data.fechaEntrega) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Almacén:" span={2}>
                  {toTitleCase(data.almacen?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Nota:" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                  children: (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                        <Input.Search
                          placeholder="Buscar detalle..."
                          allowClear
                          style={{ maxWidth: 250 }}
                          onSearch={(value) => setDetalleSearch(value)}
                          onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                        />
                      </div>
                      <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                    </>
                  ),
                },
                {
                  key: 'devoluciones',
                  label: (
                    <span>
                      Devoluciones
                      {devolucionesData.length > 0 && (
                        <Badge count={devolucionesData.length}
                          style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                      )}
                    </span>
                  ),
                  children: devolucionesData.length === 0 ? (
                    <Empty
                      image={<RollbackOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
                      imageStyle={{ height: 40 }}
                      description="Sin devoluciones registradas"
                    />
                  ) : (
                    <Table
                      dataSource={devolucionesData}
                      rowKey="id"
                      size="small"
                      pagination={false}
                      scroll={{ x: 600 }}
                      rowClassName={(record: any) =>
                        record.estado === 3 ? 'paces-row-anulado' : ''
                      }
                      columns={[
                        {
                          title: 'Documento',
                          key: 'documento',
                          width: 130,
                          render: (_: any, record: any) => (
                            tienePermisoFDVC ? (
                              <a
                                className="paces-doc-link"
                                onClick={() => navigate(`/FDVC/${record.id}`)}
                                style={{ cursor: 'pointer' }}
                              >
                                DVC-{record.noDocumento}
                              </a>
                            ) : (
                              <span>DVC-{record.noDocumento}</span>
                            )
                          ),
                        },
                        {
                          title: 'Fecha',
                          key: 'fecha',
                          width: 110,
                          render: (_: any, record: any) => formatDate(record.fechaDocumento),
                        },
                        {
                          title: 'Suplidor',
                          key: 'suplidor',
                          responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
                          render: (_: any, record: any) => toTitleCase(record.suplidor?.nombre || record.entidad?.nombre || ''),
                        },
                        {
                          title: 'Total',
                          key: 'total',
                          width: 120,
                          align: 'right',
                          render: (_: any, record: any) => (
                            <Typography.Text strong>{formatCurrency(record.total || 0)}</Typography.Text>
                          ),
                        },
                        {
                          title: 'Estado',
                          key: 'estado',
                          width: 110,
                          render: (_: any, record: any) => {
                            const info = ESTADO_DOCUMENTO_MAP[record.estado] || { label: 'Desconocido', color: 'default' };
                            return <Tag color={info.color}>{info.label}</Tag>;
                          },
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'asientos',
                  label: `Asientos (${data.asientos?.length || 0})`,
                  children: (
                    <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 800 }} />
                  ),
                },
                {
                  key: 'historial',
                  label: `Historial (${data.logs?.length || 0})`,
                  children: (
                    <LogTable dataSource={data.logs || []} scroll={{ x: 800 }} />
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.suplidor} entidadSecundaria={data.entidad} fallbackTitulo="Suplidor" />
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
            <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Space>
                  {esCerrado && (
                    <Tooltip title="Período contable cerrado">
                      <LockFilled style={{ fontSize: 14, color: '#595959' }} />
                    </Tooltip>
                  )}
                  <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  {tieneScan === true && (
                    <Tooltip title="Ver factura escaneada">
                      <Tag
                        icon={<FileTextOutlined />}
                        color="success"
                        style={{ cursor: 'pointer' }}
                        onClick={handleVerScanner}
                      />
                    </Tooltip>
                  )}
                  {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
                </Space>
              </div>
            } style={{ marginBottom: 16 }}>
              <Descriptions
                bordered
                size="small"
                column={1}
                styles={{ content: { background: 'transparent' } }}
              >
                <Descriptions.Item label="Orden Compra:">
                  {data.ordenCompra?.noDocumento || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto:">
                  {toTitleCase(data.concepto?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="NCF:">
                  {data.ncf || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Doc.:">
                  {formatDate(data.fechaDocumento)}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor:">
                  {toTitleCase(data.suplidor?.nombre || data.entidad?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Referencia:">
                  {data.referencia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha Recibo:">
                  {data.fechaEntrega ? formatDate(data.fechaEntrega) : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Almacén:">
                  {toTitleCase(data.almacen?.nombre || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Nota:">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            items={[
              {
                key: 'detalles',
                label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
                children: (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                      <Input.Search
                        placeholder="Buscar detalle..."
                        allowClear
                        style={{ maxWidth: 250 }}
                        onSearch={(value) => setDetalleSearch(value)}
                        onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                      />
                    </div>
                    <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 800 }} />
                  </>
                ),
              },
              {
                key: 'devoluciones',
                label: (
                  <span>
                    Devoluciones
                    {devolucionesData.length > 0 && (
                      <Badge count={devolucionesData.length}
                        style={{ marginLeft: 6, backgroundColor: '#556ee6' }} />
                    )}
                  </span>
                ),
                children: devolucionesData.length === 0 ? (
                  <Empty
                    image={<RollbackOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
                    imageStyle={{ height: 40 }}
                    description="Sin devoluciones registradas"
                  />
                ) : (
                  <Table
                    dataSource={devolucionesData}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 600 }}
                    rowClassName={(record: any) =>
                      record.estado === 3 ? 'paces-row-anulado' : ''
                    }
                    columns={[
                      {
                        title: 'Documento',
                        key: 'documento',
                        width: 130,
                        render: (_: any, record: any) => (
                          tienePermisoFDVC ? (
                            <a
                              className="paces-doc-link"
                              onClick={() => navigate(`/FDVC/${record.id}`)}
                              style={{ cursor: 'pointer' }}
                            >
                              DVC-{record.noDocumento}
                            </a>
                          ) : (
                            <span>DVC-{record.noDocumento}</span>
                          )
                        ),
                      },
                      {
                        title: 'Fecha',
                        key: 'fecha',
                        width: 110,
                        render: (_: any, record: any) => formatDate(record.fechaDocumento),
                      },
                      {
                        title: 'Suplidor',
                        key: 'suplidor',
                        responsive: ['md' as const, 'lg' as const, 'xl' as const, 'xxl' as const],
                        render: (_: any, record: any) => toTitleCase(record.suplidor?.nombre || record.entidad?.nombre || ''),
                      },
                      {
                        title: 'Total',
                        key: 'total',
                        width: 120,
                        align: 'right',
                        render: (_: any, record: any) => (
                          <Typography.Text strong>{formatCurrency(record.total || 0)}</Typography.Text>
                        ),
                      },
                      {
                        title: 'Estado',
                        key: 'estado',
                        width: 110,
                        render: (_: any, record: any) => {
                          const info = ESTADO_DOCUMENTO_MAP[record.estado] || { label: 'Desconocido', color: 'default' };
                          return <Tag color={info.color}>{info.label}</Tag>;
                        },
                      },
                    ]}
                  />
                ),
              },
              {
                key: 'asientos',
                label: `Asientos (${data.asientos?.length || 0})`,
                children: (
                  <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 800 }} />
                ),
              },
              {
                key: 'historial',
                label: `Historial (${data.logs?.length || 0})`,
                children: (
                  <LogTable dataSource={data.logs || []} scroll={{ x: 800 }} />
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} total={data.total} alignRight
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
          </div>
        </div>
      )}

      {/* Modal de Fecha de Vencimiento */}
      <Modal
        title="Fecha de Vencimiento"
        open={fechaVencimientoModal.open}
        onCancel={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        onOk={() => setFechaVencimientoModal({ open: false, detalleId: 0 })}
        footer={null}
        destroyOnHidden
      >
        <DatePicker
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          onChange={handleFechaVencimiento}
        />
      </Modal>

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Documento Escaneado"
        open={scannerModalOpen}
        onCancel={() => { setScannerModalOpen(false); if (scannerUrl) URL.revokeObjectURL(scannerUrl); setScannerUrl(null); }}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        destroyOnHidden
      >
        {scannerLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : scannerUrl ? (
          <iframe src={scannerUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="Scanner" />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        )}
      </Modal>

      {/* Modal Desaplicar */}
      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
        tituloDocumento={`${data.documento.codigo}-${data.noDocumento}`}
      />

      {/* Modal Anular */}
      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data.documento.codigo}-${data.noDocumento}`}
        fechaDocumento={data.fechaDocumento}
        periodoCerrado={data.periodo === 6}
      />

      {/* Modal de Fechas de Vencimiento Pendientes */}
      <Modal
        title="Fechas de Vencimiento Requeridas"
        open={vencimientoModalOpen}
        onCancel={() => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }}
        width={520}
        destroyOnClose
        maskClosable={false}
        footer={
          <Space>
            <Button onClick={() => { setVencimientoModalOpen(false); setVencimientoPendientes([]); setVencimientoFechas({}); }}>
              Cancelar
            </Button>
            <Button
              type="primary"
              disabled={vencimientoPendientes.some((p) => !vencimientoFechas[p.id])}
              onClick={handleVencimientoConfirm}
            >
              Aplicar
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Los siguientes productos requieren fecha de vencimiento:</Text>
        </div>
        {vencimientoPendientes.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.codigo}</div>
              <div className="paces-text-secondary" style={{ fontSize: 12 }}>{p.articulo}</div>
            </div>
            <DatePicker
              style={{ width: 160 }}
              format="YYYY-MM-DD"
              value={vencimientoFechas[p.id] || null}
              onChange={(date) => {
                setVencimientoFechas((prev) => ({
                  ...prev,
                  [p.id]: date || undefined as any,
                }));
              }}
              disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
            />
          </div>
        ))}
      </Modal>

      {/* Modal de Progreso para Aplicar/Postear */}
      <ModalProgreso
        open={operacion.loading || !!operacion.completado}
        titulo={operacionTitulo}
        eventos={operacion.eventos}
        completado={operacion.completado}
        onClose={() => operacion.reset()}
      />
    </div>
  );
};

export default EntradaAlmacenDetalle;
