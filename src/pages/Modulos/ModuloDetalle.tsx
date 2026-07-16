import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Table, Tag, Modal, Form, Input, Select, message, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import { configModuloApi } from '../../api/configModuloApi';
import type { ConfigModuloDTO } from '../../api/configModuloApi';
import { toTitleCase } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

const { Text, Title } = Typography;

const TIPOS = ['STRING', 'INT', 'DECIMAL', 'BOOL'];

const ModuloDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MODULOS');

  const [modulo, setModulo] = useState<any>(null);
  const [configs, setConfigs] = useState<ConfigModuloDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);

  // Modal de edición de config
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigModuloDTO | null>(null);
  const [configForm] = Form.useForm();

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const modulos = await moduloApi.obtenerTodo(sucursalActiva);
      const found = modulos.find((m) => m.id === Number(id));
      if (!found) {
        message.error('Módulo no encontrado');
        navigate('/Modulos');
        return;
      }
      setModulo(found);
      setPageTitleOverride(`Módulo: ${found.nombre}`);

      // Cargar configuraciones completas con tipo y descripción
      setConfigLoading(true);
      const configList = await configModuloApi.obtenerListaCompleta(sucursalActiva, found.nombre);
      setConfigs(configList);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setConfigLoading(false);
    }
  }, [id, sucursalActiva, navigate, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule(screenCode);
    cargar();
    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, cargar]);

  // Abrir modal para crear/editar config
  const openConfigModal = (cfg?: ConfigModuloDTO) => {
    setEditingConfig(cfg || null);
    configForm.resetFields();
    if (cfg) {
      configForm.setFieldsValue({
        clave: cfg.clave,
        valor: cfg.valor,
        tipo: cfg.tipo || 'STRING',
        descripcion: cfg.descripcion || '',
      });
    }
    setConfigModalOpen(true);
  };

  const handleConfigGuardar = async () => {
    try {
      const values = await configForm.validateFields();
      const moduloNombre = modulo?.nombre;

      if (!moduloNombre) return;

      if (editingConfig) {
        await configModuloApi.actualizar(sucursalActiva, moduloNombre, editingConfig.clave, values);
        message.success('Configuración actualizada');
      } else {
        await configModuloApi.crear(sucursalActiva, {
          modulo: moduloNombre,
          clave: values.clave,
          valor: values.valor,
          tipo: values.tipo || 'STRING',
          descripcion: values.descripcion || '',
        });
        message.success('Configuración creada');
      }
      setConfigModalOpen(false);
      cargar();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar configuración');
    }
  };

  const handleConfigEliminar = (cfg: ConfigModuloDTO) => {
    Modal.confirm({
      title: 'Eliminar configuración',
      icon: <ExclamationCircleOutlined />,
      content: `¿Eliminar "${cfg.clave}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await configModuloApi.eliminar(sucursalActiva, cfg.modulo, cfg.clave);
          message.success('Configuración eliminada');
          cargar();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
      },
    });
  };

  const configColumns = [
    { title: 'Clave', dataIndex: 'clave', key: 'clave', width: 200 },
    { title: 'Valor', dataIndex: 'valor', key: 'valor', width: 150 },
    {
      title: 'Tipo', dataIndex: 'tipo', key: 'tipo', width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true },
    {
      title: 'Acciones', key: 'acciones', width: 120,
      render: (_: any, record: ConfigModuloDTO) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <PermissionGate accion="EDITAR">
            <Button type="link" icon={<EditOutlined />} onClick={() => openConfigModal(record)} />
          </PermissionGate>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleConfigEliminar(record)} />
        </div>
      ),
    },
  ];

  if (!modulo) return null;

  return (
    <DetalleCatalogoLayout
      rutaVolver="/Modulos"
      loading={loading}
      mensajeLoading="Cargando módulo..."
      loadingError={error}
      mensajeError="Error al cargar el módulo"
      onRecargar={cargar}
      dataDisponible={!!modulo}
      onEditar={() => navigate(`/Modulos/${modulo.id}/editar`)}
    >
      {/* Datos generales */}
      <Card className="paces-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>{toTitleCase(modulo.nombre)}</Title>
        </div>
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="ID">{modulo.id}</Descriptions.Item>
          <Descriptions.Item label="Orden">{modulo.orden}</Descriptions.Item>
          <Descriptions.Item label="Nombre">{toTitleCase(modulo.nombre)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Configuración del módulo */}
      <Card className="paces-card" title="Configuración del módulo"
        extra={
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => openConfigModal()}>
              Agregar
            </Button>
          </PermissionGate>
        }>
        <Table
          dataSource={configs}
          columns={configColumns}
          rowKey="clave"
          loading={configLoading}
          size="small"
          pagination={false}
          locale={{ emptyText: 'Sin configuraciones. Agregue una usando el botón superior.' }}
        />
      </Card>

      {/* Modal crear/editar configuración */}
      <Modal
        title={editingConfig ? 'Editar configuración' : 'Nueva configuración'}
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        onOk={handleConfigGuardar}
        okText="Guardar"
        destroyOnHidden
      >
        <Form form={configForm} layout="vertical" size="small">
          <Form.Item name="clave" label="Clave"
            rules={[{ required: true, message: 'La clave es requerida' }]}>
            <Input placeholder="Ej: FACTOR_REDONDEO" disabled={!!editingConfig} />
          </Form.Item>
          <Form.Item name="valor" label="Valor"
            rules={[{ required: true, message: 'El valor es requerido' }]}>
            <Input placeholder="Ej: 5" />
          </Form.Item>
          <Form.Item name="tipo" label="Tipo">
            <Select>
              {TIPOS.map((t) => <Select.Option key={t} value={t}>{t}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Descripción del parámetro" />
          </Form.Item>
        </Form>
      </Modal>
    </DetalleCatalogoLayout>
  );
};

export default ModuloDetalle;
