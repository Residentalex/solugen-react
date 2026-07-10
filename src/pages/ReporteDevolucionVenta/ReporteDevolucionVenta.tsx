import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, DatePicker, message, Alert, Typography, Empty, Modal } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, ReloadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import type { FacturaVistaDTO } from '../../types/facturacion';
import { formatCurrency, formatDate } from '../../utils/formats';
import { toTitleCase } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

function formatDateShort(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ReporteDevolucionVenta: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [data, setData] = useState<FacturaVistaDTO[]>([]);
  const [consumidas, setConsumidas] = useState<FacturaVistaDTO[]>([]);
  const [noConsumidas, setNoConsumidas] = useState<FacturaVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([dayjs().startOf('month'), dayjs()]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [generating, setGenerating] = useState(false);

  const cargar = useCallback(async () => {
    if (!fechas) return;
    setSelectedRowKeys([]);
    setLoading(true);
    setLoadingError(false);
    try {
      const desde = fechas[0].format('YYYYMMDDHHmmss');
      const hasta = fechas[1].format('YYYYMMDDHHmmss');
      const res = await devolucionVentaApi.obtenerVista(sucursalActiva, desde, hasta, 1000, 0);
      const items = res.data || [];
      setData(items);

      const consumidasList: FacturaVistaDTO[] = [];
      const noConsumidasList: FacturaVistaDTO[] = [];

      for (const item of items || []) {
        if ((item.montoConsumido || 0) > 0) {
          consumidasList.push(item);
        } else {
          noConsumidasList.push(item);
        }
      }

      setConsumidas(consumidasList);
      setNoConsumidas(noConsumidasList);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar el reporte';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, fechas]);

  useEffect(() => {
    setActiveModule('RDEV');
    cargar();
  }, [setActiveModule, cargar]);

  const handleGenerarND = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;

    const totalMonto = noConsumidas
      .filter((item) => selectedRowKeys.includes(item.id))
      .reduce((sum, item) => sum + (item.total || 0), 0);

    Modal.confirm({
      title: 'Generar Nota de Débito',
      content: `Se generará una Nota de Débito por ${selectedRowKeys.length} devolución(es) por un monto total de ${formatCurrency(totalMonto)}. ¿Continuar?`,
      okText: 'Sí, generar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setGenerating(true);
        try {
          const nd = await devolucionVentaApi.generarND(
            sucursalActiva,
            selectedRowKeys.map(Number)
          );
          message.success(`Nota de Débito ${nd.noDocumento} generada exitosamente`);
          setSelectedRowKeys([]);
          await cargar();
          navigate(`/FNDCLI/${nd.id}`);
        } catch (err: any) {
          const msg = err?.response?.data?.errorMessage || 'Error al generar la Nota de Débito';
          message.error(msg);
        } finally {
          setGenerating(false);
        }
      },
    });
  }, [selectedRowKeys, noConsumidas, sucursalActiva, cargar, navigate]);

  const columns = [
    {
      title: 'Documento',
      key: 'documento',
      width: 170,
      render: (_: any, r: FacturaVistaDTO) => (
        <a className="paces-doc-link" onClick={() => navigate(`/FDEV/${r.id}`)}>
          {r.documento || r.id}
        </a>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => formatDateShort(v),
    },
    {
      title: 'Cliente',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || '-'),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 180,
      render: (v: string) => toTitleCase(v || '-'),
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (v: string) => v || '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatCurrency(v || 0)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (v: any) => {
        const num = typeof v === 'string' ? parseInt(v, 10) : v;
        const info = ESTADO_DOCUMENTO_MAP[num] || { label: v ?? 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>Volver</Button>
        <div style={{ flex: 1 }} />
        <RangePicker
          value={fechas}
          onChange={setFechas as any}
          format="YYYY-MM-DD"
          allowClear={false}
        />
        <Button
          type="primary"
          icon={<FileTextOutlined />}
          disabled={selectedRowKeys.length === 0}
          loading={generating}
          onClick={handleGenerarND}
        >
          Generar ND ({selectedRowKeys.length})
        </Button>
        <Button type="primary" icon={<SearchOutlined />} onClick={cargar} loading={loading}>Consultar</Button>
        <Button icon={<ReloadOutlined />} onClick={cargar} />
      </div>

      {loadingError && (
        <Alert
          message="Error al cargar el reporte"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargar}>Reintentar</Button>}
        />
      )}

      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={24} style={{ marginBottom: 16 }}>
            <Card className="paces-card" size="small" title={
              <span style={{ fontSize: 16, fontWeight: 600 }}>Resumen</span>
            }>
              <Space size={24}>
                <div>
                  <span className="paces-text-secondary">Total devoluciones: </span>
                  <Text strong>{data.length}</Text>
                </div>
                <div>
                  <span className="paces-text-secondary">Consumidas: </span>
                  <Text strong style={{ color: '#34c38f' }}>{consumidas.length}</Text>
                </div>
                <div>
                  <span className="paces-text-secondary">No consumidas: </span>
                  <Text strong style={{ color: '#f46a6a' }}>{noConsumidas.length}</Text>
                </div>
                <div>
                  <span className="paces-text-secondary">Total monto: </span>
                  <Text strong>{formatCurrency(data.reduce((s, r) => s + (r.total || 0), 0))}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="noConsumidas"
          type="card"
          items={[
            {
              key: 'noConsumidas',
              label: `No Consumidas (${noConsumidas.length})`,
              children: noConsumidas.length === 0 ? (
                <Empty description="No hay devoluciones no consumidas" />
              ) : (
                <Table
                  dataSource={noConsumidas}
                  columns={columns}
                  rowKey="id"
                  size="small"
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                  }}
                  pagination={{ pageSize: 20, showTotal: (t) => `${t} registros` }}
                  scroll={{ x: 900 }}
                />
              ),
            },
            {
              key: 'consumidas',
              label: `Consumidas (${consumidas.length})`,
              children: consumidas.length === 0 ? (
                <Empty description="No hay devoluciones consumidas" />
              ) : (
                <Table
                  dataSource={consumidas}
                  columns={columns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20, showTotal: (t) => `${t} registros` }}
                  scroll={{ x: 900 }}
                />
              ),
            },
          ]}
        />
      </Spin>
    </div>
  );
};

export default ReporteDevolucionVenta;
