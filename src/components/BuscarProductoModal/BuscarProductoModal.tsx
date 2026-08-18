import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Input, Table, Tabs, message } from 'antd';
import { formatCurrency } from '../../utils/formats';
import { productoApi } from '../../api/productoApi';
import { servicioApi } from '../../api/servicioApi';
import { useAuthStore } from '../../stores/authStore';

// ===== Tipos =====
export type BuscarProductoMode = 'inventario' | 'compra' | 'venta';

export interface ProductoSeleccionado {
  codigo: string;
  articulo: string;
  referencia: string;
  costo: number;
  precio: number;
  familia?: { nombre: string; idExterno: string };
  medida?: { nombre: string; codigo: string; factor: number; idExterno: number };
  impuesto?: { nombre: string; porcentaje: number; codigo: string; idExterno: string };
  tieneVencimiento?: boolean;
  modificaPrecio?: boolean;
  modificaDescripcion?: boolean;
}

interface BuscarProductoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producto: ProductoSeleccionado) => void;
  mode: BuscarProductoMode;
  codigosPermitidos?: string[];
}

// ===== Helpers locales =====
function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const BuscarProductoModal: React.FC<BuscarProductoModalProps> = ({ open, onClose, onSelect, mode, codigosPermitidos }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'productos' | 'servicios'>('productos');
  const pageSize = 10;
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const productosFiltrados = useMemo(() => {
    let filtrados = productos;
    if (activeTab === 'productos' && codigosPermitidos && codigosPermitidos.length > 0) {
      filtrados = filtrados.filter((p) => codigosPermitidos.includes(p.codigo));
    }
    return filtrados;
  }, [productos, codigosPermitidos, activeTab]);

   const cargar = useCallback(async (filtro?: string, pagina?: number, tab?: 'productos' | 'servicios') => {
     const pageActual = pagina ?? page;
     const tabActual = tab ?? activeTab;
     setLoading(true);
     try {
       if (tabActual === 'productos') {
         const params: any = { filas: pageSize, salto: (pageActual - 1) * pageSize };
         if (filtro) params.codigo = filtro;
         // Filtro para productos activos
         params.activo = true;

         const [res, totalCount] = await Promise.all([
           productoApi.obtenerListado(sucursalActiva, params),
           productoApi.obtenerTotal(sucursalActiva, filtro ? { codigo: filtro, activo: true } : { activo: true }),
         ]);
         setProductos(res || []);
         setTotal(totalCount || 0);
         setPage(pageActual);
       } else {
         const res = await servicioApi.obtenerVista(sucursalActiva, {
           cantidad: pageSize,
           salto: (pageActual - 1) * pageSize,
           codigo: filtro || '',
           nombre: filtro || '',
           activo: true,
         });
         setProductos(
           (res.items || []).map((s) => ({
             ...s,
             referencia: s.referenciaInterna,
             ultimoCosto: 0,
           }))
         );
         setTotal(res.total || 0);
         setPage(pageActual);
       }
     } catch {
       message.error(tabActual === 'productos' ? 'Error al cargar productos' : 'Error al cargar servicios');
     } finally {
       setLoading(false);
     }
   }, [sucursalActiva, page, activeTab]);

  useEffect(() => {
    if (open) {
      setActiveTab('productos');
      setSearch('');
      setPage(1);
      cargar('', 1, 'productos');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (key: string) => {
    const newTab = key as 'productos' | 'servicios';
    setActiveTab(newTab);
    setSearch('');
    setPage(1);
    cargar('', 1, newTab);
  };

  // Columnas base para productos
  const columnasProductos: any[] = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 120,
      render: (v: string) => v || '-' },
  ];

  // Columna extra según modo para productos
  if (mode === 'inventario' || mode === 'compra') {
    columnasProductos.push({
      title: 'Costo',
      dataIndex: 'ultimoCosto',
      key: 'ultimoCosto',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    });
  } else if (mode === 'venta') {
    columnasProductos.push({
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: any) => formatCurrency(record.precio || record.ultimoCosto || 0),
    });
  }

  // Columnas para servicios (siempre con Precio)
  const columnasServicios: any[] = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Artículo', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 120,
      render: (v: string) => v || '-' },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
  ];

  return (
    <Modal
      title="Buscar Artículo"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={(val) => {
          setSearch(val);
          cargar(val, 1);
        }}
        style={{ marginBottom: 16 }}
      />
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'productos',
            label: 'Productos',
            children: (
              <>
                {codigosPermitidos && productosFiltrados.length === 0 && productos.length > 0 && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--paces-text-secondary)' }}>
                    No se encontraron productos en los códigos permitidos. Intente con otro criterio de búsqueda.
                  </div>
                )}
                <Table
                  dataSource={productosFiltrados}
                  columns={columnasProductos}
                  rowKey="codigo"
                  loading={loading}
                  size="small"
                  pagination={
                    codigosPermitidos
                      ? { current: 1, pageSize: productosFiltrados.length, total: productosFiltrados.length, hideOnSinglePage: true, showSizeChanger: false }
                      : { current: page, pageSize, total, showSizeChanger: false, onChange: (p) => cargar(search, p) }
                  }
                  onRow={(record) => ({
                    onDoubleClick: async () => {
                      try {
                        const detalle = await productoApi.obtenerDetalle(sucursalActiva, record.codigo);
                        onSelect({
                          codigo: record.codigo,
                          articulo: detalle.nombre || record.nombre,
                          referencia: detalle.referenciaInterna || record.referencia || '',
                          costo: detalle.ultimoCosto || record.ultimoCosto || 0,
                          precio: detalle.precio || record.precio || 0,
                          familia: detalle.familia || record.familia,
                          medida: detalle.unidadMedida
                            ? { nombre: detalle.unidadMedida.nombre || '', codigo: '', factor: detalle.unidadMedida.factor ?? 1, idExterno: detalle.unidadMedida.idExterno || 0 }
                            : record.unidadMedida
                              ? { nombre: record.unidadMedida.nombre || '', codigo: '', factor: record.unidadMedida.factor ?? 1, idExterno: record.unidadMedida.idExterno || 0 }
                              : undefined,
                          impuesto: (detalle.impuestos?.[0]?.impuesto as any) || undefined,
                          tieneVencimiento: detalle.pesado || false,
                          modificaPrecio: detalle.modificaPrecio ?? false,
                          modificaDescripcion: detalle.modificaDescripcion ?? false,
                        });
                      } catch {
                        onSelect({
                          codigo: record.codigo,
                          articulo: record.nombre,
                          referencia: record.referencia || '',
                          costo: record.ultimoCosto || 0,
                          precio: record.precio || 0,
                          familia: record.familia,
                          medida: record.unidadMedida
                            ? { nombre: record.unidadMedida.nombre || '', codigo: '', factor: record.unidadMedida.factor ?? 1, idExterno: record.unidadMedida.idExterno || 0 }
                            : undefined,
                          impuesto: undefined,
                          tieneVencimiento: false,
                          modificaPrecio: false,
                          modificaDescripcion: false,
                        });
                      }
                      onClose();
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              </>
            ),
          },
          {
            key: 'servicios',
            label: 'Servicios',
            children: (
              <Table
                dataSource={productosFiltrados}
                columns={columnasServicios}
                rowKey="codigo"
                loading={loading}
                size="small"
                pagination={{ current: page, pageSize, total, showSizeChanger: false, onChange: (p) => cargar(search, p) }}
                onRow={(record) => ({
                  onDoubleClick: async () => {
                    try {
                      const detalle = await servicioApi.obtenerPorCodigo(sucursalActiva, record.codigo);
                      onSelect({
                        codigo: detalle.codigo,
                        articulo: detalle.nombre || record.nombre,
                        referencia: detalle.referenciaInterna || record.referencia || '',
                        costo: 0,
                        precio: detalle.precio || record.precio || 0,
                        familia: detalle.familia ? { nombre: detalle.familia.nombre || '', idExterno: detalle.familia.idExterno || '' } : undefined,
                        medida: detalle.unidadMedida ? { nombre: detalle.unidadMedida.nombre || '', codigo: '', factor: detalle.unidadMedida.factor ?? 1, idExterno: detalle.unidadMedida.idExterno || 0 } : undefined,
                        impuesto: (detalle.impuestos?.[0]?.impuesto as any) || undefined,
                        tieneVencimiento: false,
                        modificaPrecio: false,
                        modificaDescripcion: false,
                      });
                    } catch {
                      onSelect({
                        codigo: record.codigo,
                        articulo: record.nombre,
                        referencia: record.referencia || '',
                        costo: 0,
                        precio: record.precio || 0,
                        familia: undefined,
                        medida: undefined,
                        impuesto: undefined,
                        tieneVencimiento: false,
                        modificaPrecio: false,
                        modificaDescripcion: false,
                      });
                    }
                    onClose();
                  },
                  style: { cursor: 'pointer' },
                })}
              />
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default BuscarProductoModal;