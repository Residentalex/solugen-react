import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Descriptions, Typography, Empty, Grid, Space, message,
} from 'antd';

const { Text } = Typography;
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conteoApi } from '../../api/conteoApi';
import { generadorOrcApi } from '../../api/generadorOrcApi';
import { formatCurrency, formatDate, toTitleCase, formatNumber } from '../../utils/formats';
import type { ConteoFisicoDTO, DetalleConteoFisicoDTO } from '../../types/conteo';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';

const CONCEPTO_VACIO = '—';

// Valores del enum Metodos.Enums.Estado (SolugenApi-0.2/Metodos/Enums/Estado.cs):
// Borrador=0, Validado=1, Autorizado=2, Anulado=3, Pagado=4, Abierto=5, Cerrado=6
const ESTADO_CERRADO = 6;

const ConteoDetalle: React.FC = () => {
  const { documento } = useParams<{ documento: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ConteoFisicoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [existenciasSistema, setExistenciasSistema] = useState<Record<string, number>>({});

  const screens = Grid.useBreakpoint();

  const cargar = useCallback(async () => {
    if (!documento) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento);
      setData(result);
      setPageTitleOverride(result.documento);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [documento, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    if (!documento) return;
    cargar();
    return () => setPageTitleOverride('');
  }, [documento, cargar, setPageTitleOverride]);

  // Cargar existencias del sistema para calcular diferencias
  const cargarExistencias = useCallback((conteo: ConteoFisicoDTO) => {
    const codigos = conteo.detalles.map((d) => d.codigo);
    const fecha = conteo.fecha;
    const sucursal = conteo.sucursal || sucursalActiva;

    generadorOrcApi
      .obtenerExistencias(sucursal, codigos, fecha)
      .then((existencias) => {
        const record: Record<string, number> = {};
        existencias.forEach((e) => {
          record[e.codigo] = e.cantidad;
        });
        setExistenciasSistema(record);
      })
      .catch(() => setExistenciasSistema({}));
  }, [sucursalActiva]);

  useEffect(() => {
    if (!data?.detalles?.length) return;
    cargarExistencias(data);
  }, [data, cargarExistencias]);

  // INVENT.LOCK = 'T' (mapeado a Bloqueado) impide editar el conteo.
  // El backend tambi\u00e9n lo valida en ServicioConteoFisico.ActualizarConteo.
  const puedeEditar = !!data && !data.bloqueado;

  const manejarEditar = () => {
    if (!data) return;
    if (!puedeEditar) {
      message.error('No se puede editar: el conteo est\u00e1 bloqueado');
      return;
    }
    navigate(`/FConteos/editar/${data.documento}`, { state: data });
  };

  const renderContenido = () => {
    if (!data) return null;

    const detalles = data.detalles || [];
    const total = detalles.length;
    const coincidencias = detalles.filter(
      (d) => existenciasSistema[d.codigo] === d.cantidad
    ).length;
    const faltantes = detalles.filter(
      (d) => (existenciasSistema[d.codigo] || 0) < d.cantidad
    ).length;
    const sobrantes = detalles.filter(
      (d) => (existenciasSistema[d.codigo] || 0) > d.cantidad
    ).length;

    return (
      <>
        <Card
          className="paces-card"
          size="small"
          title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
          style={{ marginBottom: 16 }}
        >
          <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
            <Descriptions.Item label="Documento">{data.documento}</Descriptions.Item>
            <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
            <Descriptions.Item label="Almacén">{toTitleCase(data.almacen)}</Descriptions.Item>
            <Descriptions.Item label="Usuario">{toTitleCase(data.usuario) || CONCEPTO_VACIO}</Descriptions.Item>
            <Descriptions.Item label="Suplidor">
              {data.nombreSuplidor ? toTitleCase(data.nombreSuplidor) : (data.codigoSuplidor || CONCEPTO_VACIO)}
            </Descriptions.Item>
            <Descriptions.Item label="Concepto">{data.concepto || CONCEPTO_VACIO}</Descriptions.Item>
            <Descriptions.Item label="Cantidad">{data.cantidad.toLocaleString('es-DO')}</Descriptions.Item>
            <Descriptions.Item label="Costo">{formatCurrency(data.costo)}</Descriptions.Item>
            <Descriptions.Item label="Modo">
              {data.modo === 0 ? 'Manual' : data.modo === 1 ? 'Automático' : String(data.modo)}
            </Descriptions.Item>
            <Descriptions.Item label="Período">
              {data.periodo === ESTADO_CERRADO ? 'Cerrado' : 'Abierto'}
            </Descriptions.Item>
            <Descriptions.Item label="Nota" span={2}>
              <span className="paces-nota-memo">{data.nota || CONCEPTO_VACIO}</span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Resumen visual de diferencias */}
        <Card
          className="paces-card"
          size="small"
          style={{ marginBottom: 16, borderColor: '#556ee6' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Typography.Text strong style={{ fontSize: 14 }}>
              Resumen de diferencias
            </Typography.Text>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Coincidencias', valor: coincidencias, color: 'blue' },
                { label: 'Faltantes', valor: faltantes, color: 'error' },
                { label: 'Sobrantes', valor: sobrantes, color: 'success' },
                { label: 'Total', valor: total, color: 'warning' },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <Tag color={item.color} style={{ marginInlineEnd: 0 }}>{item.label}</Tag>
                  <Text strong style={{ fontSize: 18 }}>{item.valor}</Text>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card
          className="paces-card"
          size="small"
          title={<span style={{ fontSize: 16, fontWeight: 600 }}>Detalles ({total})</span>}
        >
          {total > 0 ? (
            <Table
              dataSource={detalles}
              rowKey="codigo"
              size="small"
              pagination={false}
              scroll={{ x: 1100 }}
            >
              <Table.Column title="Código" dataIndex="codigo" width={100} />
              <Table.Column
                title="Artículo"
                dataIndex="articulo"
                ellipsis
                render={(v: string) => toTitleCase(v || '')}
              />
              <Table.Column
                title="Cantidad Física"
                dataIndex="cantidad"
                align="right"
                width={120}
                render={(v: number) => formatNumber(v)}
              />
              <Table.Column
                title="Cantidad Sistema"
                align="right"
                width={120}
                render={(_: number, record: DetalleConteoFisicoDTO) => (
                  formatNumber(existenciasSistema[record.codigo] || 0)
                )}
              />
              <Table.Column
                title="Variación"
                align="center"
                width={100}
                render={(_: number, record: DetalleConteoFisicoDTO) => {
                  const sistema = existenciasSistema[record.codigo] || 0;
                  const diff = sistema - record.cantidad;
                  if (diff > 0) return <Tag color="success">+{formatNumber(diff)}</Tag>;
                  if (diff < 0) return <Tag color="error">{formatNumber(diff)}</Tag>;
                  return <Tag color="default">0</Tag>;
                }}
              />
              <Table.Column
                title="Factor"
                dataIndex="factor"
                align="right"
                width={80}
                render={(v: number) => formatNumber(v || 1)}
              />
              <Table.Column
                title="Costo"
                dataIndex="ultimoCosto"
                align="right"
                width={120}
                render={(v: number) => formatCurrency(v || 0)}
              />
              <Table.Column
                title="Medida"
                dataIndex={['medida', 'nombre']}
                width={100}
                render={(v: string) => v || CONCEPTO_VACIO}
              />
              <Table.Column
                title="Familia"
                dataIndex={['familia', 'nombre']}
                ellipsis
                render={(v: string) => (v ? toTitleCase(v) : CONCEPTO_VACIO)}
              />
              <Table.Column
                title="Referencia"
                dataIndex="referencia"
                ellipsis
                render={(v: string) => v || CONCEPTO_VACIO}
              />
            </Table>
          ) : (
            <Empty description="Sin detalles" />
          )}
        </Card>

        {/* Vista de tarjetas resumidas para pantallas pequeñas */}
        {!screens.xxl && total > 0 && (
          <Card
            className="paces-card"
            size="small"
            style={{ marginTop: 16, borderColor: '#556ee6' }}
          >
            <Typography.Text strong style={{ fontSize: 14, marginBottom: 8 }}>
              Productos ({total})
            </Typography.Text>
            <Space direction="vertical" wrap style={{ gap: 8 }}>
              {detalles.map((d) => {
                const sistema = existenciasSistema[d.codigo] || 0;
                const diff = sistema - d.cantidad;
                const color = diff === 0 ? 'blue' : diff < 0 ? 'error' : 'success';
                const signo = diff > 0 ? '+' : '';
                return (
                  <Tag key={d.codigo} color={color} style={{ marginBottom: 4, display: 'block' }}>
                    <Space direction="horizontal" align="start">
                      <span style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                        {d.codigo} — {toTitleCase(d.articulo)}
                      </span>
                      <span>Físico: {formatNumber(d.cantidad)}</span>
                      <span>Sistema: {formatNumber(sistema)}</span>
                      <span style={{ fontWeight: 600 }}>{signo}{formatNumber(diff)}</span>
                    </Space>
                  </Tag>
                );
              })}
            </Space>
          </Card>
        )}
      </>
    );
  };

  return (
    <DetalleCatalogoLayout
      rutaVolver="/FConteos"
      loading={loading}
      mensajeLoading="Cargando conteo..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle del conteo"
      onRecargar={cargar}
      dataDisponible={!!data}
      onEditar={puedeEditar ? manejarEditar : undefined}
      extraLeft={<SucursalDocumentoSelector value={sucursalDestino} onChange={setSucursalDestino} />}
      extraActions={
        data ? (
          <Tag color={data.bloqueado ? 'red' : 'green'}>
            {data.bloqueado ? 'Bloqueado' : 'Activo'}
          </Tag>
        ) : undefined
      }
    >
      {renderContenido()}
    </DetalleCatalogoLayout>
  );
};

export default ConteoDetalle;
