import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Select,
  Tag,
  message,
  Space,
  Empty,
  Alert,
  Card,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';

const FILAS_POR_PAGINA = 25;
import { useUIStore } from '../../stores/uiStore';
import { Typography } from 'antd';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
import { pantallaApi } from '../../api/pantallaApi';
import type { PantallaDTO, PantallaEntidadDTO, ModuloDTO } from '../../types/auth';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const Pantallas: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [filtroModulo, setFiltroModulo] = useState<number | undefined>();
  const [filtroGrupo, setFiltroGrupo] = useState<string | undefined>();
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloDTO[]>([]);
  const [entidadesPorPantalla, setEntidadesPorPantalla] = useState<Map<number, PantallaEntidadDTO[]>>(new Map());

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pantallas', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await pantallaApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const cargarEntidades = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    try {
      const result = await pantallaApi.obtenerPantallasConEntidades(sucursalActiva);
      const map = new Map<number, PantallaEntidadDTO[]>();
      result.forEach(p => {
        if (p.entidades?.length) map.set(p.id, p.entidades);
      });
      setEntidadesPorPantalla(map);
    } catch {
      // no crítico, las entidades son opcionales en el listado
    }
  }, [sucursalActiva]);

  const cargarModulos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    try {
      const modulos = await pantallaApi.obtenerModulos(sucursalActiva);
      setModulosCatalogo(modulos || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar módulos');
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MPantalla');
    updateToolbar({});
    cargarEntidades();
    cargarModulos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarEntidades, cargarModulos]);

  // Filtrado y búsqueda cliente
  const filteredData = useMemo(() => {
    let result = data || [];
    if (filtroModulo !== undefined) {
      result = result.filter((p) => p.modulos?.some((m) => m.id === filtroModulo));
    }
    if (filtroGrupo) {
      result = result.filter((p) => p.grupo === filtroGrupo);
    }
    if (searchText) {
      const term = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(term) ||
          p.codigo.toLowerCase().includes(term),
      );
    }
    return result;
  }, [data, filtroModulo, filtroGrupo, searchText]);

  // Grupos únicos disponibles en los datos
  const gruposDisponibles = useMemo(() => {
    const list = data || [];
    const grupos = new Set(list.map((p) => p.grupo).filter(Boolean) as string[]);
    return Array.from(grupos).sort();
  }, [data]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const columns: ColumnsType<PantallaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 240,
      render: (val: string, record: PantallaDTO) => (
        <Link to={`/MPantalla/${record.id}`} className="paces-doc-link">
          <Text strong>{val}</Text>
        </Link>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Módulos',
      dataIndex: 'modulos',
      key: 'modulo',
      width: 400,
      render: (modulos: ModuloDTO[]) =>
        modulos && modulos.length > 0
          ? modulos.map((m) => <Tag key={m.id} style={{ marginBottom: 2 }}>{m.nombre}</Tag>)
          : <Tag style={{ color: '#999' }}>Sin módulo</Tag>,
    },
    {
      title: 'Entidad(es)',
      key: 'entidades',
      width: 240,
      render: (_: any, record: PantallaDTO) => {
        const ents = entidadesPorPantalla.get(record.id) || [];
        if (!ents.length) return <Tag style={{ color: '#999' }}>—</Tag>;
        return ents.map(e => (
          <Tag key={`${e.entidadCodigo}-${e.tipoEntidad || ''}`} style={{ marginBottom: 2 }}>
            {e.entidadCodigo}{e.tipoEntidad ? <Text type="secondary">/{e.tipoEntidad}</Text> : null}
          </Tag>
        ));
      },
    },
    {
      title: 'Grupo',
      dataIndex: 'grupo',
      key: 'grupo',
      width: 140,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Ruta',
      dataIndex: 'ruta',
      key: 'ruta',
      width: 200,
      ellipsis: true,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (activo: boolean) =>
        activo ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="red">Inactivo</Tag>
        ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar pantallas"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={() => navigate('/MPantalla/nuevo')}
          onReload={() => refetch()}
          filtros={
            <>
              <Select
                placeholder="Módulo"
                allowClear
                style={{ width: 160 }}
                value={filtroModulo}
                onChange={(val) => setFiltroModulo(val)}
              >
                {modulosCatalogo.map((m) => (
                  <Select.Option key={m.id} value={m.id}>
                    {m.nombre}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="Grupo"
                allowClear
                style={{ width: 160 }}
                value={filtroGrupo}
                onChange={(val) => setFiltroGrupo(val)}
              >
                {gruposDisponibles.map((g) => (
                  <Select.Option key={g} value={g}>
                    {g}
                  </Select.Option>
                ))}
              </Select>
            </>
          }
        />
        <Table<PantallaDTO>
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1200 }}
            size="middle"
            rowClassName="paces-row-hover"
            className="paces-border-top paces-list-table"
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (t) => `${t} registros`,
            }}
            locale={{
              emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay pantallas registradas" /></div>,
            }}
          />
      </Card>
    </>
  );
};

export default Pantallas;
