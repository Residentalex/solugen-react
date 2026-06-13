import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Table, Card, Input, Select, Button, Modal, Descriptions, Typography, Tag, Divider, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ofertaApi } from '../../api/ofertaApi';
import type { OfertaDTO, DetalleOfertaDTO } from '../../types/oferta';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
  }).format(val ?? 0);
}

function getVigencia(item: OfertaDTO): { text: string; color: string } {
  if (!item.activo) return { text: 'Inactiva', color: 'default' };
  const hoy = new Date();
  const fechaFinal = new Date(item.fechaFinal);
  if (fechaFinal < hoy) return { text: 'Expirada', color: 'red' };
  return { text: 'Vigente', color: 'green' };
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€ componente â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const Ofertas: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<OfertaDTO | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ofertas', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await ofertaApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('FOfertas');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const abrirDetalle = (item: OfertaDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ filtro local â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const filteredData = useMemo(() => {
    const list = data || [];
    const result = searchText
      ? list.filter((item) => {
          const lower = searchText.toLowerCase();
          return (
            item.codigo?.toLowerCase().includes(lower) ||
            item.nombre?.toLowerCase().includes(lower)
          );
        })
      : [...list];
    return result.sort((a, b) => b.fechaFinal.localeCompare(a.fechaFinal));
  }, [data, searchText]);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ columnas â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const columns: ColumnsType<OfertaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: OfertaDTO) => (
        <Text
          strong
          className="paces-doc-link"
          style={{ cursor: 'pointer' }}
          onClick={() => abrirDetalle(record)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Fecha Inicio',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      width: 140,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Fecha Final',
      dataIndex: 'fechaFinal',
      key: 'fechaFinal',
      width: 140,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Vigencia',
      dataIndex: 'activo',
      key: 'vigencia',
      width: 160,
      render: (_: boolean, record: OfertaDTO) => {
        const vigencia = getVigencia(record);
        return <Tag color={vigencia.color}>{vigencia.text}</Tag>;
      },
    },
    {
      title: 'Cliente Crédito',
      dataIndex: 'aplicaClienteCredito',
      key: 'aplicaClienteCredito',
      width: 120,
      render: (val: boolean) => <Tag color="blue">{val ? 'Sí' : 'No'}</Tag>,
    },
  ];

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar ofertas"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onReload={() => refetch()}
        />
          </div>

        <Table<OfertaDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="codigo"
          loading={isLoading}
          scroll={{ x: 1040 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            showSizeChanger: false,
            pageSize,
            showTotal: (t) =>
              `${t} registros`,
          }}
          locale={{
            emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {searchText
                ? <Empty description="No se encontraron ofertas para la búsqueda" />
                : <Empty description="No hay ofertas registradas" />
              }
            </div>,
          }}
        />
      </Card>

      {/* â”€â”€ Modal detalle â”€â”€ */}
      <Modal
        title={`Oferta: ${detalleItem?.nombre || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={640}
      >
        {detalleItem && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
              <Descriptions.Item label="Nombre">
                {toTitleCase(detalleItem.nombre ?? '')}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Inicio">
                {formatDate(detalleItem.fechaInicio)}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Final">
                {formatDate(detalleItem.fechaFinal)}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={getVigencia(detalleItem).color}>
                  {getVigencia(detalleItem).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Aplica CrÃ©dito">
                {detalleItem.aplicaClienteCredito ? 'Sí' : 'No'}
              </Descriptions.Item>
            </Descriptions>

            {detalleItem.detalles && detalleItem.detalles.length > 0 && (
              <>
                <Divider>Productos ({detalleItem.detalles.length})</Divider>
                <Table<DetalleOfertaDTO>
                  dataSource={[...detalleItem.detalles].sort((a, b) => b.codigo.localeCompare(a.codigo))}
                  rowKey="codigo"
                  size="small"
                  pagination={false}
                  scroll={{ x: 500 }}
                >
                  <Table.Column
                    title="Código"
                    dataIndex="codigo"
                    key="codigo"
                    width={100}
                  />
                  <Table.Column
                    title="Artículo"
                    dataIndex="articulo"
                    key="articulo"
                    ellipsis
                  />
                  <Table.Column
                    title="Precio"
                    dataIndex="precio"
                    key="precio"
                    align="right"
                    width={120}
                    render={(v: number) => formatCurrency(v)}
                  />
                  <Table.Column
                    title="Dto %"
                    dataIndex="porcentajeDescuento"
                    key="porcentajeDescuento"
                    align="right"
                    width={80}
                    render={(v: number) => `${v}%`}
                  />
                </Table>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default Ofertas;
