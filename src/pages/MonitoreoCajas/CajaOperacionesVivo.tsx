import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Tag,
  Badge,
  Button,
  Input,
  Alert,
  Empty,
  Spin,
  Table,
  message,
  Typography,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ReloadOutlined,
  FileExcelOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { monitoreoApi } from '../../api/monitoreoApi';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { useAuthStore } from '../../stores/authStore';
import type { CajaVivoDTO, FacturaCajaVivoDTO, FacturaCajaEventoDTO, TurnoPorSubirDTO } from '../../types/monitoreo';
import type { CobroDTO } from '../../types/facturaPOS';
import CobrosMinimal from '../../components/CobrosCard/CobrosMinimal';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { formatCurrency } from '../../utils/formats';

const { Text, Title } = Typography;

const formatearHora = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Formatea una fecha como `yyyyMMdd` + sufijo de hora (000000 / 235959).
const formatearYMD = (d: Date, sufijo: string): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dia}${sufijo}`;
};

// Etiquetas cortas para el resumen compacto de cobros por fila en el listado.
const MEDIOS_COBRO: { key: keyof CobroDTO; label: string; corto: string }[] = [
  { key: 'efectivo', label: 'Efectivo', corto: 'Efe' },
  { key: 'cheque', label: 'Cheque', corto: 'Che' },
  { key: 'transferencia', label: 'Transferencia', corto: 'Transf' },
  { key: 'tarjetaCredito', label: 'Tarjeta Crédito', corto: 'TC' },
  { key: 'tarjetaDebito', label: 'Tarjeta Débito', corto: 'TD' },
  { key: 'bono', label: 'Bono', corto: 'Bono' },
  { key: 'tarjetaRegalo', label: 'Tarjeta Regalo', corto: 'TR' },
  { key: 'notaCredito', label: 'Nota Crédito', corto: 'NC' },
];

const CajaOperacionesVivo: React.FC = () => {
  const navigate = useNavigate();
  const { ip } = useParams<{ ip: string }>();

  // ─── Estado local ──────────────────────────────────────────
  const [data, setData] = useState<CajaVivoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscar, setBuscar] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Contador de facturas nuevas avisadas por push mientras el usuario está en una página > 1.
  const [nuevas, setNuevas] = useState(0);
  // transacId de la fila cuyo documento se está resolviendo contra el central (spinner).
  const [docResolviendo, setDocResolviendo] = useState<number | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [hubConectado, setHubConectado] = useState<boolean>(() => monitoreoApi.estaConectado);
  // Turnos cerrados que aun tienen datos sin confirmar en el central.
  const [turnosPorSubir, setTurnosPorSubir] = useState<TurnoPorSubirDTO[]>([]);

  // Guarda anti-solapado de refrescos (push/poll).
  const cargandoRef = useRef(false);

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  // ─── Carga de datos ────────────────────────────────────────
  const cargar = useCallback(
    async (silencioso = false) => {
      if (!ip) return;
      if (cargandoRef.current) return; // evita refrescos solapados
      cargandoRef.current = true;
      if (!silencioso) setLoading(true);
      try {
        const [vivo, porSubir] = await Promise.all([
          monitoreoApi.obtenerVivo(ip, {
            buscar: buscar || undefined,
            cantidad: pageSize,
            salto: (page - 1) * pageSize,
          }),
          monitoreoApi.turnosPorSubir(ip).catch(() => null),
        ]);
        setData(vivo);
        setTurnosPorSubir(porSubir ?? []);
        setError(null);
        setUltimaActualizacion(new Date());
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { errorMessage?: string } } };
        const status = e.response?.status;
        const msg = e.response?.data?.errorMessage;
        if (status === 409) {
          setError(msg || 'La caja no responde en su base local');
        } else if (status === 404) {
          // 404: la caja no tiene ruta a su base local o no está registrada.
          // Igual que el 409, se muestra como Alert persistente con Reintentar.
          setError(msg || 'La caja no tiene ruta configurada a su base local o no está registrada');
        } else if (silencioso) {
          // Refresco automático: no spamear toasts; mostramos el Alert con reintento.
          setError(msg || 'Error al cargar operaciones de la caja');
        } else {
          message.error(msg || 'Error al cargar operaciones de la caja');
        }
      } finally {
        cargandoRef.current = false;
        if (!silencioso) setLoading(false);
      }
    },
    [ip, buscar, page, pageSize]
  );

  // Refresco disparado por push/polling: respeta la guarda de solapado y usa
  // siempre la version mas reciente de cargar (con page/buscar/pageSize actuales).
  const cargarRef = useRef(cargar);
  useEffect(() => {
    cargarRef.current = cargar;
  }, [cargar]);

  const refrescar = useCallback(() => {
    void cargarRef.current(true);
  }, []);

  // Recarga manual: activa el Spin y vuelve a consultar la caja.
  const handleRecargar = useCallback(() => {
    if (cargandoRef.current) return;
    void cargar();
  }, [cargar]);

  // Replica `page` en un ref para leerla dentro del callback de SignalR sin
  // volver a conectar el hub cada vez que cambia la pagina.
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // ─── Carga inicial ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      void cargar();
    }, 0);

    return () => clearTimeout(t);
  }, [cargar]);

  // ─── SignalR: conexión + suscripción a la caja ──────────────
  useEffect(() => {
    if (!ip) return;

    let cancelado = false;

    const conectar = async () => {
      try {
        await monitoreoApi.conectarHub({
          onFacturaCaja: (evento: FacturaCajaEventoDTO) => {
            // Solo refrescar si el evento corresponde a esta caja. La IP se compara
            // sin distinguir mayusculas porque el grupo del hub va normalizado.
            if ((evento.ip || '').toLowerCase() !== ip.toLowerCase()) return;
            // Si el usuario está en una página > 1, las facturas nuevas aparecen
            // en la página 1: se acumulan en un contador para avisar con un Tag.
            if (evento.cantidad > 0 && pageRef.current > 1) {
              setNuevas((n) => n + evento.cantidad);
            }
            refrescar();
          },
        });
      } catch {
        // SignalR no crítico: el polling de respaldo cubre la actualización.
        console.warn('[CajaOperacionesVivo] SignalR no disponible, usando solo polling');
      }
      if (!cancelado) {
        await monitoreoApi.suscribirCaja(ip);
      }
    };

    void conectar();

    return () => {
      cancelado = true;
      void monitoreoApi.desuscribirCaja(ip);
      // El api lleva el conteo de pantallas que usan el hub: si otra sigue
      // usándolo no se cierra la conexión, y al volver al listado no queda huérfana.
      void monitoreoApi.desconectarHub();
    };
  }, [ip, refrescar]);

  // ─── Estado de conexión del hub (para badge e intervalo) ───
  useEffect(() => {
    const unsubscribe = monitoreoApi.onStateChange(setHubConectado);
    return unsubscribe;
  }, []);

  // ─── Auto-refresh (respaldo): 60 s con hub, 8 s sin hub ────
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        refrescar();
      }
    }, hubConectado ? 60000 : 8000);

    return () => clearInterval(intervalo);
  }, [hubConectado, refrescar]);

  // ─── Búsqueda del servidor ─────────────────────────────────
  const handleSearch = useCallback((valor: string) => {
    setBuscar(valor);
    setPage(1);
  }, []);

  // Cambio de página/tamaño: si cambia pageSize, vuelve a la página 1.
  const handlePaginacion = useCallback(
    (p: number, ps: number) => {
      setNuevas(0);
      if (ps !== pageSize) {
        setPageSize(ps);
        setPage(1);
      } else {
        setPage(p);
      }
    },
    [pageSize]
  );

  // Lleva al usuario a la página 1 para ver las facturas nuevas (push).
  const handleVerNuevas = useCallback(() => {
    setNuevas(0);
    setPage(1);
  }, []);

  // ─── Deep-link al documento (resuelve contra el central) ───
  const handleClickDocumento = useCallback(
    async (record: FacturaCajaVivoDTO) => {
      if (!data) return;
      if (docResolviendo === record.transacId) return; // evita dobles clics
      setDocResolviendo(record.transacId);
      try {
        const apertura = data.turno?.fechaApertura ? new Date(data.turno.fechaApertura) : null;
        const base =
          apertura && !isNaN(apertura.getTime())
            ? apertura
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const desde = formatearYMD(base, '000000');
        const hasta = formatearYMD(new Date(), '235959');

        const res = await facturaPOSApi.buscarPorDocumento(data.sucursal, {
          documento: record.numDoc,
          cantidad: 20,
          salto: 0,
          desde,
          hasta,
        });
        const match = res.data.find(
          (d) =>
            (d.documento || '').trim().toLowerCase() === (record.numDoc || '').trim().toLowerCase()
        );
        if (match) {
          navigate(`/FPV/${match.id}`);
        } else {
          message.warning(
            'La factura todavia no esta disponible en el central (pendiente de sincronizacion).'
          );
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { errorMessage?: string } } };
        message.error(e?.response?.data?.errorMessage || 'Error al buscar el documento en el central');
      } finally {
        setDocResolviendo(null);
      }
    },
    [data, docResolviendo, navigate]
  );

  // ─── Exportar Excel ────────────────────────────────────────
  const handleExportarExcel = async () => {
    if (!data) return;
    const companyName = await getCompanyName(sucursalActiva);
    exportToExcel({
      fileName: `CajaOperacionesVivo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Operaciones en vivo',
      companyName,
      columnHeaders: ['Documento', 'NCF', 'Hora', 'Cliente', 'Total', 'Anulada', 'Vouchers', 'Sync'],
      dataRows: (data.facturas || []).map((f) => [
        f.numDoc,
        f.ncf || '',
        f.hora || '',
        f.numEntidad ? `${f.numEntidad} ${f.nombre || ''}`.trim() : f.nombre || '',
        f.total,
        f.anulado ? 'Sí' : 'No',
        f.vouchers?.length ?? 0,
        f.estadoSync || '',
      ]),
    });
  };

  // ─── Columnas ──────────────────────────────────────────────
  const columns: ColumnsType<FacturaCajaVivoDTO> = [
    {
      title: 'Documento',
      dataIndex: 'numDoc',
      key: 'numDoc',
      width: 140,
      fixed: 'left',
      render: (numDoc: string, record: FacturaCajaVivoDTO) => {
        // Deep-link al central: record.transacId es el TRANSACID LOCAL del PVLOCAL,
        // por lo que se resuelve el documento contra el central y se navega a /FPV/{id}.
        const resolviendo = docResolviendo === record.transacId;
        return (
          <Tooltip title={record.ncf || undefined}>
            <Text
              strong
              className="paces-doc-link"
              style={{ cursor: 'pointer' }}
              onClick={() => handleClickDocumento(record)}
            >
              {resolviendo ? <Spin size="small" style={{ marginRight: 6 }} /> : null}
              {numDoc}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Hora',
      dataIndex: 'hora',
      key: 'hora',
      width: 90,
      render: (hora: string) => <Text>{hora || '—'}</Text>,
    },
    {
      title: 'Cliente',
      key: 'cliente',
      width: 240,
      render: (_: unknown, record: FacturaCajaVivoDTO) => (
        <div>
          {record.numEntidad && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.numEntidad}
              </Text>
            </div>
          )}
          <div>{record.nombre || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Cobros',
      key: 'cobro',
      width: 240,
      render: (_: unknown, record: FacturaCajaVivoDTO) => {
        // Resumen compacto por fila (CobrosMinimal queda solo para la cabecera).
        const cobro = record.cobro;
        if (!cobro) return <Text type="secondary">—</Text>;
        const medios = MEDIOS_COBRO.filter((m) => (cobro[m.key] || 0) > 0);
        if (medios.length === 0) return <Text type="secondary">—</Text>;
        const resumen = medios
          .map((m) => `${m.corto} ${formatCurrency(cobro[m.key] || 0)}`)
          .join(' · ');
        const desglose = medios
          .map((m) => `${m.label}: ${formatCurrency(cobro[m.key] || 0)}`)
          .join('\n');
        return (
          <Tooltip title={<div style={{ whiteSpace: 'pre-line' }}>{desglose}</div>}>
            <Text style={{ fontSize: 12 }}>{resumen}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">
          {formatCurrency(total)}
        </Text>
      ),
    },
    {
      title: 'Anulada',
      key: 'anulado',
      width: 90,
      align: 'center',
      render: (_: unknown, record: FacturaCajaVivoDTO) =>
        record.anulado ? <Tag color="red">Anulada</Tag> : null,
    },
    {
      title: 'Vouchers',
      key: 'vouchers',
      width: 90,
      align: 'center',
      render: (_: unknown, record: FacturaCajaVivoDTO) =>
        record.vouchers?.length ? <Text>{record.vouchers.length}</Text> : '—',
    },
    {
      title: 'Sync',
      key: 'estadoSync',
      width: 110,
      render: (_: unknown, record: FacturaCajaVivoDTO) => {
        if (!record.estadoSync) return null;
        const color =
          record.estadoSync === 'ERROR'
            ? 'red'
            : record.estadoSync === 'PENDIENTE'
              ? 'orange'
              : 'green';
        const tag = <Tag color={color}>{record.estadoSync}</Tag>;
        return record.errorSync ? <Tooltip title={record.errorSync}>{tag}</Tooltip> : tag;
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────
  const resumen = data?.resumen;

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRecargar}>
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
        {/* ── Toolbar ─────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/CCENTRALSUPERVISION')}>
              Volver
            </Button>

            <Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {data?.nombre ? `Operaciones en vivo — ${data.nombre}` : 'Operaciones en vivo'}
            </Title>

            <Badge
              status={hubConectado ? 'success' : 'processing'}
              text={
                <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {hubConectado ? 'En vivo' : 'Actualizando cada 8 s'}
                </Text>
              }
            />

            {nuevas > 0 && page > 1 && (
              <Tag color="blue" style={{ cursor: 'pointer' }} onClick={handleVerNuevas}>
                {nuevas} nuevas
              </Tag>
            )}

            {data?.turno && (
              <Tag color="blue">
                #{data.turno.noTurno} · {data.turno.nombreUsuario} · {data.turno.horaApertura}
              </Tag>
            )}
            {data && (
              <Tag color={data.fuente === 'TURNO' ? 'green' : 'orange'}>{data.fuente}</Tag>
            )}

            <Input.Search
              placeholder="Buscar..."
              allowClear
              onSearch={handleSearch}
              style={{ width: '100%', maxWidth: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />

            <div style={{ flex: 1 }} />

            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            <Button icon={<ReloadOutlined />} onClick={handleRecargar} loading={loading} />
          </div>
        </div>

        {/* ── Resumen ─────────────────────────────────────── */}
        {data && !error && resumen && (
          <div style={{ padding: '0 24px 16px' }}>
            <Card className="paces-card" size="small" title="Resumen">
              <Descriptions
                bordered
                size="small"
                column={{ xs: 1, sm: 2, md: 3, lg: 4 }}
              >
                <Descriptions.Item label="Total vendido">
                  <Text strong>{formatCurrency(resumen.totalVendido)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Facturas">
                  {resumen.cantidadFacturas}
                </Descriptions.Item>
                <Descriptions.Item label="Anuladas">
                  {resumen.cantidadAnuladas}
                </Descriptions.Item>
                <Descriptions.Item label="Vouchers">
                  {resumen.vouchersCantidad} ({formatCurrency(resumen.vouchersMonto)})
                </Descriptions.Item>
                <Descriptions.Item label="Vouchers anulados">
                  {resumen.vouchersAnulados}
                </Descriptions.Item>
                <Descriptions.Item label="Pend. sync">
                  {resumen.facturasPendientesSync}
                </Descriptions.Item>
                <Descriptions.Item label="Error sync">
                  {resumen.facturasConErrorSync}
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 16 }}>
                <CobrosMinimal cobrosPOS={resumen.totalesPorMetodo} />
              </div>
            </Card>
          </div>
        )}

        {/* ── Turnos por subir ─────────────────────────────── */}
        {turnosPorSubir.length > 0 && (
          <div style={{ padding: '0 24px 16px' }}>
            <Card
              className="paces-card"
              size="small"
              title={`Turnos por subir (${turnosPorSubir.length})`}
            >
              <Table<TurnoPorSubirDTO>
                className="paces-border-top paces-list-table"
                rowKey={(t) => String(t.turnoId)}
                dataSource={turnosPorSubir}
                pagination={false}
                size="small"
                scroll={{ x: 820 }}
                columns={[
                  {
                    title: 'Turno',
                    dataIndex: 'noTurno',
                    key: 'noTurno',
                    width: 90,
                    render: (v: number) => `#${v}`,
                  },
                  {
                    title: 'Cajero',
                    dataIndex: 'cajero',
                    key: 'cajero',
                    width: 180,
                    ellipsis: true,
                  },
                  {
                    title: 'Cierre',
                    key: 'cierre',
                    width: 170,
                    render: (_: unknown, t: TurnoPorSubirDTO) =>
                      `${t.fechaCierre ? t.fechaCierre.slice(0, 10) : ''} ${t.horaCierre}`.trim(),
                  },
                  {
                    title: 'Fact. pendientes',
                    dataIndex: 'facturasPendientes',
                    key: 'facturasPendientes',
                    width: 130,
                    align: 'center',
                  },
                  {
                    title: 'Fact. con error',
                    dataIndex: 'facturasError',
                    key: 'facturasError',
                    width: 120,
                    align: 'center',
                  },
                  {
                    title: 'Estado cierre',
                    dataIndex: 'estadoCierre',
                    key: 'estadoCierre',
                    width: 130,
                    render: (v: string | null) =>
                      v ? (
                        <Tag color={v === 'ERROR' ? 'red' : 'gold'}>{v}</Tag>
                      ) : (
                        <Tag>Sin encolar</Tag>
                      ),
                  },
                  {
                    title: 'Último error',
                    dataIndex: 'ultimoError',
                    key: 'ultimoError',
                    ellipsis: true,
                    render: (v: string | null) => v || '',
                  },
                ]}
              />
            </Card>
          </div>
        )}

        {/* ── Tabla ───────────────────────────────────────── */}
        <Spin spinning={loading}>
          {!loading && (data?.facturas?.length ?? 0) === 0 ? (
            <Empty description="No hay facturas" style={{ padding: '48px 0' }} />
          ) : (
            <Table<FacturaCajaVivoDTO>
              className="paces-border-top paces-list-table"
              rowClassName={() => 'paces-row-hover'}
              rowKey="transacId"
              columns={columns}
              dataSource={data?.facturas ?? []}
              size="middle"
              scroll={{ x: 1100 }}
              pagination={{
                current: page,
                pageSize,
                total: data?.total ?? 0,
                showSizeChanger: true,
                pageSizeOptions: ['25', '50', '100', '200'],
                showTotal: (t) => `${t} registros`,
                onChange: handlePaginacion,
              }}
            />
          )}
        </Spin>
      </Card>

      {/* ── Barra de estado inferior ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '8px 24px',
          marginTop: 8,
          fontSize: 12,
          color: '#8c8c8c',
        }}
      >
        {ultimaActualizacion
          ? `Última actualización: ${formatearHora(ultimaActualizacion)}`
          : 'Sin actualización'}
      </div>
    </>
  );
};

export default CajaOperacionesVivo;
