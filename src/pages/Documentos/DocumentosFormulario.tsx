import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Layout, Menu, Grid, Card, Switch, Button, Modal, Space, Typography,
  Drawer, Input, Select, InputNumber, message, Row, Col,
} from 'antd';
import {
  DashboardOutlined, ProjectOutlined, RobotOutlined, MessageOutlined, SettingOutlined,
  MenuOutlined, CloseOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { documentosApi } from '../../api/documentosApi';
import type { DocumentoDTO } from '../../types/documento';
import FormularioToolbar from '../../components/FormularioToolbar';
import DetalleToolbar from '../../components/DetalleToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { extraerMensajeError } from '../../utils/formats';

const { Content, Sider } = Layout;
const { Text, Title } = Typography;

// ============================================================
// Sidebar menu items
// ============================================================
const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'projects', icon: <ProjectOutlined />, label: 'Projects' },
  { key: 'ai-assistant', icon: <RobotOutlined />, label: 'AI Assistant' },
  { key: 'chat-history', icon: <MessageOutlined />, label: 'Chat History' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
];

// ============================================================
// Sub-component: HoverableCard with subtle lift animation
// ============================================================
const HoverableCard: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPadding?: boolean;
}> = ({ children, style, noPadding }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Card
      style={{
        borderRadius: 10,
        border: '1px solid #E8EAF0',
        boxShadow: hovered
          ? '0 8px 25px rgba(0,0,0,0.07)'
          : '0 4px 16px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        ...style,
      }}
      styles={noPadding ? { body: { padding: 0 } } : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </Card>
  );
};

