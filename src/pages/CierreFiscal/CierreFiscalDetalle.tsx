import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Table, Typography, Button, Spin, Descriptions, Empty, message } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { cierreFiscalApi, type CierreFiscalItem, type ResultadoCierre } from '../../api/cierreFiscalApi';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { toTitleCase, formatCurrency, formatDateRaw, formatDate } from '../../utils/formats';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

const CierreFiscalDetalle: React.FC = () => {
  const { transacId } = useParams<{ transacId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = useAuthStore((s: any) => s.usuario);
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
    if (sucursalActiva === undefined) return;
    // Priorizar el transacId del estado del cierre (pasado desde listado) sobre el URL
    const idDesdeEstado = cierreState?.transacId ? parseInt(String(cierreState.transacId), 10) : NaN;
    const idDesdeUrl = transacId ? parseInt(transacId, 10) : NaN;
    const transacIdNum = !isNaN(idDesdeEstado) ? idDesdeEstado : idDesdeUrl;
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
  }, [transacId, sucursalActiva, cierreState]);

  // Derivar estado visual del cierre a partir de discrepancias
  const cuentasConAdvertencia = resultados.filter((r) => {
    const esperado = Math.round(r.balanceAnterior + r.debitosAcum - r.creditosAcum);
    return Math.abs(esperado - r.balanceCierre) > 0.01;
  }).length;
  const cuentasConFallo = resultados.filter((r) => r.balanceCierre === 0 && r.balanceAnterior !== 0).length;

  const estadoCierre = cuentasConFallo > 0 ? 'fallido' : cuentasConAdvertencia > 0 ? 'advertencia' : 'completado';
  const estadoColor = estadoCierre === 'completado' ? '#10b981' : estadoCierre === 'advertencia' ? '#d48806' : '#e53e3e';
  const estadoIcono = estadoCierre === 'completado' ? <CheckCircleOutlined /> : estadoCierre === 'advertencia' ? <WarningOutlined /> : <CloseCircleOutlined />;
  const estadoTexto = estadoCierre === 'completado' ? 'Completado' : estadoCierre === 'advertencia' ? `Completado con advertencias (${cuentasConAdvertencia})` : `Fallido (${cuentasConFallo})`;

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

  // Priorizar anomalías primero (fallos / advertencias / normales)
  const ordenarPorEstado = (a: ResultadoCierre, b: ResultadoCierre) => {
    const esperadoA = Math.round(a.balanceAnterior + a.debitosAcum - a.creditosAcum);
    const fallidoA = Math.abs(esperadoA - a.balanceCierre) > 0.01 ? 0 : Math.abs(a.balanceCierre) < 0.01 && Math.abs(a.balanceAnterior) > 0.01 ? 1 : 2;
    const esperadoB = Math.round(b.balanceAnterior + b.debitosAcum - b.creditosAcum);
    const fallidoB = Math.abs(esperadoB - b.balanceCierre) > 0.01 ? 0 : Math.abs(b.balanceCierre) < 0.01 && Math.abs(b.balanceAnterior) > 0.01 ? 1 : 2;
    if (fallidoA !== fallidoB) return fallidoA - fallidoB;
    return a.numeroCuenta.localeCompare(b.numeroCuenta);
  };

  const resultadosOrdenados = [...resultados].sort(ordenarPorEstado);

  return (
    <>
      {/* Toolbar estructurado */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/RCIERREFISCAL')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        {cierreState && (
          <Text type="secondary" style={{ fontSize: 13 }}>
            Documento: <Text strong style={{ fontSize: 13 }}>{cierreState.numeroDocumento}</Text>
          </Text>
        )}
      </div>

      {/* Encabezado de estado del cierre */}
      <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 16, borderLeft: `4px solid ${estadoColor}`, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 28, color: estadoColor }}>
            {estadoIcono}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong style={{ fontSize: 16, color: '#111827' }}>{estadoTexto}</Text>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: estadoColor, color: '#fff', fontWeight: 600 }}>
                {estadoCierre.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>Responsable: <Text strong>{usuario?.nombre || '---'}</Text></span>
              <span>Fecha: <Text strong>{cierreState?.fecha ? formatDate(cierreState.fecha) : '---'}</Text></span>
              <span>
                {resultados.length > 0
                  ? `Registros: ${resultados.length} ${cuentasConAdvertencia > 0 ? `(${cuentasConAdvertencia} con advertencia)` : ''}`
                  : 'Sin resultados disponibles para esta consulta'}
              </span>
            </div>
          </div>
        </div>
      </Card>

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
            dataSource={resultadosOrdenados}
            rowKey="numeroCuenta"
            pagination={{ showTotal: (t) => `${t} registros`, pageSize: 20 }}
            size="middle"
            className="paces-border-top paces-list-table"
            rowClassName={(record) => {
              const esperado = Math.round(record.balanceAnterior + record.debitosAcum - record.creditosAcum);
              const discrepancia = Math.abs(esperado - record.balanceCierre) > 0.01;
              const fallido = Math.abs(record.balanceCierre) < 0.01 && Math.abs(record.balanceAnterior) > 0.01;
              return fallido ? 'paces-row-selected' : discrepancia ? 'paces-row-hover' : 'paces-row-hover';
            }}
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