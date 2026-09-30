import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Table, Checkbox, InputNumber, Button, Space, Select, Input,
  Typography, Row, Col, message, Spin, Alert, Divider, Tag
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, SettingOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardWidgetStore } from '../../stores/dashboardWidgetStore';
import { rolApi } from '../../api/rolApi';
import PermissionEspecialGate from '../../components/PermissionEspecialGate';
import type { DashboardWidgetDto, DashboardWidgetConfigDto } from '../../types/dashboard';
import type { RolFullDTO } from '../../types/administracion';

const { Text, Title } = Typography;

const zonaWidget = (codigo: string): string => {
  const mapa: Record<string, string> = {
    izquierda: 'Izquierda', derecha: 'Derecha', centro: 'Centro',
    arriba: 'Arriba', abajo: 'Abajo', principal: 'Principal',
    sec: 'Secundaria', aux: 'Auxiliar',
  };
  return mapa[codigo?.toLowerCase()] || (codigo ? codigo.toUpperCase() : '-');
};

const obtenerMensajeError = (error: unknown, mensajePredeterminado: string) => {
  const apiError = error as {
    response?: { data?: { errorMessage?: string; message?: string } };
  };
  return (
    apiError.response?.data?.errorMessage ??
    apiError.response?.data?.message ??
    (error instanceof Error ? error.message : mensajePredeterminado)
  );
};

/**
 * Página de configuración de widgets del dashboard por rol
 *
 * Solo usuarios con el permiso ADMIN_DASHBOARD_CONFIG pueden acceder.
 * Permite ver y modificar qué widgets son visibles para cada rol.
 */
const ConfiguracionDashboard: React.FC = () => {
  const securitySucursal = useAuthStore((s) => s.securitySucursal);
  const { catalog, widgetsPorRol, loading, saving, guardando, fetchCatalog, fetchWidgetsPorRol, guardarConfiguracion } =
    useDashboardWidgetStore();

  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [configs, setConfigs] = useState<Map<number, DashboardWidgetConfigDto>>(new Map());
  const [dirty, setDirty] = useState(false);
  const [roles, setRoles] = useState<RolFullDTO[]>([]);
  const [cargandoRoles, setCargandoRoles] = useState(false);

  const cargarRoles = useCallback(async () => {
    setCargandoRoles(true);
    try {
      const data = await rolApi.obtenerListado(securitySucursal);
      setRoles(data ?? []);
    } catch (err) {
      setRoles([]);
      message.error(obtenerMensajeError(err, 'Error al cargar los roles'));
    } finally {
      setCargandoRoles(false);
    }
  }, [securitySucursal]);

  // Catálogo de roles del sistema (no solo los del usuario actual)
  const rolesDisponibles = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.nombre })),
    [roles]
  );

  // Widgets actualmente cargados para el rol seleccionado
  const widgetsDelRol = useMemo(() => {
    if (!rolSeleccionado) return [];
    return widgetsPorRol.get(rolSeleccionado) || [];
  }, [widgetsPorRol, rolSeleccionado]);

  // Cargar catálogo de widgets y catálogo de roles al montar
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    const temporizadorCarga = window.setTimeout(() => {
      void cargarRoles();
    }, 0);
    return () => window.clearTimeout(temporizadorCarga);
  }, [cargarRoles]);

  // Cuando cambia el rol seleccionado, cargar sus widgets
  useEffect(() => {
    if (rolSeleccionado) {
      fetchWidgetsPorRol(rolSeleccionado);
    }
  }, [rolSeleccionado, fetchWidgetsPorRol]);

  // Sincronizar configs con los widgets del rol cuando cargan
  useEffect(() => {
    if (widgetsDelRol.length > 0) {
      const newConfigs = new Map<number, DashboardWidgetConfigDto>();
      widgetsDelRol.forEach(w => {
        newConfigs.set(w.id, {
          widgetId: w.id,
          visible: w.visible ?? false,
          ordenPersonalizado: w.ordenPersonalizado,
        });
      });
      setConfigs(newConfigs);
      setDirty(false);
    } else if (rolSeleccionado) {
      // Si el rol seleccionado no tiene widgets, limpiar las configs
      setConfigs(new Map<number, DashboardWidgetConfigDto>());
      setDirty(false);
    }
  }, [widgetsDelRol, rolSeleccionado]);

  // Agregar widget del catálogo que no esté en configs (visible = false por defecto)
  useEffect(() => {
    if (catalog.length > 0 && rolSeleccionado) {
      const newConfigs = new Map(configs);
      let changed = false;
      catalog.forEach(w => {
        if (!newConfigs.has(w.id)) {
          newConfigs.set(w.id, {
            widgetId: w.id,
            visible: false,
            ordenPersonalizado: undefined,
          });
          changed = true;
        }
      });
      if (changed) {
        setConfigs(newConfigs);
        // No marcar como dirty automáticamente: los nuevos widgets del catálogo
        // se cargan con visible=false; solo el usuario debe activar los cambios.
      }
    }
  }, [catalog, rolSeleccionado, configs]);

  const handleToggleVisible = (widgetId: number, checked: boolean) => {
    const newConfigs = new Map(configs);
    const existing = newConfigs.get(widgetId);
    if (existing) {
      newConfigs.set(widgetId, { ...existing, visible: checked });
    } else {
      newConfigs.set(widgetId, { widgetId, visible: checked });
    }
    setConfigs(newConfigs);
    setDirty(true);
  };

  const handleOrdenChange = (widgetId: number, orden: number | null) => {
    const newConfigs = new Map(configs);
    const existing = newConfigs.get(widgetId);
    if (existing) {
      newConfigs.set(widgetId, { ...existing, ordenPersonalizado: orden ?? undefined });
    }
    setConfigs(newConfigs);
    setDirty(true);
  };

