import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Typography, Button, Spin, Descriptions, Empty, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { cierreFiscalApi, type CierreFiscalItem, type ResultadoCierre } from '../../api/cierreFiscalApi';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { formatCurrency, formatDateRaw, formatDate } from '../../utils/formats';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const CierreFiscalDetalle: React.FC = () => {
  const { transacId } = useParams<{ transacId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  // Obtener info del cierre desde el estado de navegación (pasado desde el listado)
  const cierreState = (location.state as { cierre?: CierreFiscalItem })?.cierre;

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [resultados, setResultados] = useState<ResultadoCierre[]>([]);

  useEffect(() => {
    setActiveModule('RCIERREFISCAL');
  }, [setActiveModule]);

  useEffect(() => {
    if (!transacId || sucursalActiva === undefined) return;

    const transacIdNum = parseInt(transacId, 10);
    if (isNaN(transacIdNum)) return;

    setLoading(true);
    setLoadingError(false);
    cierreFiscalApi.obtenerResultadosPorCierre(sucursalActiva, transacIdNum)
      .then((results) => {
        setResultados(results);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar resultados del cierre';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [transacId, sucursalActiva]);

  const columnas: ColumnsType<ResultadoCierre> = [
    {
      title: 'Cuenta',
      dataIndex: 'numeroCuenta',
      key: 'numeroCuenta',
      width: 120,
      fixed: 'left',
      render: (val: string) => <Text strong>{val}</Text>,
    },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
    {
      title: 'Balance Anterior',
      dataIndex: 'balanceAnterior',
      key: 'balanceAnterior',
      width: 140,
      align: 'right',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Débitos',
      dataIndex: 'debitosAcum',
      key: 'debitosAcum',
      width: 140,
      align: 'right',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Créditos',
      dataIndex: 'creditosAcum',
      key: 'creditosAcum',
      width: 140,
      align: 'right',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Balance Cierre',
      dataIndex: 'balanceCierre',
      key: 'balanceCierre',
      width: 140,
      align: 'right',
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
  ];

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/RCIERREFISCAL')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        {cierreState && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            Cierre: {cierreState.numeroDocumento}
          </Text>
        )}
      </div>

      <Spin spinning={loading}>
        {/* Encabezado con información del cierre */}
        <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 24 }}>
          <Descriptions bordered size="small" column={{ xs: 1, md: 2, lg: 4 }}>
            <Descriptions.Item label="No. Documento" span={1}>
              <Text strong>{cierreState?.numeroDocumento || `#${transacId}`}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Fecha" span={1}>
              <Text>{cierreState?.fecha ? formatDate(cierreState.fecha) : '---'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Débitos" span={1}>
              <Text>{cierreState?.totalDebitos !== undefined ? formatCurrency(cierreState.totalDebitos) : '---'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Créditos" span={1}>
              <Text>{cierreState?.totalCreditos !== undefined ? formatCurrency(cierreState.totalCreditos) : '---'}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Tabla de resultados */}
        <Card
          className="paces-card-erp"
          style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}
          title="Resultados del Cierre"
        >
          <Table<ResultadoCierre>
            columns={columnas}
            dataSource={resultados}
            rowKey="numeroCuenta"
            pagination={{ showTotal: (t) => `${t} registros`, pageSize: 50 }}
            size="middle"
            className="paces-border-top paces-list-table"
            rowClassName="paces-row-hover"
            scroll={{ x: 1000 }}
            locale={{
              emptyText: (
                <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Empty description={loading ? 'Cargando...' : 'No hay resultados disponibles'} />
                </div>
              ),
            }}
          />
        </Card>
      </Spin>
    </>
  );
};

export default CierreFiscalDetalle;
