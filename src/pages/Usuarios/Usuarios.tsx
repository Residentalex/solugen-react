import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Input, Select, Tag, Button, message, Space, Card, Typography, Alert, Empty } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, RightOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import EntidadImagen from '../../components/EntidadImagen';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { Sucursal } from '../../types/auth';
import { useUIStore } from '../../stores/uiStore';
import { formatDateTime } from '../../utils/formats';
import { usuarioApi } from '../../api/usuarioApi';

import type { UsuarioDTO } from '../../types/administracion';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

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

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['usuarios', searchText],
    queryFn: async () => {
      let result: UsuarioDTO[];
      if (searchText) {
        result = await usuarioApi.filtrar(SUCURSAL_SEGURIDAD, searchText, searchText);
      } else {
        result = await usuarioApi.obtenerListado(SUCURSAL_SEGURIDAD);
      }
      return result || [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MUsuario');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
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
      render: (_, record) => {
        const roles = record.roles || [];
        const mostrar = roles.slice(0, 3);
        const restantes = roles.length - 3;
        return (
          <Space wrap size={4}>
            {mostrar.map((r) => (
              <Tag key={r.id} color="blue" style={{ fontSize: 11 }}>{r.nombre}</Tag>
            ))}
            {restantes > 0 && (
              <Tag color="default" style={{ fontSize: 11 }}>+{restantes}</Tag>
            )}
          </Space>
        );
      },
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
        <Text type="secondary">{formatDateTime(val)}</Text>
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
      {isError && (
        <Alert
          message="Error al cargar usuarios"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setSearchText(''); refetch(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={() => { setSearchText(""); refetch(); }}
        />
        <Table<UsuarioDTO>
          columns={columns}
          dataSource={data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 920 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay usuarios registrados" />
            </div>,
          }}
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
