import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Card, Button, Tag, Tooltip, message, Input, Select, Alert, Space, Popconfirm,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined,
  PlayCircleOutlined, PoweroffOutlined, DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { notificacionesApi } from '../../api/notificacionesApi';
import type { NotificacionSQLConfig } from '../../types/notificaciones';
import NotificacionSQLFormulario from './NotificacionSQLFormulario';
import NotificacionSQLResultadoModal from './NotificacionSQLResultadoModal';

const SUCURSALES_LABELS: Record<number, string> = {
  0: 'Orense Plaza', 1: 'Hiper Romana',
  2: 'O. Villa Hermosa', 3: 'El Ofertazo',
};

function formatIntervalo(minutos: number): string {
  if (minutos < 60) return `Cada ${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (m === 0) return `Cada ${h}h`;
  return `Cada ${h}h ${m}min`;
}

function formatFecha(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const tipoColor: Record<string, string> = {
  Alerta: 'gold',
  Info: 'blue',
  Error: 'red',
  Advertencia: 'orange',
  Exito: 'green',
  Ticket: 'purple',
};

const NotificacionesPersonalizadas: React.FC = () => {
  const [configs, setConfigs] = useState<NotificacionSQLConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [editando, setEditando] = useState<NotificacionSQLConfig | null>(null);
  const [resultadoVisible, setResultadoVisible] = useState(false);
  const [configIdResultado, setConfigIdResultado] = useState<number>(0);
  const [configNombreResultado, setConfigNombreResultado] = useState('');

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificacionesApi.obtenerSQLConfigs();
      setConfigs(data || []);
      setLoadingError(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar configuraciones SQL');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPagina(1);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const abrirNuevo = () => {
    setEditando(null);
    setFormularioVisible(true);
  };

  const abrirEditar = (config: NotificacionSQLConfig) => {
    setEditando(config);
    setFormularioVisible(true);
  };

  const handleGuardado = () => {
    setFormularioVisible(false);
    setEditando(null);
    cargarDatos();
  };

  const handleProbar = (config: NotificacionSQLConfig) => {
    setConfigIdResultado(config.id);
    setConfigNombreResultado(config.nombre);
    setResultadoVisible(true);
  };

  const handleActivar = async (config: NotificacionSQLConfig) => {
    try {
      await notificacionesApi.activarSQLConfig(config.id, !config.activo);
      message.success(config.activo ? 'Configuración desactivada' : 'Configuración activada');
      cargarDatos();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cambiar estado');
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await notificacionesApi.eliminarSQLConfig(id);
      message.success('Configuración eliminada');
      cargarDatos();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const dataSource = searchText
    ? configs.filter((c) =>
        c.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
        c.tipo.toLowerCase().includes(searchText.toLowerCase())
      )
    : configs;

  const columns: ColumnsType<NotificacionSQLConfig> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 220,
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontWeight: 500, color: '#556ee6' }}>{text}</span>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (text: string) => (
        <Tag color={tipoColor[text] || 'default'}>{text || 'Info'}</Tag>
      ),
    },
    {
      title: 'Sucursales',
      dataIndex: 'sucursalIDs',
      key: 'sucursalIDs',
      width: 220,
      render: (val: string) => {
        if (!val) return <Tag>Consolidado</Tag>;
        const ids = val.split(',').map(Number);
        return (
          <Space wrap size={4}>
            {ids.map(id => <Tag key={id}>{SUCURSALES_LABELS[id] || `Suc #${id}`}</Tag>)}
          </Space>
        );
      },
    },
    {
      title: 'Intervalo',
      dataIndex: 'intervaloMinutos',
      key: 'intervaloMinutos',
      width: 140,
      render: (minutos: number) => (
        <span className="paces-text-secondary">{formatIntervalo(minutos)}</span>
      ),
    },
    {
      title: 'Última ejecución',
      dataIndex: 'ultimaEjecucion',
      key: 'ultimaEjecucion',
      width: 170,
      render: (text: string) => (
        <span className="paces-text-secondary" style={{ fontSize: 12 }}>
          {formatFecha(text)}
        </span>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => abrirEditar(record)} />
          </Tooltip>
          <Tooltip title="Probar SQL">
            <Button type="text" size="small" icon={<PlayCircleOutlined />} onClick={() => handleProbar(record)} />
          </Tooltip>
          <Tooltip title={record.activo ? 'Desactivar' : 'Activar'}>
            <Button
              type="text"
              size="small"
              icon={<PoweroffOutlined />}
              onClick={() => handleActivar(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Eliminar configuración"
            description="¿Está seguro de eliminar esta configuración SQL?"
            onConfirm={() => handleEliminar(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Notificaciones Personalizadas SQL</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva configuración SQL
        </Button>
      </div>

      {loadingError && (
        <Alert
          message="Error al cargar configuraciones SQL"
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

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por nombre o tipo..."
              allowClear
              onSearch={handleSearch}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); setPagina(1); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>

        <Table<NotificacionSQLConfig>
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          scroll={{ x: 950 }}
          size="middle"
          pagination={{
            current: pagina,
            pageSize,
            onChange: (p) => setPagina(p),
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
          }}
        />
      </Card>

      <NotificacionSQLFormulario
        visible={formularioVisible}
        editando={editando}
        onClose={() => { setFormularioVisible(false); setEditando(null); }}
        onGuardado={handleGuardado}
      />

      <NotificacionSQLResultadoModal
        visible={resultadoVisible}
        configId={configIdResultado}
        configNombre={configNombreResultado}
        onClose={() => setResultadoVisible(false)}
      />
    </>
  );
};

export default NotificacionesPersonalizadas;
