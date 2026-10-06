import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Row, Col, Typography, message, Button, Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import { servicioApi } from '../../api/servicioApi';
import { recetaApi } from '../../api/recetaApi';
import type { ProductoDTO, ImpuestoProductoDTO } from '../../types/productos';
import type { IngredienteDTO } from '../../types/receta';
import type { TipoImpuesto, AmbitoImpuesto } from '../../types/contabilidad';
import ErrorBoundary from '../../components/ErrorBoundary';
import { formatCurrency, extraerMensajeError } from '../../utils/formats';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { FileTextOutlined } from '@ant-design/icons';

const { Text } = Typography;

const TIPO_IMPUESTO_MAP: Record<TipoImpuesto, string> = {
  I: 'Impuesto',
  L: 'Liquidación',
  V: 'Informativo',
  R: 'Retencion',
};

const AMBITO_IMPUESTO_MAP: Record<AmbitoImpuesto, string> = {
  Venta: 'Venta',
  Compra: 'Compra',
  Ninguno: 'Ninguno',
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

const ProductoDetalle: React.FC<{ pantalla?: 'MProducto' | 'MServicio' }> = ({ pantalla = 'MProducto' }) => {
  const esServicio = pantalla === 'MServicio';
  const basePath = esServicio ? '/MServicio' : '/MProducto';
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ProductoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [ingredientes, setIngredientes] = useState<IngredienteDTO[]>([]);
  const [loadingComponentes, setLoadingComponentes] = useState(false);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);

  const apiArticulo = esServicio ? servicioApi : productoApi;

  const cargarImagen = useCallback(async (signal?: AbortSignal) => {
    if (!codigo) return;
    try {
      const blob = await apiArticulo.obtenerImagen(sucursalProductos, codigo, signal);
      if (signal?.aborted) return;
      if (!blob) {
        setImagenUrl(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        if (signal?.aborted) return;
        setImagenUrl(e.target?.result as string);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      if (signal?.aborted) return;
      setImagenUrl(null);
    }
  }, [codigo, sucursalProductos, esServicio]);

  const cargarComponentes = useCallback(async () => {
    if (!codigo || esServicio) return;
    setLoadingComponentes(true);
    try {
      const lista = await recetaApi.obtenerIngredientes(sucursalProductos, codigo);
      setIngredientes(lista || []);
    } catch (err: unknown) {
      message.error(extraerMensajeError(err, 'Error al cargar los componentes del producto'));
      setIngredientes([]);
    } finally {
      setLoadingComponentes(false);
    }
  }, [codigo, sucursalProductos, esServicio]);

  useEffect(() => {
    setActiveModule(pantalla);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, pantalla]);

  useEffect(() => {
    if (!codigo) return;
    const abortController = new AbortController();
    setLoading(true);
    void cargarComponentes();
    void cargarImagen(abortController.signal);
    productoApi.obtenerDetalle(sucursalProductos, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error(esServicio ? 'Servicio no encontrado en la sucursal seleccionada' : 'Producto no encontrado en la sucursal seleccionada');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || (esServicio ? 'Error al cargar el servicio' : 'Error al cargar el producto'));
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
    return () => abortController.abort();
  }, [codigo, sucursalProductos, setPageTitleOverride, cargarComponentes, cargarImagen]);

  const handleRefresh = () => {
    if (!codigo) return;
    setLoadingError(false);
    setLoading(true);
    void cargarComponentes();
    void cargarImagen();
    const abortController = new AbortController();
    productoApi.obtenerDetalle(sucursalProductos, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error(esServicio ? 'Servicio no encontrado en la sucursal seleccionada' : 'Producto no encontrado en la sucursal seleccionada');
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

  const ingredienteColumns: ColumnsType<IngredienteDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      width: 150,
      render: (cod: string) => <Text strong>{cod}</Text>,
    },
    {
      title: 'Artículo',
      dataIndex: 'nombre',
      render: (nom: string) => <Text>{nom ? toTitleCase(nom) : '-'}</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      width: 130,
      align: 'right',
      render: (cant: number) => <Text>{formatNumber(cant ?? 0)}</Text>,
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      width: 150,
      align: 'right',
      render: (cost: number) => <Text strong>{formatCurrency(cost ?? 0)}</Text>,
    },
    {
      title: 'U.M.',
      key: 'unidadMedida',
      width: 120,
      render: (_: unknown, record: IngredienteDTO) => (
        <Text>{record.unidadMedida?.codigo || record.unidadMedida?.nombre || '-'}</Text>
      ),
    },
  ];

  const costoReceta = ingredientes.reduce((suma, ing) => suma + (ing.costo ?? 0), 0);

  const tabItems = [
    {
      key: 'impuestos',
      icon: <FileTextOutlined />,
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
    ...(!esServicio
      ? [{
          key: 'movimientos',
          label: 'Movimientos',
          children: (
            <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
              <Text type="secondary">Movimientos del producto (próximamente)</Text>
            </div>
          ),
        }]
      : []),
    {
      key: 'ofertas',
      label: 'Ofertas',
      children: (
        <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Ofertas del producto (próximamente)</Text>
        </div>
      ),
    },
    ...(!esServicio
      ? [{
          key: 'componentes',
          label: `Componentes (${ingredientes.length})`,
          children: (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {ingredientes.length > 0 && (
                  <Text className="paces-text-total">Costo de receta: {formatCurrency(costoReceta)}</Text>
                )}
                <div style={{ flex: 1 }} />
                <Button size="small" onClick={() => { void cargarComponentes(); }} loading={loadingComponentes}>
                  Recargar
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => navigate(`${basePath}/${codigo}/editar`)}
                >
                  Editar
                </Button>
              </div>
              <Table<IngredienteDTO>
                dataSource={ingredientes}
                columns={ingredienteColumns}
                rowKey="id"
                size="small"
                loading={loadingComponentes}
                pagination={false}
                scroll={{ x: 750 }}
                locale={{
                  emptyText: (
                    <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Empty description="Este producto no tiene componentes configurados" />
                    </div>
                  ),
                }}
                className="paces-border-top paces-list-table"
              />
            </div>
          ),
        }]
      : []),
    ...(!esServicio
      ? [{
          key: 'variacionCostos',
          label: 'Variación Costos',
          children: (
            <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
              <Text type="secondary">Variación de costos del producto (próximamente)</Text>
            </div>
          ),
        }]
      : []),
    ...(!esServicio
      ? [{
          key: 'variacionPrecios',
          label: 'Variación Precios',
          children: (
            <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">
              <Text type="secondary">Variación de precios del producto (próximamente)</Text>
            </div>
          ),
        }]
      : []),
  ];

  return (
    <DetalleCatalogoLayout
      rutaVolver={basePath}
      loading={loading}
      mensajeLoading={esServicio ? 'Cargando servicio...' : 'Cargando producto...'}
      loadingError={loadingError}
      mensajeError={esServicio ? 'Error al cargar detalle de servicio' : 'Error al cargar detalle de producto'}
      onRecargar={handleRefresh}
      dataDisponible={!!data}
      onEditar={() => navigate(`${basePath}/${codigo}/editar`)}
    >
      <Row gutter={16}>
        {/* Columna izquierda - Imagen + Configuración */}
        <Col xs={24} lg={8}>
          {/* Imagen */}
          <Card title="Imagen" className="paces-card" style={{ marginBottom: 16 }}>
            {imagenUrl ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={imagenUrl}
                  alt={data.nombre || data.codigo}
                  style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8 }}
                />
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Text type="secondary">Sin imagen</Text>
              </div>
            )}
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
              {!esServicio && (
                <Descriptions.Item label="Pesado">
                  {renderBoolTag(data.pesado)}
                </Descriptions.Item>
              )}
              {!esServicio && (
                <Descriptions.Item label="Requiere Fecha Venc.">
                  {renderBoolTag(data.requiereFechaVenc)}
                </Descriptions.Item>
              )}
              {!esServicio && (
                <Descriptions.Item label="Días Vencimiento">
                  {data.diasVencimiento ?? '-'}
                </Descriptions.Item>
              )}
              {!esServicio && (
                <Descriptions.Item label="Margen Beneficio (%)">
                  {data.datosExtra?.margenBeneficio !== undefined && data.datosExtra?.margenBeneficio !== null
                    ? `${formatNumber(data.datosExtra.margenBeneficio)}%`
                    : '-'}
                </Descriptions.Item>
              )}
              {!esServicio && (
                <Descriptions.Item label="Garantía (días)">
                  {data.datosExtra?.garantia !== undefined && data.datosExtra?.garantia !== null
                    ? data.datosExtra.garantia
                    : '-'}
                </Descriptions.Item>
              )}
              {!esServicio && (
                <Descriptions.Item label="Es Comodín">
                  {renderBoolTag(data.datosExtra?.esComodin)}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Activo">
                <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Columna derecha - Datos Generales + Tabs */}
        <Col xs={24} lg={16}>
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
                <span className="paces-nota-memo">{data.nota || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Creación">
                {data.fechaCreacion ? formatDate(data.fechaCreacion) : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="paces-card">
            <Tabs defaultActiveKey="impuestos" type="card" items={tabItems} />
          </Card>
        </Col>
      </Row>
    </DetalleCatalogoLayout>
  );
};

const ProductoDetalleWithBoundary: React.FC<{ pantalla?: 'MProducto' | 'MServicio' }> = ({ pantalla = 'MProducto' }) => (
  <ErrorBoundary>
    <ProductoDetalle pantalla={pantalla} />
  </ErrorBoundary>
);

export default ProductoDetalleWithBoundary;
