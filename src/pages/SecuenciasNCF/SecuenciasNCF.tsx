import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table, message, Card, Button, Tooltip, Space, Tag, Modal,
  Descriptions, Typography, Progress, Select, Input, Empty, Grid, Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  WarningFilled, WarningOutlined, ClockCircleOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { ncfApi } from '../../api/ncfApi';
import type { SecuenciaNCFListDTO } from '../../types/contabilidad';

const formatearFecha = (fecha?: string): string => {
  if (!fecha) return '-';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
};

const { Text } = Typography;

const SecuenciasNCF: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const toTitleCase = (str: string): string =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const getDiasRestantes = (fecha?: string): number | null => {
    if (!fecha) return null;
    const ahora = new Date();
    const venc = new Date(fecha);
    const diff = venc.getTime() - ahora.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Estados
  const [data, setData] = useState<SecuenciaNCFListDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<SecuenciaNCFListDTO | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [filtroVencimiento, setFiltroVencimiento] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modalProntoVisible, setModalProntoVisible] = useState(false);

  const screens = Grid.useBreakpoint();
  const modalWidth = screens.lg ? 600 : '92vw';

  // Carga de datos
  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await ncfApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar secuencias NCF');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MSecuenciaNCF');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  // Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    setPagina(1);
  }, []);

  const handleRefresh = useCallback(() => {
    cargarDatos();
    setPagina(1);
  }, [cargarDatos]);

  // Resumen
  const totalActivas = useMemo(
    () => data.filter((s) => s.activo).length,
    [data],
  );

  const vencidas = useMemo(
    () => data.filter((s) => s.fechaVencimiento && new Date(s.fechaVencimiento) < new Date()).length,
    [data],
  );

  const enAlerta = useMemo(
    () => data.filter((s) => s.activo && (s.cantidad - s.usado) <= s.minimo).length,
    [data],
  );

  // Filtrado local
  const filteredData = useMemo(() => {
    let result = [...data];

    // Búsqueda por texto
    if (searchText) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (s) =>
          (s.tipoComprobante?.toLowerCase() || '').includes(q) ||
          (s.codigo?.toLowerCase() || '').includes(q) ||
          (s.secuenciaInicial?.toLowerCase() || '').includes(q) ||
          (s.secuenciaFinal?.toLowerCase() || '').includes(q) ||
          (s.codigoTipoCliente?.toLowerCase() || '').includes(q),
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todas') {
      const ahora = new Date();
      result = result.filter((s) => {
        switch (filtroEstado) {
          case 'activas':
            return s.activo;
          case 'inactivas':
            return !s.activo;
          case 'alerta':
            return s.activo && (s.cantidad - s.usado) <= s.minimo;
          case 'vencidas':
            return !!s.fechaVencimiento && new Date(s.fechaVencimiento) < ahora;
          default:
            return true;
        }
      });
    }

    // Filtro por vencimiento
    if (filtroVencimiento !== 'todas') {
      const ahora = new Date();
      result = result.filter((s) => {
        if (!s.fechaVencimiento) return false;
        const diffDays = Math.ceil(
          (new Date(s.fechaVencimiento).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
        );
        switch (filtroVencimiento) {
          case '30':
            return diffDays >= 0 && diffDays <= 30;
          case '90':
            return diffDays >= 0 && diffDays <= 90;
          case 'vencida':
            return diffDays < 0;
          default:
            return true;
        }
      });
    }

    return result;
  }, [data, searchText, filtroEstado, filtroVencimiento]);

  // Columnas
  const columns: ColumnsType<SecuenciaNCFListDTO> = [
    {
      title: 'Tipo Comprobante',
      dataIndex: 'tipoComprobante',
      key: 'tipoComprobante',
      width: 320,
      render: (val: string, record: SecuenciaNCFListDTO) => (
        <>
          <Text
            strong
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setDetalleItem(record);
              setDetalleVisible(true);
            }}
          >
            {toTitleCase(val ?? '')}
          </Text>
          {record.codigoTipoCliente && (
            <Tag style={{ marginLeft: 4, fontSize: 10 }}>{record.codigoTipoCliente}</Tag>
          )}
        </>
      ),
    },
    {
      title: 'Rango NCF',
      key: 'rango',
      width: 200,
      render: (_: unknown, record: SecuenciaNCFListDTO) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 11 }}>
          {record.secuenciaInicial} → {record.secuenciaFinal}
        </Text>
      ),
    },
    {
      title: 'Consumo',
      key: 'consumo',
      width: 240,
      render: (_: unknown, record: SecuenciaNCFListDTO) => {
        const usado = record.usado ?? 0;
        const cantidad = record.cantidad ?? 0;
        const pct = cantidad > 0 ? Math.round((usado / cantidad) * 100) : 0;
        const disponible = cantidad - usado;
        const color = pct >= 90 ? '#f46a6a' : pct >= 70 ? '#f1b44c' : '#34c38f';
        return (
          <div>
            <Tooltip
              title={`${usado.toLocaleString('es-DO')} de ${cantidad.toLocaleString('es-DO')} usados (${pct}%). Disponible: ${disponible.toLocaleString('es-DO')}. Mínimo configurado: ${(record.minimo ?? 0).toLocaleString('es-DO')}.`}
            >
              <Progress percent={pct} size="small" showInfo={false} strokeColor={color} />
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {usado.toLocaleString('es-DO')} / {cantidad.toLocaleString('es-DO')} usados
            </Text>
          </div>
        );
      },
    },
    {
      title: 'Disponible',
      key: 'disponible',
      width: 100,
      align: 'right',
      render: (_: unknown, record: SecuenciaNCFListDTO) => {
        const disponible = (record.cantidad ?? 0) - (record.usado ?? 0);
        const enAlerta = disponible <= (record.minimo ?? 0);
        return (
          <Text
            style={{
              color: enAlerta ? '#f46a6a' : undefined,
              fontWeight: enAlerta ? 600 : undefined,
            }}
          >
            {disponible.toLocaleString('es-DO')}
          </Text>
        );
      },
    },
    {
      title: 'Vencimiento',
      dataIndex: 'fechaVencimiento',
      key: 'fechaVencimiento',
      width: 150,
      render: (val?: string) => {
        if (!val) return <Text type="secondary">—</Text>;
        const dias = getDiasRestantes(val);
        if (dias === null) return <Text type="secondary">—</Text>;

        if (dias < 0) {
          return (
            <Space>
              <WarningFilled style={{ color: '#f46a6a' }} />
              <Text>{formatearFecha(val)}</Text>
              <Tag color="error" style={{ marginLeft: 4 }}>
                Vencida
              </Tag>
            </Space>
          );
        }
        if (dias <= 30) {
          return (
            <Space>
              <ClockCircleOutlined style={{ color: '#f1b44c' }} />
              <Text>{formatearFecha(val)}</Text>
              <Tag color="warning" style={{ marginLeft: 4 }}>
                Vence en {dias} día{dias !== 1 ? 's' : ''}
              </Tag>
            </Space>
          );
        }
        if (dias <= 90) {
          return (
            <Space>
              <Text>{formatearFecha(val)}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                en {dias} día{dias !== 1 ? 's' : ''}
              </Text>
            </Space>
          );
        }
        return <Text>{formatearFecha(val)}</Text>;
      },
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 110,
      render: (_: unknown, record: SecuenciaNCFListDTO) => {
        const disponible = (record.cantidad ?? 0) - (record.usado ?? 0);
        const pct = record.cantidad > 0 ? Math.round(((record.usado ?? 0) / record.cantidad) * 100) : 0;

        if (!record.activo) return <Tag color="default">Inactiva</Tag>;
        if (record.fechaVencimiento && new Date(record.fechaVencimiento) < new Date())
          return <Tag color="error">Vencida</Tag>;
        if (disponible <= (record.minimo ?? 0)) return <Tag color="warning">En alerta</Tag>;
        if (pct >= 90) return <Tag color="warning">Por agotarse</Tag>;
        return <Tag color="success">Activa</Tag>;
      },
    },
  ];

  return (
    <>
      {/* Header con resumen */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {totalActivas} activas · {enAlerta} próx. a agotarse · {vencidas} vencidas
          </Text>
        </div>
        <PermissionGate accion="CREAR">
          <Button
            type="default"
            icon={<PlusOutlined />}
            onClick={() => setModalProntoVisible(true)}
          >
            Nueva Secuencia{' '}
            <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>
              Pronto
            </Tag>
          </Button>
        </PermissionGate>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        {/* Barra de búsqueda y filtros */}
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Input.Search
              placeholder="Buscar tipo de comprobante, NCF, código..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 160 }}
              value={filtroEstado}
              onChange={(value) => {
                setFiltroEstado(value);
                setPagina(1);
              }}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: 'activas', label: 'Activas' },
                { value: 'inactivas', label: 'Inactivas' },
                { value: 'alerta', label: 'En alerta' },
                { value: 'vencidas', label: 'Vencidas' },
              ]}
            />
            <Select
              style={{ width: 180 }}
              value={filtroVencimiento}
              onChange={(value) => {
                setFiltroVencimiento(value);
                setPagina(1);
              }}
              options={[
                { value: 'todas', label: 'Todas' },
                { value: '30', label: 'Vence en 30 días' },
                { value: '90', label: 'Vence en 90 días' },
                { value: 'vencida', label: 'Vencida' },
              ]}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPagina(1); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        {/* Tabla */}
        <Table<SecuenciaNCFListDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="idExterno"
          loading={loading}
          scroll={{ x: 1200 }}
          size="middle"
          onRow={(record) => ({
            style: {
              borderLeft: !record.activo
                ? '3px solid transparent'
                : record.fechaVencimiento &&
                  new Date(record.fechaVencimiento) < new Date()
                ? '3px solid #f46a6a'
                : record.cantidad - record.usado <= record.minimo
                ? '3px solid #f1b44c'
                : undefined,
              opacity: !record.activo ? 0.65 : 1,
            },
          })}
          pagination={{
            current: pagina,
            pageSize,
            onChange: (p) => setPagina(p),
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} secuencias`,
          }}
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {data.length === 0 ? (
                  <Empty description="No hay secuencias NCF registradas" />
                ) : (
                  <Empty description="No se encontraron secuencias para los filtros aplicados">
                    <Button
                      type="link"
                      onClick={() => {
                        setSearchText('');
                        setFiltroEstado('todas');
                        setFiltroVencimiento('todas');
                        setPagina(1);
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </Empty>
                )}
              </div>
            ),
          }}
        />
      </Card>

      {/* Modal de detalle mejorado */}
      <Modal
        title="Detalle de Secuencia NCF"
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={modalWidth}
      >
        {detalleItem && (
          <>
            {/* Cabecera */}
            <div style={{ marginBottom: 16 }}>
              <Typography.Title level={5}>
                {toTitleCase(detalleItem.tipoComprobante ?? '')}
                <Tag
                  color={detalleItem.activo ? 'success' : 'default'}
                  style={{ marginLeft: 8 }}
                >
                  {detalleItem.activo ? 'Activa' : 'Inactiva'}
                </Tag>
                <Tag style={{ marginLeft: 4 }}>{detalleItem.codigoTipoCliente}</Tag>
              </Typography.Title>
              <Text type="secondary">
                Código: {detalleItem.codigo} · Tipo cliente:{' '}
                {detalleItem.codigoTipoCliente}
              </Text>
            </div>

            {/* Sección Consumo */}
            <Divider>
              Consumo
            </Divider>
            {(() => {
              const usado = detalleItem.usado ?? 0;
              const cantidad = detalleItem.cantidad ?? 0;
              const disponible = cantidad - usado;
              const minimo = detalleItem.minimo ?? 0;
              const pct = cantidad > 0 ? Math.round((usado / cantidad) * 100) : 0;
              const color =
                pct >= 90 ? '#f46a6a' : pct >= 70 ? '#f1b44c' : '#34c38f';
              return (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Progress
                      percent={pct}
                      strokeWidth={14}
                      style={{ width: '100%', maxWidth: 480 }}
                      strokeColor={color}
                    />
                  </div>
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="Usados">
                      {usado.toLocaleString('es-DO')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Disponibles">
                      {disponible.toLocaleString('es-DO')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cantidad total">
                      {cantidad.toLocaleString('es-DO')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mínimo">
                      <Space>
                        <span>{minimo.toLocaleString('es-DO')}</span>
                        {disponible > minimo ? (
                          <CheckCircleOutlined style={{ color: '#34c38f' }} />
                        ) : (
                          <WarningOutlined style={{ color: '#f46a6a' }} />
                        )}
                      </Space>
                    </Descriptions.Item>
                  </Descriptions>
                </>
              );
            })()}

            {/* Sección Rango */}
            <Divider>
              Rango de secuencia
            </Divider>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Inicial">
                <Text style={{ fontFamily: 'monospace' }}>{detalleItem.secuenciaInicial}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Final">
                <Text style={{ fontFamily: 'monospace' }}>{detalleItem.secuenciaFinal}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Dígitos">
                <Text style={{ fontFamily: 'monospace' }}>{detalleItem.digitos}</Text>
              </Descriptions.Item>
            </Descriptions>

            {/* Sección Vigencia */}
            <Divider>
              Vigencia
            </Divider>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Fecha Vencimiento">
                {detalleItem.fechaVencimiento ? (
                  <Space>
                    <span>{formatearFecha(detalleItem.fechaVencimiento)}</span>
                    {(() => {
                      const dias = getDiasRestantes(detalleItem.fechaVencimiento);
                      if (dias === null) return null;
                      if (dias < 0) return <Tag color="error">Vencida</Tag>;
                      if (dias <= 30)
                        return (
                          <Tag color="warning">
                            Vence en {dias} día{dias !== 1 ? 's' : ''}
                          </Tag>
                        );
                      return null;
                    })()}
                  </Space>
                ) : (
                  <Text type="secondary">—</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      {/* Modal "Nueva Secuencia - Pronto" */}
      <Modal
        title="Nueva Secuencia NCF"
        open={modalProntoVisible}
        onCancel={() => setModalProntoVisible(false)}
        footer={
          <Button type="primary" onClick={() => setModalProntoVisible(false)}>
            Entendido
          </Button>
        }
      >
        <p>
          La funcionalidad de registro de secuencias NCF está en desarrollo.
        </p>
        <p>
          Mientras tanto, las secuencias se gestionan desde el módulo Desktop o
          mediante importación desde DGII.
        </p>
      </Modal>
    </>
  );
};

export default SecuenciasNCF;
