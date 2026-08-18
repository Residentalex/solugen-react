import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Drawer,
  Descriptions,
  Row,
  Col,
  Button,
  Space,
  Spin,
  Input,
  Modal,
  message,
  Typography,
  Badge,
} from 'antd';
import {
  ReloadOutlined,
  PauseCircleOutlined,
  SyncOutlined,
  SettingOutlined,
  SignalFilled,
  SearchOutlined,
  DatabaseOutlined,
  CreditCardOutlined,
} from '@ant-design/icons';
import { useMonitoreoStore } from '../../stores/monitoreoStore';
import { useAuthStore } from '../../stores/authStore';
import { monitoreoApi } from '../../api/monitoreoApi';
import { consultaRNCApi } from '../../api/consultaRNCApi';
import type { MonitoreoCajaDTO } from '../../types/monitoreo';
import type { ClienteRNCResultado, RNCCEDRegistroDTO } from '../../types/consultaRNC';
import CajaCard from './CajaCard';
import SyncModal from './SyncModal';
import ConfigModal from './ConfigModal';

const { Text } = Typography;

const connectionStringLabels: Record<string, string> = {
  serverConnection: 'Server',
  clientConnection: 'Client',
  rncConnection: 'RNC',
  rncClienteConnection: 'RNC Cliente',
};

