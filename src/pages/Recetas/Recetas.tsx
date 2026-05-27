import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Input, Button, Typography, message, Tag, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { recetaApi } from '../../api/recetaApi';
import type { ProductoRecetaDTO, IngredienteDTO } from '../../types/receta';

const { Text } = Typography;

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

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

  const [productos, setProductos] = useState<ProductoRecetaDTO[]>([]);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [productoSeleccionado, setProductoSeleccionado] = useState<string | null>(null);
  const [productoNombre, setProductoNombre] = useState('');
  const [ingredientes, setIngredientes] = useState<IngredienteDTO[]>([]);
  const [loadingIngredientes, setLoadingIngredientes] = useState(false);

  const cargarProductos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoadingLista(true);
    try {
      const result = await recetaApi.obtenerProductosConReceta(sucursalActiva);
      setProductos(result);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar productos con receta');
      setLoadingError(true);
    } finally {
      setLoadingLista(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MReceta');
    updateToolbar({});
    cargarProductos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarProductos]);

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

  const handleVolver = () => {
    setProductoSeleccionado(null);
    setProductoNombre('');
    setIngredientes([]);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    setSearchText('');
    handleVolver();
    cargarProductos();
  };

  const filteredProductos = searchText
    ? productos.filter(
        (p) =>
          p.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
          p.nombre.toLowerCase().includes(searchText.toLowerCase())
      )
    : productos;

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
      {loadingError && (
        <Alert
          message="Error al cargar recetas"
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
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
      <div style={{ padding: '16px 24px 0' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
          {productoSeleccionado ? (
            <>
              <Button icon={<ArrowLeftOutlined />} onClick={handleVolver}>
                Volver
              </Button>
              <Text strong style={{ fontSize: 15 }}>
                <Tag color="blue" style={{ marginLeft: 4 }}>{productoSeleccionado}</Tag>
                {toTitleCase(productoNombre)}
              </Text>
            </>
          ) : (
            <Input.Search
              placeholder="Buscar producto..."
              allowClear
              onSearch={(val) => setSearchText(val)}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
          )}
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>

        {/* Lista de productos con receta */}
        {!productoSeleccionado && (
          <Table<ProductoRecetaDTO>
            columns={columnasProductos}
            dataSource={filteredProductos}
            rowKey="codigo"
            loading={loadingLista}
            scroll={{ x: 600 }}
            size="middle"
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} productos`,
              pageSizeOptions: ['10', '20', '50', '100'],
              defaultPageSize: 20,
            }}
            onRow={(record) => ({
              onClick: () => handleSeleccionar(record.codigo, record.nombre),
              style: { cursor: 'pointer' },
            })}
            className="paces-border-top paces-list-table"
          />
        )}

        {/* Detalle de ingredientes */}
        {productoSeleccionado && (
          <Table<IngredienteDTO>
            columns={columnasIngredientes}
            dataSource={ingredientes}
            rowKey="id"
            loading={loadingIngredientes}
            scroll={{ x: 750 }}
            size="middle"
            pagination={false}
            className="paces-border-top paces-list-table"
          />
        )}
      </div>
    </Card>
    </>
  );
};

export default Recetas;
