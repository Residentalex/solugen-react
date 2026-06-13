import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Typography, Spin, Descriptions, Empty, Button, Space, Input,
} from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined, CalendarOutlined,
  NumberOutlined, DollarOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';

const { Text, Title } = Typography;

// ===== Helpers =====
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return '—';
  return `$${val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val: number | null | undefined): string {
  if (val == null) return '—';
  return val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const CierreDetalle: React.FC = () => {
  const { cierreId } = useParams<{ cierreId: string }>();
  const navigate = useNavigate();
  const sucursal = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [loading, setLoading] = useState(false);
  const [detalle, setDetalle] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cierreInfo, setCierreInfo] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  const cargarDetalle = async () => {
    if (!cierreId) return;
    setLoading(true);
    setError(null);
    try {
      const id = parseInt(cierreId, 10);
      if (isNaN(id)) {
        setError('ID de cierre inválido');
        return;
      }
      const data = await cierreInventarioApi.obtenerDetalleCierre(sucursal, id);
      if (!data) {
        setError('Documento no encontrado en la sucursal seleccionada.');
        return;
      }
      setDetalle(data);

      // Intentar obtener info del cierre del primer elemento o de una llamada separada
      // Si el detalle incluye info del encabezado, la usamos
      if (data.length > 0 && data[0].fechaCierre) {
        setCierreInfo(data[0]);
      } else {
        // Si no, cargamos los cierres para obtener metadata
        try {
          const cierres = await cierreInventarioApi.obtenerCierres(sucursal);
          const found = cierres.find((c: any) => c.cierreId === id);
          if (found) setCierreInfo(found);
        } catch {
          // Silencioso, no crítico
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || err?.message || 'Error al cargar detalle del cierre';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    setSearchText('');
    cargarDetalle();
  };

  const filteredDetalle = searchText
    ? detalle.filter((item: any) => {
        const cod = (item.codpro || '').toLowerCase();
        const desc = (item.descripcion || '').toLowerCase();
        const search = searchText.toLowerCase();
        return cod.includes(search) || desc.includes(search);
      })
    : detalle;

  useEffect(() => {
    setActiveModule('OCierreINV');
    setPageTitleOverride('Detalle del Cierre de Inventario');

    cargarDetalle();

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [cierreId, sucursal, setActiveModule, setPageTitleOverride, resetToolbar]);

  const columns = [
    {
      title: 'Código',
      dataIndex: 'codpro',
      key: 'codpro',
      width: 100,
      render: (val: string) => <Text style={{ fontSize: 12 }}>{val || '—'}</Text>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      render: (val: string) => <Text style={{ fontSize: 12 }}>{val || '—'}</Text>,
    },
    {
      title: 'Familia',
      dataIndex: 'familiaNombre',
      key: 'familiaNombre',
      width: 120,
      render: (val: string | null | undefined) => (
        <Text style={{ fontSize: 12 }}>{val || '—'}</Text>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right' as const,
      render: (val: number) => (
        <Text style={{ fontSize: 12 }}>{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <Text style={{ fontSize: 12 }}>{formatCurrency(val)}</Text>
      ),
    },
  ];

  return (
    <div>
      {/* Header con botón Volver */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space>
          <SucursalDocumentoSelector value={sucursalDestino} onChange={setSucursalDestino} />
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/OCierreINV')}
          >
            Volver
          </Button>
          <Title level={5} style={{ margin: 0 }}>
            Detalle del Cierre #{cierreId}
          </Title>
        </Space>
      </div>

      <Spin spinning={loading}>
        {/* Resumen del cierre */}
        {cierreInfo && (
          <Card
            className="paces-card"
            size="small"
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2, md: 4 }}
              colon={false}
            >
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <CalendarOutlined style={{ color: '#556ee6', fontSize: 13 }} />
                    <span style={{ fontSize: 12 }}>Cierre</span>
                  </Space>
                }
              >
                <Text strong style={{ fontSize: 13 }}>
                  {formatDateDisplay(cierreInfo.fechaCierre)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <CalendarOutlined style={{ color: '#34c38f', fontSize: 13 }} />
                    <span style={{ fontSize: 12 }}>Realizado</span>
                  </Space>
                }
              >
                <Text strong style={{ fontSize: 13 }}>
                  {formatDateDisplay(cierreInfo.fechaRealizado)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <NumberOutlined style={{ color: '#f1b44c', fontSize: 13 }} />
                    <span style={{ fontSize: 12 }}>Cantidad</span>
                  </Space>
                }
              >
                <Text strong style={{ fontSize: 13 }}>
                  {formatNumber(cierreInfo.cantidad)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <Space size={4}>
                    <DollarOutlined style={{ color: '#34c38f', fontSize: 13 }} />
                    <span style={{ fontSize: 12 }}>Total</span>
                  </Space>
                }
              >
                <Text strong style={{ fontSize: 13, color: '#34c38f' }}>
                  {formatCurrency(cierreInfo.total)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontSize: 12 }}>Tipo</span>}>—</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* Tabla de productos */}
        <Card
          className="paces-card"
          size="small"
          title={
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Productos {searchText ? `(${filteredDetalle.length} de ${detalle.length})` : `(${detalle.length})`}
            </span>
          }
          style={{ borderRadius: 8 }}
        >
          <div style={{ padding: '16px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
              <Input.Search
                placeholder="Buscar por código o descripción..."
                allowClear
                onSearch={handleSearch}
                style={{ width: 320 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
              <div style={{ flex: 1 }} />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
            </div>
          </div>
          {error ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Text type="danger" style={{ fontSize: 13 }}>
                {error}
              </Text>
            </div>
          ) : filteredDetalle.length === 0 && !loading ? (
            <Empty
              description="No se encontraron productos en este cierre"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Table
              dataSource={filteredDetalle}
              rowKey={(_, index) => index?.toString() ?? '0'}
              columns={columns}
              pagination={false}
              size="small"
              style={{ borderRadius: 6 }}
              scroll={{ y: 480 }}
            />
          )}
        </Card>
      </Spin>
    </div>
  );
};

export default CierreDetalle;
