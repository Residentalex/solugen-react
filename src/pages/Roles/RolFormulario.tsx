import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Checkbox, Spin, Skeleton, message, Grid, Collapse, Alert, Modal, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO } from '../../types/administracion';
import type { PantallaDTO, AuthPermisoEspecialDTO } from '../../types/auth';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';

type PermisoValor = { valor: boolean; valorNumerico?: number };

type PantallaPayload = { id: number; acciones: string[] };

type FirmaRol = {
  nombre: string;
  descripcion: string;
  activo?: boolean;
  pantallas: PantallaPayload[];
};

type ApiError = {
  response?: {
    data?: {
      errorMessage?: string;
      message?: string;
    };
  };
};

const obtenerMensajeError = (error: unknown, mensajePredeterminado: string) => {
  const apiError = error as ApiError;
  return (
    apiError.response?.data?.errorMessage ??
    apiError.response?.data?.message ??
    (error instanceof Error ? error.message : mensajePredeterminado)
  );
};

const obtenerFirmaRol = (rol: FirmaRol) => JSON.stringify(rol);

const construirClavePermiso = (pantallaId: number, permisoId: number) => `${pantallaId}-${permisoId}`;

const RolFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const screens = Grid.useBreakpoint();
  const securitySucursal = useAuthStore((s) => s.securitySucursal);

  const navigationConfirmedRef = useFormularioNavigation();

  const [dashboardPermisoChecked, setDashboardPermisoChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [pantallasDisponibles, setPantallasDisponibles] = useState<PantallaDTO[]>([]);
  // Catalogo de permisos especiales (id, codigo, nombre, tipoValor) — informacion de referencia
  const [catalogoPermisosEspeciales, setCatalogoPermisosEspeciales] = useState<AuthPermisoEspecialDTO[]>([]);
  // Valores de permisos por pantalla: clave "${pantallaId}-${permisoId}" → { valor, valorNumerico }
  const [permisosPorPantalla, setPermisosPorPantalla] = useState<Record<string, PermisoValor>>({});

  const bloqueoAccionRef = useRef(false);
  const rolGuardadoRef = useRef<RolFullDTO | null>(null);
  const firmaRolGuardadoRef = useRef<string | null>(null);
  const pantallasPermisosInicialesRef = useRef<Set<number>>(new Set());
  const interfazBloqueada = guardando || confirmandoCancelacion;

  // Deduplicar por id (safety: si backend devuelve la misma pantalla múltiples veces)
  const pantallasUnicas = useMemo(() => {
    const map = new Map<number, PantallaDTO>();
    for (const pp of pantallasDisponibles) {
      if (map.has(pp.id)) {
        const existing = map.get(pp.id)!;
        existing.acciones = [...new Set([...existing.acciones, ...pp.acciones])];
      } else {
        map.set(pp.id, { ...pp });
      }
    }
    return Array.from(map.values());
  }, [pantallasDisponibles]);

  // Agrupar por módulo → tipo
  const gruposPorModulo = useMemo(() => {
    const modulos = new Map<string, { nombre: string; tipos: Map<string, PantallaDTO[]> }>();
    for (const pp of pantallasUnicas) {
      const modsAsignados = pp.modulos || [];
      if (modsAsignados.length === 0) {
        // Sin módulo
        const keyMod = 'mod-0';
        if (!modulos.has(keyMod)) {
          modulos.set(keyMod, { nombre: 'Sin módulo', tipos: new Map() });
        }
        const modulo = modulos.get(keyMod)!;
        const tipo = pp.tipo || 'General';
        if (!modulo.tipos.has(tipo)) modulo.tipos.set(tipo, []);
        modulo.tipos.get(tipo)!.push(pp);
      } else {
        for (const m of modsAsignados) {
          const keyMod = `mod-${m.id}`;
          if (!modulos.has(keyMod)) {
            modulos.set(keyMod, { nombre: m.nombre || `Módulo ${m.id}`, tipos: new Map() });
          }
          const modulo = modulos.get(keyMod)!;
          const tipo = pp.tipo || 'General';
          if (!modulo.tipos.has(tipo)) modulo.tipos.set(tipo, []);
          modulo.tipos.get(tipo)!.push(pp);
        }
      }
    }
    return modulos;
  }, [pantallasUnicas]);
  const [selectedPantallas, setSelectedPantallas] = useState<Record<number, string[]>>({});
  const [rolData, setRolData] = useState<RolFullDTO | null>(null);
  const [form] = Form.useForm();

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    rolGuardadoRef.current = null;
    firmaRolGuardadoRef.current = null;
    try {
      const [pantallas] = await Promise.all([
        rolApi.obtenerPantallasDisponibles(securitySucursal),
      ]);
      setPantallasDisponibles(pantallas || []);

      if (id) {
        const rol = await rolApi.obtenerPorId(securitySucursal, parseInt(id));
        setRolData(rol);
        form.setFieldsValue({
          nombre: rol.nombre,
          descripcion: rol.descripcion,
          activo: rol.activo,
        });
        const sel: Record<number, string[]> = {};
        // El backend devuelve PantallaDTO[] plano, no PantallaFullDTO[] anidado
        for (const pp of rol.pantallas || []) {
          sel[pp.id] = [...(pp.acciones || [])];
        }
        setSelectedPantallas(sel);

        try {
          const result = await permisoEspecialApi.obtenerPorRol(securitySucursal, parseInt(id));
          // Construir catalogo deduplicado por id (para tener id, codigo, nombre, tipoValor)
          const catalogMap = new Map<number, AuthPermisoEspecialDTO>();
          for (const p of result || []) {
            if (!catalogMap.has(p.id)) {
              catalogMap.set(p.id, { id: p.id, codigo: p.codigo, nombre: p.nombre, activo: p.activo, valor: p.valor, tipoValor: p.tipoValor, valorNumerico: p.valorNumerico, pantallaId: p.pantallaId });
            }
          }
          setCatalogoPermisosEspeciales(Array.from(catalogMap.values()));
          // Construir mapa de valores por pantalla
          const map: Record<string, PermisoValor> = {};
          for (const p of result || []) {
            const pantallaId = p.pantallaId ?? 0;
            map[construirClavePermiso(pantallaId, p.id)] = { valor: p.valor, valorNumerico: p.valorNumerico };
          }
          setPermisosPorPantalla(map);
          // Pantallas que ya tienen permisos especiales: hay que reenviarlas al guardar para poder limpiarlas
          pantallasPermisosInicialesRef.current = new Set(
            result
              .map((p) => p.pantallaId)
              .filter((pantallaId): pantallaId is number => pantallaId != null),
          );
          // Cargar valor del permiso Dashboard si existe
          const dashboardPerm = result.find(
            (p) => p.codigo === 'PE_DASHBOARD_CONFIG' && (p.pantallaId === 0 || p.pantallaId == null),
          );
          if (dashboardPerm) {
            setDashboardPermisoChecked(dashboardPerm.valor);
          }
        } catch {
          // no crítico, los permisos especiales se cargan aparte
        }
      } else {
        form.setFieldsValue({ activo: true });

        try {
          const catalogo = await permisoEspecialApi.obtenerListado(securitySucursal);
          setCatalogoPermisosEspeciales((catalogo || []).filter(p => p.activo));
          // permisosPorPantalla se queda vacio (sin valores asignados aun)
        } catch { /* ignorar */ }
      }
    } catch (error) {
      message.error(obtenerMensajeError(error, 'Error al cargar datos'));
      setLoadingError(true);
      if (id) navigate('/MROL', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [form, id, navigate, securitySucursal]);

  useEffect(() => {
    setActiveModule('MROL');
    updateToolbar({});

    const temporizadorCarga = window.setTimeout(() => {
      void cargarDatos();
    }, 0);

    return () => {
      window.clearTimeout(temporizadorCarga);
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    void cargarDatos();
  }, [cargarDatos]);

  const handleToggleAccion = (pantallaId: number, accionCodigo: string, checked: boolean) => {
    if (interfazBloqueada) return;
    setSelectedPantallas((prev) => {
      const current = prev[pantallaId] || [];
      const updated = checked
        ? [...current, accionCodigo]
        : current.filter((a) => a !== accionCodigo);
      return { ...prev, [pantallaId]: updated };
    });
  };

  const handleTogglePantalla = (pantallaId: number, checked: boolean, todasAcciones: string[]) => {
    if (interfazBloqueada) return;
    setSelectedPantallas((prev) => ({
      ...prev,
      [pantallaId]: checked ? todasAcciones : [],
    }));
  };

  const handleToggleDashboardPermiso = (checked: boolean) => {
    if (interfazBloqueada) return;
    setDashboardPermisoChecked(checked);
    // Also update the global permisosPorPantalla for consistency
    const permisoCatalogo = catalogoPermisosEspeciales.find(p => p.codigo === 'PE_DASHBOARD_CONFIG');
    if (permisoCatalogo) {
      const key = construirClavePermiso(0, permisoCatalogo.id);
      setPermisosPorPantalla((prev) => ({
        ...prev,
        [key]: { valor: checked, valorNumerico: prev[key]?.valorNumerico },
      }));
    }
  };

  const handleTogglePermisoEspecial = (pantallaId: number, permisoId: number, checked: boolean, valorNumerico?: number) => {
    if (interfazBloqueada) return;
    const key = construirClavePermiso(pantallaId, permisoId);
    setPermisosPorPantalla((prev) => ({
      ...prev,
      [key]: { valor: checked, valorNumerico: valorNumerico ?? prev[key]?.valorNumerico },
    }));
  };

  // Reenvía TODAS las pantallas con permisos especiales (las iniciales + las tocadas ahora),
  // enviando la lista activa. Así desmarcar un permiso sí lo quita en el backend.
  const guardarPermisosEspeciales = async (rolId: number) => {
    const pantallasAProcesar = new Set<number>([
      ...pantallasPermisosInicialesRef.current,
      ...Object.keys(permisosPorPantalla)
        .map((clave) => Number(clave.split('-')[0]))
        .filter((pantallaId) => Number.isInteger(pantallaId)),
    ]);

    await Promise.all(
      [...pantallasAProcesar].map((pantallaId) => {
        const activos = catalogoPermisosEspeciales.flatMap((permiso) => {
          const valor = permisosPorPantalla[construirClavePermiso(pantallaId, permiso.id)];
          if (!valor) return [];
          const esNumerico = permiso.tipoValor === 'NUMERICO';
          if (esNumerico) {
            const valorNumerico = valor.valorNumerico ?? 0;
            return valorNumerico > 0 ? [{ permisoId: permiso.id, valor: true, valorNumerico }] : [];
          }
          return valor.valor ? [{ permisoId: permiso.id, valor: true }] : [];
        });

        return permisoEspecialApi.asignarARol(securitySucursal, rolId, pantallaId, activos);
      }),
    );

    pantallasPermisosInicialesRef.current = new Set(pantallasAProcesar);
  };

  const guardar = async () => {
    if (bloqueoAccionRef.current || guardando) return;

    bloqueoAccionRef.current = true;
    try {
      const values = await form.validateFields();
      setGuardando(true);
      // El backend espera PantallaDTO[] plano: { id, acciones: string[] }
      const pantallasPayload: PantallaPayload[] = Object.entries(selectedPantallas)
        .filter(([, accs]) => accs.length > 0)
        .map(([pantallaId, accs]) => ({
          id: parseInt(pantallaId),
          acciones: accs,
        }));
      const payload = {
        id: rolData?.id || 0,
        nombre: values.nombre,
        descripcion: values.descripcion || '',
        activo: values.activo ?? true,
        pantallas: pantallasPayload,
      };

      const firmaRol = obtenerFirmaRol(payload);
      const rolPersistido = rolGuardadoRef.current;

      // Firma: si el rol ya se guardó en esta sesión y no cambió, no se vuelve a llamar la API
      if (rolPersistido && firmaRolGuardadoRef.current === firmaRol) {
        try {
          await guardarPermisosEspeciales(rolPersistido.id);
        } catch (error) {
          message.warning(
            `El rol no cambió, pero no se pudieron actualizar sus permisos especiales: ${obtenerMensajeError(error, 'error desconocido')}`,
          );
        }
        message.success('No había cambios que guardar.');
        navigationConfirmedRef.current = true;
        navigate('/MROL', { replace: true });
        return;
      }

      let rolGuardado: RolFullDTO;
      if (id) {
        rolGuardado = await rolApi.actualizar(securitySucursal, payload);
        message.success('Rol actualizado correctamente');
      } else {
        rolGuardado = await rolApi.crear(securitySucursal, payload);
        message.success('Rol creado correctamente');
      }

      try {
        await guardarPermisosEspeciales(rolGuardado.id);
      } catch (error) {
        message.warning(
          `El rol fue guardado, pero no se pudieron completar sus permisos especiales: ${obtenerMensajeError(error, 'error desconocido')}`,
        );
        return;
      }

      rolGuardadoRef.current = rolGuardado;
      firmaRolGuardadoRef.current = firmaRol;
      navigationConfirmedRef.current = true;
      navigate('/MROL', { replace: true });
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(obtenerMensajeError(error, 'Error al guardar rol'));
    } finally {
      bloqueoAccionRef.current = false;
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    if (bloqueoAccionRef.current || guardando) return;

    bloqueoAccionRef.current = true;
    setConfirmandoCancelacion(true);
    let navegando = false;

    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navegando = true;
        navigationConfirmedRef.current = true;
        navigate('/MROL', { replace: true });
      },
      afterClose: () => {
        if (!navegando) {
          bloqueoAccionRef.current = false;
          setConfirmandoCancelacion(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const isSmall = !screens.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 140px)' }}>
      {loadingError && (
        <Alert
          message="Error al cargar formulario de rol"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" disabled={interfazBloqueada} onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      {/* Toolbar */}
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
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {id ? 'Editar Rol' : 'Nuevo Rol'}
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<ArrowLeftOutlined />} disabled={interfazBloqueada} onClick={handleCancelar}>
            Volver
          </Button>
          <PermissionGate accion={id ? 'EDITAR' : 'CREAR'}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={guardando}
              disabled={Boolean(loadingError) || confirmandoCancelacion}
              onClick={() => void guardar()}
            >
              Guardar
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        <Col xs={24} md={8}>
          {/* Formulario */}
          <Card className="paces-card" style={{ height: '100%' }}>
            <Form
              form={form}
              layout="vertical"
              size={isSmall ? 'middle' : undefined}
              disabled={interfazBloqueada}
            >
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Nombre del rol" />
              </Form.Item>
              <Form.Item name="descripcion" label="Descripción">
                <Input.TextArea rows={3} placeholder="Descripción del rol" />
              </Form.Item>
              <Form.Item name="activo" label="Estado" valuePropName="checked" initialValue={true}>
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Form>
            {id && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--paces-border)' }}>
                <div className="paces-text-muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  Usuarios Asignados ({rolData?.nombresUsuarios?.length || 0})
                </div>
                {(rolData?.nombresUsuarios || []).length === 0 ? (
                  <span className="paces-text-muted" style={{ fontSize: 13 }}>Sin usuarios</span>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(rolData?.nombresUsuarios || []).map((nombre, i) => (
                      <Tag key={i} color="geekblue">{nombre}</Tag>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={16} style={{ height: '100%' }}>
          {/* Dashboard global permission */}
          {(() => {
            const dashboardPermisoCatalogo = catalogoPermisosEspeciales.find(p => p.codigo === 'PE_DASHBOARD_CONFIG');
            if (!dashboardPermisoCatalogo) return null;
            return (
              <Card
                className="paces-card"
                title={
                  <span style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>◈</span>
                    Dashboard
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Checkbox
                    checked={dashboardPermisoChecked}
                    disabled={interfazBloqueada}
                    onChange={(e) => handleToggleDashboardPermiso(e.target.checked)}
                  >
                    <span style={{ fontSize: 13 }}>{dashboardPermisoCatalogo.nombre || 'PE_DASHBOARD_CONFIG'}</span>
                  </Checkbox>
                  <Tag color="purple" style={{ fontSize: 11 }}>Global</Tag>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--paces-text-muted)' }}>
                  Permite configurar qué widgets del dashboard son visibles por rol.
                </div>
              </Card>
            );
          })()}
          {/* Permisos por Pantalla */}
          <Card className="paces-card" title="Permisos por Pantalla" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} styles={{ body: { flex: 1, overflow: 'auto', padding: 16 } }}>
        {pantallasUnicas.length === 0 ? (
          <Spin size="small" />
        ) : (
          <div style={{ padding: 4 }}>
            <Collapse
              ghost
              defaultActiveKey={[]}
              items={Array.from(gruposPorModulo.entries()).map(([key, modulo]) => ({
                key,
                label: (
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#556ee6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>◈</span>
                    {modulo.nombre}
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: 8 }}>
                    {Array.from(modulo.tipos.entries()).map(([tipo, pantallas]) => (
                      <div key={tipo} style={{ marginBottom: 16 }}>
                        {tipo !== 'General' && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              color: '#8c8c8c',
                              marginBottom: 8,
                              paddingLeft: 4,
                            }}
                          >
                            {tipo}
                          </div>
                        )}
                        {pantallas.map((pp) => {
                          const pantallaId = pp.id;
                          const selected = selectedPantallas[pantallaId] || [];
                          const todas = pp.acciones;
                          const todasSeleccionadas =
                            todas.length > 0 && todas.every((a) => selected.includes(a));
                          const algunaSeleccionada = selected.length > 0;
                          return (
                            <div
                              key={`p-${pantallaId}`}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                padding: '6px 8px',
                                borderRadius: 6,
                                marginBottom: 4,
                                background: algunaSeleccionada ? 'var(--paces-selected-bg)' : 'var(--paces-topbar-search-bg)',
                                border: algunaSeleccionada
                                  ? '1px solid var(--paces-primary)'
                                  : '1px solid transparent',
                                flexWrap: 'wrap',
                                gap: 4,
                              }}
                            >
                              <Checkbox
                                checked={todasSeleccionadas}
                                indeterminate={algunaSeleccionada && !todasSeleccionadas}
                                disabled={interfazBloqueada}
                                onChange={(e) =>
                                  handleTogglePantalla(pantallaId, e.target.checked, todas)
                                }
                                style={{
                                  minWidth: 150,
                                  fontWeight: 500,
                                  fontSize: 13,
                                  flexShrink: 0,
                                }}
                              >
                                {pp.nombre}
                              </Checkbox>
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 3,
                                  alignItems: 'center',
                                }}
                              >
                                {pp.acciones.map((acc) => (
                                  <div
                                    key={`${pantallaId}-${acc}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      padding: '1px 2px',
                                      borderRadius: 4,
                                      background: selected.includes(acc)
                                        ? 'var(--paces-hover-bg)'
                                        : 'transparent',
                                      border: selected.includes(acc)
                                        ? '1px solid var(--paces-primary)'
                                        : '1px solid var(--paces-border)',
                                    }}
                                  >
                                    <Checkbox
                                      checked={selected.includes(acc)}
                                      disabled={interfazBloqueada}
                                      onChange={(e) =>
                                        handleToggleAccion(pantallaId, acc, e.target.checked)
                                      }
                                      style={{ fontSize: 12, marginRight: 0 }}
                                    >
                                      <span style={{ fontSize: 12 }}>{acc}</span>
                                    </Checkbox>
                                  </div>
                                 ))}
                              </div>
                              {/* Permisos especiales de la pantalla */}
                              {pp.permisosEspeciales && pp.permisosEspeciales.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4, marginLeft: 24, width: '100%' }}>
                                  {pp.permisosEspeciales.map((peCodigo) => {
                                    const permisoCatalogo = catalogoPermisosEspeciales.find(p => p.codigo === peCodigo);
                                    if (!permisoCatalogo) return null;
                                    const key = construirClavePermiso(pantallaId, permisoCatalogo.id);
                                    // Buscar valor especifico de esta pantalla, o global (pantallaId=0) como fallback
                                    const valorActual =
                                      permisosPorPantalla[key] ??
                                      permisosPorPantalla[construirClavePermiso(0, permisoCatalogo.id)] ?? {
                                        valor: false,
                                      };
                                    const esNumerico = permisoCatalogo.tipoValor === 'NUMERICO';
                                    const checked = valorActual.valor;
                                    return (
                                      <div key={peCodigo}
                                        style={{
                                          display: 'inline-flex', alignItems: 'center', padding: '1px 2px',
                                          borderRadius: 4, fontSize: 11,
                                          background: checked ? 'var(--paces-selected-bg)' : 'transparent',
                                          border: checked ? '1px solid var(--paces-primary)' : '1px solid var(--paces-border)',
                                          gap: 4,
                                        }}
                                      >
                                        {esNumerico ? (
                                          <>
                                            <span style={{ fontSize: 11, marginRight: 2 }}>{permisoCatalogo.nombre || peCodigo}:</span>
                                            <InputNumber
                                              min={0}
                                              step={0.01}
                                              size="small"
                                              style={{ width: 90 }}
                                              value={valorActual.valorNumerico}
                                              disabled={interfazBloqueada}
                                              onChange={(val) => {
                                                handleTogglePermisoEspecial(pantallaId, permisoCatalogo.id, true, val ?? 0);
                                              }}
                                              placeholder="Tope"
                                            />
                                          </>
                                        ) : (
                                          <Checkbox
                                            checked={checked}
                                            disabled={interfazBloqueada}
                                            onChange={(e) => {
                                              handleTogglePermisoEspecial(pantallaId, permisoCatalogo.id, e.target.checked);
                                            }}
                                            style={{ fontSize: 11, marginRight: 0 }}
                                          >
                                            <span style={{ fontSize: 11 }}>{permisoCatalogo.nombre || peCodigo}</span>
                                          </Checkbox>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ),
              }))}
            />
          </div>
        )}
        {/* Permisos especiales ahora se muestran dentro de cada pantalla */}
      </Card>
          </Col>
        </Row>
    </div>
  );
};

export default RolFormulario;