const [busquedaWidgets, setBusquedaWidgets] = useState('');

  // Candado compartido: mientras se guarda o recarga, bloquear todas las acciones
  const bloqueado = guardando || saving || loading;

  const catalogFiltrado = useMemo(() => {
    if (!busquedaWidgets.trim()) return catalog;
    const q = busquedaWidgets.toLowerCase();
    return catalog.filter(
      (w) =>
        w.nombre.toLowerCase().includes(q) ||
        (w.codigo && w.codigo.toLowerCase().includes(q)) ||
        (w.description && w.description.toLowerCase().includes(q))
    );
  }, [catalog, busquedaWidgets]);

  const handleGuardar = async () => {
    if (!rolSeleccionado) {
      message.warning('Seleccionar un rol primero');
      return;
    }
    const configsArray = Array.from(configs.values());
    const success = await guardarConfiguracion(rolSeleccionado, configsArray);
    if (success) {
      setDirty(false);
    }
  };

  const handleReset = () => {
    if (rolSeleccionado) {
      fetchWidgetsPorRol(rolSeleccionado);
    }
  };

  const handleCambiarRol = (value: number | null) => {
    if (dirty && !bloqueado) {
      message.warning('Tiene cambios sin guardar. Guarde o descarte antes de cambiar de rol.');
      return;
    }
    setRolSeleccionado(value);
  };

  const columns = [
    {
      title: 'Widget',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string, record: DashboardWidgetDto) => (
        <div>
          <Text strong>{nombre}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.descripcion}</Text>
        </div>
      ),
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 160,
      render: (codigo: string) => <Text code>{codigo}</Text>,
    },
    {
      title: 'Zona',
      dataIndex: 'codigo',
      key: 'zona',
      width: 100,
      align: 'center' as const,
      render: (codigo: string) => (
        <Text style={{ fontSize: 11, color: '#556ee6', fontWeight: 500 }}>{zonaWidget(codigo)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'visible',
      key: 'estado',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: DashboardWidgetDto) => {
        const visible = configs.get(record.id)?.visible ?? false;
        return (
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 500,
            background: visible ? '#e6f4ea' : '#f5f5f5',
            color: visible ? '#10b981' : '#6b7280',
            border: visible ? '1px solid #d1e6d8' : '1px solid #e2e5ec',
          }}>
            {visible ? 'Visible' : 'Oculto'}
          </span>
        );
      },
    },
    {
      title: 'Visible',
      dataIndex: 'visible',
      key: 'visible',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DashboardWidgetDto) => (
        <Checkbox
          checked={configs.get(record.id)?.visible ?? false}
          onChange={(e) => handleToggleVisible(record.id, e.target.checked)}
          disabled={bloqueado}
        />
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'ordenPersonalizado',
      key: 'ordenPersonalizado',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: DashboardWidgetDto) => (
        <InputNumber
          min={0}
          value={configs.get(record.id)?.ordenPersonalizado ?? record.orden}
          onChange={(val) => handleOrdenChange(record.id, val)}
          style={{ width: '100%' }}
          placeholder={`Default: ${record.orden}`}
          disabled={bloqueado}
        />
      ),
    },
  ];

  // Contenido para usuarios sin permiso
  const sinPermisoContent = (
    <div style={{ padding: 48, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ fontSize: 48, color: '#d48806', marginBottom: 16 }}>
        <SettingOutlined />
      </div>
      <Title level={4} style={{ marginBottom: 8 }}>Configuración no disponible</Title>
      <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 24 }}>
        No tienes el permiso <Text code>PE_DASHBOARD_CONFIG</Text> para configurar los widgets del dashboard por rol.
      </Text>
      <Alert
        message="¿Qué puedes hacer?"
        description="Contacta a un administrador con permisos especiales para que te asigne la configuración adecuada o solicite acceso en tu nombre."
        type="warning"
        showIcon
        style={{ textAlign: 'left', borderRadius: 8 }}
      />
    </div>
  );

  return (
    <PermissionEspecialGate permiso="PE_DASHBOARD_CONFIG" fallback={sinPermisoContent}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <SettingOutlined /> Configuración de Dashboard por Rol
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Define qué widgets del dashboard puede ver cada <strong>rol de usuario</strong> (perfil de empresa). Los cambios se aplican inmediatamente después de guardar.
          </Text>
        </div>

        <Row gutter={16} style={{ marginBottom: 24, position: 'sticky', top: 0, zIndex: 2, background: '#fff', padding: '8px 0', borderBottom: '1px solid #e2e5ec' }}>
          <Col xs={24} sm={8} lg={8}>
            <Text strong>Seleccionar Rol:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Seleccione un rol"
              value={rolSeleccionado}
              onChange={handleCambiarRol}
              options={rolesDisponibles}
              loading={cargandoRoles}
              disabled={bloqueado}
              notFoundContent={cargandoRoles ? 'Cargando roles...' : 'No hay roles disponibles'}
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} sm={16} lg={16} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar widget..."
              allowClear
              value={busquedaWidgets}
              onChange={(e) => setBusquedaWidgets(e.target.value)}
              style={{ width: 240, maxWidth: '100%' }}
              size="middle"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={!rolSeleccionado || bloqueado}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleGuardar}
              loading={saving}
              disabled={!rolSeleccionado || !dirty || bloqueado}
            >
              Guardar Cambios
            </Button>
            {dirty && (
              <Tag color="warning" icon={<SettingOutlined />}>Cambios pendientes</Tag>
            )}
          </Col>
        </Row>

        {!rolSeleccionado && (
          <Alert
            message="Seleccione un rol"
            description="Debe seleccionar un rol para ver y configurar sus widgets."
            type="info"
            showIcon
          />
        )}

        {loading && rolSeleccionado && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Cargando widgets...</Text>
            </div>
          </div>
        )}

        {!loading && rolSeleccionado && (
          <>
            {/* Vista previa del resultado */}
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f8f9fb', borderRadius: 8, border: '1px solid #e2e5ec' }}>
              <Text strong style={{ fontSize: 13, color: '#374151', display: 'block', marginBottom: 8 }}>Vista previa por rol seleccionado</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Array.from(configs.values())
                  .filter(c => c.visible)
                  .sort((a, b) => (a.ordenPersonalizado ?? 99) - (b.ordenPersonalizado ?? 99))
                  .map(c => {
                    const w = catalog.find(w => w.id === c.widgetId);
                    return (
                      <span key={c.widgetId} style={{
                        padding: '4px 10px', borderRadius: 12, fontSize: 11,
                        background: '#e6f4ea', color: '#10b981', border: '1px solid #d1e6d8', fontWeight: 500,
                      }}>
                        {w?.nombre ?? `Widget ${c.widgetId}`}
                      </span>
                    );
                  })}
                {Array.from(configs.values()).filter(c => c.visible).length === 0 && (
                  <Text className="paces-text-secondary" style={{ fontSize: 12 }}>Ningún widget visible para este rol. El dashboard aparecerá vacío.</Text>
                )}
              </div>
            </div>

            <Divider>Widgets disponibles ({catalogFiltrado.length})</Divider>

            <Table
              dataSource={catalogFiltrado}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="middle"
              bordered
              style={{ marginBottom: 24 }}
              footer={() => (
                <Space>
                  <Text type="secondary">
                    {configs.size} widgets configurados
                  </Text>
                  <Text type="secondary">
                    • {Array.from(configs.values()).filter(c => c.visible).length} visibles
                  </Text>
                  <Text type="secondary">
                    • {Array.from(configs.values()).filter(c => !c.visible).length} ocultos
                  </Text>
                </Space>
              )}
            />
          </>
        )}
      </div>
    </PermissionEspecialGate>
  );
};

export default ConfiguracionDashboard;
