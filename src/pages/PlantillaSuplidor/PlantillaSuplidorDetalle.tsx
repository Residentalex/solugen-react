import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Button, Row, Col, Grid,
  message, Typography, Descriptions, Modal,
} from 'antd';
import {
  ExclamationCircleOutlined, CheckCircleOutlined,
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

  const screens = Grid.useBreakpoint();
  const isLarge = screens.lg ?? true;

  const handleRefresh = useCallback(() => {
    if (!id) return;
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
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

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
    Modal.confirm({
      title: 'Eliminar plantilla',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea eliminar esta plantilla de suplidor?',
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (!id) return;
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
        }
      },
    });
  };

  const handleGenerarAnalisis = () => {
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
        setGenerando(true);
        try {
          const resultado = await analisisCompraApi.refrescarPorCodigosEnSegundoPlano(codigos);
          message.success(resultado.mensaje);
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al iniciar el proceso de análisis');
          message.error(msg);
        } finally {
          setGenerando(false);
        }
      },
    });
  };

  if (!data) return null;

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
      extraActions={
        <PermissionGate accion="PROCESAR">
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={generando}
            onClick={handleGenerarAnalisis}
            style={{ background: '#389e0d', borderColor: '#389e0d' }}
          >
            Generar Análisis
          </Button>
        </PermissionGate>
      }
    >
      {isLarge ? (
        <Row gutter={16}>
          <Col lg={18}>
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
                <Descriptions.Item label="Número:">
                  {data.numero || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tipo:">—</Descriptions.Item>
                <Descriptions.Item label="Fecha:">
                  {formatDate(data.fecha)}
                </Descriptions.Item>
                <Descriptions.Item label="Suplidor:" span={2}>
                  {toTitleCase(data.nombreSuplidor || '-')}
                </Descriptions.Item>
                <Descriptions.Item label="Notas:" span={2}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Tabs */}
            <Tabs
              defaultActiveKey="detalles"
              type="card"
              items={[
                {
                  key: 'detalles',
                  label: `Detalles (${data.detalles?.length || 0})`,
                  children: (
                    <Table
                      dataSource={data.detalles || []}
                      columns={detalleColumns}
                      rowKey={(r) => r.id || r.codigoProducto}
                      size="small"
                      pagination={false}
                      scroll={{ x: 700 }}
                    />
                  ),
                },
              ]}
            />
          </Col>

          <Col lg={6}>
            {/* Sidebar info */}
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Información</span>}
              className="paces-card"
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span className="paces-text-secondary">Código Suplidor: </span>
                  <span>{data.codigoSuplidor || '-'}</span>
                </div>
                <div>
                  <span className="paces-text-secondary">Productos: </span>
                  <span>{data.detalles?.length || 0}</span>
                </div>
              </div>
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
              <Descriptions.Item label="Número:">
                {data.numero || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo:">—</Descriptions.Item>
              <Descriptions.Item label="Fecha:">
                {formatDate(data.fecha)}
              </Descriptions.Item>
              <Descriptions.Item label="Suplidor:">
                {toTitleCase(data.nombreSuplidor || '-')}
              </Descriptions.Item>
              <Descriptions.Item label="Notas:">
                <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="detalles"
            type="card"
            items={[
              {
                key: 'detalles',
                label: `Detalles (${data.detalles?.length || 0})`,
                children: (
                  <Table
                    dataSource={data.detalles || []}
                    columns={detalleColumns}
                    rowKey={(r) => r.id || r.codigoProducto}
                    size="small"
                    pagination={false}
                    scroll={{ x: 700 }}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </DetalleCatalogoLayout>
  );
};

export default PlantillaSuplidorDetalle;
