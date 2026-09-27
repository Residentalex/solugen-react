import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Table, Button, Select, Tag, message, Empty, Alert, Card, Typography, Tooltip,
} from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { pantallaApi } from '../../api/pantallaApi';
import type { PantallaDTO, PantallaEntidadDTO, ModuloDTO } from '../../types/auth';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;
const FILAS_POR_PAGINA = 25;

const Pantallas: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);
  const [filtroModulo, setFiltroModulo] = useState<number | undefined>();
  const [filtroGrupo, setFiltroGrupo] = useState<string | undefined>();
  const [modulosCatalogo, setModulosCatalogo] = useState<ModuloDTO[]>([]);
  const [entidadesPorPantalla, setEntidadesPorPantalla] = useState<Map<number, PantallaEntidadDTO[]>>(new Map());
  const [entidadesCargando, setEntidadesCargando] = useState(false);
  const [entidadesError, setEntidadesError] = useState(false);
  const [todosLosGrupos, setTodosLosGrupos] = useState<string[]>([]);
  const [gruposCargando, setGruposCargando] = useState(false);
  const [gruposError, setGruposError] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pantallas', sucursalActiva, page, pageSize, searchText, filtroModulo, filtroGrupo],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string; moduloId?: number; grupo?: string } = {
        cantidad: pageSize, salto,
      };
      if (searchText) params.busqueda = searchText;
      if (filtroModulo !== undefined) params.moduloId = filtroModulo;
      if (filtroGrupo) params.grupo = filtroGrupo;

      const [resultados, totalCount] = await Promise.all([
        pantallaApi.filtrar(sucursalActiva, params),
        pantallaApi.obtenerTotalPantallas(sucursalActiva, {
          busqueda: searchText || undefined,
          moduloId: filtroModulo,
          grupo: filtroGrupo,
        }),
      ]);
      return { datos: resultados.datos || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const cargarEntidades = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setEntidadesCargando(true);
    setEntidadesError(false);
    try {
      const result = await pantallaApi.obtenerPantallasConEntidades(sucursalActiva);
      const map = new Map<number, PantallaEntidadDTO[]>();
      result.forEach(p => {
        if (p.entidades?.length) map.set(p.id, p.entidades);
      });
      setEntidadesPorPantalla(map);
      setEntidadesCargando(false);
    } catch {
      setEntidadesError(true);
      setEntidadesCargando(false);
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

const cargarTodosLosGrupos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setGruposCargando(true);
    setGruposError(false);
    try {
      const result = await pantallaApi.filtrar(sucursalActiva, { cantidad: 1000, salto: 0 });
      const gruposUnicos = [...new Set((result.datos || []).map((p: PantallaDTO) => p.grupo).filter(Boolean))].sort();
      setTodosLosGrupos(gruposUnicos);
    } catch (err: any) {
      setGruposError(true);
      message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos');
    } finally {
      setGruposCargando(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MPantalla');
    updateToolbar({});
    cargarEntidades();
    cargarModulos();
    cargarTodosLosGrupos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarEntidades, cargarModulos, cargarTodosLosGrupos]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columns.filter((c) => c.key !== 'acciones' && c.key !== 'entidades');
    const dataSource = data?.datos || [];
    exportToExcel({
      fileName: `Pantallas_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`,
      sheetName: 'Pantallas',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: dataSource.map((item: any) =>
        cols.map((col) => {
          if (col.key === 'modulo') {
            const mods = item.modulos || [];
            return mods.map((m: any) => m.nombre).join(', ');
          }
          const val = item[col.dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleModuloChange = (val: number | undefined) => {
    setFiltroModulo(val);
    setPage(1);
  };

  const handleGrupoChange = (val: string | undefined) => {
    setFiltroGrupo(val);
    setPage(1);
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
          if (entidadesCargando) {
            return <Tag style={{ color: '#556ee6' }}>Cargando...</Tag>;
          }
          if (entidadesError) {
            return (
              <>
                <Tag style={{ color: '#ff4d4f' }}>No disponible</Tag>
                <Tooltip title="Falló la carga de entidades">
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginLeft: 4 }} />
                </Tooltip>
              </>
            );
          }
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
       {entidadesError && (
         <Alert
           title="No se pudieron cargar las entidades"
           type="error"
           showIcon
           style={{ marginBottom: 16, marginTop: 8 }}
           action={
             <Button size="small" onClick={() => cargarEntidades()}>
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
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={() => navigate('/MPantalla/nuevo')}
          onReload={() => refetch()}
          onExportarExcel={handleExportarExcel}
          filtros={
            <>
              <Select
                placeholder="Módulo"
                allowClear
                style={{ width: 160 }}
                value={filtroModulo}
                onChange={handleModuloChange}
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
                  onChange={handleGrupoChange}
                  dropdownRender={(menu) => (
                    <>
                      {todosLosGrupos.length === 0 && gruposCargando ? (
                        <div style={{ padding: '8px 12px' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Cargando grupos...</Text>
                        </div>
                      ) : null}
                      {todosLosGrupos.length === 0 && !gruposCargando && !gruposError ? (
                        <div style={{ padding: '8px 12px' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>No hay grupos disponibles</Text>
                        </div>
                      ) : null}
                      {menu}
                    </>
                  )}
                >
                  {todosLosGrupos.map((g) => (
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
            dataSource={data?.datos || []}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1000 }}
            size="middle"
            rowClassName="paces-row-hover"
            className="paces-border-top paces-list-table"
            pagination={{
              current: page,
              pageSize,
              total: data?.total || 0,
              onChange: (p) => setPage(p),
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
