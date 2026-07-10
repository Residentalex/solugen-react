import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, InputNumber, Switch, Checkbox, Spin, message, Grid, Collapse, Alert, Modal } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO } from '../../types/administracion';
import type { PantallaDTO, AuthPermisoEspecialDTO } from '../../types/auth';
import { useMemo } from 'react';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';

const RolFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const screens = Grid.useBreakpoint();
  const securitySucursal = useAuthStore((s) => s.securitySucursal);

  const navigationConfirmedRef = useFormularioNavigation();

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pantallasDisponibles, setPantallasDisponibles] = useState<PantallaDTO[]>([]);
  // Catalogo de permisos especiales (id, codigo, nombre, tipoValor) — informacion de referencia
  const [catalogoPermisosEspeciales, setCatalogoPermisosEspeciales] = useState<AuthPermisoEspecialDTO[]>([]);
  // Valores de permisos por pantalla: clave "${pantallaId}-${permisoId}" → { valor, valorNumerico }
  const [permisosPorPantalla, setPermisosPorPantalla] = useState<Record<string, { valor: boolean; valorNumerico?: number }>>({});
  const [cargandoPermisosEspeciales, setCargandoPermisosEspeciales] = useState(false);

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
      const modsAsignados = (pp as any).modulos || [];
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

  useEffect(() => {
    setActiveModule('MROL');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cargarDatos = async () => {
    setLoading(true);
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
        const pantallas = (rol.pantallas || []) as any[];
        for (const pp of pantallas) {
          sel[pp.id] = [...(pp.acciones || [])];
        }
        setSelectedPantallas(sel);

        setCargandoPermisosEspeciales(true);
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
          const map: Record<string, { valor: boolean; valorNumerico?: number }> = {};
          for (const p of result || []) {
            const pantallaId = p.pantallaId ?? 0;
            const key = `${pantallaId}-${p.id}`;
            map[key] = { valor: p.valor, valorNumerico: p.valorNumerico };
          }
          setPermisosPorPantalla(map);
        } catch {
          // no crítico, los permisos especiales se cargan aparte
        } finally {
          setCargandoPermisosEspeciales(false);
        }
      } else {
        form.setFieldsValue({ activo: true });

        try {
          const catalogo = await permisoEspecialApi.obtenerListado(securitySucursal);
          setCatalogoPermisosEspeciales((catalogo || []).filter(p => p.activo));
          // permisosPorPantalla se queda vacio (sin valores asignados aun)
        } catch { /* ignorar */ }
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      setLoadingError(true);
      if (id) navigate('/MROL', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    cargarDatos();
    setLoadingError(false);
  }, [id]);

  const handleToggleAccion = (pantallaId: number, accionCodigo: string, checked: boolean) => {
    setSelectedPantallas((prev) => {
      const current = prev[pantallaId] || [];
      const updated = checked
        ? [...current, accionCodigo]
        : current.filter((a) => a !== accionCodigo);
      return { ...prev, [pantallaId]: updated };
    });
  };

  const handleTogglePantalla = (pantallaId: number, checked: boolean, todasAcciones: string[]) => {
    setSelectedPantallas((prev) => ({
      ...prev,
      [pantallaId]: checked ? todasAcciones : [],
    }));
  };

  const handleTogglePermisoEspecial = (pantallaId: number, permisoId: number, checked: boolean, valorNumerico?: number) => {
    const key = `${pantallaId}-${permisoId}`;
    setPermisosPorPantalla((prev) => ({
      ...prev,
      [key]: { valor: checked, valorNumerico: valorNumerico ?? prev[key]?.valorNumerico },
    }));
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      // El backend espera PantallaDTO[] plano: { id, acciones: string[] }
      const pantallasPayload = Object.entries(selectedPantallas)
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
      let rolId = rolData?.id || 0;
      if (id) {
        await rolApi.actualizar(securitySucursal, payload as any);
        message.success('Rol actualizado correctamente');
      } else {
        const creado = await rolApi.crear(securitySucursal, payload as any);
        rolId = creado.id;
        message.success('Rol creado correctamente');
      }

      try {
        // Agrupar permisos por pantallaId
        const permisosPorPantallaId: Record<number, { permisoId: number; valor: boolean; valorNumerico?: number }[]> = {};
        for (const [key, val] of Object.entries(permisosPorPantalla)) {
          const [pantallaIdStr, permisoIdStr] = key.split('-');
          const pantallaId = parseInt(pantallaIdStr, 10);
          const permisoId = parseInt(permisoIdStr, 10);
          if (!val.valor && !((val.valorNumerico ?? 0) > 0)) continue;
          if (!permisosPorPantallaId[pantallaId]) permisosPorPantallaId[pantallaId] = [];
          const permCatalogo = catalogoPermisosEspeciales.find(p => p.id === permisoId);
          permisosPorPantallaId[pantallaId].push({
            permisoId,
            valor: val.valor,
            valorNumerico: permCatalogo?.tipoValor === 'NUMERICO' ? val.valorNumerico : undefined,
          });
        }
        for (const [pantallaId, payloadPermisos] of Object.entries(permisosPorPantallaId)) {
          if (payloadPermisos.length > 0) {
            await permisoEspecialApi.asignarARol(securitySucursal, rolId, parseInt(pantallaId), payloadPermisos);
          }
        }
      } catch {
        // no crítico, el rol ya se guardó
      }

      navigationConfirmedRef.current = true;
      navigate('/MROL', { replace: true });
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar rol');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando...</div>
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
            <Button size="small" onClick={handleRefresh}>
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => {
            Modal.confirm({
              title: 'Cancelar',
              icon: <ExclamationCircleOutlined />,
              content: '¿Está seguro que desea cancelar los cambios realizados?',
              okText: 'Si, cancelar',
              cancelText: 'No, continuar editando',
              okButtonProps: { danger: true },
              onOk: () => {
                navigationConfirmedRef.current = true;
                navigate('/MROL', { replace: true });
              },
            });
          }}>
            Volver
          </Button>
          <PermissionGate accion={id ? 'EDITAR' : 'CREAR'}>
            <Button type="primary" icon={<SaveOutlined />} loading={guardando} onClick={guardar}>
              Guardar
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        <Col xs={24} md={8}>
          {/* Formulario */}
          <Card className="paces-card" style={{ height: '100%' }}>
            <Form form={form} layout="vertical" size={isSmall ? 'middle' : undefined}>
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
          </Card>
        </Col>
        <Col xs={24} md={16} style={{ height: '100%' }}>
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
                                    const key = `${pantallaId}-${permisoCatalogo.id}`;
                                    // Buscar valor especifico de esta pantalla, o global (pantallaId=0) como fallback
                                    const valorActual = permisosPorPantalla[key] ?? permisosPorPantalla[`0-${permisoCatalogo.id}`] ?? { valor: false };
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
                                              onChange={(val) => {
                                                handleTogglePermisoEspecial(pantallaId, permisoCatalogo.id, true, val ?? 0);
                                              }}
                                              placeholder="Tope"
                                            />
                                          </>
                                        ) : (
                                          <Checkbox
                                            checked={checked}
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
