import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Divider, Grid, Input, Typography, Tooltip, Modal, Alert, App
} from 'antd';
import {
  ArrowLeftOutlined,
  LockFilled,
  CloseCircleOutlined,
  FileTextOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import { useAplicar } from '../../hooks/useAplicar';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { documentoRelacionApi, type DocumentoRelacionDTO } from '../../api/documentoRelacionApi';
import TotalesCard from '../../components/TotalesCard';
import DocumentosRelacionadosCard from '../../components/DocumentosRelacionadosCard';
import { formatCurrency, formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

const TransferenciaAlmacenDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [detalleSearch, setDetalleSearch] = useState('');
  const [tieneScan, setTieneScan] = useState<boolean | null>(null);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerUrl, setScannerUrl] = useState<string | null>(null);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [documentosRelacionados, setDocumentosRelacionados] = useState<DocumentoRelacionDTO[]>([]);
  const operacion = useAplicar();
  const [operacionTitulo, setOperacionTitulo] = useState('');
  const screens = Grid.useBreakpoint();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    setActiveModule('FTRP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Verificar si tiene documento escaneado
        transferenciaAlmacenApi.verificarScan(sucursalActiva, parseInt(id))
          .then((scanRes) => setTieneScan(scanRes.existe))
          .catch(() => setTieneScan(false));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        messageApi.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setLoadingError(false);
    transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`${res.documento.codigo}-${res.noDocumento}`);
        // Cargar documentos relacionados desde DOCUMENTOS_RELACION
        documentoRelacionApi.obtenerPorTransaccion(parseInt(id))
          .then(rel => setDocumentosRelacionados(rel || []))
          .catch(() => setDocumentosRelacionados([]));
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        messageApi.error(msg);
        setLoadingError(true);
      })
  }, [id, sucursalActiva, setPageTitleOverride]);

  const handleVerScanner = async () => {
    if (!id) return;
    setScannerLoading(true);
    try {
      const blob = await transferenciaAlmacenApi.descargarScan(sucursalActiva, parseInt(id));
      const url = URL.createObjectURL(blob);
      setScannerUrl(url);
      setScannerModalOpen(true);
    } catch {
      messageApi.error('Error al cargar el archivo escaneado');
    } finally {
      setScannerLoading(false);
    }
  };

  // Cargar documentos relacionados desde DOCUMENTOS_RELACION
  useEffect(() => {
    if (!data?.id) return;
    documentoRelacionApi.obtenerPorTransaccion(data.id)
      .then(rel => setDocumentosRelacionados(rel || []))
      .catch(() => {
        setDocumentosRelacionados([]);
        messageApi.warning('No se pudieron cargar los documentos relacionados');
      });
  }, [data?.id]);

  if (loading || (!data && !loadingError)) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }
  if (loadingError && !data) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
        <div style={{ marginTop: 16, fontSize: 16, color: '#ff4d4f' }}>
          Error al cargar el documento
        </div>
        <div style={{ marginTop: 8 }} className="paces-text-secondary">
          Verifique que el documento exista en la sucursal seleccionada.
        </div>
        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          style={{ marginTop: 24 }}
          onClick={() => navigate('/FTRP')}
        >
          Volver al listado
        </Button>
      </div>
    );
  }

  const isLarge = screens.lg ?? true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  // ===== Detalles filtrados por búsqueda =====
  const detallesFiltrados = detalleSearch
    ? (data?.detalles || []).filter((d: any) => {
        const q = detalleSearch.toLowerCase();
        return (
          (d.codigo || '').toLowerCase().includes(q) ||
          (d.articulo || '').toLowerCase().includes(q) ||
          (d.referencia || '').toLowerCase().includes(q)
        );
      })
    : (data?.detalles || []);

  const detalleColumns = [
    {
      title: 'Artículo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { paddingLeft: 16 } }),
      onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
      render: (_: any, record: any) => (
        <div style={{ fontSize: 13 }}>
          <div>{toTitleCase(record.articulo || '')}</div>
          <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {record.codigo && <span>{record.codigo}</span>}
              {record.codigo && record.referencia && <span>{' | '}</span>}
              {record.referencia && <span>{record.referencia}</span>}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <div>
          <div>{formatNumber(record.cantidad || 0)}</div>
          {record.medida?.nombre && (
            <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.5, textAlign: 'right' }}>
              {record.medida.nombre}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, record: any) => (
        <div>
          <Text strong>{formatNumber(record.total || 0)}</Text>
          <div style={{ fontSize: 11, lineHeight: 1.5 }}>&nbsp;</div>
        </div>
      ),
    },
  ];

  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleAplicar = () => {
    if (!id) return;
    // TRP - transferencia no requiere scanner check
    setOperacionTitulo(`Aplicando TRP-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/TRP/${sucursalActiva}/aplicar/${id}`,
      handleRefresh
    );
  };

  const handleDesaplicar = async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const origen = data.codigoSucursal || String(sucursalActiva);
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await transferenciaAlmacenApi.desaplicar(sucursalActiva, documento);
      messageApi.success('Documento desaplicado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await transferenciaAlmacenApi.anular(sucursalActiva, data as any);
      messageApi.success('Documento anulado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePostear = () => {
    if (!data) return;
    setOperacionTitulo(`Posteando TRP-${data?.noDocumento || id}`);
    operacion.ejecutar(
      `/TRP/${sucursalActiva}/postear`,
      handleRefresh,
      data
    );
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await transferenciaAlmacenApi.revisado(sucursalActiva, parseInt(id));
      messageApi.success('Documento marcado como revisado');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await transferenciaAlmacenApi.reversar(sucursalActiva, parseInt(id));
      messageApi.success('Documento reversado exitosamente');
      const res = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      messageApi.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Datos Generales card (compartido desktop/mobile) =====
  const renderDatosGenerales = (columnCount: number) => (
    <Card className="paces-card" size="small" title={
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
        <Space>
          {esCerrado && (
            <Tooltip title="Período contable cerrado">
              <LockFilled style={{ fontSize: 14, color: '#595959' }} />
            </Tooltip>
          )}
          <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
          {tieneScan === true && (
            <Tooltip title="Ver documento escaneado">
              <Tag
                icon={<FileTextOutlined />}
                color="success"
                style={{ cursor: 'pointer' }}
                onClick={handleVerScanner}
              />
            </Tooltip>
          )}
          {tieneScan === false && <Tag icon={<FileSearchOutlined />} color="warning" />}
        </Space>
      </div>
    } style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={columnCount} styles={{ content: { background: 'transparent' } }}>
        <Descriptions.Item label="Concepto:">
          {data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="NCF:">
          {data.ncf || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Doc.:">
          {formatDate(data.fechaDocumento)}
        </Descriptions.Item>
        <Descriptions.Item label="Almacén Origen:">
          {data.almacen?.nombre ? toTitleCase(data.almacen.nombre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Almacén Destino:" span={columnCount === 3 ? 2 : 1}>
          {data.almacenDestino?.nombre ? toTitleCase(data.almacenDestino.nombre) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Referencia:">
          {data.referencia || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Nota:" span={columnCount === 3 ? 3 : 1}>
          <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  // ===== Tabs (compartido desktop/mobile) =====
  const renderTabs = () => (
    <Tabs
      defaultActiveKey="detalles"
      type="card"
      items={[
        {
          key: 'detalles',
          label: `Detalles (${detallesFiltrados.length}${detalleSearch ? `/${data.detalles?.length || 0}` : ''})`,
          children: (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <Input.Search
                  placeholder="Buscar detalle..."
                  allowClear
                  style={{ maxWidth: 250 }}
                  onSearch={(value) => setDetalleSearch(value)}
                  onChange={(e) => { if (!e.target.value) setDetalleSearch(''); }}
                />
              </div>
              <Table dataSource={detallesFiltrados} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 600 }} />
            </>
          ),
        },
        {
          key: 'asientos',
          label: `Asientos (${data.asientos?.length || 0})`,
          children: (
            <AsientosContableTable asientos={data.asientos || []} scroll={{ x: 600 }} rowKey={(r: any) => r.id || r.asientoID} />
          ),
        },
        {
          key: 'historial',
          label: `Historial (${data.logs?.length || 0})`,
          children: (
            <LogTable dataSource={data.logs || []} scroll={{ x: 900 }} />
          ),
        },
      ]}
    />
  );

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar detalle de transferencia de almacén"
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

      <DetalleToolbar
        modulo="FTRP"
        estado={data.estado}
        periodo={data.periodo}
        revisado={data.revisado}
        saving={saving}
        imprimiendo={imprimiendo}
        operacionLoading={operacion?.loading}
        onVolver={() => navigate('/FTRP')}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const sucursalParam = data.codigoSucursal
              ? obtenerNombreEnumSucursal(data.codigoSucursal)
              : sucursalActiva;
            const res = await apiClient.post('/reportes/inventario/transferencia', data, {
              responseType: 'blob',
            });
            const blobUrl = URL.createObjectURL(res.data);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            setTimeout(() => {
              iframe.contentWindow?.print();
              setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(blobUrl);
              }, 30000);
            }, 2000);
          } catch {
            messageApi.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/FTRP/${id}/editar`)}
        onAplicar={handleAplicar}
        onAnular={handleAnular}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onDesaplicar={handleDesaplicar}
        onReversar={handleReversar}
      />

      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ lg) === */
        <Row gutter={16}>
          <Col lg={18}>
            {renderDatosGenerales(3)}
            {renderTabs()}
          </Col>

          <Col lg={6}>
            <TotalesCard subTotal={data.subTotal || 0} descuento={0} impuestos={0} total={data.total} nota={data.nota} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
            <DocumentosRelacionadosCard
              documentos={documentosRelacionados}
              currentId={data?.id}
            />
          </Col>
        </Row>
      ) : (
        /* === MOBILE LAYOUT (< lg) === */
        <div>
          {renderDatosGenerales(1)}
          {renderTabs()}
          <TotalesCard subTotal={data.subTotal || 0} descuento={0} impuestos={0} total={data.total} nota={data.nota} alignRight={true}
            monedaSimbolo={data.moneda?.simbolo || 'RD$'}
            monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
            tasa={data.tasa ?? 1}
          />
          <DocumentosRelacionadosCard
            documentos={documentosRelacionados}
            currentId={data?.id}
          />
        </div>
      )}

      {/* Modal de Visor de Scanner */}
      <Modal
        title="Documento Escaneado"
        open={scannerModalOpen}
        onCancel={() => { setScannerModalOpen(false); if (scannerUrl) URL.revokeObjectURL(scannerUrl); setScannerUrl(null); }}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        destroyOnHidden
      >
        {scannerLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : scannerUrl ? (
          <iframe src={scannerUrl} style={{ width: '100%', height: '70vh', border: 'none' }} title="Scanner" />
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        )}
      </Modal>

      {/* Modal de Progreso para Aplicar/Postear */}
      <ModalProgreso
        open={operacion.loading || !!operacion.completado}
        titulo={operacionTitulo}
        eventos={operacion.eventos}
        completado={operacion.completado}
        onClose={() => operacion.reset()}
      />
    </div>
  );
};

export default TransferenciaAlmacenDetalle;
