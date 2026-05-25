import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Form, Input, Switch, Checkbox, Spin, message, Grid, Collapse } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import { rolApi } from '../../api/rolApi';
import type { RolFullDTO } from '../../types/administracion';
import type { PantallaDTO } from '../../types/auth';
import { useMemo } from 'react';

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const RolFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const screens = Grid.useBreakpoint();

  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [pantallasDisponibles, setPantallasDisponibles] = useState<PantallaDTO[]>([]);

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
        rolApi.obtenerPantallasDisponibles(SUCURSAL_SEGURIDAD),
      ]);
      setPantallasDisponibles(pantallas || []);

      if (id) {
        const rol = await rolApi.obtenerPorId(SUCURSAL_SEGURIDAD, parseInt(id));
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
      } else {
        form.setFieldsValue({ activo: true });
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      if (id) navigate('/MROL');
    } finally {
      setLoading(false);
    }
  };

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
      if (id) {
        await rolApi.actualizar(SUCURSAL_SEGURIDAD, payload);
        message.success('Rol actualizado correctamente');
      } else {
        await rolApi.crear(SUCURSAL_SEGURIDAD, payload);
        message.success('Rol creado correctamente');
      }
      navigate('/MROL');
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
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MROL')}>
            Volver
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={guardando} onClick={guardar}>
            Guardar
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ flex: 1 }}>
        <Col xs={24} md={8}>
          {/* Formulario */}
          <Card className="paces-card" style={{ height: '100%' }}>
            <Form form={form} layout="vertical" size={isSmall ? 'middle' : 'default'}>
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
                                background: algunaSeleccionada ? '#f0f5ff' : '#fafafa',
                                border: algunaSeleccionada
                                  ? '1px solid #d6e4ff'
                                  : '1px solid #f0f0f0',
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
                                        ? '#e6f7ff'
                                        : '#fff',
                                      border: selected.includes(acc)
                                        ? '1px solid #91d5ff'
                                        : '1px solid #d9d9d9',
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
      </Card>
          </Col>
        </Row>
    </div>
  );
};

export default RolFormulario;
