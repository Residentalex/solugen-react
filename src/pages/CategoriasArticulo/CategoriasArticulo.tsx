import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Button, Table, Typography, Empty, Spin, Tag } from 'antd';
import { FolderOutlined, UploadOutlined } from '@ant-design/icons';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import CeldaArbol from '../../components/CeldaArbol';
import { useCompanyStore } from '../../stores/companyStore';
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
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);

  const [totalesPorCategoria, setTotalesPorCategoria] = useState<Record<string, number>>({});

  useEffect(() => {
    if (sucursalProductos === undefined) return;
    productoApi
      .obtenerConteoPorCategoria(sucursalProductos)
      .then((mapa) => setTotalesPorCategoria(mapa))
      .catch(() => setTotalesPorCategoria({}));
  }, [sucursalProductos]);

  const [searchText, setSearchText] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categoriasArticulo', sucursalProductos, searchText],
    queryFn: async () => {
      if (sucursalProductos === undefined) return { datos: [], total: 0 };
      const params: { cantidad?: number; salto?: number; busqueda?: string } = { cantidad: 500, salto: 0 };
      if (searchText) params.busqueda = searchText;
      return await categoriaArticuloApi.filtrar(sucursalProductos, params);
    },
    enabled: sucursalProductos !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MCategoria');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const datos = Array.isArray(data?.datos) ? data.datos : [];

  const arbol = useMemo(() => {
    const mapa = new Map<string, any>();
    const nodoPorNombre = new Map<string, any>();
    datos.forEach((c) => {
      const nodo = { ...c, children: [] as any[] };
      mapa.set(String(c.codigo ?? c.idExterno), nodo);
      const nombre = String(c.nombre ?? '').trim().toUpperCase();
      if (nombre && !nodoPorNombre.has(nombre)) nodoPorNombre.set(nombre, nodo);
    });
    const raices: any[] = [];
    datos.forEach((c) => {
      const clave = String(c.codigo ?? c.idExterno);
      const padreCodigo = c.control?.codigo ?? c.control?.idExterno;
      let padre = padreCodigo ? mapa.get(String(padreCodigo)) : undefined;
      if (!padre && c.control?.nombre) {
        padre = nodoPorNombre.get(String(c.control.nombre).trim().toUpperCase());
      }
      if (padre && padre !== mapa.get(clave)) padre.children.push(mapa.get(clave));
      else raices.push(mapa.get(clave));
    });
    const ordenar = (arr: any[]) => {
      arr.sort((a, b) => String(a.nombre ?? '').localeCompare(String(b.nombre ?? '')));
      arr.forEach((n) => ordenar(n.children));
    };
    ordenar(raices);
    const limpiar = (n: any) => { if (n.children.length === 0) delete n.children; else n.children.forEach(limpiar); };
    raices.forEach(limpiar);
    const marcar = (arr: any[], nivel: number, abierto: boolean) => arr.forEach((n, i) => {
      n.__nivel = nivel; n.__ultimo = i === arr.length - 1; n.__rama = abierto;
      if (n.children) marcar(n.children, nivel + 1, abierto || expandedKeys.includes(String(n.codigo ?? n.idExterno)));
    });
    marcar(raices, 0, false);
    return raices;
  }, [datos, expandedKeys]);

  const claveCat = (r: any) => String(r?.codigo ?? r?.idExterno ?? '');

  const columnas = useMemo(() => [
    {
      title: 'Categoría',
      dataIndex: 'nombre',
      render: (v: string, r: any) => (
        <CeldaArbol
          nivel={r.__nivel ?? 0}
          tieneHijos={!!(r.children?.length)}
          expandido={expandedKeys.includes(claveCat(r))}
          onToggle={() => setExpandedKeys((prev) => prev.includes(claveCat(r)) ? prev.filter((k) => k !== claveCat(r)) : [...prev, claveCat(r)])}
          icono={<FolderOutlined />}
        >
          <a className="paces-doc-link" onClick={() => navigate(`/MCategoria/${r.codigo}`)}>{toTitleCase(v ?? '')}</a>
        </CeldaArbol>
      ),
    },
    {
      title: 'Familia',
      key: 'familia',
      width: 260,
      render: (_: unknown, r: CategoriaArticuloDTO) => {
        const familia = r.familia?.nombre ?? r.grupo?.nombre;
        return familia ? toTitleCase(familia) : '—';
      },
    },
    {
      title: 'Artículos',
      key: 'articulos',
      width: 120,
      align: 'right' as const,
      render: (_: unknown, r: CategoriaArticuloDTO) => <Tag color="geekblue">{totalesPorCategoria[String(r.codigo ?? '')] || 0}</Tag>,
    },
  ], [navigate, totalesPorCategoria, expandedKeys]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalProductos);
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
        ocultarPageSize
        onNuevo={() => navigate('/MCategoria/nuevo')}
        onReload={() => refetch()}
        onExportarExcel={handleExportarExcel}
        accionesItems={[
          {
            key: 'importar',
            label: 'Importar desde Excel',
            icon: <UploadOutlined />,
            soloIcono: true,
            tooltip: 'Importar desde Excel',
            onClick: () => navigate('/MCategoria/importar'),
            permiso: { permisoEspecial: 'pe_importar' },
          },
        ]}
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
          <Table
            rowKey={(r: any) => String(r.codigo ?? r.idExterno)}
            columns={columnas as any}
            dataSource={(searchText ? datos : arbol) as any[]}
            pagination={false}
            size="middle"
            className="paces-border-top paces-list-table paces-tree-table"
            rowClassName={(r: any) => { const abierto = expandedKeys.includes(claveCat(r)); return `paces-row-hover${abierto ? ' paces-tree-fila-abierta' : ''}${!abierto && r.__rama ? ' paces-tree-rama-abierta' : ''}${r.__ultimo && r.__nivel > 0 ? ' paces-tree-ultimo' : ''}`; }}
            expandable={{
              expandIcon: () => null,
              expandedRowKeys: expandedKeys,
              onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
            }}
            indentSize={0}
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
