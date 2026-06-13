import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Input, Button, Typography, message, Spin, DatePicker, Checkbox,
  Modal, Space, Row, Col, Table, Empty,
} from 'antd';
import { PrinterOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { mayorAuxiliarApi } from '../../api/mayorAuxiliarApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { formatDateParam } from '../../utils/formats';
import type { CuentaContableDTO } from '../../types/contabilidad';

const { Text } = Typography;

const MayorAuxiliar: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  /* ───── Estados ───── */

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<dayjs.Dayjs>(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState<dayjs.Dayjs>(dayjs());
  const [noCuenta, setNoCuenta] = useState('');
  const [nomCuenta, setNomCuenta] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [balanceAnterior, setBalanceAnterior] = useState(true);
  const [detallado, setDetallado] = useState(true);

  // Generacion PDF
  const [generando, setGenerando] = useState(false);

  // Modal de busqueda de cuenta contable
  const [modalCuentaAbierto, setModalCuentaAbierto] = useState(false);
  const [cuentas, setCuentas] = useState<CuentaContableDTO[]>([]);
  const [cuentasOrig, setCuentasOrig] = useState<CuentaContableDTO[]>([]);
  const [buscandoCuenta, setBuscandoCuenta] = useState(false);
  const [_searchCuenta, setSearchCuenta] = useState('');

  /* ───── UI setup ───── */

  useEffect(() => {
    setActiveModule('RMayorAux');
    setPageTitleOverride('Mayor Auxiliar');
    updateToolbar({});
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, updateToolbar, resetToolbar]);

  /* ───── Handlers ───── */

  const handlePrint = useCallback(async () => {
    setGenerando(true);
    try {
      const filtros = {
        fechaInicial: formatDateParam(fechaDesde.toDate()),
        fechaFinal: formatDateParam(fechaHasta.toDate()),
        noCuenta: noCuenta || undefined,
        tipoDocumento: tipoDocumento || undefined,
        balanceAnterior,
        detallado,
      };

      const blob = await mayorAuxiliarApi.generarPDF(sucursalActiva, filtros);
      const blobUrl = URL.createObjectURL(blob);
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
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar el PDF');
    } finally {
      setGenerando(false);
    }
  }, [sucursalActiva, fechaDesde, fechaHasta, noCuenta, tipoDocumento, balanceAnterior, detallado]);

  /* ───── Handlers de busqueda de cuenta ───── */

  const abrirModalCuenta = async () => {
    setModalCuentaAbierto(true);
    setSearchCuenta('');
    setBuscandoCuenta(true);
    try {
      const lista = await cuentaContableApi.obtenerAuxiliares(sucursalActiva);
      setCuentas(lista || []);
      setCuentasOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables');
    } finally {
      setBuscandoCuenta(false);
    }
  };

  const buscarCuenta = (valor: string) => {
    setSearchCuenta(valor);
    if (!valor) {
      setCuentas([...cuentasOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = cuentasOrig.filter(
      (c) =>
        c.noCuenta?.toLowerCase().includes(term) ||
        c.nombre?.toLowerCase().includes(term),
    );
    setCuentas(filtradas);
  };

  const seleccionarCuenta = (item: CuentaContableDTO) => {
    setNoCuenta(item.noCuenta);
    setNomCuenta(`${item.noCuenta} - ${item.nombre}`);
    setModalCuentaAbierto(false);
  };

  const limpiarCuenta = () => {
    setNoCuenta('');
    setNomCuenta('');
  };

  /* ───── Render ───── */

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .paces-card-erp { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* ───── Filtros ───── */}
      <Card className="paces-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha Desde</Text>
              </div>
              <DatePicker
                value={fechaDesde}
                onChange={(d) => d && setFechaDesde(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Fecha Hasta</Text>
              </div>
              <DatePicker
                value={fechaHasta}
                onChange={(d) => d && setFechaHasta(d)}
                style={{ width: '100%' }}
                format="DD/MM/YYYY"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Cuenta</Text>
              </div>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Buscar cuenta..."
                  value={nomCuenta}
                  readOnly
                  style={{ width: '100%' }}
                />
                <Button icon={<SearchOutlined />} onClick={abrirModalCuenta} />
                {nomCuenta ? (
                  <Button icon={<CloseOutlined />} onClick={limpiarCuenta} />
                ) : null}
              </Space.Compact>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tipo Documento</Text>
              </div>
              <Input
                placeholder="Ej: FAC, NCR, NDB..."
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>

          <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={balanceAnterior} onChange={(e) => setBalanceAnterior(e.target.checked)}>
                Incluir Balance Anterior
              </Checkbox>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Checkbox checked={detallado} onChange={(e) => setDetallado(e.target.checked)}>
                Vista Detallada
              </Checkbox>
            </Col>
          </Row>

          <Row style={{ marginTop: 16 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={handlePrint}
                  loading={generando}
                >
                  Generar PDF
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* ───── Loading ───── */}
      {generando && (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Generando reporte..." />
        </div>
      )}

      {/* ───── Modal busqueda cuenta contable ───── */}
      <Modal
        title="Buscar Cuenta Contable"
        open={modalCuentaAbierto}
        onCancel={() => setModalCuentaAbierto(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Input.Search
          placeholder="Buscar por número o nombre..."
          allowClear
          onSearch={buscarCuenta}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'No. Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 140 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={cuentas}
          rowKey="noCuenta"
          loading={buscandoCuenta}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: CuentaContableDTO) => ({
            onClick: () => seleccionarCuenta(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>
    </>
  );
};

export default MayorAuxiliar;
