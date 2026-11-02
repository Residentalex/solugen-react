import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Segmented,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import {
  FileExcelOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { devolucionCompraApi } from '../../api/devolucionCompraApi';
import { reporteDevolucionesAlmacenApi } from '../../api/reporteDevolucionesAlmacenApi';
import { almacenApi } from '../../api/almacenApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import {
  formatCurrency,
  formatNumber,
  formatDateRaw,
  toTitleCase,
  extraerMensajeError,
} from '../../utils/formats';
import { resolveEstado } from '../../utils/estadoDocumento';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type {
  AlmacenDTO,
  FilaReporteInventario,
  ReporteInventarioDocumentoDTO,
  ReporteInventarioDetalleDTO,
} from '../../types/entradaAlmacen';
import type { FamiliaArticuloDTO } from '../../types/productos';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const FILAS_POR_PAGINA = 25;

const ReporteDevoluciones: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  useScreenConfig('RDVC');

  const [data, setData] = useState<ReporteInventarioDocumentoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [page, setPage] = useState(1);
  const [imprimiendo, setImprimiendo] = useState(false);

  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [codigo, setCodigo] = useState<string | undefined>(undefined);
  const [familia, setFamilia] = useState<string | undefined>(undefined);
  const [almacen, setAlmacen] = useState<AlmacenDTO | undefined>(undefined);
  const [cuenta, setCuenta] = useState<string | undefined>(undefined);
  const [agrupado, setAgrupado] = useState<number>(2);
  const [detallado, setDetallado] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [almacenes, setAlmacenes] = useState<AlmacenDTO[]>([]);
  const [cuentas, setCuentas] = useState<CuentaContableResumenDTO[]>([]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await devolucionCompraApi.obtenerDetallado(sucursalActiva, {
        desde: fechas[0].format('YYYYMMDDHHmmss'),
        hasta: fechas[1].format('YYYYMMDDHHmmss'),
        cantidad: 100000,
        salto: 0,
        codigo: codigo || undefined,
        almacen: almacen?.idExterno || almacen?.codigo || undefined,
        familia: familia || undefined,
        cuenta: cuenta || undefined,
      });
      setData(result.data ?? []);
    } catch (err) {
      setLoadingError(true);
      message.error(
        extraerMensajeError(err, 'No se pudo generar el reporte PDF')
      );
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, fechas, codigo, familia, almacen, cuenta]);

  useEffect(() => {
    setActiveModule('RDVC');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    let activo = true;

    familiaArticuloApi
      .obtenerTodo(sucursalActiva)
      .then((fams) => {
        if (activo) setFamilias(fams ?? []);
      })
      .catch((err) => {
        message.error(extraerMensajeError(err, 'No se pudo cargar el catálogo de familias'));
      });

    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  useEffect(() => {
    let activo = true;

    almacenApi
      .obtenerListado(sucursalActiva)
      .then((alms) => {
        if (activo) setAlmacenes(alms ?? []);
      })
      .catch((err) => {
        message.error(extraerMensajeError(err, 'No se pudo cargar el catálogo de almacenes'));
      });

    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  useEffect(() => {
    let activo = true;

    cuentaContableApi
      .obtenerListado(sucursalActiva)
      .then((cts) => {
        if (activo) setCuentas(cts ?? []);
      })
      .catch((err) => {
        message.error(extraerMensajeError(err, 'No se pudo cargar el catálogo de cuentas'));
      });

    return () => {
      activo = false;
    };
  }, [sucursalActiva]);

  const filas = useMemo<FilaReporteInventario[]>(() => {
    if (agrupado === 2) {
      return data.map((doc, i) => ({
        key: `doc-${i}`,
        noDocumento: doc.noDocumento,
        fechaDocumento: doc.fechaDocumento,
        entidad: toTitleCase(doc.suplidor?.nombre || doc.nombreEntidad || ''),
        almacen: toTitleCase(
          doc.almacen?.nombre || doc.almacen?.codigo || doc.codigoAlmacenDestino || ''
        ),
        concepto: toTitleCase(doc.concepto?.nombre || ''),
        total: doc.total,
        estado: doc.estado,
        periodo: doc.periodo,
      }));
    }
    if (agrupado === 0) {
      if (!detallado) {
        const porProducto = new Map<string, FilaReporteInventario>();
        data.forEach((doc) => {
          (doc.detalles ?? []).forEach((det) => {
            const k = det.codigo ?? '';
            const ex = porProducto.get(k);
            if (ex) {
              ex.cantidad = (ex.cantidad ?? 0) + (det.cantidad ?? 0);
              ex.total = (ex.total ?? 0) + (det.total ?? 0);
            } else {
              porProducto.set(k, {
                key: `prod-${k}`,
                codigo: det.codigo,
                articulo: det.articulo,
                cantidad: det.cantidad ?? 0,
                total: det.total ?? 0,
              });
            }
          });
        });
        return Array.from(porProducto.values());
      }
      const rows: FilaReporteInventario[] = [];
      data.forEach((doc, di) => {
        (doc.detalles ?? []).forEach((det, i) => {
          rows.push({
            key: `${doc.noDocumento}-${det.codigo}-${di}-${i}`,
            noDocumento: doc.noDocumento,
            fechaDocumento: doc.fechaDocumento,
            entidad: toTitleCase(doc.suplidor?.nombre || doc.nombreEntidad || ''),
            almacen: toTitleCase(
              doc.almacen?.nombre || doc.almacen?.codigo || doc.codigoAlmacenDestino || ''
            ),
            codigo: det.codigo,
            articulo: det.articulo,
            cantidad: det.cantidad,
            costo: det.costo,
            subTotal: det.subTotal,
            descuento: det.descuento,
            impuestos: det.impuestos,
            total: det.total,
          });
        });
      });
      return rows;
    }
    const porFamilia = new Map<string, FilaReporteInventario>();
    data.forEach((doc) => {
      (doc.detalles ?? []).forEach((det) => {
        const nombre = det.familia?.nombre || '';
        const existente = porFamilia.get(nombre);
        if (existente) {
          existente.cantidad = (existente.cantidad ?? 0) + (det.cantidad ?? 0);
          existente.subTotal = (existente.subTotal ?? 0) + (det.subTotal ?? 0);
          existente.total = (existente.total ?? 0) + (det.total ?? 0);
        } else {
          porFamilia.set(nombre, {
            key: `fam-${nombre}`,
            familia: toTitleCase(nombre),
            cantidad: det.cantidad ?? 0,
            subTotal: det.subTotal ?? 0,
            total: det.total ?? 0,
          });
        }
      });
    });
    return Array.from(porFamilia.values());
  }, [data, agrupado, detallado]);

  useEffect(() => {
    if (detallado && agrupado !== 0) {
      setExpandedRowKeys(filas.map((f) => f.key));
    } else {
      setExpandedRowKeys([]);
    }
  }, [detallado, agrupado, filas]);

  const columns = useMemo<ColumnsType<FilaReporteInventario>>(() => {
    if (agrupado === 2) {
      return [
        {
          title: 'No Documento',
          dataIndex: 'noDocumento',
          key: 'noDocumento',
          width: 160,
          fixed: 'left',
          render: (val: string) => (
            <Text strong style={{ fontFamily: 'monospace' }}>
              {val || '-'}
            </Text>
          ),
        },
        {
          title: 'Fecha',
          dataIndex: 'fechaDocumento',
          key: 'fechaDocumento',
          width: 120,
          render: (val: string) => <Text>{formatDateRaw(val)}</Text>,
        },
        {
          title: 'Entidad',
          dataIndex: 'entidad',
          key: 'entidad',
          ellipsis: true,
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Almacén',
          dataIndex: 'almacen',
          key: 'almacen',
          width: 260,
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Concepto',
          dataIndex: 'concepto',
          key: 'concepto',
          width: 160,
          ellipsis: true,
          responsive: ['lg'],
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Total',
          dataIndex: 'total',
          key: 'total',
          width: 140,
          align: 'right' as const,
          render: (val: number) => (
            <Text strong className="paces-text-total">
              {formatCurrency(val ?? 0)}
            </Text>
          ),
        },
        {
          title: 'Estado',
          key: 'estado',
          width: 130,
          render: (_: unknown, record: FilaReporteInventario) => (
            <EstadoColumnCell estado={record.estado ?? 0} periodo={record.periodo} />
          ),
        },
      ];
    }
    if (agrupado === 0) {
      if (!detallado) {
        return [
          {
            title: 'Código',
            dataIndex: 'codigo',
            key: 'codigo',
            width: 120,
            render: (val: string) => (
              <Text strong style={{ fontFamily: 'monospace' }}>
                {val || '-'}
              </Text>
            ),
          },
          {
            title: 'Artículo',
            dataIndex: 'articulo',
            key: 'articulo',
            ellipsis: true,
            render: (val: string) => <Text>{val || '-'}</Text>,
          },
          {
            title: 'Cantidad',
            dataIndex: 'cantidad',
            key: 'cantidad',
            width: 130,
            align: 'right' as const,
            render: (val: number) => formatNumber(val ?? 0),
          },
          {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 140,
            align: 'right' as const,
            render: (val: number) => (
              <Text strong className="paces-text-total">
                {formatCurrency(val ?? 0)}
              </Text>
            ),
          },
        ];
      }
      return [
        {
          title: 'No Documento',
          dataIndex: 'noDocumento',
          key: 'noDocumento',
          width: 160,
          fixed: 'left',
          render: (val: string) => (
            <Text strong style={{ fontFamily: 'monospace' }}>
              {val || '-'}
            </Text>
          ),
        },
        {
          title: 'Fecha',
          dataIndex: 'fechaDocumento',
          key: 'fechaDocumento',
          width: 120,
          render: (val: string) => <Text>{formatDateRaw(val)}</Text>,
        },
        {
          title: 'Entidad',
          dataIndex: 'entidad',
          key: 'entidad',
          ellipsis: true,
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Almacén',
          dataIndex: 'almacen',
          key: 'almacen',
          width: 260,
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Código',
          dataIndex: 'codigo',
          key: 'codigo',
          width: 120,
          render: (val: string) => (
            <Text strong style={{ fontFamily: 'monospace' }}>
              {val || '-'}
            </Text>
          ),
        },
        {
          title: 'Artículo',
          dataIndex: 'articulo',
          key: 'articulo',
          ellipsis: true,
          render: (val: string) => <Text>{val || '-'}</Text>,
        },
        {
          title: 'Cantidad',
          dataIndex: 'cantidad',
          key: 'cantidad',
          width: 130,
          align: 'right' as const,
          render: (val: number) => formatNumber(val ?? 0),
        },
        ...(detallado
          ? [
              {
                title: 'Costo',
                dataIndex: 'costo',
                key: 'costo',
                width: 130,
                align: 'right' as const,
                render: (val: number) => formatCurrency(val ?? 0),
              },
              {
                title: 'SubTotal',
                dataIndex: 'subTotal',
                key: 'subTotal',
                width: 130,
                align: 'right' as const,
                render: (val: number) => formatCurrency(val ?? 0),
              },
              {
                title: 'Descuento',
                dataIndex: 'descuento',
                key: 'descuento',
                width: 130,
                align: 'right' as const,
                render: (val: number) => formatCurrency(val ?? 0),
              },
              {
                title: 'Impuestos',
                dataIndex: 'impuestos',
                key: 'impuestos',
                width: 140,
                align: 'right' as const,
                render: (val: number) => formatCurrency(val ?? 0),
              },
            ]
          : []),
        {
          title: 'Total',
          dataIndex: 'total',
          key: 'total',
          width: 140,
          align: 'right' as const,
          render: (val: number) => (
            <Text strong className="paces-text-total">
              {formatCurrency(val ?? 0)}
            </Text>
          ),
        },
      ];
    }
    return [
      {
        title: 'Familia',
        dataIndex: 'familia',
        key: 'familia',
        render: (val: string) => <Text>{val || '-'}</Text>,
      },
      ...(detallado
        ? [
            {
              title: 'SubTotal',
              dataIndex: 'subTotal',
              key: 'subTotal',
              width: 140,
              align: 'right' as const,
              render: (val: number) => formatCurrency(val ?? 0),
            },
          ]
        : []),
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 130,
        align: 'right' as const,
        render: (val: number) => formatNumber(val ?? 0),
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 200,
        align: 'right' as const,
        render: (val: number) => (
          <Text strong className="paces-text-total">
            {formatCurrency(val ?? 0)}
          </Text>
        ),
      },
    ];
  }, [agrupado, detallado]);

  const getDetallesDeFila = (r: FilaReporteInventario): ReporteInventarioDetalleDTO[] => {
    if (agrupado === 2) {
      const idx = Number(String(r.key).replace('doc-', ''));
      return Number.isInteger(idx) ? data[idx]?.detalles ?? [] : [];
    }
    if (agrupado === 1) {
      const nombre = String(r.key).replace('fam-', '');
      const rows: ReporteInventarioDetalleDTO[] = [];
      data.forEach((doc) => {
        (doc.detalles ?? []).forEach((det) => {
          if ((det.familia?.nombre || '') === nombre) rows.push(det);
        });
      });
      return rows;
    }
    return [];
  };

  const handleFechasChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (dates) {
      setFechas(dates);
      setPage(1);
    }
  };

  const handleCodigoSearch = (value: string) => {
    setCodigo(value.trim() || undefined);
    setPage(1);
  };

  const handleFamiliaChange = (value: string | undefined) => {
    setFamilia(value);
    setPage(1);
  };

  const handleAlmacenChange = (value: string | undefined) => {
    const almacenSel = almacenes.find((a) => a.codigo === value || a.idExterno === value) || null;
    setAlmacen(almacenSel);
    setPage(1);
  };

  const handleCuentaChange = (value: string | undefined) => {
    setCuenta(value);
    setPage(1);
  };

  const handleRefresh = () => {
    cargarDatos();
  };

  const handleImprimir = async () => {
    setImprimiendo(true);
    try {
      const blob = await reporteDevolucionesAlmacenApi.imprimir(sucursalActiva, {
        desde: fechas[0].format('YYYYMMDDHHmmss'),
        hasta: fechas[1].format('YYYYMMDDHHmmss'),
        agrupado,
        detallado,
        codigo: codigo || undefined,
        almacen: almacen?.idExterno || almacen?.codigo || undefined,
        familia: familia || undefined,
        cuenta: cuenta || undefined,
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      message.error(extraerMensajeError(err, 'No se pudo generar el reporte PDF'));
    } finally {
      setImprimiendo(false);
    }
  };

  const filasDetalle = (): (string | number)[][] => {
    const rows: (string | number)[][] = [];
    data.forEach((doc) => {
      (doc.detalles ?? []).forEach((det) => {
        rows.push([
          doc.noDocumento ?? '',
          formatDateRaw(doc.fechaDocumento ?? ''),
          toTitleCase(doc.suplidor?.nombre || doc.nombreEntidad || ''),
          toTitleCase(doc.almacen?.nombre || doc.almacen?.codigo || doc.codigoAlmacenDestino || ''),
          toTitleCase(det.familia?.nombre ?? ''),
          det.codigo ?? '',
          toTitleCase(det.articulo ?? ''),
          det.cantidad ?? 0,
          det.costo ?? 0,
          det.subTotal ?? 0,
          det.descuento ?? 0,
          det.impuestos ?? 0,
          det.total ?? 0,
        ]);
      });
    });
    return rows;
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    let columnHeaders: string[];
    let dataRows: (string | number)[][];
    if (agrupado === 2) {
      if (detallado) {
        columnHeaders = [
          'No Documento',
          'Fecha',
          'Entidad',
          'Almacén',
          'Familia',
          'Código',
          'Artículo',
          'Cantidad',
          'Costo',
          'SubTotal',
          'Descuento',
          'Impuestos',
          'Total',
        ];
        dataRows = filasDetalle();
      } else {
        columnHeaders = ['No Documento', 'Fecha', 'Entidad', 'Almacén', 'Concepto', 'Total', 'Estado'];
        dataRows = filas.map((r) => [
          r.noDocumento ?? '',
          formatDateRaw(r.fechaDocumento ?? ''),
          r.entidad ?? '',
          r.almacen ?? '',
          r.concepto ?? '',
          r.total ?? 0,
          r.estado !== undefined && r.estado !== null ? resolveEstado(r.estado).label : '',
        ]);
      }
    } else if (agrupado === 0) {
      if (detallado) {
        columnHeaders = [
          'No Documento',
          'Fecha',
          'Entidad',
          'Almacén',
          'Código',
          'Artículo',
          'Cantidad',
          'Costo',
          'SubTotal',
          'Descuento',
          'Impuestos',
          'Total',
        ];
        dataRows = filas.map((r) => [
          r.noDocumento ?? '',
          formatDateRaw(r.fechaDocumento ?? ''),
          r.entidad ?? '',
          r.almacen ?? '',
          r.codigo ?? '',
          toTitleCase(r.articulo ?? ''),
          r.cantidad ?? 0,
          r.costo ?? 0,
          r.subTotal ?? 0,
          r.descuento ?? 0,
          r.impuestos ?? 0,
          r.total ?? 0,
        ]);
      } else {
        columnHeaders = ['Código', 'Artículo', 'Cantidad', 'Total'];
        dataRows = filas.map((r) => [
          r.codigo ?? '',
          toTitleCase(r.articulo ?? ''),
          r.cantidad ?? 0,
          r.total ?? 0,
        ]);
      }
    } else {
      if (detallado) {
        columnHeaders = [
          'No Documento',
          'Fecha',
          'Entidad',
          'Almacén',
          'Familia',
          'Código',
          'Artículo',
          'Cantidad',
          'Costo',
          'SubTotal',
          'Descuento',
          'Impuestos',
          'Total',
        ];
        dataRows = filasDetalle();
      } else {
        columnHeaders = ['Familia', 'Cantidad', 'Total'];
        dataRows = filas.map((r) => [
          r.familia ?? '',
          r.cantidad ?? 0,
          r.total ?? 0,
        ]);
      }
    }
    exportToExcel({
      fileName: `ReporteDevoluciones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Devoluciones',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const detalleColumns: ColumnsType<ReporteInventarioDetalleDTO> = [
    {
      title: 'Producto',
      key: 'producto',
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => (
        <div>
          <Text strong style={{ fontFamily: 'monospace' }}>
            {d.codigo || '-'}
          </Text>
          {d.articulo && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {d.articulo}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 130,
      align: 'right' as const,
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => formatNumber(d.cantidad ?? 0),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => formatCurrency(d.costo ?? 0),
    },
    {
      title: 'SubTotal',
      key: 'subTotal',
      width: 130,
      align: 'right' as const,
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => formatCurrency(d.subTotal ?? 0),
    },
    {
      title: 'Descuento',
      key: 'descuento',
      width: 130,
      align: 'right' as const,
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => formatCurrency(d.descuento ?? 0),
    },
    {
      title: 'Total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (_: unknown, d: ReporteInventarioDetalleDTO) => (
        <Text strong>{formatCurrency(d.total ?? 0)}</Text>
      ),
    },
  ];

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar el reporte de devoluciones en compra"
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
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <RangePicker
              value={fechas}
              onChange={handleFechasChange}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Input.Search
              placeholder="Código de producto"
              allowClear
              onSearch={handleCodigoSearch}
              style={{ width: '100%', maxWidth: 240 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              placeholder="Todas las familias"
              allowClear
              showSearch
              style={{ width: 200 }}
              value={familia}
              onChange={handleFamiliaChange}
              options={familias.map((f) => ({
                value: f.idExterno ?? '',
                label: f.nombre ?? f.idExterno ?? '',
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              placeholder="Todos los almacenes"
              allowClear
              showSearch
              style={{ width: 200 }}
              value={almacen}
              onChange={handleAlmacenChange}
              options={almacenes.map((a) => ({
                value: a.idExterno ?? a.codigo,
                label: a.nombre,
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Select
              placeholder="Todas las cuentas"
              allowClear
              showSearch
              style={{ width: 200 }}
              value={cuenta}
              onChange={handleCuentaChange}
              options={cuentas.map((c) => ({
                value: c.noCuenta ?? c.idExterno ?? '',
                label: `${c.noCuenta ?? ''} ${c.nombre ?? ''}`.trim(),
              }))}
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <Segmented
              options={[
                { label: 'Por producto', value: 0 },
                { label: 'Por familia', value: 1 },
                { label: 'Resumido', value: 2 },
              ]}
              value={agrupado}
              onChange={(v) => {
                setAgrupado(v as number);
                setPage(1);
              }}
            />
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Detallado
              </Text>
              <Switch
                checked={detallado}
                onChange={(checked) => {
                  setDetallado(checked);
                  setPage(1);
                }}
              />
            </Space>
            <div style={{ flex: 1 }} />
            <Button icon={<PrinterOutlined />} loading={imprimiendo} onClick={handleImprimir} />
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
         <Table<FilaReporteInventario>
           columns={columns}
           dataSource={filas}
           rowKey={(r) => r.key}
           loading={loading}
           scroll={{ x: agrupado === 0 ? (detallado ? 1600 : 720) : agrupado === 1 ? 1100 : 1300 }}
           size="middle"
           rowClassName="paces-row-hover"
           className="paces-border-top paces-list-table"
            expandable={{
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
              expandedRowRender: (record) => (
                <Table<ReporteInventarioDetalleDTO>
                  size="small"
                  rowKey={(_, index) => String(index)}
                  dataSource={getDetallesDeFila(record)}
                  pagination={false}
                  columns={detalleColumns}
                />
              ),
              rowExpandable: (record) =>
                detallado && agrupado !== 0 && getDetallesDeFila(record).length > 0,
            }}
           pagination={{
             current: page,
             pageSize: FILAS_POR_PAGINA,
             total: filas.length,
             showSizeChanger: false,
             onChange: (p) => setPage(p),
             showTotal: (t) => `${t} registros`,
           }}
           locale={{
             emptyText: (
               <div
                 style={{
                   minHeight: 160,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                 }}
               >
                 <Empty description="No hay devoluciones en compra para los filtros seleccionados" />
               </div>
             ),
           }}
         />
      </Card>
    </>
  );
};

export default ReporteDevoluciones;
