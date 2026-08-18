import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, Typography, Descriptions, Alert, message, Modal, Input, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, CheckCircleOutlined, CheckCircleFilled, CloseCircleFilled, SearchOutlined, PrinterOutlined, DownloadOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import PermissionGate from '../../components/PermissionGate';
import { formatCurrency, formatNumber, formatDate, extraerMensajeError, toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { ConciliacionBancariaDTO, MovimientoBancarioDTO, TransaccionConciliadaDTO, ResumenTipoDocumentoDTO, ResumenGeneralConciliacionDTO } from '../../types/conciliacionBancaria';

const { Text } = Typography;

const ConciliacionBancariaDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<ConciliacionBancariaDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [searchMov, setSearchMov] = useState('');
  const [searchSinConcil, setSearchSinConcil] = useState('');
  const [searchTrans, setSearchTrans] = useState('');
  const [enTransito, setEnTransito] = useState<TransaccionConciliadaDTO[]>([]);
  const [loadingTransito, setLoadingTransito] = useState(false);
  const [searchTransito, setSearchTransito] = useState('');
  const [resumenGeneral, setResumenGeneral] = useState<ResumenGeneralConciliacionDTO | null>(null);
  const [exportandoLibros, setExportandoLibros] = useState(false);
  const [exportandoTransito, setExportandoTransito] = useState(false);
  const [movimientosDetalle, setMovimientosDetalle] = useState<MovimientoBancarioDTO[]>([]);
  const [transaccionesDetalle, setTransaccionesDetalle] = useState<TransaccionConciliadaDTO[]>([]);
  const [movimientosCargados, setMovimientosCargados] = useState(false);
  const [transaccionesCargadas, setTransaccionesCargadas] = useState(false);
  const [transitoCargado, setTransitoCargado] = useState(false);

  // ===== Carga de datos =====
  const cargarData = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);

    conciliacionBancariaApi.obtenerEncabezado(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Conciliación N° ${res.concilID}`);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la conciliación');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const cargarEnTransito = useCallback(() => {
    if (!id) return;
    setLoadingTransito(true);
    conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id))
      .then((res) => {
        setEnTransito(res);
        setTransitoCargado(true);
      })
      .catch(() => message.error('Error al cargar documentos en tránsito'))
      .finally(() => setLoadingTransito(false));
  }, [id, sucursalActiva]);

  const cargarMovimientosDetalle = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerMovimientos(sucursalActiva, parseInt(id))
      .then((res) => {
        setMovimientosDetalle(res);
        setMovimientosCargados(true);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar los movimientos');
        message.error(msg);
      });
  }, [id, sucursalActiva]);

  const cargarTransaccionesDetalle = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id))
      .then((res) => {
        setTransaccionesDetalle(res);
        setTransaccionesCargadas(true);
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar las transacciones');
        message.error(msg);
      });
  }, [id, sucursalActiva]);

  const cargarResumenGeneral = useCallback(() => {
    if (!id) return;
    conciliacionBancariaApi.obtenerResumenGeneral(sucursalActiva, parseInt(id))
      .then(setResumenGeneral)
      .catch(() => message.error('Error al cargar el resumen general'));
  }, [id, sucursalActiva]);

  useEffect(() => {
    setActiveModule('FConcil');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    cargarData();
  }, [cargarData]);

  // Cargar tránsito al montar para que el label del tab muestre el conteo real
  useEffect(() => {
    if (data) cargarEnTransito();
  }, [data, cargarEnTransito]);

  // La pestaña activa por defecto es 'movimientos'; onChange no se dispara al montar,
  // así que cargar los movimientos aquí (igual que el efecto de tránsito).
  useEffect(() => {
    if (!data) return;
    if (movimientosCargados) return;
    cargarMovimientosDetalle();
    cargarResumenGeneral();
  }, [data, movimientosCargados, cargarMovimientosDetalle, cargarResumenGeneral]);

  // ===== Handlers =====
  const handleAplicar = () => {
    if (!data) return;

    Modal.confirm({
      title: 'Aplicar conciliación',
      content: `¿Está seguro de aplicar la conciliación N° ${data.concilID}?`,
      okText: 'Sí, aplicar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setSaving(true);
        try {
          await conciliacionBancariaApi.aplicar(sucursalActiva, data.concilID);
          message.success('Conciliación aplicada exitosamente');
          cargarData();
          if (movimientosCargados) cargarMovimientosDetalle();
          if (transaccionesCargadas) cargarTransaccionesDetalle();
        } catch (err: any) {
          const msg = extraerMensajeError(err, 'Error al aplicar');
          message.error(msg);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const handleImprimir = async () => {
    setImprimiendo(true);
    try {
      const res = await apiClient.get(
        `/reportes/conciliacion-bancaria/${sucursalActiva}/${Number(id)}/pdf`,
        { responseType: 'blob' }
      );
      const blobUrl = URL.createObjectURL(res.data);
      window.open(blobUrl, '_blank');
    } catch {
      message.error('Error al generar el PDF');
    } finally {
      setImprimiendo(false);
    }
  };

  const handleExportarLibros = async () => {
    if (!id) return;
    setExportandoLibros(true);
    try {
      const datos = await conciliacionBancariaApi.exportarLibros(sucursalActiva, parseInt(id));
      if (datos.length === 0) {
        message.warning('No hay movimientos para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Déb/Créd', 'Monto', 'TransacID', 'Entidad', 'Conciliado'];
      const dataRows = datos.map(d => [
        d.nombreTipoDoc || d.tipoDoc,
        d.numDoc,
        d.fecha ? formatDate(d.fecha) : '',
        d.debCred === 'D' ? 'Débito' : 'Crédito',
        d.monto,
        d.transacId,
        d.entidad || '',
        d.conciliado === 'T' ? 'Sí' : 'No',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Libro del Mayor - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Libro del Mayor',
        fileName: `libro-mayor-${id}.xlsx`,
        columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
      });
      message.success('Libro del mayor exportado correctamente');
    } catch {
      message.error('Error al exportar libro del mayor');
    } finally {
      setExportandoLibros(false);
    }
  };

  const handleExportarTransito = async () => {
    if (!id) return;
    setExportandoTransito(true);
    try {
      // Asegurar datos cargados bajo demanda (sin barrer CTRANSAC en el backend)
      let conciliadas = transaccionesDetalle;
      if (!transaccionesCargadas) {
        conciliadas = await conciliacionBancariaApi.obtenerTransaccionesConciliadas(sucursalActiva, parseInt(id));
        setTransaccionesDetalle(conciliadas);
        setTransaccionesCargadas(true);
      }
      let transito = enTransito;
      if (!transitoCargado) {
        transito = await conciliacionBancariaApi.obtenerEnTransito(sucursalActiva, parseInt(id));
        setEnTransito(transito);
        setTransitoCargado(true);
      }

      const datos = [...conciliadas, ...transito];
      if (datos.length === 0) {
        message.warning('No hay documentos en tránsito para exportar');
        return;
      }
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Tipo Doc', 'Número', 'Fecha', 'Monto', 'Déb/Créd', 'Entidad', 'Conciliado'];
      const dataRows = datos.map(d => [
        d.nombreTipoDoc || d.tipoDoc,
        d.numDoc,
        d.fecha ? formatDate(d.fecha) : '',
        d.monto,
        d.debCred === 'D' ? 'Débito' : 'Crédito',
        d.entidad || '',
        d.concil ? 'Sí' : 'No',
      ]);
      exportToExcel({
        companyName,
        extraHeaderRows: [[`Tránsito - Conciliación ${id}`]],
        columnHeaders,
        dataRows,
        sheetName: 'Tránsito',
        fileName: `transito-${id}.xlsx`,
        columnWidths: [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 40 }, { wch: 12 }],
      });
      message.success('Tránsito exportado correctamente');
    } catch {
      message.error('Error al exportar tránsito');
    } finally {
      setExportandoTransito(false);
    }
  };

  // ===== Loading state =====
  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando conciliación...</div>
      </div>
    );
  }

  if (loadingError && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Alert
          message="Error al cargar la conciliación"
          type="error"
          showIcon
          action={<Button size="small" onClick={cargarData}>Reintentar</Button>}
        />
      </div>
    );
  }

  if (!data) return null;

  const isLarge = screens.xxl === true;
  const diferencia = data.diferencia ?? (data.balBancos - data.balLibros);

  // ===== Columnas de movimientos bancarios =====
  const movimientoColumns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
    },
    {
      title: 'Referencia',
      dataIndex: 'numRef',
      key: 'numRef',
      width: 130,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatNumber(val)}</Text>,
    },
    {
      title: 'Déb/Créd',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'D' ? '#f50' : '#87d068'}>
          {val === 'D' ? 'Débito' : 'Crédito'}
        </Tag>
      ),
    },
    {
      title: 'Cotejado',
      dataIndex: 'cotejado',
      key: 'cotejado',
      width: 100,
      render: (cotejado: boolean) => (
        cotejado
          ? <CheckCircleFilled style={{ color: '#34c38f', fontSize: 16 }} />
          : <CloseCircleFilled style={{ color: '#d9d9d9', fontSize: 16 }} />
      ),
    },
  ];

  // ===== Columnas de transacciones conciliadas =====
  const transaccionColumns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => formatDate(f),
    },
    {
      title: 'Documento',
      key: 'documento',
      width: 160,
      render: (_: unknown, record: TransaccionConciliadaDTO) => (
        <Text>{record.tipoDoc}-{record.numDoc}</Text>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      render: (val: string) => <Text>{toTitleCase(val || '-')}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatNumber(val)}</Text>,
    },
    {
      title: 'Déb/Créd',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 100,
      render: (val: string) => (
        <Tag color={val === 'D' ? '#f50' : '#87d068'}>
          {val === 'D' ? 'Débito' : 'Crédito'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar la conciliación"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={cargarData}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/FConcil')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        <Space>
          <PermissionGate accion="EDITAR">
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/FConcil/${data.concilID}/editar`)}
              disabled={data.aplicada}
            >
              Editar
            </Button>
          </PermissionGate>
          <PermissionGate accion="IMPRIMIR">
            <Button
              icon={<PrinterOutlined />}
              onClick={handleImprimir}
              loading={imprimiendo}
            >
              Imprimir
            </Button>
          </PermissionGate>
          <PermissionGate accion="APLICAR">
            <Button
              icon={<CheckCircleOutlined />}
              onClick={handleAplicar}
              loading={saving}
              disabled={data.aplicada}
              style={data.aplicada ? undefined : { background: '#389e0d', borderColor: '#389e0d', color: '#fff' }}
            >
              Aplicar
            </Button>
          </PermissionGate>
        </Space>
      </div>

      {/* Layout responsive */}
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Card Datos Generales */}
            <Card
              className="paces-card"
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                  <Tag color={data.aplicada ? 'success' : 'warning'}>
                    {data.aplicada ? 'Aplicada' : 'Pendiente'}
                  </Tag>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="N° Conciliación">{data.concilID}</Descriptions.Item>
                <Descriptions.Item label="Cuenta Bancaria">{data.numeroCta || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
                <Descriptions.Item label="Fecha Período Anterior">{data.fechaAnt ? formatDate(data.fechaAnt) : '-'}</Descriptions.Item>
                <Descriptions.Item label="Balance Bancos">{formatCurrency(data.balBancos)}</Descriptions.Item>
                <Descriptions.Item label="Balance Libros">{formatCurrency(data.balLibros)}</Descriptions.Item>
                <Descriptions.Item label="Diferencia">
                  <Text strong className={diferencia !== 0 ? 'paces-text-error' : ''}>
                    {formatCurrency(diferencia)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Archivo">{data.archivo || '-'}</Descriptions.Item>
                <Descriptions.Item label="Estado">
                  <Tag color={data.aplicada ? 'success' : 'warning'}>
                    {data.aplicada ? 'Aplicada' : 'Pendiente'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Notas" span={3}>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Tabs */}
            <Tabs
              defaultActiveKey="resumen"
              type="card"
              onChange={(key) => {
                if (key === 'resumen') {
                  cargarResumenGeneral();
                } else if (key === 'movimientos' || key === 'sinconciliar') {
                  if (!movimientosCargados) cargarMovimientosDetalle();
                } else if (key === 'transacciones') {
                  if (!transaccionesCargadas) cargarTransaccionesDetalle();
                } else if (key === 'transito') {
                  cargarEnTransito();
                }
              }}
              items={[
              {
                key: 'resumen',
                label: 'Resumen General',
                children: resumenGeneral ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Sección Libro del Mayor */}
                    <Card className="paces-card" size="small" title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Libro del Mayor</span>
                        <Button
                          icon={<DownloadOutlined />}
                          size="small"
                          onClick={handleExportarLibros}
                          loading={exportandoLibros}
                        >
                          Exportar
                        </Button>
                      </div>
                    }>
                      <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                        <Descriptions.Item label="Balance inicial en libros">
                          <Text strong>{formatCurrency(resumenGeneral.balanceInicialLibros)}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Período">
                          {data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-'}
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla resumen por tipo doc */}
                      <Table
                        dataSource={resumenGeneral.resumenLibros}
                        columns={[
                          { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                            <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                          )},
                          { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                            render: (v: number) => formatNumber(v) },
                          { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                            render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                        ]}
                        rowKey="tipoDoc"
                        size="small"
                        pagination={false}
                        style={{ marginTop: 12 }}
                        locale={{ emptyText: 'No hay movimientos en el período' }}
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado en libros:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoLibros)}</span>
                      </div>
                    </Card>

                    {/* Sección Banco */}
                    <Card className="paces-card" size="small" title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Banco</span>
                        <Button
                          icon={<DownloadOutlined />}
                          size="small"
                          onClick={handleExportarTransito}
                          loading={exportandoTransito}
                        >
                          Exportar
                        </Button>
                      </div>
                    }>
                      <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                        <Descriptions.Item label="Balance según estado bancario">
                          <Text strong>{formatCurrency(resumenGeneral.balanceBancos)}</Text>
                        </Descriptions.Item>
                      </Descriptions>

                      {/* Tabla tránsito */}
                      <Table
                        dataSource={resumenGeneral.resumenTransito}
                        columns={[
                          { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                            <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                          )},
                          { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                            render: (v: number) => formatNumber(v) },
                          { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                            render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                        ]}
                        rowKey="tipoDoc"
                        size="small"
                        pagination={false}
                        style={{ marginTop: 12 }}
                        locale={{ emptyText: 'No hay documentos en tránsito' }}
                      />

                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                        <span>Balance conciliado banco + tránsito:</span>
                        <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoBanco)}</span>
                      </div>
                    </Card>

                    {/* Diferencia */}
                    <Card className="paces-card" size="small"
                      style={{ borderLeft: `4px solid ${resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }}>
                        <span>Diferencia</span>
                        <span style={{ color: resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f' }}>
                          {formatCurrency(resumenGeneral.diferencia)}
                        </span>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Spin />
                    <div style={{ marginTop: 8 }} className="paces-text-secondary">Cargando resumen...</div>
                  </div>
                ),
              },
              {
              key: 'movimientos',
              label: `Movimientos Bancarios (${movimientosDetalle.length})`,
              children: (
              <>
              <Input.Search
                placeholder="Buscar en movimientos..."
                allowClear
                onSearch={(v) => setSearchMov(v)}
                onChange={(e) => { if (!e.target.value) setSearchMov(''); }}
                style={{ width: 300, marginBottom: 12 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
                />
                  <Table
                      dataSource={(() => {
                        const items = movimientosDetalle;
                      if (!searchMov) return items;
                      const q = searchMov.toLowerCase();
                      return items.filter((m) =>
                      (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                    (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                    (m.documento && m.documento.toLowerCase().includes(q))
                  );
                })()}
                columns={movimientoColumns}
                rowKey="orden"
                size="small"
                  pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 800 }}
                      locale={{ emptyText: 'No hay movimientos bancarios importados' }}
                      />
                        </>
                        ),
                              },
                      {
                      key: 'sinconciliar',
              label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en sin conciliar..."
                    allowClear
                    onSearch={(v) => setSearchSinConcil(v)}
                    onChange={(e) => { if (!e.target.value) setSearchSinConcil(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = movimientosDetalle.filter((m) => !m.cotejado);
                      if (!searchSinConcil) return items;
                      const q = searchSinConcil.toLowerCase();
                      return items.filter((m) =>
                        (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                        (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                        (m.documento && m.documento.toLowerCase().includes(q)) ||
                        (m.entidad && m.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={movimientoColumns}
                    rowKey="orden"
                    size="small"
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: 'No hay movimientos sin conciliar' }}
                  />
                </>
              ),
            },
            {
              key: 'transacciones',
              label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en documentos..."
                    allowClear
                    onSearch={(v) => setSearchTrans(v)}
                    onChange={(e) => { if (!e.target.value) setSearchTrans(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = transaccionesDetalle;
                      if (!searchTrans) return items;
                      const q = searchTrans.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones conciliadas' }}
                  />
                </>
              ),
            },
            {
              key: 'transito',
              label: `Transacciones en Tránsito (${enTransito.length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en tránsito..."
                    allowClear
                    onSearch={(v) => setSearchTransito(v)}
                    onChange={(e) => { if (!e.target.value) setSearchTransito(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = enTransito;
                      if (!searchTransito) return items;
                      const q = searchTransito.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    loading={loadingTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay documentos en tránsito' }}
                  />
                </>
              ),
            },
          ]}
        />
      </Col>
      <Col xxl={6}>
            {/* Sidebar con totales */}
            <Card className="paces-card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(data.balBancos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(data.balLibros)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Resumen de movimientos */}
            <Card
              className="paces-card"
              title={<span style={{ fontSize: 14, fontWeight: 600 }}>Resumen</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total movimientos</span>
                  <span>{movimientosDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientosDetalle.filter((m) => m.cotejado).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Documentos conciliados</span>
                  <span>{transaccionesDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">En tránsito</span>
                  <span>{enTransito.length}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile / compacto */
        <div>
          <Card
            className="paces-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Tag color={data.aplicada ? 'success' : 'warning'}>
                  {data.aplicada ? 'Aplicada' : 'Pendiente'}
                </Tag>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
              <Descriptions.Item label="N° Conciliación">{data.concilID}</Descriptions.Item>
              <Descriptions.Item label="Cuenta Bancaria">{data.numeroCta || '-'}</Descriptions.Item>
              <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
              <Descriptions.Item label="Fecha Período Anterior">{data.fechaAnt ? formatDate(data.fechaAnt) : '-'}</Descriptions.Item>
              <Descriptions.Item label="Balance Bancos">{formatCurrency(data.balBancos)}</Descriptions.Item>
              <Descriptions.Item label="Balance Libros">{formatCurrency(data.balLibros)}</Descriptions.Item>
              <Descriptions.Item label="Diferencia">
                <Text strong className={diferencia !== 0 ? 'paces-text-error' : ''}>
                  {formatCurrency(diferencia)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Archivo">{data.archivo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Notas" span={1}>
                <span style={{ whiteSpace: 'pre-wrap' }}>{data.notas || '-'}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="resumen"
            type="card"
            onChange={(key) => {
              if (key === 'resumen') {
                cargarResumenGeneral();
              } else if (key === 'movimientos' || key === 'sinconciliar') {
                if (!movimientosCargados) cargarMovimientosDetalle();
              } else if (key === 'transacciones') {
                if (!transaccionesCargadas) cargarTransaccionesDetalle();
              } else if (key === 'transito') {
                cargarEnTransito();
              }
            }}
            items={[
            {
              key: 'resumen',
              label: 'Resumen General',
              children: resumenGeneral ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
{/* Sección Libro del Mayor */}
                   <Card className="paces-card" size="small" title={
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span>Libro del Mayor</span>
                       <Button
                         icon={<DownloadOutlined />}
                         size="small"
                         onClick={handleExportarLibros}
                         loading={exportandoLibros}
                       >
                         Exportar
                       </Button>
                     </div>
                   }>
                     <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
                       <Descriptions.Item label="Balance inicial en libros">
                         <Text strong>{formatCurrency(resumenGeneral.balanceInicialLibros)}</Text>
                       </Descriptions.Item>
                       <Descriptions.Item label="Período">
                         {data.fechaAnt ? `${formatDate(data.fechaAnt)} → ${formatDate(data.fecha)}` : '-'}
                       </Descriptions.Item>
                     </Descriptions>

                     {/* Tabla resumen por tipo doc */}
                     <Table
                       dataSource={resumenGeneral.resumenLibros}
                       columns={[
                         { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                           <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                         )},
                         { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                           render: (v: number) => formatNumber(v) },
                         { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                           render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                       ]}
                       rowKey="tipoDoc"
                       size="small"
                       pagination={false}
                       style={{ marginTop: 12 }}
                       locale={{ emptyText: 'No hay movimientos en el período' }}
                     />

                     <Divider style={{ margin: '12px 0' }} />
                     <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                       <span>Balance conciliado en libros:</span>
                       <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoLibros)}</span>
                     </div>
                   </Card>

                   {/* Sección Banco */}
                   <Card className="paces-card" size="small" title={
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span>Banco</span>
                       <Button
                         icon={<DownloadOutlined />}
                         size="small"
                         onClick={handleExportarTransito}
                         loading={exportandoTransito}
                       >
                         Exportar
                       </Button>
                     </div>
                   }>
                     <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                       <Descriptions.Item label="Balance según estado bancario">
                         <Text strong>{formatCurrency(resumenGeneral.balanceBancos)}</Text>
                       </Descriptions.Item>
                     </Descriptions>

                     {/* Tabla tránsito */}
                     <Table
                       dataSource={resumenGeneral.resumenTransito}
                       columns={[
                         { title: 'Tipo de Documento', key: 'tipo', render: (_: unknown, r: ResumenTipoDocumentoDTO) => (
                           <Text>{r.nombreTipoDoc || r.tipoDoc}</Text>
                         )},
                         { title: 'Cantidad', dataIndex: 'cantidad', align: 'right' as const, width: 120,
                           render: (v: number) => formatNumber(v) },
                         { title: 'Monto', dataIndex: 'montoTotal', align: 'right' as const, width: 160,
                           render: (v: number) => <Text strong>{formatCurrency(v)}</Text> },
                       ]}
                       rowKey="tipoDoc"
                       size="small"
                       pagination={false}
                       style={{ marginTop: 12 }}
                       locale={{ emptyText: 'No hay documentos en tránsito' }}
                     />

                     <Divider style={{ margin: '12px 0' }} />
                     <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, fontSize: 16, fontWeight: 700 }}>
                       <span>Balance conciliado banco + tránsito:</span>
                       <span style={{ color: 'var(--paces-primary)' }}>{formatCurrency(resumenGeneral.balanceConciliadoBanco)}</span>
                     </div>
                   </Card>

                  {/* Diferencia */}
                  <Card className="paces-card" size="small"
                    style={{ borderLeft: `4px solid ${resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 18, fontWeight: 700 }}>
                      <span>Diferencia</span>
                      <span style={{ color: resumenGeneral.diferencia === 0 ? '#34c38f' : '#ff4d4f' }}>
                        {formatCurrency(resumenGeneral.diferencia)}
                      </span>
                    </div>
                  </Card>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin />
                  <div style={{ marginTop: 8 }} className="paces-text-secondary">Cargando resumen...</div>
                </div>
              ),
            },
            {
            key: 'movimientos',
            label: `Movimientos Bancarios (${movimientosDetalle.length})`,
            children: (
            <>
            <Input.Search
              placeholder="Buscar en movimientos..."
              allowClear
              onSearch={(v) => setSearchMov(v)}
              onChange={(e) => { if (!e.target.value) setSearchMov(''); }}
              style={{ width: 300, marginBottom: 12 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
              />
                <Table
                    dataSource={(() => {
                      const items = movimientosDetalle;
                    if (!searchMov) return items;
                    const q = searchMov.toLowerCase();
                    return items.filter((m) =>
                    (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                  (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                  (m.documento && m.documento.toLowerCase().includes(q))
                );
              })()}
              columns={movimientoColumns}
              rowKey="orden"
              size="small"
                pagination={{ pageSize: 50, showSizeChanger: true }}
                  scroll={{ x: 800 }}
                    locale={{ emptyText: 'No hay movimientos bancarios importados' }}
                    />
                    </>
              ),
              },
            {
              key: 'sinconciliar',
              label: `Importados sin conciliar (${movimientosDetalle.filter((m) => !m.cotejado).length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en sin conciliar..."
                    allowClear
                    onSearch={(v) => setSearchSinConcil(v)}
                    onChange={(e) => { if (!e.target.value) setSearchSinConcil(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = movimientosDetalle.filter((m) => !m.cotejado);
                      if (!searchSinConcil) return items;
                      const q = searchSinConcil.toLowerCase();
                      return items.filter((m) =>
                        (m.concepto && m.concepto.toLowerCase().includes(q)) ||
                        (m.numRef && m.numRef.toLowerCase().includes(q)) ||
                        (m.documento && m.documento.toLowerCase().includes(q)) ||
                        (m.entidad && m.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={movimientoColumns}
                    rowKey="orden"
                    size="small"
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: 'No hay movimientos sin conciliar' }}
                  />
                </>
              ),
            },
            {
              key: 'transacciones',
              label: `Transacciones Conciliadas (${transaccionesDetalle.length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en documentos..."
                    allowClear
                    onSearch={(v) => setSearchTrans(v)}
                    onChange={(e) => { if (!e.target.value) setSearchTrans(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = transaccionesDetalle;
                      if (!searchTrans) return items;
                      const q = searchTrans.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} registros`, size: 'small' }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay transacciones conciliadas' }}
                  />
                </>
              ),
            },
            {
              key: 'transito',
              label: `Transacciones en Tránsito (${enTransito.length})`,
              children: (
                <>
                  <Input.Search
                    placeholder="Buscar en tránsito..."
                    allowClear
                    onSearch={(v) => setSearchTransito(v)}
                    onChange={(e) => { if (!e.target.value) setSearchTransito(''); }}
                    style={{ width: 300, marginBottom: 12 }}
                    prefix={<SearchOutlined className="paces-text-icon" />}
                  />
                  <Table
                    dataSource={(() => {
                      const items = enTransito;
                      if (!searchTransito) return items;
                      const q = searchTransito.toLowerCase();
                      return items.filter((t) =>
                        (t.tipoDoc && t.tipoDoc.toLowerCase().includes(q)) ||
                        (t.numDoc && t.numDoc.toLowerCase().includes(q)) ||
                        (t.entidad && t.entidad.toLowerCase().includes(q))
                      );
                    })()}
                    columns={transaccionColumns}
                    rowKey="transacId"
                    size="small"
                    loading={loadingTransito}
                    pagination={{ pageSize: 50, showSizeChanger: true }}
                    scroll={{ x: 700 }}
                    locale={{ emptyText: 'No hay documentos en tránsito' }}
                  />
                </>
              ),
            },
          ]}
        />

          {/* Totales en compacto */}
          <div style={{ marginTop: 24 }}>
            <Card className="paces-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(data.balBancos)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(data.balLibros)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="paces-card" style={{ marginTop: 16 }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Resumen</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total movimientos</span>
                  <span>{movimientosDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientosDetalle.filter((m) => m.cotejado).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Documentos conciliados</span>
                  <span>{transaccionesDetalle.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">En tránsito</span>
                  <span>{enTransito.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciliacionBancariaDetalle;
