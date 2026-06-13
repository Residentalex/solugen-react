import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Select, Tag, Button, Card, Typography, Modal, Descriptions, DatePicker, Alert, Empty } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import type { ActualizacionPrecioDTO } from '../../types/actualizacionPrecio';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  Pendiente: { color: 'warning', label: 'Pendiente' },
  Aplicado: { color: 'success', label: 'Aplicado' },
  Anulado: { color: 'error', label: 'Anulado' },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

const ActualizacionPrecio: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [detalleItem, setDetalleItem] = useState<ActualizacionPrecioDTO | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });
  const [dateTrigger, setDateTrigger] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['actualizacionPrecio', sucursalActiva, page, pageSize, searchText, dateTrigger],
    queryFn: async () => {
      const { desde, hasta } = dateParamsRef.current;
      let resultados: ActualizacionPrecioDTO[];

      if (searchText.length > 2) {
        resultados = await actualizacionPrecioApi.filtrar(sucursalActiva, {
          cantidad: pageSize,
          salto: (page - 1) * pageSize,
          desde,
          hasta,
          documento: searchText,
        });
      } else {
        resultados = await actualizacionPrecioApi.obtenerResumido(
          sucursalActiva,
          desde,
          hasta,
          pageSize,
          (page - 1) * pageSize
        );
      }

      const total = resultados.length < pageSize
        ? (page - 1) * pageSize + resultados.length
        : page * pageSize + 1;
      return { datos: resultados, total };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('FActPrecio');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setDateTrigger((n) => n + 1);
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const d = dates[0].format('YYYYMMDD') + '000000';
      const h = dates[1].format('YYYYMMDD') + '000000';
      dateParamsRef.current = { desde: d, hasta: h };
    } else {
      dateParamsRef.current = {
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
      };
    }
    setPage(1);
    setDateTrigger((n) => n + 1);
  };

  const columns: ColumnsType<ActualizacionPrecioDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      fixed: 'left',
      render: (val: string, record: ActualizacionPrecioDTO) => (
        <Text
          strong
          className="paces-doc-link"
          onClick={() => {
            setDetalleItem(record);
            setDetalleOpen(true);
          }}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Fecha Aplicar',
      dataIndex: 'fechaParaAplicar',
      key: 'fechaParaAplicar',
      width: 120,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },

    {
      title: 'Doc. Referencia',
      dataIndex: 'docReferencia',
      key: 'docReferencia',
      width: 150,
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>,
    },
    {
      title: 'Ajuste',
      dataIndex: 'ajuste',
      key: 'ajuste',
      width: 100,
      align: 'right',
      render: (val: number) => (
        <Text style={{ fontFamily: 'monospace' }}>{val.toLocaleString('es-DO')}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (val: string) => {
        const info = ESTADO_TAG[val] || { color: 'default', label: val };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'Autorizado',
      dataIndex: 'autorizado',
      key: 'autorizado',
      width: 100,
      render: (val: boolean) => (
        <Tag color="blue">{val ? 'SÃ­' : 'No'}</Tag>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar actualizaciones de precio"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onReload={handleRefresh}
          filtros={
            <RangePicker
              style={{ width: 220 }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
              placeholder={["Desde", "Hasta"]}
            />
          }
        />
        <Table<ActualizacionPrecioDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="documento"
          loading={isLoading}
          scroll={{ x: 1200 }}
          size="middle"
          locale={{
            emptyText: isLoading ? ' ' : <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No se encontraron actualizaciones de precio" /></div>,
          }}
          onRow={() => ({
            style: { cursor: 'default' },
          })}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total || 0,
            onChange: (newPage, newPageSize) => {
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
              } else {
                setPage(newPage);
              }
            },
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      <Modal
        title={`ActualizaciÃ³n: ${detalleItem?.documento || ''}`}
        open={detalleOpen}
        onCancel={() => setDetalleOpen(false)}
        footer={null}
        width={600}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Documento">{detalleItem.documento}</Descriptions.Item>
            <Descriptions.Item label="Fecha">{formatDate(detalleItem.fecha)}</Descriptions.Item>
            <Descriptions.Item label="Fecha para Aplicar">
              {formatDate(detalleItem.fechaParaAplicar)}
            </Descriptions.Item>

            <Descriptions.Item label="Doc. Referencia">
              {detalleItem.docReferencia || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Ajuste">{detalleItem.ajuste}</Descriptions.Item>
            <Descriptions.Item label="Redondear">
              {detalleItem.redondear ? 'SÃ­' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag
                color={
                  (ESTADO_TAG[detalleItem.estado] || { color: 'default' }).color
                }
              >
                {detalleItem.estado}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Autorizado">
              <Tag color="blue">{detalleItem.autorizado ? 'SÃ­' : 'No'}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </>
  );
};

export default ActualizacionPrecio;
