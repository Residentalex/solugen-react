import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tree, Alert, Card, Button, Typography, Empty, Spin, Input, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';

import { toTitleCase } from '../../utils/formats';
import type { CategoriaArticuloDTO } from '../../types/productos';
import { productoApi } from '../../api/productoApi';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

const CategoriasArticulo: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [totalesPorCategoria, setTotalesPorCategoria] = useState<Record<string, number>>({});

  useEffect(() => {
    if (sucursalActiva === undefined || sucursalActiva === 0) return;
    productoApi
      .obtenerListado(sucursalActiva, { cantidad: 500 })
      .then((list) => {
        const mapa: Record<string, number> = {};
        (list || []).forEach((p) => {
          const clave = p.categoriaCodigo || p.familia?.nombre || '';
          if (clave) {
            mapa[clave] = (mapa[clave] || 0) + 1;
          }
        });
        setTotalesPorCategoria(mapa);
      })
      .catch(() => setTotalesPorCategoria({}));
  }, [sucursalActiva]);

  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriasArticulo', sucursalActiva, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const params: { cantidad?: number; salto?: number; busqueda?: string } = { cantidad: 500, salto: 0 };
      if (searchText) params.busqueda = searchText;
      const [resultados, totalCount] = await Promise.all([
        categoriaArticuloApi.filtrar(sucursalActiva, params),
        categoriaArticuloApi.obtenerTotal(sucursalActiva, { busqueda: searchText || undefined }),
      ]);
      return { datos: resultados || [], total: totalCount ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MCategoria');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const datos = Array.isArray(data?.datos) ? data.datos : [];

  const treeData = useMemo(() => {
    const grupos = new Map<string, CategoriaArticuloDTO[]>();
    const sinGrupo: CategoriaArticuloDTO[] = [];
    datos.forEach((item) => {
      const grupoNombre = item.grupo?.nombre ? toTitleCase(item.grupo.nombre) : 'Sin grupo';
      if (grupoNombre === 'Sin grupo') {
        sinGrupo.push(item);
      } else {
        if (!grupos.has(grupoNombre)) grupos.set(grupoNombre, []);
        grupos.get(grupoNombre)!.push(item);
      }
    });
    const nodes: any[] = [];
    grupos.forEach((items, grupoNombre) => {
      nodes.push({
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 13 }}>{grupoNombre}</Text>
            <Tag color="geekblue" style={{ fontSize: 11 }}>{items.reduce((acc, item) => acc + (totalesPorCategoria[item.codigo || ''] || totalesPorCategoria[item.grupo?.nombre || ''] || 0), 0)} art.</Tag>
          </span>
        ),
        key: `grupo-${grupoNombre}`,
        isLeaf: false,
        children: items.map((item) => ({
          title: (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => navigate(`/MCategoria/${item.codigo}`)}>
              <strong>{item.codigo || '-'}</strong> — <span>{toTitleCase(item.nombre ?? '')}</span>
              <Tag color="geekblue" style={{ fontSize: 11, marginLeft: 'auto' }}>{totalesPorCategoria[item.codigo || ''] || totalesPorCategoria[item.grupo?.nombre || ''] || 0} art.</Tag>
            </span>
          ),
          key: item.codigo || item.nombre || `item-${Math.random()}`,
          isLeaf: true,
        })),
      });
    });
    sinGrupo.forEach((item) => {
      nodes.push({
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => navigate(`/MCategoria/${item.codigo}`)}>
            <strong>{item.codigo || '-'}</strong> — <span>{toTitleCase(item.nombre ?? '')}</span>
            <Tag color="geekblue" style={{ fontSize: 11, marginLeft: 'auto' }}>{totalesPorCategoria[item.codigo || ''] || totalesPorCategoria[item.grupo?.nombre || ''] || 0} art.</Tag>
          </span>
        ),
        key: item.codigo || item.nombre || `item-${Math.random()}`,
        isLeaf: true,
      });
    });
    return nodes.sort((a, b) => a.key.localeCompare(b.key));
  }, [datos, navigate]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = datos || [];
    const exportCols = [
      { title: 'Código', dataIndex: 'codigo' },
      { title: 'Nombre', dataIndex: 'nombre' },
      { title: 'Grupo', dataIndex: 'grupo' },
      { title: 'Control', dataIndex: 'control' },
      { title: 'ID Externo', dataIndex: 'idExterno' },
    ];
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.dataIndex) {
          if (col.dataIndex === 'grupo') return item.grupo?.nombre || '';
          if (col.dataIndex === 'control') return item.control?.nombre || '';
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `CategoriasArticulo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'CategoriasArticulo',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  return (<>
    {isError && (
      <Alert
        message="Error al cargar categorías de artículo"
        type="error"
        showIcon
        style={{ marginBottom: 16 }}
        action={
          <Button size="small" onClick={() => refetch()}>Reintentar</Button>
        }
      />
    )}
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      <CatalogoListadoToolbar
        onSearch={handleSearch}
        pageSize={25}
        onPageSizeChange={() => {}}
        onNuevo={() => navigate('/MCategoria/nuevo')}
        onReload={() => refetch()}
        onExportarExcel={handleExportarExcel}
      />
      <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {searchText ? `${(data?.total ?? 0)} resultado${(data?.total ?? 0) !== 1 ? 's' : ''} para "${searchText}"` : `${(data?.total ?? 0)} categoría${(data?.total ?? 0) !== 1 ? 's' : ''}`}
        </Text>
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
        ) : (
          <Tree
            showLine={{ showLeafIcon: false }}
            defaultExpandAll={false}
            treeData={treeData}
            blockNode
            selectable={false}
          />
        )}
        {!isLoading && datos.length === 0 && (
          <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            {!searchText ? (
              <>
                <Empty description="No hay categorías de artículo registradas" />
                <Button type="primary" size="small" onClick={() => navigate('/MCategoria/nuevo')}>Crear primera categoría</Button>
              </>
            ) : (
              <Empty description={`No se encontraron resultados para "${searchText}"`} />
            )}
          </div>
        )}
      </div>
    </Card>
  </>);
};

export default CategoriasArticulo;
