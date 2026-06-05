import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Select, Tag, Button, message, Space, Card, Typography, Alert } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import EntidadImagen from '../../components/EntidadImagen';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { usuarioApi } from '../../api/usuarioApi';

import type { UsuarioDTO } from '../../types/administracion';

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function letraInicial(nombre: string): string {
  return (nombre || '?').charAt(0).toUpperCase();
}

const { Text } = Typography;

const Usuarios: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

  const [data, setData] = useState<UsuarioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [_searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);

  const cargarDatos = useCallback(async (busqueda?: string) => {
    setLoading(true);
    try {
      let result: UsuarioDTO[];
      if (busqueda) {
        result = await usuarioApi.filtrar(SUCURSAL_SEGURIDAD, busqueda, busqueda);
      } else {
        result = await usuarioApi.obtenerListado(SUCURSAL_SEGURIDAD);
      }
      setData(result || []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveModule('MUsuario');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    cargarDatos(value.trim() || undefined);
  };

  const abrirNuevo = () => {
    navigate('/MUsuario/nuevo');
  };

  const columns: ColumnsType<UsuarioDTO> = [
    {
      title: 'Usuario',
      key: 'usuario',
      width: 220,
      fixed: 'left',
      render: (_, record) => (
        <Link to={`/MUsuario/${record.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EntidadImagen
            tipo="USUARIO"
            entidadID={record.id}
            fallback={letraInicial(record.nombre)}
            size={34}
          />
          <div>
            <Text className="paces-text-primary" strong style={{ fontSize: 13, lineHeight: 1.3 }}>
              {record.nombreUsuario}
              <RightOutlined style={{ fontSize: 10, marginLeft: 4, opacity: 0.5 }} />
            </Text>
            <br />
            <Text type="secondary" style={{ lineHeight: 1.3 }}>{record.nombre}</Text>
          </div>
        </Link>
      ),
    },
    {
      title: 'Roles',
      key: 'roles',
      width: 200,
      render: (_, record) => (
        <Space wrap size={4}>
          {(record.roles || []).map((r) => (
            <Tag key={r.id} color="blue" style={{ fontSize: 11 }}>{r.nombre}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Sucursales',
      key: 'sucursales',
      width: 200,
      render: (_, record) => (
        <Space wrap size={2}>
          {(record.sucursalesRoles || []).map((sr) => (
            <Tag key={sr.sucursal} style={{ fontSize: 11 }}>{sr.nombreSucursal}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Último inicio',
      dataIndex: 'ultimoLogin',
      key: 'ultimoLogin',
      width: 170,
      render: (val: string) => (
        <Text type="secondary">{formatFecha(val)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },

  ];

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar usuarios"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); setSearchText(''); cargarDatos(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 16,
            flexWrap: 'wrap',
          }}>
            <Input.Search
              placeholder="Buscar por usuario o nombre..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPage(1); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nuevo Usuario
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={() => { setLoadingError(false); setSearchText(''); cargarDatos(); }} />
          </div>
        </div>
        <Table<UsuarioDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 920 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>
    </>
  );
};

export default Usuarios;
