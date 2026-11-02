import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Button, Typography, message, Spin, DatePicker, Switch,
  Space, Row, Col, Table, Tabs, Empty,
} from 'antd';
import { Select } from '../../components/Select';
import { TableOutlined, PrinterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { asientosInventarioApi } from '../../api/asientosInventarioApi';
import { documentosApi } from '../../api/documentosApi';
import { parametrosApi } from '../../api/parametrosApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { formatDateParam, extraerMensajeError } from '../../utils/formats';
import { Sucursal } from '../../types/auth';
import type { CuentaContableResumenDTO, ReporteAsientosInventarioItem } from '../../types/contabilidad';
import type { DocumentoDTO } from '../../types/documento';

const { Text } = Typography;
const { RangePicker } = DatePicker;

/* ─────────────────────────────────────────────────────────────────────────────
 * Cálculo en centavos enteros
 *
 * Los montos llegan como `number` (decimal de C#). Para que las restas y las
 * acumulaciones no generen error de coma flotante (0.30000000000000004), se
 * trabaja SIEMPRE en centavos enteros y se divide recién al formatear. Esto es
 * crítico: el reporte existe para detectar descuadres entre el balance contable
 * y el auxiliar, y un error de redondeo produciría falsos descuadres.
 * ───────────────────────────────────────────────────────────────────────────── */

const aCentavos = (monto: number): number => Math.round(monto * 100);

/** Cultura fija es-DO (coma decimal, punto de miles), no heredada del navegador. */
const FORMATO_MONTO = new Intl.NumberFormat('es-DO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Recibe centavos y devuelve el monto formateado. Divide recién aquí. */
const formatMonto = (centavos: number): string => FORMATO_MONTO.format(centavos / 100);

/** Fila calculada con montos en centavos. */
interface FilaCalculada {
  item: ReporteAsientosInventarioItem;
  debitos: number;      // centavos
  creditos: number;     // centavos
  montoAuxiliar: number; // centavos
  balance: number;      // centavos (debitos - creditos)
  diferencia: number;   // centavos (balance - montoAuxiliar)
}

/** 5 columnas numéricas agregadas en centavos (subtotal y total general). */
interface TotalesCentavos {
  debitos: number;
  creditos: number;
  montoAuxiliar: number;
  balance: number;
  diferencia: number;
}

interface GrupoReporte {
  noCuenta: string;
  nombre: string;
  filas: FilaCalculada[];
  subtotal: TotalesCentavos;
}

const calcularFila = (item: ReporteAsientosInventarioItem): FilaCalculada => {
  const debitos = aCentavos(item.debitos);
  const creditos = aCentavos(item.creditos);
  const montoAuxiliar = aCentavos(item.montoAuxiliar);
  const balance = debitos - creditos;
  const diferencia = balance - montoAuxiliar;
  return { item, debitos, creditos, montoAuxiliar, balance, diferencia };
};

/** Reduce único: acumula las 3 columnas base y deriva balance/diferencia restando. */
const calcularTotales = (filas: FilaCalculada[]): TotalesCentavos => {
  const acc = filas.reduce<TotalesCentavos>(
    (a, f) => ({
      debitos: a.debitos + f.debitos,
      creditos: a.creditos + f.creditos,
      montoAuxiliar: a.montoAuxiliar + f.montoAuxiliar,
      balance: 0,
      diferencia: 0,
    }),
    { debitos: 0, creditos: 0, montoAuxiliar: 0, balance: 0, diferencia: 0 },
  );
  acc.balance = acc.debitos - acc.creditos;
  acc.diferencia = acc.balance - acc.montoAuxiliar;
  return acc;
};

/** Acumula totales ya calculados (para el Total General del resumen por cuenta). */
const sumarTotales = (totales: TotalesCentavos[]): TotalesCentavos => {
  const acc = totales.reduce<TotalesCentavos>(
    (a, t) => ({
      debitos: a.debitos + t.debitos,
      creditos: a.creditos + t.creditos,
      montoAuxiliar: a.montoAuxiliar + t.montoAuxiliar,
      balance: 0,
      diferencia: 0,
    }),
    { debitos: 0, creditos: 0, montoAuxiliar: 0, balance: 0, diferencia: 0 },
  );
  acc.balance = acc.debitos - acc.creditos;
  acc.diferencia = acc.balance - acc.montoAuxiliar;
  return acc;
};

/**
 * Agrupa por cuenta contable preservando el orden del backend
 * (las filas ya llegan ordenadas por cuenta y `Existencia` primero dentro del grupo).
 */
const agrupar = (items: ReporteAsientosInventarioItem[]): GrupoReporte[] => {
  const mapa = new Map<string, FilaCalculada[]>();
  const orden: string[] = [];
  for (const item of items) {
    const key = item.cuentaContableNoCuenta;
    if (!mapa.has(key)) {
      mapa.set(key, []);
      orden.push(key);
    }
    mapa.get(key)!.push(calcularFila(item));
  }
  return orden.map((noCuenta) => {
    const filas = mapa.get(noCuenta)!;
    return {
      noCuenta,
      nombre: filas[0].item.cuentaContableNombre,
      filas,
      subtotal: calcularTotales(filas),
    };
  });
};

/** Fila plana para la tabla: intercala encabezado, detalle, subtotal y total. */
type FilaReporte =
  | { tipo: 'grupo'; key: string; noCuenta: string; nombre: string }
  | { tipo: 'detalle'; key: string; documento: string; fila: FilaCalculada }
  | { tipo: 'subtotal'; key: string; totales: TotalesCentavos }
  | { tipo: 'total'; key: string; totales: TotalesCentavos };

/** Totales por cuenta para la vista resumida (en centavos). */
interface FilaResumen {
  key: string;
  noCuenta: string;
  nombre: string;
  totales: TotalesCentavos;
}

/** Fila plana para la tabla resumen: una fila por cuenta más la fila de Total General. */
type FilaResumenTabla =
  | { tipo: 'cuenta'; key: string; noCuenta: string; nombre: string; totales: TotalesCentavos }
  | { tipo: 'total'; key: string; totales: TotalesCentavos };

const AsientosInventario: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalContable = useAuthStore((s) => s.sucursalContable);
  const [sucursalContableResuelta, setSucursalContableResuelta] = useState<Sucursal>(sucursalContable);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ──── Filtros ──── */

  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  // Cuentas contables (opcional, selección múltiple)
  const [cuentasSeleccionadas, setCuentasSeleccionadas] = useState<CuentaContableResumenDTO[]>([]);
  const [cuentasDisponibles, setCuentasDisponibles] = useState<CuentaContableResumenDTO[]>([]);

  // Tipo de documento (opcional, mutuamente excluyente con la cuenta)
  const [tipoDocumento, setTipoDocumento] = useState<string | undefined>(undefined);
  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);

  // Costo alterno y balance anterior
  const [alterno, setAlterno] = useState(false);
  const [balance, setBalance] = useState(false);

  /* ──── Datos ──── */

  const [items, setItems] = useState<ReporteAsientosInventarioItem[]>([]);
  const [consultando, setConsultando] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  /* ──── UI setup ──── */

  useEffect(() => {
    setActiveModule('RAsientosInventario');
    setPageTitleOverride('Reporte de Asientos de Inventario');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* ──── Carga de documentos para el filtro ──── */

  useEffect(() => {
    documentosApi
      .obtenerListado(sucursalActiva)
      .then(setDocumentos)
      .catch((err) => console.warn('Error al cargar documentos para filtro', err));
  }, [sucursalActiva]);

  useEffect(() => {
    let cancelado = false;
    parametrosApi
      .obtenerSucursalContable(sucursalActiva)
      .then((s) => {
        if (!cancelado && s != null) setSucursalContableResuelta(s as Sucursal);
      })
      .catch((err) => {
        message.error(extraerMensajeError(err, 'Error al obtener la sucursal contable'));
      });
    return () => {
      cancelado = true;
    };
  }, [sucursalActiva]);

  /* ──── Carga de cuentas contables auxiliares ──── */

  useEffect(() => {
    cuentaContableApi
      .obtenerAuxiliares(sucursalActiva)
      .then(setCuentasDisponibles)
      .catch((err) => {
        message.error(extraerMensajeError(err, 'Error al cargar las cuentas contables'));
      });
  }, [sucursalActiva]);

  /* ──── Derivados ──── */

  const { grupos, totalGeneral } = useMemo(() => {
    const gs = agrupar(items);
    const todasLasFilas = gs.flatMap((g) => g.filas);
    return { grupos: gs, totalGeneral: calcularTotales(todasLasFilas) };
  }, [items]);

  const filasReporte = useMemo<FilaReporte[]>(() => {
    const filas: FilaReporte[] = [];
    let idx = 0;
    for (const g of grupos) {
      filas.push({ tipo: 'grupo', key: `g-${idx++}`, noCuenta: g.noCuenta, nombre: g.nombre });
      for (const f of g.filas) {
        filas.push({ tipo: 'detalle', key: `d-${idx++}`, documento: f.item.documentoNombre, fila: f });
      }
      filas.push({ tipo: 'subtotal', key: `s-${idx++}`, totales: g.subtotal });
    }
    filas.push({ tipo: 'total', key: 't-total', totales: totalGeneral });
    return filas;
  }, [grupos, totalGeneral]);

  const resumenPorCuenta = useMemo<FilaResumen[]>(() => {
    return cuentasSeleccionadas.map((cuenta) => {
      const filas = items
        .filter((item) => item.cuentaContableNoCuenta === cuenta.noCuenta)
        .map(calcularFila);
      return {
        key: cuenta.noCuenta,
        noCuenta: cuenta.noCuenta,
        nombre: cuenta.nombre,
        totales: calcularTotales(filas),
      };
    });
  }, [cuentasSeleccionadas, items]);

  const filasResumen = useMemo<FilaResumenTabla[]>(() => {
    const filas: FilaResumenTabla[] = resumenPorCuenta.map((r) => ({
      tipo: 'cuenta',
      key: r.key,
      noCuenta: r.noCuenta,
      nombre: r.nombre,
      totales: r.totales,
    }));
    filas.push({
      tipo: 'total',
      key: 't-total',
      totales: sumarTotales(resumenPorCuenta.map((r) => r.totales)),
    });
    return filas;
  }, [resumenPorCuenta]);

  const docOptions = useMemo(
    () => documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })),
    [documentos],
  );

  /* ──── Handlers ──── */

  const handleConsultar = useCallback(async () => {
    setConsultando(true);
    setItems([]);
    try {
      const filtrosBase = {
        fechaInicial: formatDateParam(fechas[0].startOf('day').toDate()),
        fechaFinal: formatDateParam(fechas[1].endOf('day').toDate()),
        tipoDocumento: tipoDocumento || undefined,
        alterno,
        balance,
        sucursalContable: sucursalContableResuelta,
      };

      if (cuentasSeleccionadas.length === 0) {
        // Sin cuentas: una sola llamada con noCuenta indefinido (comportamiento actual).
        const res = await asientosInventarioApi.obtenerDatos(sucursalActiva, {
          ...filtrosBase,
          noCuenta: undefined,
        });
        setItems(res.items ?? []);
      } else if (cuentasSeleccionadas.length === 1) {
        // Una cuenta: una llamada con noCuenta = cuenta.noCuenta.
        const res = await asientosInventarioApi.obtenerDatos(sucursalActiva, {
          ...filtrosBase,
          noCuenta: cuentasSeleccionadas[0].noCuenta,
        });
        setItems(res.items ?? []);
      } else {
        // Varias cuentas: una llamada por cuenta y se concatenan los items.
        const resultados = await Promise.all(
          cuentasSeleccionadas.map((cuenta) =>
            asientosInventarioApi.obtenerDatos(sucursalActiva, {
              ...filtrosBase,
              noCuenta: cuenta.noCuenta,
            }),
          ),
        );
        setItems(resultados.flatMap((res) => res.items ?? []));
      }
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al consultar los datos'));
    } finally {
      setConsultando(false);
      setConsultado(true);
    }
  }, [sucursalActiva, sucursalContableResuelta, fechas, cuentasSeleccionadas, tipoDocumento, alterno, balance]);

  const handleImprimir = async () => {
    if (items.length === 0) {
      message.warning('No hay datos para imprimir');
      return;
    }
    setImprimiendo(true);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechas[0].startOf('day').toDate()),
        fechaFinal: formatDateParam(fechas[1].endOf('day').toDate()),
        noCuenta: cuentasSeleccionadas.length
          ? cuentasSeleccionadas.map((c) => c.noCuenta).join(', ')
          : undefined,
        tipoDocumento: tipoDocumento || undefined,
        alterno,
        balance,
        sucursalContable: sucursalContableResuelta,
      };
      const blob = await asientosInventarioApi.imprimir(sucursalActiva, filtros, items);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al generar el PDF'));
    } finally {
      setImprimiendo(false);
    }
  };

  const handleCuentasChange = (vals: string[]) => {
    setCuentasSeleccionadas(cuentasDisponibles.filter((c) => vals.includes(c.noCuenta)));
    // Cuenta y documento son mutuamente excluyentes en el desktop.
    if (vals.length > 0) setTipoDocumento(undefined);
  };

  const limpiarCuenta = () => {
    setCuentasSeleccionadas([]);
  };

  const handleTipoDocumentoChange = (val: string | undefined) => {
    setTipoDocumento(val);
    if (val) {
      // Al elegir documento se limpian las cuentas.
      setCuentasSeleccionadas([]);
    }
  };

  /* ──── Columnas ──── */

  const columnas: ColumnsType<FilaReporte> = [
    {
      title: 'Documento',
      key: 'documento',
      width: 220,
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 6 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'grupo') return <Text strong>{r.noCuenta} - {r.nombre}</Text>;
        if (r.tipo === 'subtotal') return <Text strong>Subtotal</Text>;
        if (r.tipo === 'total') return <Text strong>Total General</Text>;
        return <Text>{r.documento}</Text>;
      },
    },
    {
      title: 'Débito',
      key: 'debitos',
      width: 130,
      align: 'right',
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 0 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'detalle') return <Text>{formatMonto(r.fila.debitos)}</Text>;
        if (r.tipo === 'subtotal' || r.tipo === 'total') return <Text strong>{formatMonto(r.totales.debitos)}</Text>;
        return null;
      },
    },
    {
      title: 'Crédito',
      key: 'creditos',
      width: 130,
      align: 'right',
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 0 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'detalle') return <Text>{formatMonto(r.fila.creditos)}</Text>;
        if (r.tipo === 'subtotal' || r.tipo === 'total') return <Text strong>{formatMonto(r.totales.creditos)}</Text>;
        return null;
      },
    },
    {
      title: 'Balance',
      key: 'balance',
      width: 130,
      align: 'right',
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 0 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'detalle') return <Text>{formatMonto(r.fila.balance)}</Text>;
        if (r.tipo === 'subtotal' || r.tipo === 'total') return <Text strong>{formatMonto(r.totales.balance)}</Text>;
        return null;
      },
    },
    {
      title: 'Auxiliar',
      key: 'montoAuxiliar',
      width: 130,
      align: 'right',
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 0 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'detalle') return <Text>{formatMonto(r.fila.montoAuxiliar)}</Text>;
        if (r.tipo === 'subtotal' || r.tipo === 'total') return <Text strong>{formatMonto(r.totales.montoAuxiliar)}</Text>;
        return null;
      },
    },
    {
      title: 'Diferencia',
      key: 'diferencia',
      width: 130,
      align: 'right',
      onCell: (r) => (r.tipo === 'grupo' ? { colSpan: 0 } : {}),
      render: (_v, r) => {
        if (r.tipo === 'detalle') return <Text strong>{formatMonto(r.fila.diferencia)}</Text>;
        if (r.tipo === 'subtotal' || r.tipo === 'total') return <Text strong>{formatMonto(r.totales.diferencia)}</Text>;
        return null;
      },
    },
  ];

  const columnasResumen: ColumnsType<FilaResumenTabla> = [
    {
      title: 'Cuenta',
      key: 'cuenta',
      render: (_v, r) => {
        if (r.tipo === 'total') return <Text strong>Total General</Text>;
        return <Text>{r.noCuenta} - {r.nombre}</Text>;
      },
    },
    {
      title: 'Débito',
      key: 'debitos',
      align: 'right',
      render: (_v, r) => <Text strong={r.tipo === 'total'}>{formatMonto(r.totales.debitos)}</Text>,
    },
    {
      title: 'Crédito',
      key: 'creditos',
      align: 'right',
      render: (_v, r) => <Text strong={r.tipo === 'total'}>{formatMonto(r.totales.creditos)}</Text>,
    },
    {
      title: 'Balance',
      key: 'balance',
      align: 'right',
      render: (_v, r) => <Text strong={r.tipo === 'total'}>{formatMonto(r.totales.balance)}</Text>,
    },
    {
      title: 'Auxiliar',
      key: 'montoAuxiliar',
      align: 'right',
      render: (_v, r) => <Text strong={r.tipo === 'total'}>{formatMonto(r.totales.montoAuxiliar)}</Text>,
    },
    {
      title: 'Diferencia',
      key: 'diferencia',
      align: 'right',
      render: (_v, r) => <Text strong>{formatMonto(r.totales.diferencia)}</Text>,
    },
  ];

  /* ──── Render ──── */

  const emptyText = (
    <Empty
      description={
        !consultado
          ? 'Seleccione los filtros y presione Consultar para ver el reporte'
          : 'No se encontraron datos para el filtro seleccionado'
      }
    />
  );

  const tablaDetallada = (
    <Table<FilaReporte>
      className="paces-border-top paces-list-table"
      dataSource={filasReporte}
      columns={columnas}
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ x: 1000, y: 600 }}
      onRow={(r) => {
        if (r.tipo === 'grupo') {
          return { style: { background: '#f0f5ff', fontWeight: 600 } };
        }
        if (r.tipo === 'subtotal') {
          return { style: { background: '#fafafa', fontWeight: 600 } };
        }
        if (r.tipo === 'total') {
          return { style: { background: '#e6f4ff', fontWeight: 700 } };
        }
        return {};
      }}
      locale={{ emptyText }}
    />
  );

  const tablaResumida = (
    <Table<FilaResumenTabla>
      className="paces-border-top paces-list-table"
      dataSource={filasResumen}
      columns={columnasResumen}
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ x: 1000, y: 600 }}
      onRow={(r) => (r.tipo === 'total' ? { style: { background: '#e6f4ff', fontWeight: 700 } } : {})}
      locale={{ emptyText }}
    />
  );

  return (
    <>
      {/* ──── Filtros ──── */}
      <Card className="paces-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Rango de Fechas</Text>
              </div>
              <RangePicker
                value={fechas}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) setFechas([dates[0], dates[1]]);
                }}
                allowClear={false}
                disabledDate={(current) => current && current.isAfter(dayjs(), 'day')}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Cuenta Contable</Text>
              </div>
              <Select
                mode="multiple"
                allowClear
                showSearch
                placeholder="Buscar cuenta..."
                value={cuentasSeleccionadas.map((c) => c.noCuenta)}
                onChange={handleCuentasChange}
                options={cuentasDisponibles.map((c) => ({
                  value: c.noCuenta,
                  label: `${c.noCuenta} - ${c.nombre}`,
                }))}
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tipo Documento</Text>
              </div>
              <Select
                placeholder="Todos"
                allowClear
                showSearch
                value={tipoDocumento}
                onChange={handleTipoDocumentoChange}
                options={docOptions}
                style={{ width: '100%' }}
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Col>
          </Row>

          <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Switch checked={alterno} onChange={setAlterno} />
                <Text>Costo Alterno</Text>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Switch checked={balance} onChange={setBalance} />
                <Text>Balance Anterior</Text>
              </Space>
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<TableOutlined />}
                  onClick={handleConsultar}
                  loading={consultando}
                >
                  Consultar
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handleImprimir}
                  loading={imprimiendo}
                  disabled={consultando || items.length === 0}
                >
                  Imprimir PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* ──── Resultados ──── */}
      <Spin spinning={consultando}>
        <Card
          className="paces-card-erp"
          style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}
        >
          {cuentasSeleccionadas.length > 1 ? (
            <Tabs
              defaultActiveKey="detallado"
              items={[
                { key: 'resumido', label: 'Resumido', children: tablaResumida },
                { key: 'detallado', label: 'Detallado', children: tablaDetallada },
              ]}
            />
          ) : (
            tablaDetallada
          )}
        </Card>
      </Spin>
    </>
  );
};

export default AsientosInventario;
