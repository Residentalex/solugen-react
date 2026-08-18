import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, InputNumber, Select, Modal, Tag, Typography, Space, Row, Col, Alert, Table, Drawer, message } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, PrinterOutlined, CreditCardOutlined, StopOutlined, FolderOpenOutlined, FileExcelOutlined, ReloadOutlined, CodeOutlined, HeartOutlined, IdcardOutlined, ReadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { getCompanyName, exportToExcel } from '../../utils/exportToExcel';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { useCompanyStore } from '../../stores/companyStore';
import { visanetApi } from '../../api/visanetApi';
import type { VisanetResponseDTO, VisanetVoucherDTO, VisanetVoucherInputDTO } from '../../types/visanet';
import VisanetVoucher from '../../components/VisanetVoucher';
import { useQZTray } from '../../hooks/useQZTray';
import ModalSeleccionarImpresoraPOS from '../../components/ModalSeleccionarImpresoraPOS/ModalSeleccionarImpresoraPOS';
import { formatTicket } from '../../utils/escpos-formatter';
import { obtenerConfigPlantilla, CODIGO_PLANTILLA_VSNT_VOUCHER } from '../../utils/ticketPlantilla';
import { obtenerLogoEscPosBase64 } from '../../utils/logoEscPos';
import type { LogoPlantillaConfig } from '../../types/reportesConfig';

const { Title, Text } = Typography;

const SUBSIDIO_OPCIONES = [
  { label: 'COMER ES PRIMERO', value: ' ' },
  { label: 'ENVEJECIENTES', value: 'E' },
  { label: 'BONO ESCOLAR', value: 'F' },
  { label: 'ILAE', value: 'G' },
  { label: 'ESTUDIANTES', value: 'B' },
  { label: 'PIPP', value: 'D' },
  { label: 'BONOGAS HOGAR', value: 'C' },
  { label: 'BONOGAS CHOFER', value: 'H' },
  { label: 'MEDICINA', value: 'A' },
  { label: 'BONO LUZ', value: 'I' },
  { label: 'OPORTUNIDAD 14/24', value: 'O' },
  { label: 'TRANSFORMANDO MI PAIS', value: 'T' },
  { label: 'MOTOBEN', value: 'M' },
];

const SUBSIDIO_MONTOS: Record<string, number> = {
  ' ': 1650,   // COMER ES PRIMERO
  'E': 400,    // ENVEJECIENTES
  'F': 300,    // BONO ESCOLAR
};

const SUBSIDIO_NOMBRES: Record<string, string> = {
  ' ': 'COMER ES PRIMERO',
  'G': 'ILAE',
  'B': 'ESTUDIANTES',
  'E': 'ENVEJECIENTES',
  'D': 'PIPP',
  'C': 'BONOGAS HOGAR',
  'H': 'BONOGAS CHOFER',
  'A': 'MEDICINA',
  'I': 'BONO LUZ',
  'F': 'BONO ESCOLAR',
  'O': 'OPORTUNIDAD 14/24',
  'T': 'TRANSFORMANDO MI PAIS',
  'M': 'MOTOBEN',
};

