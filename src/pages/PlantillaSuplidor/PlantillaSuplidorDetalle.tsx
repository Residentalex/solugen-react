import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Button, Row, Col, Grid,
  message, Typography, Descriptions, Modal, Tooltip,
} from 'antd';
import {
  ExclamationCircleOutlined, CheckCircleOutlined, PrinterOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import { analisisCompraApi } from '../../api/analisisCompraApi';
import PermissionGate from '../../components/PermissionGate';
import type { PlantillaSuplidorDTO, DetallePlantillaSuplidorDTO } from '../../types/plantillaSuplidor';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

const { Text } = Typography;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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

const PlantillaSuplidorDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<PlantillaSuplidorDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const ocupado = useMemo(() => saving || generando || imprimiendo || loading, [saving, generando, imprimiendo, loading]);
  const operacionRef = useRef(false);

  const intentarTomarLock = () => {
    if (operacionRef.current) return false;
    operacionRef.current = true;
    return true;
  };

  const liberarLock = () => {
    operacionRef.current = false;
  };

  const handleRefresh = useCallback(() => {
    if (operacionRef.current || ocupado) return;
    if (!id) return;
    if (!intentarTomarLock()) return;
    setLoadingError(false);
    setLoading(true);
    plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Plantilla #${res.numero}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => {
        setLoading(false);
        liberarLock();
      });
  }, [id, sucursalActiva, setPageTitleOverride, ocupado]);

  useEffect(() => {
    setActiveModule('mplantillasup');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`Plantilla #${res.numero}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleEliminar = () => {
    if (operacionRef.current || ocupado) return;
    Modal.confirm({
      title: 'Eliminar plantilla',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea eliminar esta plantilla de suplidor?',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!intentarTomarLock()) return;
        if (!id) {
          liberarLock();
          return;
        }
        setSaving(true);
        try {
          await plantillaSuplidorApi.eliminar(sucursalActiva, id);
          message.success('Plantilla eliminada correctamente');
          navigate('/mplantillasup');
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al eliminar');
          message.error(msg);
        } finally {
          setSaving(false);
          liberarLock();
        }
      },
    });
  };

  const handleGenerarAnalisis = () => {
    if (operacionRef.current || ocupado) return;
    if (!data?.detalles?.length) {
      message.warning('La plantilla no tiene productos para procesar');
      return;
    }

    const codigos = data.detalles
      .map((d) => d.codigoProducto)
      .filter(Boolean) as string[];

    if (codigos.length === 0) {
      message.warning('No se encontraron códigos de producto válidos');
      return;
    }

    Modal.confirm({
      title: 'Generar Análisis de Compra',
      icon: <ExclamationCircleOutlined />,
      content: `Se procesarán ${codigos.length} producto${codigos.length !== 1 ? 's' : ''} en todas las sucursales. El proceso toma varios minutos y se ejecutará en segundo plano. Recibirá una notificación cuando finalice. ¿Desea continuar?`,
      okText: 'Sí, generar',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!intentarTomarLock()) return;
        setGenerando(true);
        try {
          const resultado = await analisisCompraApi.refrescarPorCodigosEnSegundoPlano(codigos);
          message.success(resultado.mensaje);
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al iniciar el proceso de análisis');
          message.error(msg);
        } finally {
          setGenerando(false);
          liberarLock();
        }
      },
    });
  };

  const handleImprimir = async () => {
    if (!id) return;
    if (!intentarTomarLock()) return;
    setImprimiendo(true);
    try {
      const res = await plantillaSuplidorApi.imprimir(sucursalActiva, id!);
      const blobUrl = URL.createObjectURL(res);
      window.open(blobUrl, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      message.error('Error al generar el PDF');
    } finally {
      setImprimiendo(false);
      liberarLock();
    }
  };

  const detalleColumns = [
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 80,
      align: 'right' as const,
      onCell: () => ({ style: { paddingLeft: 16 } }),
      onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
    },
    {
      title: 'Código Producto',
      dataIndex: 'codigoProducto',
      key: 'codigoProducto',
      width: 150,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: 'Presentación',
      key: 'presentacion',
      width: 130,
      render: (_: any, record: DetallePlantillaSuplidorDTO) => {
        return record.nombrePresentacion || '-';
      },
    },
  ];

  return (
    <DetalleCatalogoLayout
      rutaVolver="/mplantillasup"
      loading={loading}
      mensajeLoading="Cargando plantilla..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de plantilla de suplidor"
      onRecargar={handleRefresh}
      dataDisponible={!!data}
      onEditar={() => navigate(`/mplantillasup/${id}/editar`)}
      onEliminar={handleEliminar}
      eliminando={saving}
      bloqueado={ocupado}
      extraActions={
        <>
          <PermissionGate accion="PROCESAR">
            <Tooltip title="Imprimir">
              <Button icon={<PrinterOutlined />} loading={imprimiendo} disabled={ocupado} onClick={handleImprimir} aria-label="Imprimir" />
            </Tooltip>
          </PermissionGate>
          <PermissionGate accion="PROCESAR">
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={generando}
              disabled={ocupado}
              onClick={handleGenerarAnalisis}
            >
              Generar Análisis
            </Button>
          </PermissionGate>
        </>
      }
    >
      {isLarge ? (
        <Row gutter={16}>
          <Col span={24}>
            {/* Datos Generales */}
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
              style={{ marginBottom: 16 }}
            >
              <Descriptions
                bordered
                size="small"
                column={2}
                styles={{ content: { background: 'transparent' } }}
              >
                <Descriptions.Item label="Número">
                  {data?.numero || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo">{data?.tipo || '—'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">
                  {formatDate(data?.fecha || '')}
                </Descriptions.Item>
                <Descriptions.Item label="Código Suplidor">
                  {data?.codigoSuplidor || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor" span={2}>
                  {toTitleCase(data?.nombreSuplidor || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Notas" span={2}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data?.notas || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Productos */}
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Productos ({data?.detalles?.length || 0})</span>}
              style={{ marginBottom: 16 }}
            >
              <Table
                dataSource={data?.detalles || []}
                columns={detalleColumns}
                rowKey={(r) => r.id || r.codigoProducto}
                size="small"
                pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (t) => `${t} registros` }}
                scroll={{ x: 700 }}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile */
        <div>
          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
            style={{ marginBottom: 16 }}
          >
            <Descriptions
              bordered
              size="small"
              column={1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Número">
                {data?.numero || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo">{data?.tipo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {formatDate(data?.fecha || '')}
              </Descriptions.Item>
              <Descriptions.Item label="Código Suplidor">
                {data?.codigoSuplidor || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Suplidor">
                {toTitleCase(data?.nombreSuplidor || '-')}
              </Descriptions.Item>
              <Descriptions.Item label="Productos">
                {data?.detalles?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Notas">
                <span style={{ whiteSpace: 'pre-wrap' }}>{data?.notas || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Productos ({data?.detalles?.length || 0})</span>}
            style={{ marginBottom: 16 }}
          >
            <Table
              dataSource={data?.detalles || []}
              columns={detalleColumns}
              rowKey={(r) => r.id || r.codigoProducto}
              size="small"
              pagination={{ pageSize: 25, showSizeChanger: false, showTotal: (t) => `${t} registros` }}
              scroll={{ x: 700 }}
            />
          </Card>
        </div>
      )}
    </DetalleCatalogoLayout>
  );
};

export default PlantillaSuplidorDetalle;
