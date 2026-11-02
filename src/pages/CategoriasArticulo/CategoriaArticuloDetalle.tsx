import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Table, Empty, Spin } from 'antd';
import { productoApi } from '../../api/productoApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

import type { ProductoVistaDTO } from '../../types/productos';

const { Text } = Typography;

const CategoriaArticuloDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  useEffect(() => {
    setActiveModule('MCategoria');
  }, [setActiveModule]);

  const [productos, setProductos] = useState<ProductoVistaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categoriaInfo, setCategoriaInfo] = useState<{ nombre?: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const cargar = useCallback(async () => {
    if (!codigo || sucursalProductos === undefined) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const categoria = await categoriaArticuloApi.obtenerPorCodigo(sucursalProductos, codigo);

      if (!categoria) {
        setCategoriaInfo(null);
        setError(true);
        return;
      }

      const nombreCategoria = categoria.nombre || codigo;
      setCategoriaInfo({ nombre: nombreCategoria });

      const { items } = await productoApi.obtenerVistaPorCategoria(sucursalProductos, codigo, {
        cantidad: 500,
        salto: 0,
      });

      setProductos(items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalProductos]);

  useEffect(() => {
    cargar();
  }, [cargar, reloadKey]);

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MCategoria"
      loading={loading}
      mensajeLoading="Cargando categoría..."
      loadingError={error}
      mensajeError="Error al cargar la categoría"
      onRecargar={() => setReloadKey((k) => k + 1)}
      dataDisponible={!!categoriaInfo}
      onEditar={codigo ? () => navigate(`/MCategoria/${codigo}/editar`) : undefined}
    >
      <Card
        title={`Productos de la categoría: ${categoriaInfo?.nombre || codigo || '-'}`}
        extra={<Text type="secondary">{productos.length} producto{productos.length !== 1 ? 's' : ''}</Text>}
      >
        {loading && <Spin tip="Cargando productos..." />}
        {!loading && (
          <Table
            columns={[
              { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
              { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', width: 280 },
              { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 200 },
              { title: 'Precio', dataIndex: 'precio', key: 'precio', width: 120, render: (v: number) => <Text>{v != null ? v.toLocaleString('es-DO', { minimumFractionDigits: 2 }) : '-'}</Text> },
            ]}
            dataSource={productos}
            rowKey="codigo"
            size="middle"
            pagination={{ pageSize: 25, showTotal: (t) => `${t} productos` }}
            locale={{ emptyText: <Empty description="No hay productos en esta categoría" /> }}
          />
        )}
      </Card>
    </DetalleCatalogoLayout>
  );
};

export default CategoriaArticuloDetalle;
