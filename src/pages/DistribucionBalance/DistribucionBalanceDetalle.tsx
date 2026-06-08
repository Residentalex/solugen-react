import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Table, Tabs, Tag, Spin, Button, Space, Row, Col, Grid, message, Input, Tooltip, Typography, Empty
} from 'antd';
import {
  ArrowLeftOutlined, LockFilled, ReloadOutlined
} from '@ant-design/icons';
import DetalleToolbar from '../../components/DetalleToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { distribucionBalanceApi } from '../../api/distribucionBalanceApi';
import { transaccionApi } from '../../api/transaccionApi';
import { obtenerNombreEnumSucursal } from '../../utils/sucursalEnumMapper';
import LogTable from '../../components/LogTable';
import AsientosContableTable from '../../components/AsientosContableTable';
import DocumentosBalanceCard from '../../components/DocumentosBalanceCard';
import EntidadCard from '../../components/EntidadCard';
import TotalesCard from '../../components/TotalesCard';
import ModalDesaplicar from '../../components/ModalDesaplicar/ModalDesaplicar';
import ModalAnular from '../../components/ModalAnular/ModalAnular';
import { ModalProgreso } from '../../components/ModalProgreso/ModalProgreso';
import { formatNumber, toTitleCase, formatDate } from '../../utils/formats';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

interface DistribucionBalanceDetalleProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const DistribucionBalanceDetalle: React.FC<DistribucionBalanceDetalleProps> = ({ tipoEntidad }) => {
  const { Text } = Typography;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const [data, setData] = useState<any>(null);
  const [asociadas, setAsociadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [debitosSearch, setDebitosSearch] = useState('');
  const [creditosSearch, setCreditosSearch] = useState('');
  const [modalDesaplicarOpen, setModalDesaplicarOpen] = useState(false);
  const [modalAnularOpen, setModalAnularOpen] = useState(false);
  const screens = Grid.useBreakpoint();

  const codigoPantalla = tipoEntidad === 'SUP' ? 'FDBASUP' : 'FDBACLI';

  useEffect(() => {
    setActiveModule(codigoPantalla);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, codigoPantalla]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          const msg = 'Documento no encontrado en la sucursal seleccionada.';
          setError(msg);
          message.error(msg);
          return;
        }
        setData(res);
        const data = res as any;
        setPageTitleOverride(`${data.documento.codigo}-${data.noDocumento}`);

        // Cargar transacciones asociadas (débitos/créditos)
        transaccionApi.obtenerAsociadas(sucursalActiva, parseInt(id), 'Debito', true)
          .then((asoc) => setAsociadas(asoc || []))
          .catch(() => setAsociadas([]));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || err?.response?.data?.ErrorMessage || 'Error al cargar el documento';
        setError(msg);
        message.error(msg);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  const debitos = (asociadas || []).filter(
    (t: any) => t.origenCuenta === 0
  );
  const creditos = (asociadas || []).filter(
    (t: any) => t.origenCuenta === 1
  );

  const debitosFiltrados = useMemo(() => {
    if (!debitosSearch) return debitos;
    const q = debitosSearch.toLowerCase();
    return debitos.filter((d: any) =>
      (d.documento || '').toLowerCase().includes(q) ||
      (d.nCF || '').toLowerCase().includes(q)
    );
  }, [debitos, debitosSearch]);

  const creditosFiltrados = useMemo(() => {
    if (!creditosSearch) return creditos;
    const q = creditosSearch.toLowerCase();
    return creditos.filter((d: any) =>
      (d.documento || '').toLowerCase().includes(q) ||
      (d.nCF || '').toLowerCase().includes(q)
    );
  }, [creditos, creditosSearch]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando documento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <div style={{ fontSize: 18, color: '#ff4d4f', marginBottom: 16 }}>Error</div>
        <div style={{ marginBottom: 24 }} className="paces-text-secondary">{error}</div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/${codigoPantalla}`)}>
          Volver
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const isLarge = screens.xxl === true;
  const estadoInfo = ESTADO_DOCUMENTO_MAP[data.estado] || { label: 'Desconocido', color: 'default' };
  const esCerrado = data.periodo === 6;

  // ===== Columnas para Débitos y Créditos =====
  const asociadasColumnsDebito = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 100, render: (v: string) => formatDate(v) },
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'nCF', key: 'nCF', width: 140, render: (v: string) => v || '—' },
    { title: 'Monto Original', dataIndex: 'montoOriginal', key: 'montoOriginal', width: 130, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Pagado', dataIndex: 'pagado', key: 'pagado', width: 110, align: 'right' as const, render: (v: number) => formatNumber(v) },
    { title: 'Saldo Pendiente', dataIndex: 'saldoPendiente', key: 'saldoPendiente', width: 120, align: 'right' as const, render: (v: number) => <Text strong style={{ color: v > 0 ? '#faad14' : undefined }}>{formatNumber(v)}</Text> },
    { title: 'Retención', dataIndex: 'retencion', key: 'retencion', width: 110, align: 'right' as const, responsive: ['md' as const], render: (v: number) => formatNumber(v || 0) },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', width: 120, align: 'right' as const, render: (v: number) => <Text strong style={{ color: '#556ee6' }}>{formatNumber(v)}</Text> },
  ];

  const asociadasColumnsCredito = asociadasColumnsDebito.map(col =>
    col.key === 'monto'
      ? { ...col, render: (v: number) => <Text strong style={{ color: '#34c38f' }}>{formatNumber(v)}</Text> }
      : col
  );

  // asientoColumns reemplazado por AsientosContableTable compartido

  // ===== Handlers de acciones de estado =====
  const handleAplicar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await distribucionBalanceApi.aplicar(sucursalActiva, parseInt(id));
      message.success('Documento aplicado exitosamente');
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAnularConfirm = async (dataAnular: { fecha: string; motivo: string }) => {
    if (!data || !id) return;
    try {
      const payload = { ...(data as any), motivo: dataAnular.motivo, fechaAnulacion: dataAnular.fecha };
      await distribucionBalanceApi.anular(sucursalActiva, payload);
      message.success('Documento anulado exitosamente');
      setModalAnularOpen(false);
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al anular');
      message.error(msg);
      throw err;
    }
  };

  const handleDesaplicarConfirm = async (motivo: string) => {
    if (!id || !data) return;
    try {
      const origen = obtenerNombreEnumSucursal(data.codigoSucursal || String(sucursalActiva));
      const documento = `${data.documento.codigo}-${data.noDocumento}`;
      await distribucionBalanceApi.desaplicar(sucursalActiva, documento);
      message.success('Documento desaplicado exitosamente');
      setModalDesaplicarOpen(false);
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al desaplicar');
      message.error(msg);
      throw err;
    }
  };

  const handlePostear = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await distribucionBalanceApi.postear(sucursalActiva, data as any);
      message.success('Documento posteado exitosamente');
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id!));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al postear');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRecalcular = async () => {
    if (!id) return;
    setRecalculando(true);
    try {
      await distribucionBalanceApi.recalcular(sucursalActiva, parseInt(id));
      message.success('Documento recalculado correctamente');
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al recalcular');
      message.error(msg);
    } finally {
      setRecalculando(false);
    }
  };

  const handleRevisado = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await distribucionBalanceApi.revisado(sucursalActiva, parseInt(id));
      message.success('Documento marcado como revisado');
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al marcar revisado');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReversar = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await distribucionBalanceApi.reversar(sucursalActiva, parseInt(id));
      message.success('Documento reversado exitosamente');
      const res = await distribucionBalanceApi.obtenerPorId(sucursalActiva, parseInt(id));
      setData(res);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al reversar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div>
      <DetalleToolbar
        modulo={codigoPantalla}
        estado={data.estado}
        periodo={data.periodo}
        saving={saving}
        imprimiendo={imprimiendo}
        onVolver={() => navigate(`/${codigoPantalla}`)}
        onImprimir={async () => {
          setImprimiendo(true);
          try {
            const res = await apiClient.get(`/reportes/contabilidad/distribucionBalance/${data.codigoSucursal ? obtenerNombreEnumSucursal(data.codigoSucursal) : sucursalActiva}/${id}`, {
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
            message.error('Error al generar el PDF');
          } finally {
            setImprimiendo(false);
          }
        }}
        onEditar={() => navigate(`/${codigoPantalla}/${id}/editar`)}
        onAplicar={handleAplicar}
        onDesaplicar={async () => setModalDesaplicarOpen(true)}
        onAnular={async () => setModalAnularOpen(true)}
        onPostear={handlePostear}
        onRevisado={handleRevisado}
        onReversar={handleReversar}
        confirmActions={false}
        extraButtons={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRecalcular}
            loading={recalculando}
          >
            Recalcular
          </Button>
        }
      />

      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={3} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            <Tabs
              defaultActiveKey="documentos"
              type="card"
              items={[
                {
                  key: 'documentos',
                  label: `Documentos (${debitos.length + creditos.length})`,
                  children: (
                    <DocumentosBalanceCard
                      debitos={debitos}
                      creditos={creditos}
                    />
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
          </Col>

          <Col xxl={6}>
            <EntidadCard entidad={data.entidad} titulo={tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente'} />
            {data.beneficiario && (
              <EntidadCard entidad={data.beneficiario} titulo="Beneficiario" />
            )}
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} alignRight={false}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
          </Col>
        </Row>
      ) : (
        <div>
          <Card className="paces-card" size="small" title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Datos Generales
                  </span>
                  <Space>
                    {esCerrado && (
  <Tooltip title="Período contable cerrado">
    <LockFilled style={{ marginLeft: 4, fontSize: 14, color: '#595959' }} />
  </Tooltip>
)}
                    <Tag color={estadoInfo.color}>{estadoInfo.label}</Tag>
                  </Space>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions bordered size="small" column={1} styles={{ content: { background: 'transparent' } }}>
                <Descriptions.Item label="Documento">{data.noDocumento || '-'}</Descriptions.Item>
                <Descriptions.Item label="Fecha">{formatDate(data.fechaDocumento)}</Descriptions.Item>
                <Descriptions.Item label="Concepto">{data.concepto?.nombre ? toTitleCase(data.concepto.nombre) : '-'}</Descriptions.Item>
                <Descriptions.Item label="NCF">{data.ncf || '-'}</Descriptions.Item>
                <Descriptions.Item label="Referencia">{data.referencia || '-'}</Descriptions.Item>

                <Descriptions.Item label="Tasa">{data.tasa ? formatNumber(data.tasa) : '-'}</Descriptions.Item>
              </Descriptions>
          </Card>

          <Tabs
            defaultActiveKey="documentos"
            type="card"
            items={[
              {
                key: 'documentos',
                label: `Documentos (${debitos.length + creditos.length})`,
                children: (
                  <DocumentosBalanceCard
                    debitos={debitos}
                    creditos={creditos}
                  />
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

          <div style={{ marginTop: 16 }}>
            <TotalesCard subTotal={data.subTotal} descuento={data.descuento} impuestos={data.impuestos} retenciones={data.retenciones} total={data.total} alignRight={true}
              monedaSimbolo={data.moneda?.simbolo || 'RD$'}
              monedaNombre={data.moneda?.nombre || 'Peso Dominicano'}
              tasa={data.tasa ?? 1}
            />
          </div>
        </div>
      )}

      <ModalDesaplicar
        open={modalDesaplicarOpen}
        onClose={() => setModalDesaplicarOpen(false)}
        onConfirm={handleDesaplicarConfirm}
        tituloDocumento={`${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || id}`}
      />

      <ModalAnular
        open={modalAnularOpen}
        onClose={() => setModalAnularOpen(false)}
        onConfirm={handleAnularConfirm}
        documento={`${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || ''}`}
        fechaDocumento={data?.fechaDocumento || ''}
        periodoCerrado={data?.periodo === 6}
      />

      {/* Modal de Progreso para operaciones de estado */}
      <ModalProgreso
        open={saving}
        titulo={`${data?.documento?.codigo || 'DBA'}-${data?.noDocumento || id}`}
        eventos={[]}
        completado={saving ? null : { exito: true }}
        onClose={() => {}}
      />
    </div>
  );
};

export default DistribucionBalanceDetalle;