const MonitoreoCajas: React.FC = () => {
  // ─── Estado local ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [drawerCaja, setDrawerCaja] = useState<MonitoreoCajaDTO | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncAllModalOpen, setSyncAllModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [signalRReady, setSignalRReady] = useState(false);
  const [rncBuscado, setRncBuscado] = useState('');
  const [resultadoRNC, setResultadoRNC] = useState<ClienteRNCResultado | null>(null);
  const [buscandoRNC, setBuscandoRNC] = useState(false);
  const [guardandoRNC, setGuardandoRNC] = useState(false);
  const [registroGuardado, setRegistroGuardado] = useState<RNCCEDRegistroDTO | null>(null);
  const [rncModalOpen, setRncModalOpen] = useState(false);

  const signalRReadyRef = useRef(false);

  // ─── Store ─────────────────────────────────────────────────
  const {
    cajasMap,
    signalRConectado,
    ultimaActualizacion,
    setCajas,
    actualizarCaja,
    marcarDesconectada,
    setSignalRConectado,
    setUltimaActualizacion,
  } = useMonitoreoStore();

  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const navigate = useNavigate();

  // ─── Handlers ──────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      const cajas = sucursalActiva != null
        ? await monitoreoApi.obtenerPorSucursal(sucursalActiva)
        : await monitoreoApi.obtenerTodas();
      setCajas(cajas);
      setUltimaActualizacion(new Date().toISOString());
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cajas');
    } finally {
      setLoading(false);
    }
  }, [setCajas, setUltimaActualizacion, sucursalActiva]);

  const handleCajaClick = useCallback((caja: MonitoreoCajaDTO) => {
    setDrawerCaja(caja);
    setDrawerOpen(true);
  }, []);

  const handlePausar = useCallback(async () => {
    if (!drawerCaja) return;
    try {
      await monitoreoApi.pausar(drawerCaja.ip);
      message.success(`Caja ${drawerCaja.nombre} pausada`);
      handleRefresh();
      setDrawerOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al pausar caja');
    }
  }, [drawerCaja, handleRefresh]);

  const handlePausarTodas = useCallback(async () => {
    try {
      await monitoreoApi.pausarTodas();
      message.success('Todas las cajas pausadas');
      handleRefresh();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al pausar todas las cajas');
    }
  }, [handleRefresh]);

  // ─── Consulta de RNC / Cédula ─────────────────────────────
  const handleBuscarRNC = useCallback(async (valor: string) => {
    const rnc = (valor || '').trim();
    setRncBuscado(rnc);
    setResultadoRNC(null);
    setRegistroGuardado(null);
    if (!rnc) return;

    setBuscandoRNC(true);
    try {
      const resultado = await consultaRNCApi.consultar(sucursalActiva, rnc);
      setResultadoRNC(resultado);
      if (!resultado) {
        message.warning('RNC no encontrado en BD local ni en DGII');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al consultar RNC');
    } finally {
      setBuscandoRNC(false);
    }
  }, [sucursalActiva]);

  const handleGuardarRNC = useCallback(async () => {
    if (!rncBuscado) return;
    setGuardandoRNC(true);
    try {
      const registro = await consultaRNCApi.guardar(sucursalActiva, rncBuscado);
      setRegistroGuardado(registro);
      message.success('Guardado en BD central correctamente');
      setRncModalOpen(false);

      // Sincronizar RNC a todas las cajas conectadas de la sucursal activa
      const cajasConectadas = Object.values(cajasMap).filter(
        (c: MonitoreoCajaDTO) => c.sucursal === sucursalActiva && c.conectado
      );
      if (cajasConectadas.length > 0) {
        message.loading({ content: `Enviando comando de sincronización a ${cajasConectadas.length} cajas...`, key: 'syncRNC', duration: 0 });
        let errores = 0;
        for (const caja of cajasConectadas) {
          try {
            await monitoreoApi.sincronizar(caja.ip, { tipos: ['RNC'], syncAll: false });
          } catch {
            errores++;
          }
        }
        message.destroy('syncRNC');
        if (errores === 0) {
          message.success(`Comando de sincronización enviado a ${cajasConectadas.length} cajas`);
        } else {
          message.warning(
            `Comando enviado a ${cajasConectadas.length - errores} de ${cajasConectadas.length} cajas; ${errores} caja(s) aparecían conectadas pero no respondieron`
          );
        }
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar RNC');
    } finally {
      setGuardandoRNC(false);
    }
  }, [sucursalActiva, rncBuscado, cajasMap]);

  // ─── SignalR setup ─────────────────────────────────────────
  useEffect(() => {
    const conectar = async () => {
      try {
        await monitoreoApi.conectarHub({
          onCajaActualizada: (caja) => {
            actualizarCaja(caja);
            setUltimaActualizacion(new Date().toISOString());
          },
          onCajaDesconectada: (ip) => {
            marcarDesconectada(ip);
            setUltimaActualizacion(new Date().toISOString());
          },
          onCajaConectada: (caja) => {
            actualizarCaja(caja);
            setUltimaActualizacion(new Date().toISOString());
          },
        });
        setSignalRReady(true);
        signalRReadyRef.current = true;
      } catch {
        // SignalR no crítico para la funcionalidad base
        console.warn('[Monitoreo] SignalR no disponible, funcionando solo con REST');
      }
    };

    // Escuchar cambios de estado de conexión SignalR
    const unsubscribe = monitoreoApi.onStateChange((conectado) => {
      setSignalRConectado(conectado);
    });

    conectar();

    return () => {
      unsubscribe();
      monitoreoApi.desconectarHub();
    };
  }, [actualizarCaja, marcarDesconectada, setSignalRConectado, setUltimaActualizacion]);

  // ─── Carga inicial ─────────────────────────────────────────
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // ─── Auto-refresh periódico ────────────────────────────────
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (!loading) {
        handleRefresh();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(intervalo);
  }, [handleRefresh, loading]);

  // ─── Filtrar cajas por sucursal activa ─────────────────────
  const cajasFiltradas = useMemo(
    () => Object.values(cajasMap).filter((c) => c.sucursal === sucursalActiva),
    [cajasMap, sucursalActiva]
  );

  const conectadasCount = useMemo(
    () => cajasFiltradas.filter((c) => c.conectado).length,
    [cajasFiltradas]
  );

  const ipsConectadas = useMemo(
    () => cajasFiltradas.filter((c) => c.conectado).map((c) => c.ip),
    [cajasFiltradas]
  );

  // ─── Render ────────────────────────────────────────────────
  const hayConectadas = Object.values(cajasMap).some((c) => c.conectado);

  return (
    <>
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* ── Toolbar ─────────────────────────────────────── */}
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Typography.Title level={5} style={{ margin: 0, whiteSpace: 'nowrap' }}>
              Monitoreo de Cajas
            </Typography.Title>

            {/* Indicador de conexión al servicio */}
            <Badge
              status={signalRConectado ? 'success' : 'error'}
              text={
                <Text style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {signalRConectado ? 'Servicio activo' : 'Servicio desconectado'}
                </Text>
              }
            />

            <div style={{ flex: 1 }} />

            <Space size={8}>
              <Button
                icon={<SearchOutlined />}
                onClick={() => {
                  setRncBuscado('');
                  setResultadoRNC(null);
                  setRegistroGuardado(null);
                  setRncModalOpen(true);
                }}
              >
                Consultar RNC
              </Button>
              <Button
                icon={<CreditCardOutlined />}
                onClick={() => navigate('/TVISANET')}
                size="small"
              >
                Visanet
              </Button>
              {hayConectadas && (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePausarTodas}
                  size="small"
                >
                  Pausar todas
                </Button>
              )}
              {hayConectadas && (
                <Button
                  icon={<SyncOutlined />}
                  onClick={() => setSyncAllModalOpen(true)}
                  size="small"
                >
                  Actualizar todas
                </Button>
              )}
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading} />
            </Space>
          </div>
        </div>

        {/* ── Modal Consulta de RNC / Cédula ──────────────── */}
        <Modal
          title="Consulta de RNC / Cédula"
          open={rncModalOpen}
          onCancel={() => setRncModalOpen(false)}
          footer={null}
          width={560}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <Input.Search
              placeholder="Buscar RNC o Cédula..."
              allowClear
              onSearch={handleBuscarRNC}
              style={{ width: 380 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
              enterButton="Buscar"
              loading={buscandoRNC}
            />
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              onClick={handleGuardarRNC}
              disabled={!resultadoRNC}
              loading={guardandoRNC}
            >
              Actualizar BD
            </Button>
          </div>

          {resultadoRNC && (
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Nombre / Razón Social">
                {resultadoRNC.nombre || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="RNC / Cédula">
                {resultadoRNC.identificacion || rncBuscado}
              </Descriptions.Item>
              {resultadoRNC.tipoNCF && (
                <Descriptions.Item label="Tipo NCF">
                  {resultadoRNC.tipoNCF}
                </Descriptions.Item>
              )}
              {resultadoRNC.nombreTipoComprobante && (
                <Descriptions.Item label="Tipo Comprobante">
                  {resultadoRNC.nombreTipoComprobante}
                </Descriptions.Item>
              )}
              {registroGuardado && (
                <>
                  <Descriptions.Item label="Régimen de pago">
                    {registroGuardado.regPago || '—'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    {registroGuardado.estatus || '—'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          )}
        </Modal>

        {/* ── Grid de cajas por sucursal activa ───────────────── */}
        <div style={{ padding: '0 24px 16px' }}>
          <Spin spinning={loading}>
            {cajasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>
                No hay cajas en esta sucursal
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12, fontSize: 13, color: '#8c8c8c' }}>
                  {conectadasCount} de {cajasFiltradas.length} cajas conectadas
                </div>
                <Row gutter={[12, 12]}>
                  {cajasFiltradas.map((caja) => (
                    <Col key={caja.ip} xs={24} sm={12} md={8} lg={6} xl={6} xxl={4}>
                      <CajaCard caja={caja} onClick={handleCajaClick} />
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Spin>
        </div>
      </Card>

      {/* ── Barra de estado inferior ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          marginTop: 8,
          fontSize: 12,
          color: '#8c8c8c',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Space size={12}>
          <SignalFilled
            style={{ color: signalRConectado ? '#52c41a' : '#ff4d4f', fontSize: 14 }}
          />
          <span>
            SignalR:{' '}
            {signalRConectado ? 'Conectado' : 'Desconectado'}
          </span>
        </Space>
        <span>
          {ultimaActualizacion
            ? `Última actualización: ${new Date(ultimaActualizacion).toLocaleTimeString()}`
            : 'Sin actualización'}
        </span>
      </div>

      {/* ── Drawer de detalle ─────────────────────────────── */}
      <Drawer
        title={drawerCaja?.nombre || 'Detalle de Caja'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={500}
        footer={
          <Space style={{ float: 'right' }}>
            <Button
              icon={<SyncOutlined />}
              onClick={() => {
                setSyncModalOpen(true);
              }}
            >
              Sincronizar
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handlePausar}
            >
              Pausar
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => {
                setConfigModalOpen(true);
              }}
            >
              Configurar
            </Button>
          </Space>
        }
      >
        {drawerCaja && (
          <>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Nombre">{drawerCaja.nombre}</Descriptions.Item>
              <Descriptions.Item label="IP">
                <Text code>{drawerCaja.ip}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Versión">{drawerCaja.version}</Descriptions.Item>
              <Descriptions.Item label="No. Caja">{drawerCaja.noCaja}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Badge
                  status={drawerCaja.conectado ? 'success' : 'error'}
                  text={drawerCaja.conectado ? 'Conectado' : 'Desconectado'}
                />
              </Descriptions.Item>
              <Descriptions.Item label="DelayTime">{drawerCaja.delayTime}</Descriptions.Item>
              <Descriptions.Item label="UpdaterServiceStatus">
                {drawerCaja.updaterServiceStatus || '—'}
              </Descriptions.Item>
            </Descriptions>

            <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 12 }}>
              ConnectionStrings
            </Typography.Title>
            <Descriptions bordered size="small" column={1}>
              {Object.entries(drawerCaja.connectionStrings).map(([key, value]) => (
                <Descriptions.Item key={key} label={connectionStringLabels[key] || key}>
                  <Text
                    code
                    style={{
                      fontSize: 11,
                      wordBreak: 'break-all',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {value || '—'}
                  </Text>
                </Descriptions.Item>
              ))}
            </Descriptions>
          </>
        )}
      </Drawer>

      {/* ── Modales ───────────────────────────────────────── */}
      {drawerCaja && (
        <>
          <SyncModal
            ip={drawerCaja.ip}
            nombre={drawerCaja.nombre}
            open={syncModalOpen}
            onClose={() => setSyncModalOpen(false)}
          />
          <ConfigModal
            caja={drawerCaja}
            open={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
          />
        </>
      )}

      <SyncModal
        ipList={ipsConectadas}
        open={syncAllModalOpen}
        onClose={() => setSyncAllModalOpen(false)}
      />
    </>
  );
};

export default MonitoreoCajas;
