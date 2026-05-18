import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, message
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import type { ProductoDTO, ImpuestoProductoDTO } from '../../types/productos';

const { TabPane } = Tabs;

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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

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

interface PreciosCardProps {
  precio: number;
  ultimoCosto: number;
  margenBeneficio?: number;
  alignRight: boolean;
}

const PreciosCard: React.FC<PreciosCardProps> = ({ precio, ultimoCosto, margenBeneficio, alignRight }) => (
  <Card
    title={<span style={{ fontSize: 16, fontWeight: 600 }}>Precios</span>}
    className="paces-card"
    style={{ marginBottom: 16 }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Precio</span>}
        <span style={{ fontWeight: 600 }}>{formatCurrency(precio)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
        {!alignRight && <span className="paces-text-secondary">Último Costo</span>}
        <span>{formatCurrency(ultimoCosto)}</span>
      </div>
      {margenBeneficio !== undefined && margenBeneficio !== null && (
        <div style={{ display: 'flex', justifyContent: alignRight ? 'flex-end' : 'space-between', gap: 16, fontSize: 14 }}>
          {!alignRight && <span className="paces-text-secondary">Margen de Beneficio</span>}
          <span>{formatNumber(margenBeneficio)}%</span>
        </div>
      )}
    </div>
  </Card>
);

interface FamiliaCardProps {
  familia: {
    nombre?: string;
    idExterno?: string;
    aumentoPrecioMaximo?: number;
    cuentaCostoVenta?: string;
    cuentaIngresosVenta?: string;
    cuentaDescuentoVenta?: string;
    cuentaDeVolucionVenta?: string;
    cuentaCostoCompra?: string;
    cuentaDevolucionCompra?: string;
  } | null | undefined;
}

const FamiliaCard: React.FC<FamiliaCardProps> = ({ familia }) => {
  if (!familia || !familia.nombre) return null;

  const tieneCuentas = !!(
    familia.cuentaCostoVenta ||
    familia.cuentaIngresosVenta ||
    familia.cuentaDescuentoVenta ||
    familia.cuentaDeVolucionVenta ||
    familia.cuentaCostoCompra ||
    familia.cuentaDevolucionCompra
  );

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>Familia</span>}
      className="paces-card"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {toTitleCase(familia.nombre)}
        </div>
        {familia.idExterno && (
          <div>
            <span className="paces-text-secondary">ID Externo: </span>
            <span>{familia.idExterno}</span>
          </div>
        )}
        {familia.aumentoPrecioMaximo !== undefined && familia.aumentoPrecioMaximo !== null && (
          <div>
            <span className="paces-text-secondary">Aumento Máx. Precio: </span>
            <span>{formatNumber(familia.aumentoPrecioMaximo)}%</span>
          </div>
        )}
        {tieneCuentas && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }} className="paces-text-secondary">Cuentas Contables</div>
            {familia.cuentaCostoVenta && (
              <div><span className="paces-text-secondary">Costo Venta: </span>{familia.cuentaCostoVenta}</div>
            )}
            {familia.cuentaIngresosVenta && (
              <div><span className="paces-text-secondary">Ingresos Venta: </span>{familia.cuentaIngresosVenta}</div>
            )}
            {familia.cuentaDescuentoVenta && (
              <div><span className="paces-text-secondary">Descuento Venta: </span>{familia.cuentaDescuentoVenta}</div>
            )}
            {familia.cuentaDeVolucionVenta && (
              <div><span className="paces-text-secondary">Devolución Venta: </span>{familia.cuentaDeVolucionVenta}</div>
            )}
            {familia.cuentaCostoCompra && (
              <div><span className="paces-text-secondary">Costo Compra: </span>{familia.cuentaCostoCompra}</div>
            )}
            {familia.cuentaDevolucionCompra && (
              <div><span className="paces-text-secondary">Devolución Compra: </span>{familia.cuentaDevolucionCompra}</div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

const ProductoDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ProductoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setActiveModule('MProducto');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!codigo) return;
    setLoading(true);
    productoApi.obtenerDetalle(sucursalActiva, codigo)
      .then((res) => {
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar el producto');
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando producto...</div>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;

  const impuestoColumns = [
    { title: 'Nombre', key: 'nombre', render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.nombre ? toTitleCase(r.impuesto.nombre) : '-' },
    { title: 'Porcentaje (%)', key: 'porcentaje', width: 130, align: 'right' as const, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.porcentaje !== undefined && r.impuesto?.porcentaje !== null ? formatNumber(r.impuesto.porcentaje) : '-' },
    { title: 'Tipo', key: 'tipo', width: 120, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.tipo !== undefined && r.impuesto?.tipo !== null ? (TIPO_IMPUESTO_MAP[r.impuesto.tipo] || `Tipo ${r.impuesto.tipo}`) : '-' },
    { title: 'Ámbito', key: 'ambito', width: 100, render: (_: any, r: ImpuestoProductoDTO) => r.impuesto?.ambito !== undefined && r.impuesto?.ambito !== null ? (AMBITO_IMPUESTO_MAP[r.impuesto.ambito] || `Ámbito ${r.impuesto.ambito}`) : '-' },
  ];

  const renderEncabezado = (columnas: { xs: number; sm: number; md: number } | number) => (
    <Card
      className="paces-card"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>
            {data.nombre ? toTitleCase(data.nombre) : '-'}
          </span>
          <Space>
            <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
            {data.paraVender && <Tag color="blue">Para Vender</Tag>}
            {data.paraComprar && <Tag color="orange">Para Comprar</Tag>}
            {data.pesado && <Tag color="purple">Pesado</Tag>}
          </Space>
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions bordered size="small" column={columnas}>
        <Descriptions.Item label="Código"><span style={{ fontFamily: 'monospace' }}>{data.codigo}</span></Descriptions.Item>
        <Descriptions.Item label="Referencia Interna">{data.referenciaInterna || '-'}</Descriptions.Item>
        <Descriptions.Item label="UPC">{data.upc || '-'}</Descriptions.Item>
        <Descriptions.Item label="Familia">{data.familia?.nombre ? toTitleCase(data.familia.nombre) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Categoría">{data.categoria?.nombre ? toTitleCase(data.categoria.nombre) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Unidad de Medida">{data.unidadMedida?.nombre ? toTitleCase(data.unidadMedida.nombre) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Fecha Creación">{data.fechaCreacion ? formatDate(data.fechaCreacion) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Nota" span={2}>{data.nota || '-'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const renderTabs = () => (
    <Tabs defaultActiveKey="impuestos" type="card">
      <TabPane tab={`Impuestos (${data.impuestos?.length || 0})`} key="impuestos">
        {data.impuestos && data.impuestos.length > 0 ? (
          <Table
            dataSource={data.impuestos}
            columns={impuestoColumns}
            rowKey={(_, idx) => String(idx)}
            size="small"
            pagination={false}
            scroll={{ x: 500 }}
          />
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">Sin impuestos configurados</div>
        )}
      </TabPane>
      <TabPane tab="Datos Extra" key="datosExtra">
        {data.datosExtra ? (
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Ubicación">{data.datosExtra.ubicacion || '-'}</Descriptions.Item>
            <Descriptions.Item label="Margen de Beneficio (%)">{data.datosExtra.margenBeneficio !== undefined && data.datosExtra.margenBeneficio !== null ? formatNumber(data.datosExtra.margenBeneficio) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Garantía (días)">{data.datosExtra.garantia !== undefined && data.datosExtra.garantia !== null ? data.datosExtra.garantia : '-'}</Descriptions.Item>
            <Descriptions.Item label="Para Alquilar">{data.datosExtra.paraAlquilar ? 'Sí' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Para Exportar">{data.datosExtra.paraExportar ? 'Sí' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Producto Terminado">{data.datosExtra.productoTerminado ? 'Sí' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Pesado">{data.datosExtra.pesado ? 'Sí' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Código Control">{data.datosExtra.codigoControl || '-'}</Descriptions.Item>
            <Descriptions.Item label="Unidad Medida Compra">{data.datosExtra.unidadMedidaCompra?.nombre ? toTitleCase(data.datosExtra.unidadMedidaCompra.nombre) : '-'}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">Sin datos extra disponibles</div>
        )}
      </TabPane>
      <TabPane tab="Producto Control" key="productoControl">
        {data.productoControl ? (
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            <Descriptions.Item label="Código"><span style={{ fontFamily: 'monospace' }}>{data.productoControl.codigo}</span></Descriptions.Item>
            <Descriptions.Item label="Nombre">{data.productoControl.nombre ? toTitleCase(data.productoControl.nombre) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Precio">{formatCurrency(data.productoControl.precio)}</Descriptions.Item>
            <Descriptions.Item label="Último Costo">{formatCurrency(data.productoControl.ultimoCosto)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }} className="paces-text-secondary">Este producto no tiene producto de control asociado</div>
        )}
      </TabPane>
    </Tabs>
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MProducto')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <Button icon={<PrinterOutlined />} disabled>Imprimir</Button>
          {data.activo && (
            <Button type="primary" icon={<EditOutlined />}>Editar</Button>
          )}
        </Space>
      </div>

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderEncabezado({ xs: 1, sm: 2, md: 3 })}
            {renderTabs()}
          </Col>

          <Col lg={6}>
            <PreciosCard
              precio={data.precio}
              ultimoCosto={data.ultimoCosto}
              margenBeneficio={data.datosExtra?.margenBeneficio}
              alignRight={false}
            />
            <FamiliaCard familia={data.familia} />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderEncabezado(1)}
          <PreciosCard
            precio={data.precio}
            ultimoCosto={data.ultimoCosto}
            margenBeneficio={data.datosExtra?.margenBeneficio}
            alignRight={true}
          />
          <FamiliaCard familia={data.familia} />
          {renderTabs()}
        </div>
      )}
    </div>
  );
};

export default ProductoDetalle;