import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Grid, message,
} from 'antd';
import {
  IdcardOutlined, PhoneOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { proveedorApi } from '../../api/proveedorApi';
import type { SuplidorDTO } from '../../types/entradaAlmacen';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const ProveedorDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const [data, setData] = useState<SuplidorDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('MSUP');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!codigo) return;
    setLoading(true);
    proveedorApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        setData(res);
        setPageTitleOverride(toTitleCase(res.nombre || codigo));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el proveedor';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  const handleRefresh = useCallback(() => {
    if (!codigo) return;
    setLoadingError(false);
    setLoading(true);
    proveedorApi.obtenerPorCodigo(sucursalActiva, codigo)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(toTitleCase(res.nombre || codigo));
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  if (!data) return null;

  const isLarge = screens.xxl === true;

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MProveedor"
      loading={loading}
      mensajeLoading="Cargando proveedor..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de proveedor"
      onRecargar={handleRefresh}
      dataDisponible={!!data}
    >
      <Card className="paces-card" size="small" title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos del Proveedor</span>
          <Tag color="blue">{data.codigo}</Tag>
        </div>
      } style={{ marginBottom: 16 }}>
        <Descriptions
          bordered
          size="small"
          column={isLarge ? 3 : 1}
          styles={{ content: { background: 'transparent' } }}
        >
          <Descriptions.Item label="Nombre" span={isLarge ? 2 : 1}>
            {toTitleCase(data.nombre || '-')}
          </Descriptions.Item>
          <Descriptions.Item label="Código">
            {data.codigo || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Identificación">
            <span><IdcardOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data.identificacion || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Teléfono">
            <span><PhoneOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data.telefono || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Días Crédito">
            {data.diasCredito ? `${data.diasCredito} días` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Requiere ORC">
            <Tag color={data.requiereORC ? 'warning' : 'default'}>{data.requiereORC ? 'Sí' : 'No'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Dirección" span={3}>
            <span><EnvironmentOutlined style={{ color: '#556ee6', marginRight: 6 }} />{data.direccion ? toTitleCase(data.direccion) : '-'}</span>
          </Descriptions.Item>
          {data.idExterno && (
            <Descriptions.Item label="ID Externo">
              {data.idExterno}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </DetalleCatalogoLayout>
  );
};

export default ProveedorDetalle;
