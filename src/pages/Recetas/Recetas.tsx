import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Input, Select, Button, Typography, message, Tag, Alert, Empty, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, ArrowLeftOutlined, CalculatorOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { recetaApi } from '../../api/recetaApi';
import type { ProductoRecetaDTO, IngredienteDTO } from '../../types/receta';
import { formatCurrency } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

function formatDecimal(n: number): string {
  return n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const Recetas: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const [productoSeleccionado, setProductoSeleccionado] = useState<string | null>(null);
  const [productoNombre, setProductoNombre] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredienteDTO[]>([]);
  const [loadingIngredientes, setLoadingIngredientes] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recetas', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await recetaApi.obtenerProductosConReceta(sucursalActiva);
      return result;
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MReceta');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSeleccionar = async (codigo: string, nombre: string) => {
    setProductoSeleccionado(codigo);
    setProductoNombre(nombre);
    setLoadingIngredientes(true);
    try {
      const result = await recetaApi.obtenerIngredientes(sucursalActiva, codigo);
      setIngredientes(result);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al consultar receta');
      setIngredientes([]);
    } finally {
      setLoadingIngredientes(false);
    }
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = filteredProductos;
    const exportCols = columnasProductos.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `Recetas_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Recetas',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleVolver = () => {
    setProductoSeleccionado(null);
    setProductoNombre('');
    setIngredientes([]);
  };

  const costoEstimado = useMemo(() => {
    return ingredientes.reduce((sum, ing) => sum + (ing.costo ?? 0), 0);
  }, [ingredientes]);

  const filteredProductos = (data || []).filter(
    (p) =>
      !searchText ||
      p.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchText.toLowerCase())
  );

  const columnasProductos: ColumnsType<ProductoRecetaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 150,
      render: (cod: string) => <Text strong>{cod}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nom: string) => <Text>{nom}</Text>,
    },
    {
      title: 'Componentes',
      dataIndex: 'cantidadIngredientes',
      key: 'cantidadIngredientes',
      width: 130,
      align: 'center',
      render: (cant: number) => <Tag color="blue">{cant} ingrediente{cant !== 1 ? 's' : ''}</Tag>,
    },
  ];

  const columnasIngredientes: ColumnsType<IngredienteDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 150,
      render: (cod: string) => <Text strong>{cod}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nom: string) => <Text>{nom}</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 120,
      align: 'right',
      render: (cant: number) => <Text>{formatDecimal(cant ?? 0)}</Text>,
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 150,
      align: 'right',
      render: (cost: number) => <Text strong>{formatCurrency(cost ?? 0)}</Text>,
    },
    {
      title: 'U.M.',
      key: 'unidadMedida',
      width: 120,
      render: (_: unknown, record: IngredienteDTO) => (
        <Text>{record.unidadMedida?.codigo || record.unidadMedida?.nombre || ''}</Text>
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar recetas"
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
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        {productoSeleccionado ? (
          <>
            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: 24, flexWrap: "wrap" }}>
                <Button icon={<ArrowLeftOutlined />} onClick={handleVolver}>
                  Volver
                </Button>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Tag color="blue" style={{ marginRight: 8 }}>{productoSeleccionado}</Tag>
                  <Text strong style={{ fontSize: 18 }}>{toTitleCase(productoNombre)}</Text>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Text>Estado:</Text>
                    <Tag color="green">Activo</Tag>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Text>Costo estimado:</Text>
                    <Text strong>
                      <CalculatorOutlined /> {formatCurrency(costoEstimado)}
                    </Text>
                  </div>
                </div>
                <div style={{ flex: 1 }} />
                <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
              </div>
              <Divider />
              <h4 style={{ margin: "16px 24px 8px", color: "rgba(0,0,0,0.65)" }}>Composición de la receta</h4>
              <Table<IngredienteDTO>
                columns={columnasIngredientes}
                dataSource={ingredientes}
                rowKey="id"
                loading={loadingIngredientes}
                scroll={{ x: 750 }}
                size="middle"
                pagination={false}
                locale={{
                  emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Empty description="No hay ingredientes registrados para este producto. Agregue ingredientes desde el módulo de productos." />
                  </div>,
                }}
                className="paces-border-top paces-list-table"
              />
            </div>
          </>
        ) : (
          <>
            <CatalogoListadoToolbar
              onSearch={(val) => setSearchText(val)}
              pageSize={pageSize}
              onPageSizeChange={(v) => { setPageSize(v); }}
              onReload={() => refetch()}
              onExportarExcel={handleExportarExcel}
            />
            <Divider />
            <h4 style={{ margin: "16px 24px 8px", color: "rgba(0,0,0,0.65)" }}>Productos</h4>
            <Table<ProductoRecetaDTO>
              columns={columnasProductos}
              dataSource={filteredProductos}
              rowKey="codigo"
              loading={isLoading}
              scroll={{ x: 600 }}
              size="middle"
              pagination={{
                pageSize,
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
              }}
              onRow={(record) => ({
                onClick: () => handleSeleccionar(record.codigo, record.nombre),
                style: { cursor: "pointer" },
              })}
              locale={{
                emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Empty description="No hay productos con receta registrados" />
                </div>,
              }}
              className="paces-border-top paces-list-table"
            />
          </>
        )}
      </Card>
    </>
  );
};

export default Recetas;
