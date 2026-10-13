import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Input, Button, Typography, message, Spin, DatePicker, Switch,
  Space, Row, Col, Table, Empty, 
} from 'antd';
import { Select } from '../../components/Select';
import { SearchOutlined, CloseOutlined, TableOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { asientosInventarioApi } from '../../api/asientosInventarioApi';
import { documentosApi } from '../../api/documentosApi';
import { formatDateParam, extraerMensajeError } from '../../utils/formats';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
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

const AsientosInventario: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalContable = useAuthStore((s) => s.sucursalContable);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ──── Filtros ──── */

  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  // Cuenta contable (opcional)
  const [noCuenta, setNoCuenta] = useState<string | undefined>(undefined);
  const [nomCuenta, setNomCuenta] = useState('');
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);

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

  const docOptions = useMemo(
    () => documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${d.nombre || ''}` })),
    [documentos],
  );

  /* ──── Handlers ──── */

  const handleConsultar = useCallback(async () => {
    setConsultando(true);
    setItems([]);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechas[0].startOf('day').toDate()),
        fechaFinal: formatDateParam(fechas[1].endOf('day').toDate()),
        noCuenta: noCuenta || undefined,
        tipoDocumento: tipoDocumento || undefined,
        alterno,
        balance,
        sucursalContable,
      };
      const res = await asientosInventarioApi.obtenerDatos(sucursalActiva, filtros);
      setItems(res.items ?? []);
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al consultar los datos'));
    } finally {
      setConsultando(false);
      setConsultado(true);
    }
  }, [sucursalActiva, sucursalContable, fechas, noCuenta, tipoDocumento, alterno, balance]);

  const seleccionarCuenta = (cuenta: CuentaContableResumenDTO) => {
    setNoCuenta(cuenta.noCuenta);
    setNomCuenta(`${cuenta.noCuenta} - ${cuenta.nombre}`);
    // Cuenta y documento son mutuamente excluyentes en el desktop.
    setTipoDocumento(undefined);
    setModalCuentaAbierto(false);
  };

  const limpiarCuenta = () => {
    setNoCuenta(undefined);
    setNomCuenta('');
  };

  const handleTipoDocumentoChange = (val: string | undefined) => {
    setTipoDocumento(val);
    if (val) {
      // Al elegir documento se limpia la cuenta.
      setNoCuenta(undefined);
      setNomCuenta('');
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

  /* ──── Render ──── */

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
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Buscar cuenta..."
                  value={nomCuenta}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={() => setModalCuentaAbierto(true)} />
                {noCuenta ? <Button icon={<CloseOutlined />} onClick={limpiarCuenta} /> : null}
              </Space.Compact>
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
              <Button
                type="primary"
                icon={<TableOutlined />}
                onClick={handleConsultar}
                loading={consultando}
              >
                Consultar
              </Button>
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
            locale={{
              emptyText: (
                <Empty
                  description={
                    !consultado
                      ? 'Seleccione los filtros y presione Consultar para ver el reporte'
                      : 'No se encontraron datos para el filtro seleccionado'
                  }
                />
              ),
            }}
          />
        </Card>
      </Spin>

      {/* ──── Modal búsqueda cuenta contable (modo simple) ──── */}
      <BuscarCuentaContableModal
        open={modalCuentaAbierto}
        onClose={() => setModalCuentaAbierto(false)}
        onSelect={seleccionarCuenta}
        sucursal={sucursalActiva}
      />
    </>
  );
};

export default AsientosInventario;
