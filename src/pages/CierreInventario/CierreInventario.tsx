import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Switch, Button, Tag, message,
  Spin, Alert, Table, Modal, Divider,
} from 'antd';
import {
  ReloadOutlined, LockOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, CloseCircleOutlined,
  CalendarOutlined, SafetyOutlined, ShoppingCartOutlined,
  SearchOutlined, DollarOutlined, EyeOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import PermissionGate from '../../components/PermissionGate';
import { cierreInventarioApi } from '../../api/cierreInventarioApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CierreReaperturaModal from './CierreReaperturaModal';
import ExistenciasNegativasModal from './ExistenciasNegativasModal';

const { Text } = Typography;

// ===== Constantes =====
const SUCURSAL_VALUE_MAP: Record<number, string> = {
  0: 'Orense Plaza',
  1: 'Hiper Romana',
  2: 'O. Villa Hermosa',
  3: 'El Ofertazo',
};

// ===== Helpers =====
function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

function proximoUltimoDiaDelMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 2, 0);
}

function calcularCierresRestantes(fechaCierreStr: string): number {
  if (!fechaCierreStr) return 0;
  try {
    const fechaCierre = new Date(fechaCierreStr);
    if (isNaN(fechaCierre.getTime())) return 0;
    const hoy = new Date();
    const diffMs = hoy.getTime() - fechaCierre.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.floor((diffDays / 365.25) * 12));
  } catch {
    return 0;
  }
}

// ===== Interfaz de validación =====
interface ValidacionItem {
  key: string;
  label: string;
  estado: 'success' | 'error' | 'pending' | 'skipped';
  count?: number;
  mensaje?: string;
  datosDetalle?: any[];
}

