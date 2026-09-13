import React, { useEffect, useState, useMemo } from 'react';
import {
  Card, Table, Checkbox, InputNumber, Button, Space, Select,
  Typography, Row, Col, message, Spin, Alert, Divider
} from 'antd';
import {
  SaveOutlined, ReloadOutlined, SettingOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardWidgetStore } from '../../stores/dashboardWidgetStore';
import PermissionEspecialGate from '../../components/PermissionEspecialGate';
import type { DashboardWidgetDto, DashboardWidgetConfigDto } from '../../types/dashboard';

const { Text, Title } = Typography;

/**
 * Página de configuración de widgets del dashboard por rol
 *
 * Solo usuarios con el permiso ADMIN_DASHBOARD_CONFIG pueden acceder.
 * Permite ver y modificar qué widgets son visibles para cada rol.
 */
const DashboardConfig: React.FC = () => {
  const usuario = useAuthStore((s) => s.usuario);
  const { catalog, widgetsPorRol, loading, saving, fetchCatalog, fetchWidgetsPorRol, guardarConfiguracion } =
    useDashboardWidgetStore();

  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [configs, setConfigs] = useState<Map<number, DashboardWidgetConfigDto>>(new Map());
  const [dirty, setDirty] = useState(false);

  // Lista de roles del usuario actual
  const rolesDisponibles = useMemo(() => {
    if (!usuario?.roles) return [];
    return usuario.roles.map(r => ({
      value: r.id,
      label: r.nombre,
    }));
  }, [usuario?.roles]);

  // Widgets actualmente cargados para el rol seleccionado
  const widgetsDelRol = useMemo(() => {
    if (!rolSeleccionado) return [];
    return widgetsPorRol.get(rolSeleccionado) || [];
  }, [widgetsPorRol, rolSeleccionado]);

  // Cargar catálogo al montar
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
    }
  }, [widgetsDelRol]);

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
        setDirty(true);
      }
    }
  }, [catalog, rolSeleccionado]);

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

  const handleGuardar = async () => {
    if (!rolSeleccionado) {
      message.warning('Seleccione un rol primero');
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
      title: 'Visible',
      dataIndex: 'visible',
      key: 'visible',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: DashboardWidgetDto) => (
        <Checkbox
          checked={configs.get(record.id)?.visible ?? false}
          onChange={(e) => handleToggleVisible(record.id, e.target.checked)}
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
        />
      ),
    },
  ];

  // Contenido para usuarios sin permiso
  const sinPermisoContent = (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <Title level={4}>Acceso Denegado</Title>
      <Text type="secondary">
        No tienes el permiso <Text code>PE_DASHBOARD_CONFIG</Text> para acceder a esta página.
      </Text>
    </div>
  );

  return (
    <PermissionEspecialGate permiso="PE_DASHBOARD_CONFIG" fallback={sinPermisoContent}>
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={4}>
            <SettingOutlined /> Configuración de Dashboard por Rol
          </Title>
          <Text type="secondary">
            Define qué widgets del dashboard puede ver cada rol de usuario.
          </Text>
        </div>

        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={8}>
            <Text strong>Seleccionar Rol:</Text>
            <Select
              style={{ width: '100%', marginTop: 8 }}
              placeholder="Seleccione un rol"
              value={rolSeleccionado}
              onChange={setRolSeleccionado}
              options={rolesDisponibles}
              loading={loading}
            />
          </Col>
          <Col span={16} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={!rolSeleccionado || loading}
            >
              Recargar
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleGuardar}
              loading={saving}
              disabled={!rolSeleccionado || !dirty}
            >
              Guardar Cambios
            </Button>
            {dirty && (
              <Text type="warning" style={{ marginLeft: 8 }}>
                Hay cambios sin guardar
              </Text>
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
            <Divider orientation="left">
              Widgets disponibles ({catalog.length})
            </Divider>

            <Table
              dataSource={catalog}
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

export default DashboardConfig;