const VisanetTest: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const qz = useQZTray();

  // Estado de carga y resultado
  const [loading, setLoading] = useState<string | null>(null);
  const [resultado, setResultado] = useState<VisanetResponseDTO | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Última venta ejecutada (se conserva para imprimir el voucher)
  const [montoPesos, setMontoPesos] = useState<number | null>(null);
  const [tokenECR, setTokenECR] = useState<string>('');

  // Campos Subsidio
  const [subsidioMontoPesos, setSubsidioMontoPesos] = useState<number | null>(null);
  const [subsidyId, setSubsidyId] = useState<string>('');
  // Subsidio seleccionado en el listado (pendiente de confirmación)
  const [subsidioConfirmacion, setSubsidioConfirmacion] = useState<{ subsidyId: string; montoPesos: number } | null>(null);

  // Modales de operación
  const [venderModalOpen, setVenderModalOpen] = useState(false);
  const [venderMonto, setVenderMonto] = useState<number | null>(null);
  const [venderTokenECR, setVenderTokenECR] = useState<string>('');

  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [anularTokenId, setAnularTokenId] = useState<string>('');

  const [cerrarLoteModalOpen, setCerrarLoteModalOpen] = useState(false);

  // Drawer de JSON de respuesta (soporte)
  const [jsonDrawerOpen, setJsonDrawerOpen] = useState(false);

  // Registros del día (vouchers)
  const [vouchers, setVouchers] = useState<VisanetVoucherDTO[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);

  // Estado del modal voucher
  const [voucherVisible, setVoucherVisible] = useState(false);

  // Datos de empresa
  const companyStore = useCompanyStore();
  const [companyName, setCompanyName] = useState('');
  const [sucursalName, setSucursalName] = useState('');
  const [simMoneda, setSimMoneda] = useState('RD$');
  const [tipoOperacion, setTipoOperacion] = useState<'venta' | 'subsidio'>('venta');

  // Obtener datos de empresa al iniciar
  useEffect(() => {
    getCompanyName(sucursalActiva).then(setCompanyName);
    setSimMoneda(getMonedaSucursalActiva().simbolo);
    const suc = companyStore.data.sucursales.find((s: any) => s.sucursal === sucursalActiva);
    setSucursalName(suc?.nombre || '');
  }, [sucursalActiva]);

  // Estado del selector de impresora QZ Tray
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerList, setPrinterList] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');

  // Carga los vouchers del día (GET /visanet/{sucursal}/vouchers-dia)
  const cargarVouchersDelDia = useCallback(async () => {
    setVouchersLoading(true);
    try {
      const data = await visanetApi.obtenerVouchersDelDia(sucursalActiva);
      setVouchers(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar los vouchers del día');
    } finally {
      setVouchersLoading(false);
    }
  }, [sucursalActiva]);

  // Cargar registros del día al montar
  useEffect(() => {
    cargarVouchersDelDia();
  }, [cargarVouchersDelDia]);

  // Handlers
  const ejecutarVenta = async (montoPesosParam: number, tokenECRParam?: string) => {
    setLoading('vender');
    setError(null);
    setResultado(null);
    try {
      if (!montoPesosParam || montoPesosParam <= 0) {
        setError('Ingresa un monto válido mayor a 0');
        return;
      }
      const res = await visanetApi.vender(sucursalActiva, 0, montoPesosParam, tokenECRParam || undefined);
      setResultado(res);
      setTipoOperacion('venta');
      setMontoPesos(montoPesosParam);
      setTokenECR(tokenECRParam || '');
      await cargarVouchersDelDia();
      if (res?.exitoso) {
        imprimirVoucherConDatos(res, 'venta', montoPesosParam);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al vender');
    } finally {
      setLoading(null);
    }
  };

  const confirmarVentaModal = async () => {
    if (!venderMonto || venderMonto <= 0) {
      message.warning('Ingresa un monto válido mayor a 0');
      return;
    }
    setVenderModalOpen(false);
    await ejecutarVenta(venderMonto, venderTokenECR || undefined);
  };

  const ejecutarVentaSubsidio = async (subsidyIdParam: string, montoPesosParam: number) => {
    setLoading('subsidio');
    setError(null);
    setResultado(null);
    try {
      if (!montoPesosParam || montoPesosParam <= 0) {
        setError('Ingresa un monto válido mayor a 0');
        return;
      }
      const res = await visanetApi.venderSubsidio(sucursalActiva, 0, montoPesosParam, subsidyIdParam);
      setResultado(res);
      setTipoOperacion('subsidio');
      await cargarVouchersDelDia();
      if (res?.exitoso) {
        imprimirVoucherConDatos(res, 'subsidio', montoPesosParam, subsidyIdParam);
      }
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al vender con subsidio');
    } finally {
      setLoading(null);
    }
  };

  const handleVenderSubsidio = async () => {
    await ejecutarVentaSubsidio(subsidyId, subsidioMontoPesos ?? 0);
  };

  const ejecutarAnulacion = async (tokenIdParam: string) => {
    setLoading('anular');
    setError(null);
    setResultado(null);
    try {
      const res = await visanetApi.anular(sucursalActiva, tokenIdParam);
      setResultado(res);
      await cargarVouchersDelDia();
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al anular');
    } finally {
      setLoading(null);
    }
  };

  const confirmarAnularModal = async () => {
    const token = anularTokenId.trim();
    if (!token) {
      message.warning('Ingresa el TokenId a anular');
      return;
    }
    setAnularModalOpen(false);
    await ejecutarAnulacion(token);
  };

  const confirmarCerrarLoteModal = async () => {
    setCerrarLoteModalOpen(false);
    setLoading('cerrar');
    setError(null);
    setResultado(null);
    try {
      const res = await visanetApi.cerrarLote(sucursalActiva);
      setResultado(res);
      await cargarVouchersDelDia();
    } catch (err: any) {
      setError(err?.response?.data?.errorMessage || err.message || 'Error al cerrar lote');
    } finally {
      setLoading(null);
    }
  };

  // Fallback de impresión: abre una ventana emergente con SOLO el ticket y llama print() al cargar
  const imprimirTicketEnVentana = (ticketText: string, logo?: LogoPlantillaConfig) => {
    const ventana = window.open('', '_blank', 'width=380,height=600');
    if (!ventana) {
      message.error('El navegador bloqueó la ventana de impresión. Habilita los popups para este sitio o usa QZ Tray.');
      return;
    }
    const ticketHtml = ticketText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Logo configurable: insertar <img> centrado antes del <pre> si esta activo y hay fuente.
    let logoHtml = '';
    if (logo?.mostrar) {
      const logoSrc = logo.base64
        ? (logo.base64.startsWith('data:') ? logo.base64 : `data:image/png;base64,${logo.base64}`)
        : logo.url;
      if (logoSrc) {
        const ancho = logo.anchoPx ?? 384;
        logoHtml = `<div style="text-align:center;margin-bottom:8px"><img src="${logoSrc}" style="max-width:${ancho}px;max-height:120px;object-fit:contain" /></div>`;
      }
    }
    ventana.document.write(
      '<!DOCTYPE html><html><head><title>Voucher</title>' +
        '<style>' +
        'html, body { margin: 0; padding: 0; }' +
        'body { padding: 16px; }' +
        'pre { font-family: "Courier New", Courier, monospace; font-size: 12px; ' +
        'width: 300px; max-width: 100%; white-space: pre-wrap; word-wrap: break-word; margin: 0; }' +
        '</style></head><body>' +
        logoHtml +
        '<pre>' + ticketHtml + '</pre>' +
        '<script>window.addEventListener("load", function () { window.focus(); window.print(); });</script>' +
        '</body></html>'
    );
    ventana.document.close();
  };

  // Imprime el voucher con los datos de la venta recibidos como argumentos
  // (sin depender del estado del closure, para evitar imprimir datos obsoletos).
  const imprimirVoucherConDatos = async (
    resultadoVenta: VisanetResponseDTO,
    tipoOp: 'venta' | 'subsidio',
    monto: number,
    subsidyId?: string
  ) => {
    const suc = companyStore.data.sucursales.find((s: any) => s.sucursal === sucursalActiva);
    const company = {
      nombre: suc?.nombre || '',
      direccion: suc?.direccion || '',
      telefono: suc?.telefono || '',
      rnc: suc?.rnc || '',
      fax: suc?.fax || '',
      slogan: suc?.slogan || '',
    };
    const configPlantilla = await obtenerConfigPlantilla(CODIGO_PLANTILLA_VSNT_VOUCHER);
    const subsidioLabel = tipoOp === 'venta' ? 'VENTA' : (SUBSIDIO_NOMBRES[subsidyId ?? ''] || 'SUBSIDIO');
    const dataVoucher: VisanetVoucherInputDTO = {
      ...resultadoVenta,
      montoPesos: monto,
      simMoneda,
      sucursalName,
      subsidioLabel,
    };
    const ticketText = formatTicket(
      dataVoucher,
      company,
      configPlantilla ?? undefined,
      'TICKET_VSNT'
    );

    // Logo configurable: generar comando GS v 0 (base64) si la plantilla lo activa.
    let logoBase64 = '';
    if (configPlantilla?.logo?.mostrar) {
      logoBase64 = await obtenerLogoEscPosBase64(configPlantilla.logo);
    }

    try {
      await qz.print(ticketText, logoBase64 || undefined);
      message.success('Imprimiendo voucher...');
    } catch (err: any) {
      if (err.code === 'NO_PRINTER_SELECTED') {
        try {
          const list = await qz.fetchPrinters();
          if (list.length > 0) {
            setPrinterList(list);
            setSelectedPrinter(list[0] || '');
            setPrinterModalOpen(true);
          } else {
            message.warning('No se encontraron impresoras. Imprimiendo en pantalla...');
            imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
          }
        } catch {
          message.warning('QZ Tray no disponible. Imprimiendo en pantalla...');
          imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
        }
      } else {
        message.error('QZ Tray: ' + (err.message || 'Error'));
        imprimirTicketEnVentana(ticketText, configPlantilla?.logo);
      }
    }
  };

  // Botón manual "Imprimir": wrapper que usa el estado actual (comportamiento idéntico al original).
  const handlePrintQZ = async () => {
    if (!resultado || typeof resultado === 'string') return;

    // El monto del ticket depende de la operación: venta normal o subsidio
    const monto = tipoOperacion === 'venta' ? (montoPesos || 0) : (subsidioMontoPesos || 0);
    await imprimirVoucherConDatos(resultado, tipoOperacion, monto, subsidyId);
  };

  const handleCopiarJson = () => {
    const texto = JSON.stringify(resultado, null, 2);
    navigator.clipboard.writeText(texto);
    message.success('JSON copiado al portapapeles');
  };

  const subsidioLabel = tipoOperacion === 'venta' ? 'VENTA' : (SUBSIDIO_NOMBRES[subsidyId] || 'SUBSIDIO');

  // Columnas de la tabla de registros del día
  const columnasVouchers: ColumnsType<VisanetVoucherDTO> = [
    {
      title: 'NOSEC',
      dataIndex: 'noSec',
      key: 'noSec',
      width: 80,
      render: (noSec: number, record: VisanetVoucherDTO) => (
        <span style={record.anulado === 'S' ? { textDecoration: 'line-through' } : undefined}>{noSec}</span>
      ),
    },
    { title: 'Token ID', dataIndex: 'tokenId', key: 'tokenId', width: 150 },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right',
      render: (monto: number) => (monto != null ? `${simMoneda} ${monto.toFixed(2)}` : '-'),
    },
    { title: 'Tarjeta', dataIndex: 'notarjeta', key: 'notarjeta', width: 140 },
    { title: 'Autorización', dataIndex: 'noAprob', key: 'noAprob', width: 120 },
    { title: 'RRN', dataIndex: 'rrn', key: 'rrn', width: 130 },
    { title: 'Lote', dataIndex: 'noLote', key: 'noLote', width: 90 },
    {
      title: 'Estado',
      key: 'estado',
      width: 120,
      render: (_, record) => (
        record.anulado === 'S' ? <Tag color="red">ANULADO</Tag> : <Tag color="green">APROBADO</Tag>
      ),
    },
    { title: 'Origen', dataIndex: 'origen', key: 'origen', width: 110 },
    { title: 'Respuesta', dataIndex: 'respuestaMsg', key: 'respuestaMsg', width: 220, ellipsis: true },
  ];

  const handleExportarExcelVouchers = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columnasVouchers.filter((c) => c.key !== 'acciones');
    exportToExcel({
      fileName: `VisanetVouchers_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'VisanetVouchers',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: vouchers.map((item: any) =>
        cols.map((col) => {
          if (col.key === 'estado') {
            return item.anulado === 'S' ? 'ANULADO' : 'APROBADO';
          }
          if (col.key === 'monto') {
            return item.monto != null ? item.monto.toFixed(2) : '';
          }
          const val = item[col.dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Toolbar superior: Volver + título, acciones alineadas a la derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/CCENTRALSUPERVISION')}>
          Volver
        </Button>
        <Title level={4} style={{ margin: 0 }}>Cobro con Tarjeta (Visanet)</Title>
        <div style={{ flex: 1 }} />
        <Button
          type="primary"
          icon={<CreditCardOutlined />}
          style={{ height: 40 }}
          loading={loading === 'vender'}
          onClick={() => {
            setVenderMonto(null);
            setVenderTokenECR('');
            setVenderModalOpen(true);
          }}
        >
          Vender
        </Button>
        <Button
          danger
          icon={<StopOutlined />}
          style={{ height: 40 }}
          loading={loading === 'anular'}
          onClick={() => {
            setAnularTokenId('');
            setAnularModalOpen(true);
          }}
        >
          Anular
        </Button>
        <Button
          icon={<FolderOpenOutlined />}
          style={{ height: 40 }}
          loading={loading === 'cerrar'}
          onClick={() => setCerrarLoteModalOpen(true)}
        >
          Cerrar Lote
        </Button>
      </div>

      {/* KPIs de subsidios prioritarios + Subsidio */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* KPIs de subsidios prioritarios */}
        <Col xs={24} sm={12}>
          <Card title="Subsidios prioritarios" size="small" className="paces-card">
            <Row gutter={[12, 12]}>
              {Object.entries(SUBSIDIO_MONTOS).map(([id, monto]) => {
                const KPI_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
                  ' ': { color: '#34c38f', bg: 'rgba(52,195,143,0.1)', icon: <HeartOutlined /> },
                  'E': { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: <IdcardOutlined /> },
                  'F': { color: '#f0b345', bg: 'rgba(240,179,69,0.1)', icon: <ReadOutlined /> },
                };
                const kpi = KPI_CONFIG[id] || { color: '#556ee6', bg: 'rgba(85,110,230,0.1)', icon: <CreditCardOutlined /> };
                return (
                  <Col xs={24} sm={8} key={id}>
                    <div
                      className="dashboard-kpi-card"
                      style={{ cursor: 'pointer', '--kpi-accent': kpi.color } as React.CSSProperties}
                      onClick={() => setSubsidioConfirmacion({ subsidyId: id, montoPesos: monto })}
                    >
                      <div className="dashboard-kpi-top">
                        <div className="dashboard-kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>
                          {kpi.icon}
                        </div>
                        <span className="dashboard-kpi-chip">Monto</span>
                      </div>
                      <div className="dashboard-kpi-value">
                        {simMoneda}{' '}
                        {monto.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <p className="dashboard-kpi-label">{SUBSIDIO_NOMBRES[id] || 'SUBSIDIO'}</p>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Card>
        </Col>

        {/* Subsidio */}
        <Col xs={24} sm={12}>
          <Card title="🎫 Subsidio" size="small" className="paces-card">
            <Space direction="vertical" style={{ width: '100%' }}>
              <InputNumber
                placeholder="Monto en pesos (ej: 500.00)"
                style={{ width: '100%' }}
                precision={2}
                min={0}
                value={subsidioMontoPesos}
                onChange={(v) => setSubsidioMontoPesos(v ?? null)}
                onPressEnter={handleVenderSubsidio}
              />
              <Select
                placeholder="Seleccionar subsidio"
                style={{ width: '100%' }}
                allowClear
                options={SUBSIDIO_OPCIONES}
                value={subsidyId || undefined}
                onChange={(val) => {
                  const value = val ?? '';
                  setSubsidyId(value);
                  const montoDefinido = SUBSIDIO_MONTOS[value];
                  if (montoDefinido != null) {
                    setSubsidioMontoPesos(montoDefinido);
                  }
                }}
              />
              <Button type="primary" block loading={loading === 'subsidio'} onClick={handleVenderSubsidio}>
                Vender
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Área de resultado */}
      {error && (
        <Alert type="error" message="Error" description={error} showIcon style={{ marginTop: 16 }} />
      )}

      {resultado && !error && typeof resultado === 'object' && 'exitoso' in resultado && (
        <Space style={{ marginTop: 16 }}>
          <Button icon={<PrinterOutlined />} onClick={() => setVoucherVisible(true)}>
            Ver Voucher
          </Button>
          <Button icon={<CodeOutlined />} onClick={() => setJsonDrawerOpen(true)}>
            Ver JSON (soporte)
          </Button>
        </Space>
      )}

      <VisanetVoucher
        visible={voucherVisible}
        onClose={() => setVoucherVisible(false)}
        respuesta={
          resultado && typeof resultado === 'object' && 'exitoso' in resultado
            ? (resultado as VisanetResponseDTO)
            : ({} as VisanetResponseDTO)
        }
        montoPesos={tipoOperacion === 'venta' ? (montoPesos || 0) : (subsidioMontoPesos || 0)}
        transacId={0}
        onPrintQZ={handlePrintQZ}
        companyName={companyName}
        sucursalName={sucursalName}
        simMoneda={simMoneda}
        subsidioLabel={subsidioLabel}
      />

      {/* Registros del día */}
      <Card
        className="paces-card-erp"
        title="Registros del día"
        style={{ borderRadius: 8, overflow: 'hidden', marginTop: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }} />
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcelVouchers} />
            <Button icon={<ReloadOutlined />} onClick={cargarVouchersDelDia} />
          </div>
        </div>
        <Table
          rowKey="noSec"
          className="paces-border-top paces-list-table"
          size="middle"
          columns={columnasVouchers}
          dataSource={vouchers}
          loading={vouchersLoading}
          scroll={{ x: 1300 }}
          pagination={{ showTotal: (t) => `${t} registros` }}
          rowClassName={(record) => (record.anulado === 'S' ? 'paces-text-secondary' : '')}
        />
      </Card>

      {/* Modal de confirmación de subsidio rápido */}
      <Modal
        title="Confirmar venta de subsidio"
        open={subsidioConfirmacion !== null}
        onCancel={() => setSubsidioConfirmacion(null)}
        onOk={() => {
          const confirmacion = subsidioConfirmacion;
          if (!confirmacion) return;
          const { subsidyId: subsId, montoPesos: monto } = confirmacion;
          setSubsidyId(subsId);
          setSubsidioMontoPesos(monto);
          setSubsidioConfirmacion(null);
          ejecutarVentaSubsidio(subsId, monto);
        }}
        okText="Vender"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'subsidio' }}
      >
        {subsidioConfirmacion && (
          <p style={{ margin: 0 }}>
            ¿Deseas vender el subsidio{' '}
            <strong>{SUBSIDIO_NOMBRES[subsidioConfirmacion.subsidyId] || 'SUBSIDIO'}</strong> por un
            monto de{' '}
            <strong>
              {simMoneda}{' '}
              {subsidioConfirmacion.montoPesos.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
            ?
          </p>
        )}
      </Modal>

      {/* Modal de venta */}
      <Modal
        title="Vender (PAX)"
        open={venderModalOpen}
        onCancel={() => setVenderModalOpen(false)}
        onOk={confirmarVentaModal}
        okText="Vender"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'vender' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text type="secondary">Monto en pesos</Text>
            <InputNumber
              style={{ width: '100%' }}
              precision={2}
              min={0}
              value={venderMonto}
              onChange={(v) => setVenderMonto(v ?? null)}
              onPressEnter={confirmarVentaModal}
              placeholder="Ej: 1500.00"
              autoFocus
            />
          </div>
          <div>
            <Text type="secondary">TokenECR (opcional)</Text>
            <Input
              placeholder="TokenECR"
              value={venderTokenECR}
              onChange={(e) => setVenderTokenECR(e.target.value)}
            />
          </div>
        </Space>
      </Modal>

      {/* Modal de anulación */}
      <Modal
        title="Anular (PAX)"
        open={anularModalOpen}
        onCancel={() => setAnularModalOpen(false)}
        onOk={confirmarAnularModal}
        okText="Anular"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'anular', danger: true }}
      >
        <div>
          <Text type="secondary">TokenId a anular</Text>
          <Input
            placeholder="TokenId"
            value={anularTokenId}
            onChange={(e) => setAnularTokenId(e.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal de cierre de lote */}
      <Modal
        title="Cerrar Lote (PAX)"
        open={cerrarLoteModalOpen}
        onCancel={() => setCerrarLoteModalOpen(false)}
        onOk={confirmarCerrarLoteModal}
        okText="Cerrar Lote"
        cancelText="Cancelar"
        okButtonProps={{ loading: loading === 'cerrar' }}
      >
        <p style={{ margin: 0 }}>
          ¿Deseas cerrar el lote de transacciones del PAX? Esta acción no se puede deshacer.
        </p>
      </Modal>

      {/* Modal selector de impresora QZ Tray */}
      <ModalSeleccionarImpresoraPOS
        open={printerModalOpen}
        impresoras={printerList}
        seleccionada={selectedPrinter}
        onSelect={setSelectedPrinter}
        onConfirm={async () => {
          if (selectedPrinter) {
            qz.selectPrinter(selectedPrinter);
            setPrinterModalOpen(false);
            setTimeout(() => handlePrintQZ(), 200);
          }
        }}
        onClose={() => setPrinterModalOpen(false)}
        titulo="Seleccionar impresora"
        okText="Seleccionar"
        deshabilitarOkSinSeleccion={false}
        usarSelect
      />

      {/* Drawer JSON de respuesta (soporte) */}
      <Drawer
        title="JSON de respuesta"
        open={jsonDrawerOpen}
        onClose={() => setJsonDrawerOpen(false)}
        width={560}
      >
        <p style={{ marginTop: 0 }}>
          Si necesitas soporte técnico, copia este JSON y envíalo al equipo de desarrollo.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button size="small" icon={<CopyOutlined />} onClick={handleCopiarJson}>
            Copiar JSON
          </Button>
        </div>
        <pre
          style={{
            maxHeight: 'calc(100vh - 260px)',
            overflow: 'auto',
            background: '#f5f5f5',
            padding: 12,
            borderRadius: 4,
            fontSize: 12,
            margin: 0,
          }}
        >
          {JSON.stringify(resultado, null, 2)}
        </pre>
      </Drawer>
    </div>
  );
};

export default VisanetTest;