// ===== Componente principal =====
const CierreInventario: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursal = useAuthStore((s: any) => s.sucursalActiva);
  const codigoUsuario = useAuthStore((s: any) => s.usuario?.nombreUsuario ?? '');

  // ===== Estados =====
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [cierres, setCierres] = useState<any[]>([]);
  const [validar, setValidar] = useState(true);
  const [validaciones, setValidaciones] = useState<ValidacionItem[]>([]);
  const [reaperturaModalOpen, setReaperturaModalOpen] = useState(false);
  const [cierreCompletado, setCierreCompletado] = useState(false);
  const [existenciasModalOpen, setExistenciasModalOpen] = useState(false);
  const [existenciasNegativasData, setExistenciasNegativasData] = useState<any[]>([]);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [etapaActual, setEtapaActual] = useState<'validacion' | 'incidencias' | 'confirmacion' | 'resultado'>('validacion');
  const [negativasDetectadas, setNegativasDetectadas] = useState(0);

  // ===== Valores derivados =====
  const cierresRestantes = calcularCierresRestantes(fechaCierre);
  const fechaCierreDate = fechaCierre ? new Date(fechaCierre) : null;
  const proximoCierre = fechaCierreDate ? proximoUltimoDiaDelMes(fechaCierreDate) : null;
  const proximoCierreStr = proximoCierre ? formatDateDisplay(proximoCierre.toISOString()) : '—';
  const hayCierresPendientes = cierresRestantes > 0;

  // ===== Cargar datos =====
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setCierreCompletado(false);
    try {
      const [fecha, cierresData] = await Promise.all([
        cierreInventarioApi.obtenerFechaCierre(sucursal),
        cierreInventarioApi.obtenerCierres(sucursal),
      ]);
      setFechaCierre(fecha);
      setCierres(cierresData);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos de cierre');
    } finally {
      setLoading(false);
    }
  }, [sucursal]);

  useEffect(() => {
    setActiveModule('OCierreINV');
    setPageTitleOverride('Cierre de Inventario');
    cargarDatos();
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, cargarDatos]);

  // ===== Generar Cierre =====
  const handleGenerarCierre = async () => {
    if (!proximoCierre) {
      message.warning('No hay fecha de cierre disponible');
      return;
    }

    if (negativasDetectadas > 0) {
      message.error('Existen existencias negativas. Corrija antes de continuar.');
      return;
    }

    setConfirmModalOpen(true);
    setEtapaActual('confirmacion');
  };

  const confirmarCierre = async () => {
    if (!proximoCierre) {
      message.warning('No hay fecha de cierre disponible');
      setConfirmModalOpen(false);
      return;
    }

    setConfirmModalOpen(false);
    setGenerando(true);
    setCierreCompletado(false);
    setEtapaActual('validacion');

    const vitems: ValidacionItem[] = [
      { key: 'sinSolucion', label: 'Productos sin solución', estado: 'pending' },
      { key: 'sinFamilia', label: 'Productos sin familia', estado: 'pending' },
      { key: 'sinClasificacion', label: 'Productos sin clasificación', estado: 'pending' },
      { key: 'sinAlmacen', label: 'Movimientos sin almacén', estado: 'pending' },
      { key: 'costosSinIntegridad', label: 'Costos sin integridad', estado: 'pending' },
      { key: 'existenciasNegativas', label: 'Productos con existencia negativa', estado: 'pending' },
    ];

    if (!validar) {
      vitems.forEach((v) => { v.estado = 'skipped'; v.mensaje = 'Validación desactivada'; });
    }
    setValidaciones(vitems);
    setCierreCompletado(false);

    try {
      if (validar) {
        let validationFailed = false;
        try {
          const negativas = await cierreInventarioApi.obtenerExistenciasNegativas(sucursal);
          if (negativas.length > 0) {
            setExistenciasNegativasData(negativas);
            setNegativasDetectadas(negativas.length);
            setValidaciones((prev) =>
              prev.map((v) =>
                v.key === 'existenciasNegativas'
                  ? {
                      ...v,
                      estado: 'error' as const,
                      mensaje: `${negativas.length} producto(s)`,
                      count: negativas.length,
                      datosDetalle: negativas,
                    }
                  : { ...v, estado: 'success' as const, mensaje: 'OK' }
              )
            );
            validationFailed = true;
            setEtapaActual('incidencias');
          } else {
            setNegativasDetectadas(0);
            setValidaciones((prev) =>
              prev.map((v) => ({ ...v, estado: 'success' as const, mensaje: 'OK' }))
            );
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'Error al validar';
          setValidaciones((prev) =>
            prev.map((v) =>
              v.key === 'existenciasNegativas'
                ? { ...v, estado: 'error' as const, mensaje: errorMsg }
                : { ...v, estado: 'success' as const, mensaje: 'OK' }
            )
          );
          validationFailed = true;
        }

        if (validationFailed) {
          message.error('Corrija los errores de validación antes de generar el cierre.');
          setGenerando(false);
          setEtapaActual('incidencias');
          return;
        }
      }

      setEtapaActual('confirmacion');
      const fechaFormatted = formatDateISO(proximoCierre);
      const resultado = await cierreInventarioApi.generarCierre(sucursal, fechaFormatted);

      message.success(`Cierre generado exitosamente al ${formatDateDisplay(proximoCierre.toISOString())}`);
      await cargarDatos();
      setCierreCompletado(true);
      setEtapaActual('resultado');
    } catch (err: any) {
      const errorMsg = err?.response?.data?.errorMessage || 'Error al generar cierre';
      message.error(errorMsg);
      if (validar) {
        setValidaciones((prev) =>
          prev.map((v) => ({
            ...v,
            estado: v.estado === 'pending' ? 'error' as const : v.estado,
            mensaje: v.estado === 'pending' ? 'Error en el proceso' : v.mensaje,
          }))
        );
      }
      setEtapaActual('resultado');
    } finally {
      setGenerando(false);
    }
  };

  // ===== Detalle =====
  const handleOpenDetalle = (cierre: any) => {
    navigate(`/OCierreINV/detalle/${cierre.cierreId}`);
  };

  // ===== Reaperturar =====
  const handleReaperturaSuccess = () => {
    setReaperturaModalOpen(false);
    cargarDatos();
  };

  // ===== Exportar Excel =====
  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursal);
    const exportColumns = [
      { title: 'Fecha de cierre', dataIndex: 'fechaCierre' },
      { title: 'Fecha realizado', dataIndex: 'fechaRealizado' },
      { title: 'Cantidad total', dataIndex: 'cantidad' },
      { title: 'Costo total', dataIndex: 'total' },
    ];
    const columnHeaders = exportColumns.map((col) => col.title);
    const dataRows = cierres.map((item: any) =>
      exportColumns.map((col) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `CierreInventario_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'CierreInventario',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  // ===== Render helpers =====
  const renderValidationIcon = (estado: ValidacionItem['estado']) => {
    switch (estado) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#34c38f' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#f46a6a' }} />;
      case 'pending':
        return <Spin size="small" />;
      case 'skipped':
        return <ExclamationCircleOutlined style={{ color: '#f1b44c' }} />;
    }
  };

  const etapas = [
    { key: 'validacion', label: 'Validación' },
    { key: 'incidencias', label: 'Incidencias' },
    { key: 'confirmacion', label: 'Confirmación' },
    { key: 'resultado', label: 'Resultado' },
  ];

  const renderValidationPanel = () => {
    if (validaciones.length === 0 && etapaActual === 'resultado' && !cierreCompletado) return null;

    const hasVisible = validaciones.some((v) => v.estado !== 'skipped');
    if (!hasVisible && !generando && etapaActual === 'validacion') return null;

    return (
      <Card
        className="paces-card"
        size="small"
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {generando ? 'Verificando integridad...' : `Etapa: ${etapas.find((e) => e.key === etapaActual)?.label}`}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {etapas.map((e) => (
                <Tag
                  key={e.key}
                  color={
                    etapaActual === e.key
                      ? 'blue'
                      : etapas.indexOf(e) < etapas.indexOf(etapas.find((et) => et.key === etapaActual) || etapas[0])
                      ? 'success'
                      : 'default'
                  }
                  style={{ borderRadius: 4, fontSize: 11, padding: '2px 6px', margin: 0 }}
                >
                  {e.label}
                </Tag>
              ))}
            </div>
          </div>
        }
        style={{ marginTop: 16, borderRadius: 8 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {validaciones.map((v) => (
            <div
              key={v.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                background:
                  v.estado === 'success' ? '#f0fff4' :
                  v.estado === 'error' ? '#fff5f5' :
                  v.estado === 'skipped' ? '#fffbf0' :
                  'transparent',
              }}
            >
              <span style={{ fontSize: 16 }}>{renderValidationIcon(v.estado)}</span>
              <Text style={{ flex: 1, fontSize: 13 }}>{v.label}</Text>
              {v.estado === 'success' && (
                <Tag color="success" style={{ margin: 0, borderRadius: 4 }}>OK</Tag>
              )}
              {v.estado === 'error' && v.mensaje && !v.datosDetalle && (
                <Text type="danger" style={{ fontSize: 12 }}>{v.mensaje}</Text>
              )}
              {v.estado === 'error' && v.datosDetalle && (
                <>
                  <Tag color="error" style={{ margin: 0, borderRadius: 4 }}>
                    {v.count ?? v.datosDetalle.length} producto{(v.count ?? v.datosDetalle.length) !== 1 ? 's' : ''}
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setExistenciasModalOpen(true)}
                    style={{ padding: '0 4px', fontSize: 12 }}
                  >
                    Ver detalle
                  </Button>
                </>
              )}
              {v.estado === 'skipped' && (
                <Tag color="warning" style={{ margin: 0, borderRadius: 4 }}>Omitido</Tag>
              )}
              {v.estado === 'pending' && (
                <Tag style={{ margin: 0, borderRadius: 4, borderColor: '#d9d9d9', color: '#999' }}>Verificando...</Tag>
              )}
            </div>
          ))}
        </div>
      </Card>
    );
  };

  // ===== Render =====
  return (
    <div>
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }} />
        <PermissionGate accion="EXPORTAR">
          <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
        </PermissionGate>
        <Button icon={<ReloadOutlined />} onClick={cargarDatos} loading={loading} />
      </div>

      <Spin spinning={loading && !generando}>
        <Row gutter={[16, 16]}>
          {/* Columna izquierda */}
          <Col xs={24} lg={18}>
            {/* Info cards */}
            {/* KPIs en una sola fila */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #eef1ff 0%, #f8f9ff 100%)',
                    borderRadius: 12,
                    padding: '20px 16px',
                    border: '1px solid #e8ecf4',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #556ee6, #364574)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      color: '#fff',
                      marginBottom: 12,
                    }}
                  >
                    <CalendarOutlined />
                  </div>
                    <Text strong style={{ fontSize: 20, display: 'block', color: '#556ee6', lineHeight: 1.2 }}>
                    {fechaCierre ? formatDateDisplay(fechaCierre) : '—'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Último Cierre
                  </Text>
                </div>
              </Col>
              <Col xs={6}>
                <div
                  style={{
                    background: cierresRestantes > 0
                      ? 'linear-gradient(135deg, #fff8e6 0%, #fffdf5 100%)'
                      : 'linear-gradient(135deg, #e8faf0 0%, #f5fffa 100%)',
                    borderRadius: 12,
                    padding: '20px 16px',
                    border: `1px solid ${cierresRestantes > 0 ? '#f1b44c' : '#34c38f'}`,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: cierresRestantes > 0
                        ? 'linear-gradient(135deg, #f1b44c, #d4922a)'
                        : 'linear-gradient(135deg, #34c38f, #219a6e)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      color: '#fff',
                      marginBottom: 12,
                    }}
                  >
                    <ShoppingCartOutlined />
                  </div>
                  <Text
                    strong
                    style={{
                      fontSize: 20,
                      display: 'block',
                      color: cierresRestantes > 0 ? '#f1b44c' : '#34c38f',
                      lineHeight: 1.2,
                    }}
                  >
                    {cierresRestantes}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                    Cierres Pendientes
                  </Text>
                </div>
              </Col>
              <Col xs={6}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #e8faf0 0%, #f5fffa 100%)',
                    borderRadius: 12,
                    padding: '16px 20px',
                    border: '1px solid #b7eb8f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #34c38f, #219a6e)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 24,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    <DollarOutlined />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      Total Último Cierre
                    </Text>
                    <Text
                      strong
                      style={{
                        fontSize: 18,
                        display: 'block',
                        color: '#219a6e',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cierres.length > 0 && cierres[0]?.total != null
                        ? `$${cierres[0].total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </Text>
                  </div>
                  {cierres.length > 0 && cierres[0]?.cierreId != null && (
                    <div
                      onClick={() => handleOpenDetalle(cierres[0])}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: '#e8faf0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        color: '#34c38f',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d9f7e6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#e8faf0';
                      }}
                      title="Ver detalle del último cierre"
                    >
                      <SearchOutlined />
                    </div>
                  )}
                </div>
              </Col>
            </Row>

            {/* Alertas posteriores al cierre */}
            {!hayCierresPendientes && fechaCierre && (
              <Alert
                message="No hay cierres pendientes. Todos los períodos están cerrados."
                type="info"
                showIcon
                style={{ marginTop: 12, borderRadius: 6 }}
              />
            )}

            {/* Panel de validaciones */}
            {renderValidationPanel()}

            {cierreCompletado && (
              <Alert
                message="Cierre generado exitosamente"
                type="success"
                showIcon
                style={{ marginTop: 12, borderRadius: 6 }}
              />
            )}
          </Col>

          {/* Columna derecha — Zona de riesgo */}
          <Col xs={24} lg={6}>
            {/* Toggle validar dentro de la zona de riesgo */}
            <Card
              className="paces-card"
              size="small"
              style={{
                marginBottom: 16,
                borderRadius: 8,
                borderLeft: `3px solid ${validar ? '#556ee6' : '#d9d9d9'}`,
                background: 'linear-gradient(135deg, #fff8f0 0%, #fff5f0 100%)',
                border: '2px solid #f1b44c',
                boxShadow: '0 2px 8px rgba(241, 180, 76, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: validar ? '#eef1ff' : '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    color: validar ? '#556ee6' : '#bfbfbf',
                  }}
                >
                  <SafetyOutlined />
                </div>
                <Text strong style={{ fontSize: 14, color: '#cf3b3b' }}>Validar documentos antes del cierre</Text>
                <Switch
                  checked={validar}
                  onChange={setValidar}
                  disabled={generando}
                  size="small"
                />
              </div>
            </Card>

            {/* Indicador bloqueante */}
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                border: `2px solid ${negativasDetectadas > 0 ? '#f46a6a' : '#34c38f'}`,
                background: negativasDetectadas > 0 ? '#fff5f5' : '#f0fff4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: negativasDetectadas > 0 ? 'linear-gradient(135deg, #f46a6a, #cf3b3b)' : 'linear-gradient(135deg, #34c38f, #219a6e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {negativasDetectadas > 0 ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                </div>
                <div>
                  <Text strong style={{ fontSize: 14, display: 'block', color: negativasDetectadas > 0 ? '#cf3b3b' : '#219a6e' }}>
                    Existencias negativas
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                    {negativasDetectadas > 0
                      ? `${negativasDetectadas} producto${negativasDetectadas !== 1 ? 's' : ''} con existencia negativa.`
                      : 'Sin incidencias.'}
                  </Text>
                </div>
              </div>
              {negativasDetectadas > 0 && (
                <Button
                  type="primary"
                  danger
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setExistenciasModalOpen(true);
                    if (existenciasNegativasData.length === 0) {
                      setEtapaActual('validacion');
                    }
                  }}
                >
                  Ver
                </Button>
              )}
            </div>

            {/* Zona de riesgo separada */}
            <div
              style={{
                padding: '16px 16px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #fff8f0 0%, #fff5f0 100%)',
                border: '2px solid #f1b44c',
                boxShadow: '0 2px 8px rgba(241, 180, 76, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <ExclamationCircleOutlined style={{ color: '#f46a6a', fontSize: 22 }} />
                <Text strong style={{ fontSize: 15, color: '#cf3b3b' }}>Zona de riesgo</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                Cerrar o reabrir inventario afecta los registros contables del período.
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PermissionGate accion="PROCESAR">
                  <Button
                    type="primary"
                    danger
                    block
                    icon={<LockOutlined />}
                    disabled={!hayCierresPendientes || generando || negativasDetectadas > 0}
                    onClick={() => setConfirmModalOpen(true)}
                    style={{
                      height: 44,
                      fontWeight: 600,
                      backgroundColor: negativasDetectadas > 0 ? '#ccc' : '#cf3b3b',
                      borderColor: negativasDetectadas > 0 ? '#ccc' : '#cf3b3b',
                      opacity: negativasDetectadas > 0 ? 0.5 : 1,
                      fontSize: 14,
                    }}
                  >
                    {negativasDetectadas > 0 ? 'Corregir negativas' : `Generar Cierre al ${proximoCierreStr}`}
                  </Button>
                </PermissionGate>
                <PermissionGate accion="PROCESAR">
                  <Button
                    block
                    style={{
                      borderColor: '#4a7db5',
                      color: '#4a7db5',
                      height: 40,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                    onClick={() => setReaperturaModalOpen(true)}
                    disabled={generando}
                  >
                    <LockOutlined /> Reaperturar
                  </Button>
                </PermissionGate>
              </div>
            </div>

            {!hayCierresPendientes && fechaCierre && (
              <Alert
                message="No hay cierres pendientes. Todos los períodos están cerrados."
                type="info"
                showIcon
                style={{ marginTop: 12, borderRadius: 6 }}
              />
            )}
          </Col>
        </Row>

        {/* Histórico de cierres */}
        <Card
          className="paces-card"
          size="small"
          title={<span style={{ fontSize: 13, fontWeight: 600 }}>Historial de Cierres</span>}
          style={{ marginTop: 16, borderRadius: 8 }}
        >
          {cierres.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: '24px 0' }}>
              No hay cierres registrados
            </Text>
          ) : (
            <Table
              dataSource={cierres}
              rowKey={(_, index) => index?.toString() ?? '0'}
              pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
              size="small"
              style={{ borderRadius: 6 }}
              columns={[
                {
                  title: 'Fecha de cierre',
                  dataIndex: 'fechaCierre',
                  key: 'fechaCierre',
                  render: (val: string) => formatDateDisplay(val),
                  width: 140,
                },
                {
                  title: 'Fecha realizado',
                  dataIndex: 'fechaRealizado',
                  key: 'fechaRealizado',
                  render: (val: string) => formatDateDisplay(val),
                  width: 140,
                },
                {
                  title: 'Cantidad total',
                  dataIndex: 'cantidad',
                  key: 'cantidad',
                  render: (val: number) =>
                    val != null ? val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
                  align: 'right',
                  width: 140,
                },
                {
                  title: 'Costo total',
                  dataIndex: 'total',
                  key: 'total',
                  render: (val: number) =>
                    val != null
                      ? `$${val.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—',
                  align: 'right',
                  width: 140,
                },
                {
                  title: 'Detalle',
                  key: 'detalle',
                  width: 70,
                  align: 'center' as const,
                  render: (_: any, record: any) => (
                    <div
                      onClick={() => handleOpenDetalle(record)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#556ee6',
                        transition: 'all 0.2s',
                        fontSize: 15,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eef1ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Ver detalle del cierre"
                    >
                      <SearchOutlined />
                    </div>
                  ),
                },

              ]}
            />
          )}
        </Card>
      </Spin>

      {/* Modal de Reapertura */}
      <CierreReaperturaModal
        open={reaperturaModalOpen}
        sucursal={sucursal}
        fechaCierreActual={fechaCierre}
        codigoUsuario={codigoUsuario}
        onClose={() => setReaperturaModalOpen(false)}
        onSuccess={handleReaperturaSuccess}
      />

      {/* Modal de confirmación de cierre */}
      <Modal
        open={confirmModalOpen}
        onCancel={() => setConfirmModalOpen(false)}
        footer={null}
        width={520}
        centered
        destroyOnHidden
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#cf3b3b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
              <LockOutlined />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>Confirmar Cierre de Inventario</span>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <Alert
            type="warning"
            showIcon
            message="Operación de alto impacto"
            description="Esta acción generará el cierre del período y afectará los registros contables. Verifique que las validaciones sean correctas."
            style={{ marginBottom: 16, borderRadius: 6 }}
          />
          <div style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>Resumen del período</Text>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }} type="secondary">Fecha de cierre:</Text>
              <Text strong style={{ fontSize: 14 }}>{proximoCierreStr}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }} type="secondary">Sucursal activa:</Text>
              <Text strong style={{ fontSize: 14 }}>{SUCURSAL_VALUE_MAP[sucursal] || '—'}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <Text style={{ fontSize: 14 }} type="secondary">Estado validación:</Text>
              <Tag color={negativasDetectadas === 0 ? 'success' : 'error'} style={{ borderRadius: 4 }}>
                {negativasDetectadas === 0 ? 'Sin incidencias' : `${negativasDetectadas} negativa(s)`}
              </Tag>
            </div>
          </div>
          <Text style={{ fontSize: 13, display: 'block', marginBottom: 12, color: '#666' }}>
            Una vez generado, el período quedará cerrado y solo podrá reabrirse mediante reapertura manual.
          </Text>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setConfirmModalOpen(false)}>Cancelar</Button>
            <Button type="primary" danger onClick={confirmarCierre} loading={generando}>
              Confirmar y ejecutar cierre
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de existencias negativas */}
      <ExistenciasNegativasModal
        open={existenciasModalOpen}
        onClose={() => setExistenciasModalOpen(false)}
        datos={existenciasNegativasData}
      />
    </div>
  );
};

export default CierreInventario;
