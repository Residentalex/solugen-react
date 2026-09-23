import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Card, Table, Button, Empty, Spin, Alert } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { productoApi } from '../../api/productoApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

import type { ProductoListaDTO } from '../../types/productos';

const { Text } = Typography;

const CategoriaArticuloDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [productos, setProductos] = useState<ProductoListaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [categoriaInfo, setCategoriaInfo] = useState<{ nombre?: string } | null>(null);

  useEffect(() => {
    if (!codigo || sucursalActiva === undefined || sucursalActiva === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    // Cargar info de la categoría
    categoriaArticuloApi
      .obtenerPorCodigo(sucursalActiva, codigo)
      .then((cat) => {
        setCategoriaInfo({ nombre: cat?.nombre || codigo });
      })
      .catch(() => setCategoriaInfo({ nombre: codigo }));

    const timeoutId = setTimeout(() => setLoading(false), 8000);
    productoApi
      .obtenerListado(sucursalActiva, { cantidad: 500 })
      .then((list) => {
        const filtrados = (list || []).filter((p) =>
          p.categoriaCodigo === codigo || p.familia?.nombre?.toLowerCase() === codigo?.toLowerCase() || p.familia?.nombre?.toLowerCase() === (categoriaInfo?.nombre || '').toLowerCase()
        );
        setProductos(filtrados);
      })
      .catch(() => setError(true))
      .finally(() => { clearTimeout(timeoutId); setLoading(false); });
  }, [codigo, sucursalActiva]);

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/MCategoria')}
        style={{ marginBottom: 16 }}
      >
        Volver al listado
      </Button>
      {(sucursalActiva === 0 || sucursalActiva === undefined) && (
        <Alert message="No se detectó una sucursal activa válida (sucursal = 0). Verifique la autenticación o la configuración del backend." type="warning" showIcon style={{ marginBottom: 16 }} />
      )}
      <Card title={`Productos de la categoría: ${categoriaInfo?.nombre || codigo || '-'}`} extra={<Text type="secondary">{productos.length} producto{productos.length !== 1 ? 's' : ''}</Text>}>
        {error && (
          <Alert message="Error al cargar productos" type="error" showIcon style={{ marginBottom: 16 }} />
        )}
        {loading && <Spin tip="Cargando productos..." />}
        {!loading && !error && (
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
    </div>
  );
};

export default CategoriaArticuloDetalle;
