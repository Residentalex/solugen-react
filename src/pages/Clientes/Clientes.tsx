import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  message,
  Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { clienteApi } from '../../api/clienteApi';
import PermissionGate from '../../components/PermissionGate';
import type { ClienteDTO } from '../../types/facturacion';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const { Text } = Typography;

const Clientes: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);

  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MCliente');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [data, setData] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const resultados = await clienteApi.obtenerListado(sucursalActiva, {});
      setData(resultados || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCliente');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, updateToolbar, resetToolbar, sucursalActiva]);

  const filteredData = useMemo(() => {
    let resultado = data;

    if (searchText.trim()) {
      const termino = searchText.trim().toLowerCase();
      resultado = resultado.filter(
        (item) =>
          item.codigo.toLowerCase().includes(termino) ||
          item.nombre.toLowerCase().includes(termino)
      );
    }

    if (filtroActivo === 'activos') {
      resultado = resultado.filter((item) => item.activo);
    } else if (filtroActivo === 'inactivos') {
      resultado = resultado.filter((item) => !item.activo);
    }

    return resultado;
  }, [data, searchText, filtroActivo]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleReload = () => {
    cargarDatos();
  };

  const abrirNuevo = () => navigate('/MCliente/nuevo');

  const columns: ColumnsType<ClienteDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ClienteDTO) =>
        puedeEditar ? (
          <Button type="link" size="small" style={{ padding: 0, fontWeight: 500 }} onClick={() => navigate(`/MCliente/${record.codigo}`)}>
            {val}
          </Button>
        ) : (
          <Text style={{ fontFamily: 'monospace' }}>{val}</Text>
        ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Identificación',
      dataIndex: 'identificacion',
      key: 'identificacion',
      width: 150,
      render: (val: string) => <Text style={{ fontFamily: 'monospace' }}>{val || '-'}</Text>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 130,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'correoElectronico',
      key: 'correoElectronico',
      width: 200,
      render: (val: string) => val ? (
        <Text type="secondary">{val}</Text>
      ) : <Text>{'-'}</Text>,
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
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
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
              value={filtroActivo}
              onChange={(val) => setFiltroActivo(val)}
              style={{ width: 130 }}
              size="middle"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'activos', label: 'Solo activos' },
                { value: 'inactivos', label: 'Solo inactivos' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nuevo
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleReload} />
          </div>
        </div>
        <Table<ClienteDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1000 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} clientes`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
    </>
  );
};

export default Clientes;
