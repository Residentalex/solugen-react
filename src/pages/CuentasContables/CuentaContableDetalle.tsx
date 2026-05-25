import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, message, Button, Row, Col, Table, Statistic, Typography, Empty } from 'antd';
import { ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, SwapOutlined, EditOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { CuentaContableDTO, MovimientoCuentaDTO, BalanceCuentaDTO } from '../../types/contabilidad';
import { OrigenCuenta } from '../../types/contabilidad';

const { Text } = Typography;

const ORIGEN_LABEL: Record<number, string> = {
  [OrigenCuenta.Debito]: 'Débito',
  [OrigenCuenta.Credito]: 'Crédito',
  [OrigenCuenta.Desconocido]: 'Desconocido',
};

const CuentaContableDetalle: React.FC = () => {
  const { noCuenta } = useParams<{ noCuenta: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [item, setItem] = useState<CuentaContableDTO | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCuentaDTO[]>([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);
  const [balance, setBalance] = useState<BalanceCuentaDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Carga inicial: cuenta + balance
  useEffect(() => {
    setActiveModule('MCuentaContable');
    if (sucursalActiva === undefined || !noCuenta) return;
    setLoading(true);
    Promise.all([
      cuentaContableApi.obtenerPorId(sucursalActiva, noCuenta),
      cuentaContableApi.obtenerBalance(sucursalActiva, noCuenta),
    ])
      .then(([cta, bal]) => {
        setItem(cta);
        setPageTitleOverride(cta.noCuenta);
        setBalance(bal);
      })
      .catch((err: any) => {
        message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
        navigate('/MCuentaContable');
      })
      .finally(() => setLoading(false));
    return () => setPageTitleOverride('');
  }, [noCuenta, sucursalActiva]);

  // Carga de movimientos paginada
  const cargarMovimientos = useCallback(async (pag: number, size: number) => {
    if (!sucursalActiva || !noCuenta) return;
    setLoadingMovimientos(true);
    try {
      const skip = (pag - 1) * size;
      const result = await cuentaContableApi.obtenerMovimientos(
        sucursalActiva, noCuenta, skip, size, balance?.fechaUltimoCierre ?? undefined
      );
      setMovimientos(result.data);
      setTotalMovimientos(result.total);
    } catch {
      message.error('Error al cargar movimientos');
    } finally {
      setLoadingMovimientos(false);
    }
  }, [sucursalActiva, noCuenta, balance?.fechaUltimoCierre]);

  useEffect(() => {
    cargarMovimientos(pagina, pageSize);
  }, [pagina, pageSize, cargarMovimientos]);

  if (loading || !item) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const columnsMovimientos: ColumnsType<MovimientoCuentaDTO> = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 90,
      render: (v: string) => v ? v.substring(0, 10) : '-' },
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'Entidad', dataIndex: 'entidad', key: 'entidad' },
    { title: 'Débito', dataIndex: 'debe', key: 'debe', width: 120, align: 'right',
      render: (v: number) => v ? v.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '-' },
    { title: 'Crédito', dataIndex: 'haber', key: 'haber', width: 120, align: 'right',
      render: (v: number) => v ? v.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '-' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MCuentaContable')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<EditOutlined />} onClick={() => navigate('/MCuentaContable')}>
          Editar
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            className="paces-card"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Datos Generales</span>
                <Tag color={item.activo ? 'green' : 'default'}>{item.activo ? 'Activo' : 'Inactivo'}</Tag>
              </div>
            }
          >
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Nombre">{item.nombre}</Descriptions.Item>
              <Descriptions.Item label="Tipo Cuenta">{item.tipoCuenta?.nombre || '-'}</Descriptions.Item>
              <Descriptions.Item label="Grupo">{item.grupo?.nombre || '-'}</Descriptions.Item>
              <Descriptions.Item label="Moneda">{item.moneda?.codigo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Origen">{ORIGEN_LABEL[item.origen] || 'Desconocido'}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Control">
                {item.cuentaControl?.noCuenta
                  ? `${item.cuentaControl.noCuenta} - ${item.cuentaControl.nombre}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Cuenta Prima">
                {item.cuentaPrima?.noCuenta
                  ? `${item.cuentaPrima.noCuenta} - ${item.cuentaPrima.nombre}`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Centro Costo">
                {item.utilizaCentroCosto ? 'Sí' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Nota">{item.nota || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card className="paces-card" title="Resumen" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Débitos"
                  value={balance?.totalDebe ?? 0}
                  precision={2}
                  prefix={<ArrowDownOutlined style={{ color: '#f5222d' }} />}
                  valueStyle={{ color: '#f5222d', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Total Créditos"
                  value={balance?.totalHaber ?? 0}
                  precision={2}
                  prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ color: '#52c41a', fontSize: 18 }}
                />
              </Col>
              <Col xs={12} sm={8}>
                <Statistic
                  title="Saldo Actual"
                  value={balance?.saldo ?? 0}
                  precision={2}
                  prefix={<SwapOutlined style={{ color: '#556ee6' }} />}
                  valueStyle={{ color: '#556ee6', fontSize: 18, fontWeight: 600 }}
                />
              </Col>
            </Row>
            {balance?.fechaUltimoCierre && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                  <Card size="small" className="paces-card" style={{ background: '#fafafa' }}>
                    <Text type="secondary">
                      Último cierre: <Text strong>{balance.fechaUltimoCierre?.split('-').reverse().join('/')}</Text>
                      {balance.balanceBase != null && (
                        <> — Balance al cierre: <Text strong>{balance.balanceBase.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</Text></>
                      )}
                    </Text>
                  </Card>
                </Col>
              </Row>
            )}
          </Card>

          <Card className="paces-card" title={`Movimientos (${totalMovimientos})`}>
            <Table<MovimientoCuentaDTO>
              columns={columnsMovimientos}
              dataSource={movimientos}
              rowKey="id"
              loading={loadingMovimientos}
              size="middle"
              className="paces-list-table"
              locale={{ emptyText: <Empty description="No hay movimientos registrados" /> }}
              pagination={{
                current: pagina,
                pageSize: pageSize,
                total: totalMovimientos,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                showTotal: (t) => `${t} registros`,
                onChange: (pag, size) => {
                  setPagina(pag);
                  setPageSize(size);
                },
              }}
              scroll={{ x: 550 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CuentaContableDetalle;
