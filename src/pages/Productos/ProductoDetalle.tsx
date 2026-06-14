import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Row, Col, Typography, message, Alert
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import type { ProductoDTO, ImpuestoProductoDTO } from '../../types/productos';
import ErrorBoundary from '../../components/ErrorBoundary';
import { formatCurrency } from '../../utils/formats';
import { ErrorDetalle } from '../../components';

const { Text } = Typography;

const TIPO_IMPUESTO_MAP: Record<number, string> = {
  0: 'Exento',
  1: 'Gravado',
  2: 'No Gravado',
};

const AMBITO_IMPUESTO_MAP: Record<number, string> = {
  0: 'Venta',
  1: 'Compra',
  2: 'Ambos',
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ProductoDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ProductoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('MProducto');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!codigo) return;
    const abortController = new AbortController();
    setLoading(true);
    productoApi.obtenerDetalle(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al cargar el producto');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
    return () => abortController.abort();
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = () => {
    if (!codigo) return;
    setLoadingError(false);
    setLoading(true);
    const abortController = new AbortController();
    productoApi.obtenerDetalle(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al recargar');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
  };

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando producto...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return <ErrorDetalle mensaje="Error al cargar el producto" rutaVolver="/MProducto" />;
  }
  if (!data) return null;

  const impuestoColumns = [
    { title: 'Nombre', key: 'nombre', render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.nombre ? toTitleCase(r.impuesto.nombre) : '-' },
    { title: 'Porcentaje (%)', key: 'porcentaje', width: 130, align: 'right' as const, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.porcentaje !== undefined && r.impuesto?.porcentaje !== null ? formatNumber(r.impuesto.porcentaje) : '-' },
    { title: 'Tipo', key: 'tipo', width: 120, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.tipo !== undefined && r.impuesto?.tipo !== null ? (TIPO_IMPUESTO_MAP[r.impuesto.tipo] || `Tipo ${r.impuesto.tipo}`) : '-' },
    { title: 'Ámbito', key: 'ambito', width: 100, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.ambito !== undefined && r.impuesto?.ambito !== null ? (AMBITO_IMPUESTO_MAP[r.impuesto.ambito] || `Ámbito ${r.impuesto.ambito}`) : '-' },
  ];

  const renderBoolTag = (valor: boolean | undefined | null): React.ReactNode => {
    if (valor) return <Tag color="green">Sí</Tag>;
    return <Tag>No</Tag>;
  };

  const tabItems = [
    {
      key: 'impuestos',
      label: `Impuestos (${data.impuestos?.length || 0})`,
      children: data.impuestos && data.impuestos.length > 0 ? (
        <Table
          dataSource={data.impuestos}
          columns={impuestoColumns}
          rowKey={(_, idx) => String(idx)}
          size="small"
          pagination={false}
          scroll={{ x: 500 }}
        />
      ) : (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Sin impuestos configurados</Text>
        </div>
      ),
    },
    {
      key: 'movimientos',
      label: 'Movimientos',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Movimientos del producto (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'ofertas',
      label: 'Ofertas',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Ofertas del producto (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'componentes',
      label: 'Componentes/Ingredientes',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Componentes e ingredientes del producto (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'variacionCostos',
      label: 'Variación Costos',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Variación de costos del producto (próximamente)</Text>
        </div>
      ),
    },
    {
      key: 'variacionPrecios',
      label: 'Variación Precios',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Variación de precios del producto (próximamente)</Text>
        </div>
      ),
    },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de producto"
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MProducto')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate('/MProducto')}>
          Editar
        </Button>
      </div>

      <Row gutter={16}>
        {/* Columna izquierda - Datos Generales + Configuración */}
        <Col xs={24} lg={8}>
          {/* Datos Generales */}
          <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Código">
                <Text style={{ fontFamily: 'monospace' }}>{data.codigo}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nombre">
                {data.nombre ? toTitleCase(data.nombre) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Referencia Interna">
                {data.referenciaInterna || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="UPC">
                {data.upc || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Categoría">
                {data.categoria?.nombre ? toTitleCase(data.categoria.nombre) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Familia">
                {data.familia?.nombre ? toTitleCase(data.familia.nombre) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Código Control">
                {data.datosExtra?.codigoControl || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Último Costo">
                {formatCurrency(data.ultimoCosto)}
              </Descriptions.Item>
              <Descriptions.Item label="Precio">
                {formatCurrency(data.precio)}
              </Descriptions.Item>
              <Descriptions.Item label="Nota">
                {data.nota || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Creación">
                {data.fechaCreacion ? formatDate(data.fechaCreacion) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Configuración */}
          <Card title="Configuración" className="paces-card" style={{ marginBottom: 16 }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Para Vender">
                {renderBoolTag(data.paraVender)}
              </Descriptions.Item>
              <Descriptions.Item label="Para Comprar">
                {renderBoolTag(data.paraComprar)}
              </Descriptions.Item>
              <Descriptions.Item label="Pesado">
                {renderBoolTag(data.pesado)}
              </Descriptions.Item>
              <Descriptions.Item label="Requiere Fecha Venc.">
                {renderBoolTag(data.requiereFechaVenc)}
              </Descriptions.Item>
              <Descriptions.Item label="Días Vencimiento">
                {data.diasVencimiento ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Margen Beneficio (%)">
                {data.datosExtra?.margenBeneficio !== undefined && data.datosExtra?.margenBeneficio !== null
                  ? `${formatNumber(data.datosExtra.margenBeneficio)}%`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Garantía (días)">
                {data.datosExtra?.garantia !== undefined && data.datosExtra?.garantia !== null
                  ? data.datosExtra.garantia
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Es Comodín">
                {renderBoolTag(data.datosExtra?.esComodin)}
              </Descriptions.Item>
              <Descriptions.Item label="Activo">
                <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Columna derecha - Tabs */}
        <Col xs={24} lg={16}>
          <Card className="paces-card">
            <Tabs defaultActiveKey="impuestos" type="card" items={tabItems} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const ProductoDetalleWithBoundary: React.FC = () => (
  <ErrorBoundary>
    <ProductoDetalle />
  </ErrorBoundary>
);

export default ProductoDetalleWithBoundary;