// ============================================================
// Main component
// ============================================================
const DocumentosFormulario: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [idGuardado, setIdGuardado] = useState<number | null>(null);
  const sucursalActiva = useAuthStore((s: any) => s.securitySucursal);
  const sucursalesPermitidas = useAuthStore((s: any) => s.sucursalesPermitidas);
  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  // ----- Form state -----
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<string | undefined>(undefined);
  const [longitudCodigo, setLongitudCodigo] = useState<number | null>(8);

  // ----- Advanced fields -----
  const [origenCuenta, setOrigenCuenta] = useState<number>(0);
  const [tipoImpuesto, setTipoImpuesto] = useState<number>(0);
  const [puedeReimprimir, setPuedeReimprimir] = useState(false);
  const [recibePagos, setRecibePagos] = useState(false);
  const [metodoPosteo, setMetodoPosteo] = useState<number>(0);
  const [fechaPermitida, setFechaPermitida] = useState<number>(0);
  const [documentoContable, setDocumentoContable] = useState(false);
  const [documentoReverso, setDocumentoReverso] = useState('');
  const [idExterno, setIdExterno] = useState('');

  // ----- Configuration switches -----
  const [estadoCuenta, setEstadoCuenta] = useState(true);
  const [preciosConImpuestos, setPreciosConImpuestos] = useState(false);
  const [afectaInventario, setAfectaInventario] = useState(true);
  const [requiereAsiento, setRequiereAsiento] = useState(true);
  const [modPrecio, setModPrecio] = useState(false);
  const [modDescripcion, setModDescripcion] = useState(true);

  // ----- Numeración -----
  const [tipoNumeracion, setTipoNumeracion] = useState<number>(0);
  const [metodoAplicar, setMetodoAplicar] = useState<number>(0);

  /** Convierte un valor enum del backend (string o number) a número */
  const toEnum = (value: any, mapping: Record<string, number>, defaultVal: number): number => {
    if (value === null || value === undefined) return defaultVal;
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
    return mapping[String(value)] ?? defaultVal;
  };

  // ----- Cargar datos en modo edición -----
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;
    if (sucursalActiva === undefined) return;

    setLoading(true);
    documentosApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((doc) => {
        if (!doc) {
          message.error('No se encontró el documento');
          return;
        }
        setCodigo(doc.codigo || '');
        setNombre(doc.nombre || '');
        setTipo(doc.tipo || undefined);
        setLongitudCodigo(doc.longitudCodigo ?? 8);
        setEstadoCuenta(doc.incluirEstadoCuenta ?? true);
        setPreciosConImpuestos(doc.preciosIncluyenImpuestos ?? false);
        setAfectaInventario(doc.afectaInventario ?? true);
        setRequiereAsiento(doc.requiereAsiento ?? true);
        setModPrecio(doc.modificaPrecio ?? false);
        setModDescripcion(doc.modificaDescripcion ?? true);
        setOrigenCuenta(toEnum(doc.origenCuenta, { Debito: 0, Credito: 1, Desconocido: 2 }, 0));
        setTipoImpuesto(toEnum(doc.tipoImpuesto, { Venta: 0, Compra: 1, Ninguno: 2 }, 0));
        setPuedeReimprimir(doc.puedeReimprimir ?? false);
        setRecibePagos(doc.recibePagos ?? false);
        setMetodoPosteo(toEnum(doc.metodoPosteo, { Manualmente: 0, Guardar: 1, Imprimir: 2, Aplicar: 3 }, 0));
        setFechaPermitida(toEnum(doc.fechaPermitida, { None: 0, Todas: 1, MayorCierre: 2, MayorDocAplicado: 3, FechaDia: 4, MenorIgualFechaDia: 5 }, 0));
        setDocumentoContable(doc.documentoContable ?? false);
        setDocumentoReverso(doc.documentoReverso ?? '');
        setIdExterno(doc.idExterno ?? '');
        setTipoNumeracion(toEnum(doc.tipoNumeracion, { Manual: 0, Automatica: 1 }, 0));
        setMetodoAplicar(toEnum(doc.metodoAplicar, { Manualmente: 0, Guardar: 1, Imprimir: 2 }, 0));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        message.error(msg);
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva]);

  // ----- Danger zone -----
  const handleDesactivarDocumento = () => {
    Modal.confirm({
      title: 'Desactivar tipo de documento',
      icon: <ExclamationCircleOutlined />,
      content: 'Esta acción desactivará el tipo de documento. Los documentos existentes no se verán afectados, pero no podrá crear nuevos documentos con este tipo. Esta acción puede revertirse posteriormente.',
      okText: 'Sí, desactivar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: () => {
        message.success('Tipo de documento desactivado correctamente');
      },
    });
  };

  // ----- Toolbar handlers -----
  const handleGuardar = async () => {
    if (!codigo.trim()) {
      message.error('El código es requerido');
      return;
    }
    if (!nombre.trim()) {
      message.error('El nombre es requerido');
      return;
    }
    if (sucursalActiva === undefined) {
      message.error('No hay sucursal activa');
      return;
    }

    setSaving(true);
    try {
      const payload: DocumentoDTO = {
        id: mode === 'editar' ? parseInt(id!) : 0,
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo,
        longitudCodigo: longitudCodigo ?? undefined,
        incluirEstadoCuenta: estadoCuenta,
        preciosIncluyenImpuestos: preciosConImpuestos,
        afectaInventario,
        requiereAsiento,
        modificaPrecio: modPrecio,
        modificaDescripcion: modDescripcion,
        tipoNumeracion,
        metodoAplicar,
        origenCuenta,
        tipoImpuesto,
        puedeReimprimir,
        recibePagos,
        metodoPosteo,
        fechaPermitida,
        documentoContable,
        documentoReverso: documentoReverso || undefined,
        idExterno: idExterno || undefined,
      };

      // Determinar las sucursales destino: securitySucursal + sucursalesPermitidas
      const sucursalesDestino = sucursalesPermitidas.map((s: any) => s.sucursal);
      const sucursalesAProcesar = sucursalesDestino.length > 0
        ? [...new Set([sucursalActiva, ...sucursalesDestino])]
        : [sucursalActiva];

      let primerResultado: DocumentoDTO | null = null;
      const errores: string[] = [];

      for (const suc of sucursalesAProcesar) {
        try {
          // Buscar si ya existe el documento por código
          const existente = await documentosApi.obtenerPorCodigo(suc, codigo.trim());

          if (existente) {
            // Actualizar
            const payloadActualizar = { ...payload, id: existente.id };
            await documentosApi.actualizar(suc, existente.id, payloadActualizar);
            if (!primerResultado) primerResultado = existente;
          } else {
            // Crear
            const resultado = await documentosApi.crear(suc, payload);
            if (!primerResultado) primerResultado = resultado;
          }
        } catch (err: any) {
          const msg = extraerMensajeError(err, `Error en sucursal ${suc}`);
          errores.push(msg);
        }
      }

      if (errores.length > 0) {
        message.warning(`Documento procesado con ${errores.length} error(es)`);
      } else {
        message.success('Tipo de documento guardado en todas las sucursales');
      }

      if (primerResultado) {
        setIdGuardado(primerResultado.id);
      }
      setGuardado(true);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar el tipo de documento');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Descartar cambios',
      icon: <ExclamationCircleOutlined />,
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Descartar',
      okType: 'danger',
      cancelText: 'Continuar editando',
      onOk: () => {
        navigate('/MDocumento');
      },
    });
  };

  // ----- Select options -----
  const tipoOptions = [
    { value: 'compra', label: 'Compra' },
    { value: 'venta', label: 'Venta' },
    { value: 'ajuste', label: 'Ajuste' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'devolucion', label: 'Devolución' },
    { value: 'consignacion', label: 'Consignación' },
    { value: 'produccion', label: 'Producción' },
  ];

  const tipoNumeracionOptions = [
    { value: 0, label: 'Manual' },
    { value: 1, label: 'Automática' },
  ];

  const metodoAplicarOptions = [
    { value: 0, label: 'Manual' },
    { value: 1, label: 'Al Grabar' },
    { value: 2, label: 'Al Imprimir' },
  ];

  // ----- Sidebar content (shared between desktop Sider and mobile Drawer) -----
  const sidebarContent = (
    <>
      {/* Logo / brand */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #F0F0F0',
        }}
      >
        <Text strong style={{ fontSize: 18, letterSpacing: '-0.3px' }}>
          Genesis<span style={{ color: '#556ee6' }}>ERP</span>
        </Text>
      </div>

      <Menu
        mode="inline"
        selectedKeys={['settings']}
        defaultSelectedKeys={['settings']}
        items={menuItems}
        style={{ border: 'none', marginTop: 8 }}
      />

      {/* Bottom profile dummy */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #556ee6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          CJ
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>Carlos Jiménez</Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>carlos@solugen.do</Text>
        </div>
      </div>
    </>
  );

  if (loading) return <LoadingSpinner mensaje="Cargando documento..." />;

  return (
    <Layout style={{ minHeight: '100vh', background: '#F7F8FA' }}>
      {/* ================================================================ */}
      {/* Desktop Sider                                                  */}
      {/* ================================================================ */}
      {!isMobile && (
        <Sider
          width={240}
          style={{
            background: '#fff',
            borderRight: '1px solid #F0F0F0',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 10,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* ================================================================ */}
      {/* Mobile Drawer (sidebar overlay)                                 */}
      {/* ================================================================ */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          width={260}
          styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
          extra={<Button type="text" icon={<CloseOutlined />} onClick={() => setMobileOpen(false)} />}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : 240, background: '#F7F8FA', minHeight: '100vh' }}>
        {/* ============================================================ */}
        {/* Header bar                                                  */}
        {/* ============================================================ */}
        <div
          style={{
            padding: '8px 32px',
            background: '#fff',
            borderBottom: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 9,
            minHeight: isMobile ? 48 : 40,
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 18 }} />}
              onClick={() => setMobileOpen(true)}
            />
          )}
        </div>

        {/* ============================================================ */}
        {/* Scrollable content area                                     */}
        {/* ============================================================ */}
        <Content
          style={{
            padding: isMobile ? 16 : '24px 32px 40px',
            overflow: 'auto',
          }}
        >
          {/* ---- Toolbar ---- */}
          {guardado ? (
            <DetalleToolbar
              modulo="MDocumento"
              estado={0}
              periodo={new Date().getMonth() + 1}
              revisado={false}
              onVolver={() => navigate('/MDocumento')}
              onEditar={() => navigate(`/MDocumento/${idGuardado || id}/editar`)}
            />
          ) : (
            <FormularioToolbar
              saving={saving}
              onGuardar={handleGuardar}
              onCancelar={handleCancelar}
            />
          )}

          {/* ---- Page intro ---- */}
          <div style={{ marginBottom: 28, animation: 'fadeIn 0.3s ease' }}>
            <Text style={{ fontSize: 15, color: '#4B5563', display: 'block', maxWidth: 560 }}>
              Configure los parámetros del tipo de documento, incluyendo identificación, opciones de configuración y método de numeración.
            </Text>
          </div>

          {/* ========================================================== */}
          {/* 1. Identificación                                           */}
          {/* ========================================================== */}
          <Title level={5} style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
            Identificación
          </Title>

          <HoverableCard style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Código
                </Text>
                <Input
                  placeholder="Código del tipo de documento"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  maxLength={10}
                  disabled={mode === 'editar' || guardado}
                />
              </div>
              <div>
                <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Nombre
                </Text>
                <Input
                  placeholder="Nombre del tipo de documento"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={100}
                  disabled={guardado}
                />
              </div>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <div>
                    <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Tipo
                    </Text>
                    <Select
                      showSearch
                      placeholder="Seleccionar tipo"
                      optionFilterProp="label"
                      value={tipo}
                      onChange={setTipo}
                      style={{ width: '100%' }}
                      options={tipoOptions}
                      disabled={guardado}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12}>
                  <div>
                    <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                      Longitud código
                    </Text>
                    <InputNumber
                      placeholder="Longitud"
                      value={longitudCodigo}
                      onChange={(val) => setLongitudCodigo(val)}
                      min={1}
                      max={20}
                      style={{ width: '100%' }}
                      disabled={guardado}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          </HoverableCard>

          {/* ========================================================== */}
          {/* 2. Configuración                                           */}
          {/* ========================================================== */}
          <Title level={5} style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
            Configuración
          </Title>

          <HoverableCard style={{ marginBottom: 32 }}>
            <Row gutter={[16, 20]}>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Estado de cuenta</Text>
                    <Switch checked={estadoCuenta} onChange={setEstadoCuenta} disabled={guardado} />
                  </div>
              </Col>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Precios con impuestos</Text>
                    <Switch checked={preciosConImpuestos} onChange={setPreciosConImpuestos} disabled={guardado} />
                  </div>
              </Col>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Afecta inventario</Text>
                    <Switch checked={afectaInventario} onChange={setAfectaInventario} disabled={guardado} />
                  </div>
              </Col>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Requiere asiento</Text>
                    <Switch checked={requiereAsiento} onChange={setRequiereAsiento} disabled={guardado} />
                  </div>
              </Col>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Mod. precio</Text>
                    <Switch checked={modPrecio} onChange={setModPrecio} disabled={guardado} />
                  </div>
              </Col>
              <Col xs={12}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Mod. descripción</Text>
                    <Switch checked={modDescripcion} onChange={setModDescripcion} disabled={guardado} />
                  </div>
              </Col>
            </Row>
          </HoverableCard>

          {/* ========================================================== */}
          {/* 3. Numeración y método                                     */}
          {/* ========================================================== */}
          <Title level={5} style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
            Numeración y método
          </Title>

          <HoverableCard style={{ marginBottom: 32 }}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Tipo numeración
                  </Text>
                    <Select
                      showSearch
                      placeholder="Seleccionar tipo de numeración"
                      optionFilterProp="label"
                      value={tipoNumeracion}
                      onChange={setTipoNumeracion}
                      style={{ width: '100%' }}
                      options={tipoNumeracionOptions}
                      disabled={guardado}
                    />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Método aplicar
                  </Text>
                    <Select
                      showSearch
                      placeholder="Seleccionar método"
                      optionFilterProp="label"
                      value={metodoAplicar}
                      onChange={setMetodoAplicar}
                      style={{ width: '100%' }}
                      options={metodoAplicarOptions}
                      disabled={guardado}
                    />
                </div>
              </Col>
            </Row>
          </HoverableCard>

          {/* ========================================================== */}
          {/* 4. Avanzado                                                */}
          {/* ========================================================== */}
          <Title level={5} style={{ marginBottom: 16, fontSize: 15, fontWeight: 600 }}>
            Avanzado
          </Title>

          <HoverableCard style={{ marginBottom: 32 }}>
            {/* Primera fila: origenCuenta + tipoImpuesto */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Origen cuenta
                  </Text>
                  <Select
                    showSearch
                    placeholder="Seleccionar origen"
                    optionFilterProp="label"
                    value={origenCuenta}
                    onChange={setOrigenCuenta}
                    style={{ width: '100%' }}
                    options={[
                      { value: 0, label: 'Débito' },
                      { value: 1, label: 'Crédito' },
                      { value: 2, label: 'Desconocido' },
                    ]}
                    disabled={guardado}
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Tipo impuesto
                  </Text>
                  <Select
                    showSearch
                    placeholder="Seleccionar tipo impuesto"
                    optionFilterProp="label"
                    value={tipoImpuesto}
                    onChange={setTipoImpuesto}
                    style={{ width: '100%' }}
                    options={[
                      { value: 0, label: 'Venta' },
                      { value: 1, label: 'Compra' },
                      { value: 2, label: 'Ninguno' },
                    ]}
                    disabled={guardado}
                  />
                </div>
              </Col>
            </Row>

            {/* Segunda fila: metodoPosteo + fechaPermitida */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Método posteo
                  </Text>
                  <Select
                    showSearch
                    placeholder="Seleccionar método posteo"
                    optionFilterProp="label"
                    value={metodoPosteo}
                    onChange={setMetodoPosteo}
                    style={{ width: '100%' }}
                    options={[
                      { value: 0, label: 'Manual' },
                      { value: 1, label: 'Al Grabar' },
                      { value: 2, label: 'Al Imprimir' },
                      { value: 3, label: 'Al Aplicar' },
                    ]}
                    disabled={guardado}
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Fecha permitida
                  </Text>
                  <Select
                    showSearch
                    placeholder="Seleccionar fecha permitida"
                    optionFilterProp="label"
                    value={fechaPermitida}
                    onChange={setFechaPermitida}
                    style={{ width: '100%' }}
                    options={[
                      { value: 0, label: 'Ninguna' },
                      { value: 1, label: 'Todas' },
                      { value: 2, label: 'Mayor al Cierre' },
                      { value: 3, label: 'Mayor Documento Aplicado' },
                      { value: 4, label: 'Fecha del Día' },
                      { value: 5, label: 'Menor o Igual Fecha' },
                    ]}
                    disabled={guardado}
                  />
                </div>
              </Col>
            </Row>

            {/* Switches en grilla */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
              <Col xs={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Puede reimprimir</Text>
                  <Switch checked={puedeReimprimir} onChange={setPuedeReimprimir} disabled={guardado} />
                </div>
              </Col>
              <Col xs={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Recibe pagos</Text>
                  <Switch checked={recibePagos} onChange={setRecibePagos} disabled={guardado} />
                </div>
              </Col>
              <Col xs={8}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Documento contable</Text>
                  <Switch checked={documentoContable} onChange={setDocumentoContable} disabled={guardado} />
                </div>
              </Col>
            </Row>

            {/* Campos de texto */}
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    Documento reverso
                  </Text>
                  <Input
                    placeholder="Documento reverso"
                    value={documentoReverso}
                    onChange={(e) => setDocumentoReverso(e.target.value)}
                    maxLength={20}
                    disabled={guardado}
                  />
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div>
                  <Text style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 500, color: '#374151' }}>
                    ID externo
                  </Text>
                  <Input
                    placeholder="ID externo"
                    value={idExterno}
                    onChange={(e) => setIdExterno(e.target.value)}
                    maxLength={50}
                    disabled={guardado}
                  />
                </div>
              </Col>
            </Row>
          </HoverableCard>

          {/* ========================================================== */}
          {/* 5. Danger Zone                                             */}
          {/* ========================================================== */}
          <Title level={5} style={{ marginBottom: 16, fontSize: 15, fontWeight: 600, color: '#ef4444' }}>
            Danger Zone
          </Title>

          <HoverableCard
            style={{
              borderColor: '#fecaca',
              background: '#FFFBFB',
            }}
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <ExclamationCircleOutlined style={{ fontSize: 20, color: '#ef4444', marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 14, color: '#991b1b' }}>
                    Desactivar tipo de documento
                  </Text>
                  <Text style={{ fontSize: 13, color: '#b91c1c', display: 'block', marginTop: 2 }}>
                    Esta acción desactivará el tipo de documento. Los documentos existentes no se verán afectados, pero no podrá crear nuevos documentos con este tipo. Esta acción puede revertirse posteriormente.
                  </Text>
                </div>
              </div>
              <Button
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={handleDesactivarDocumento}
                style={{ borderRadius: 8, alignSelf: 'flex-start' }}
              >
                Desactivar documento
              </Button>
            </Space>
          </HoverableCard>

          {/* ---- Footer spacer ---- */}
          <div style={{ height: 40 }} />
        </Content>
      </Layout>

      {/* ============================================================ */}
      {/* Global keyframes for fade-in animation                      */}
      {/* ============================================================ */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

      `}</style>
    </Layout>
  );
};

export default DocumentosFormulario;
