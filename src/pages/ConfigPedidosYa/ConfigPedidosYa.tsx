import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Button, Descriptions, Tag, Typography, Alert, Spin, Space, Popconfirm, message,
} from 'antd';
import {
  ReloadOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { configPedidosYaApi } from '../../api/configPedidosYaApi';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import type { ConfigPedidosYaDTO } from '../../types/configPedidosYa';
import ConfigPedidosYaFormulario from './ConfigPedidosYaFormulario';

const { Text } = Typography;

const ConfigPedidosYa: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [config, setConfig] = useState<ConfigPedidosYaDTO | null>(null);
  const [noExiste, setNoExiste] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cargarConfig = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    setNoExiste(false);
    try {
      const data = await configPedidosYaApi.obtener(sucursalActiva);
      setConfig(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setConfig(null);
        setNoExiste(true);
      } else {
        setLoadingError(true);
        message.error(err?.response?.data?.errorMessage || 'Error al cargar configuración de PedidosYa');
      }
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('ConfigPedidosYa');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  useEffect(() => {
    cargarConfig();
  }, [cargarConfig]);

  const abrirNuevo = () => {
    setFormularioVisible(true);
  };

  const abrirEditar = () => {
    setFormularioVisible(true);
  };

  const handleEliminar = async () => {
    setEliminando(true);
    try {
      await configPedidosYaApi.eliminar(sucursalActiva);
      message.success('Configuración de PedidosYa eliminada correctamente');
      setConfig(null);
      setNoExiste(true);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar configuración de PedidosYa');
    } finally {
      setEliminando(false);
    }
  };

  const handleGuardar = () => {
    cargarConfig();
  };

  const handleSubir = async () => {
    if (!config) return;
    setSubiendo(true);
    try {
      const rutaTemp = `C:\\temp\\pedidosya_${sucursalActiva}_${Date.now()}.csv`;
      await actualizacionPrecioApi.subirArchivoPedidosYa(sucursalActiva, rutaTemp);
      message.success('Archivo subido correctamente a PedidosYa');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al subir archivo a PedidosYa');
    } finally {
      setSubiendo(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <>
      {loadingError && (
        <Alert
          message="Error al cargar configuración de PedidosYa"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={cargarConfig}>
              Reintentar
            </Button>
          }
        />
      )}

      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Toolbar */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Text strong style={{ fontSize: 16 }}>Configuración PedidosYa</Text>
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={cargarConfig} />
            {noExiste ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Crear configuración
              </Button>
            ) : (
              <Space>
                <Button type="primary" icon={<UploadOutlined />} loading={subiendo} onClick={handleSubir}>
                  Subir ahora
                </Button>
                <Button icon={<EditOutlined />} onClick={abrirEditar}>
                  Editar
                </Button>
                <Popconfirm
                  title="Eliminar configuración"
                  description="¿Estás seguro de eliminar la configuración de PedidosYa para esta sucursal?"
                  onConfirm={handleEliminar}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} loading={eliminando}>
                    Eliminar
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ padding: '0 24px 24px' }}>
          {noExiste ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary" style={{ fontSize: 15 }}>
                No hay configuración de PedidosYa para esta sucursal.
              </Text>
              <div style={{ marginTop: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                  Crear configuración
                </Button>
              </div>
            </div>
          ) : config ? (
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2, md: 2 }}
              style={{ background: '#fff' }}
            >
              <Descriptions.Item label="Servidor" span={2}>
                <Text code>{config.servidor}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Puerto">
                <Text>{config.puerto}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Usuario">
                <Text>{config.usuario}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contraseña">
                <Text>{config.contrasena ? '••••••••' : <Text type="secondary">No definida</Text>}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Archivo Clave">
                <Text>{config.archivoClave || <Text type="secondary">No definido</Text>}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Margen Beneficio">
                <Tag color="blue">{config.margenBeneficio}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ruta Remota">
                <Text>{config.rutaRemota || <Text type="secondary">No definida</Text>}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Prefijo Archivo">
                <Text>{config.prefijoArchivo || <Text type="secondary">No definido</Text>}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Vendor ID">
                <Text>{config.vendorID || <Text type="secondary">No definido</Text>}</Text>
              </Descriptions.Item>
            </Descriptions>
          ) : !loadingError ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">No hay configuración de PedidosYa para esta sucursal.</Text>
            </div>
          ) : null}
        </div>
      </Card>

      <ConfigPedidosYaFormulario
        visible={formularioVisible}
        editItem={config}
        onClose={() => setFormularioVisible(false)}
        onSaved={handleGuardar}
      />
    </>
  );
};

export default ConfigPedidosYa;
