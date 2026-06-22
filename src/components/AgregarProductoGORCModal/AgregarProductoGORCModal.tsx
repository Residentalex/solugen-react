import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Tabs, Table, Input, Button, message } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { productoApi } from '../../api/productoApi';
import { useAuthStore } from '../../stores/authStore';
import { formatNumber, toTitleCase } from '../../utils/formats';
import type { ProductoSeleccionado } from '../BuscarProductoModal/BuscarProductoModal';

interface AgregarProductoGORCModalProps {
  open: boolean;
  onClose: () => void;
  onSelectProducto: (producto: ProductoSeleccionado) => void;
  onSelectConteos: (productos: ProductoSeleccionado[]) => void;
  conteoDetallesData: any[] | null;
  maestroDetallesData: any[] | null;
}

// ===== Helper para extraer valor de campos con nombre variable =====
function getCampo(obj: any, ...campos: string[]): any {
  for (const c of campos) {
    const val = obj?.[c];
    if (val !== undefined && val !== null) return val;
  }
  return undefined;
}

const AgregarProductoGORCModal: React.FC<AgregarProductoGORCModalProps> = ({
  open,
  onClose,
  onSelectProducto,
  onSelectConteos,
  conteoDetallesData,
  maestroDetallesData,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [activeTab, setActiveTab] = useState('conteo');
  const buscarSearchRef = useRef<any>(null);

  useEffect(() => {
    if (open && activeTab === 'buscar') {
      const timer = setTimeout(() => {
        buscarSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  // ===== Tab 1 â€” Conteo fÃ­sico =====
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedRowKeys([]);
      if (conteoDetallesData && conteoDetallesData.length > 0) {
        setActiveTab('conteo');
      } else if (maestroDetallesData && maestroDetallesData.length > 0) {
        setActiveTab('maestro');
      } else {
        setActiveTab('buscar');
      }
    }
  }, [open, conteoDetallesData, maestroDetallesData]);

  const handleAgregarConteo = () => {
    if (selectedRowKeys.length === 0) return;

    const seleccionados = (conteoDetallesData ?? []).filter((d) => {
      const key = getCampo(d, 'codigo', 'cod_pro');
      return selectedRowKeys.includes(key ?? '');
    });

    const productos: ProductoSeleccionado[] = seleccionados.map((d) => {
      const medidaObj = getCampo(d, 'medida');
      const presentacionStr = getCampo(d, 'presentacion');
      const presentacionId = getCampo(d, 'presentacionID');

      return {
        ...d,
        codigo: getCampo(d, 'codigo', 'cod_pro') || '',
        articulo: getCampo(d, 'articulo', 'DESCRIPCION', 'descripcion') || '',
        referencia: getCampo(d, 'referencia') || '',
        costo: getCampo(d, 'ultimoCosto', 'costo') || 0,
        precio: getCampo(d, 'precio', 'precioSugerido') || 0,
        medida: medidaObj
          ? {
              nombre: getCampo(medidaObj, 'nombre', 'descripcion') || '',
              codigo: getCampo(medidaObj, 'codigo') || '',
              factor: getCampo(medidaObj, 'factor') || 1,
              idExterno: getCampo(medidaObj, 'idExterno', 'multiusoid', 'codigo') || 0,
            }
          : presentacionStr
            ? { nombre: presentacionStr, codigo: '', factor: 1, idExterno: presentacionId || 0 }
            : undefined,
        impuesto: getCampo(d, 'impuesto') || undefined,
      };
    });

    onSelectConteos(productos);
    onClose();
  };

  // ===== Tab Maestro â€” Productos del suplidor =====
  const handleAgregarMaestro = () => {
    if (selectedRowKeys.length === 0) return;

    const seleccionados = (maestroDetallesData ?? []).filter((d) =>
      selectedRowKeys.includes(d.codigo)
    );

    onSelectConteos(seleccionados);
    onClose();
  };

  const maestroColumns = [
    {
      title: 'CÃ³digo',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 100,
    },
    {
      title: 'Producto',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => formatNumber(record._costo || 0),
    },
  ];

  const conteoColumns = [
    {
      title: 'CÃ³digo',
      key: 'codigo',
      width: 100,
      render: (_: any, record: any) => getCampo(record, 'codigo', 'cod_pro') || '-',
    },
    {
      title: 'Producto',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      render: (_: any, record: any) =>
        toTitleCase(getCampo(record, 'articulo', 'DESCRIPCION', 'descripcion') || ''),
    },
    {
      title: 'Cant.',
      key: 'cantidad',
      width: 70,
      align: 'right' as const,
      render: (_: any, record: any) => formatNumber(getCampo(record, 'cantidad') || 0),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => formatNumber(getCampo(record, 'ultimoCosto', 'costo') || 0),
    },
  ];

  // ===== Tab 2 â€” Buscar producto =====
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(
    async (filtro?: string) => {
      setLoading(true);
      try {
        const params: any = { filas: 20, salto: 0, activo: true };
        if (filtro) params.codigo = filtro;
        const res = await productoApi.obtenerListado(sucursalActiva, params);
        setProductos(Array.isArray(res) ? res : []);
      } catch {
        message.error('Error al buscar productos');
        setProductos([]);
      } finally {
        setLoading(false);
      }
    },
    [sucursalActiva]
  );

  useEffect(() => {
    if (open && activeTab === 'buscar') cargar();
  }, [open, activeTab, cargar]);

  const buscarColumns = [
    { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 100 },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Costo',
      dataIndex: 'ultimoCosto',
      key: 'ultimoCosto',
      width: 80,
      align: 'right' as const,
      render: (v: number) => formatNumber(v || 0),
    },
  ];

  // ===== Tabs definition =====
  const tabsItems = [];

  if (conteoDetallesData && conteoDetallesData.length > 0) {
    tabsItems.push({
      key: 'conteo',
      label: 'ðŸ“‹ Conteo fÃ­sico',
      children: (
        <div>
          <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
            Productos cargados del conteo fÃ­sico. Seleccione los que desea agregar.
          </p>
          <Table
            dataSource={conteoDetallesData}
            columns={conteoColumns}
            rowKey={(r) => getCampo(r, 'codigo', 'cod_pro') || Math.random().toString()}
            size="small"
            pagination={false}
            scroll={{ y: 350 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAgregarConteo}
              disabled={selectedRowKeys.length === 0}
            >
              Agregar seleccionados ({selectedRowKeys.length})
            </Button>
          </div>
        </div>
      ),
    });
  }

  if (maestroDetallesData && maestroDetallesData.length > 0) {
    tabsItems.push({
      key: 'maestro',
      label: 'ðŸ“¦ Suplidor',
      children: (
        <div>
          <p style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 12 }}>
            Productos cargados del suplidor. Seleccione los que desea agregar.
          </p>
          <Table
            dataSource={maestroDetallesData}
            columns={maestroColumns}
            rowKey={(r) => r.codigo || Math.random().toString()}
            size="small"
            pagination={false}
            scroll={{ y: 350 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAgregarMaestro}
              disabled={selectedRowKeys.length === 0}
            >
              Agregar seleccionados ({selectedRowKeys.length})
            </Button>
          </div>
        </div>
      ),
    });
  }

  tabsItems.push({
    key: 'buscar',
    label: 'ðŸ” Buscar producto',
    children: (
      <div>
        <Input.Search
          ref={buscarSearchRef}
          placeholder="Buscar por cÃ³digo o nombre..."
          allowClear
          onSearch={(val) => cargar(val)}
          style={{ marginBottom: 12 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <Table
          dataSource={productos}
          columns={buscarColumns}
          rowKey="codigo"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ y: 350 }}
          onRow={(record) => ({
            onClick: () => {
              const producto: ProductoSeleccionado = {
                codigo: record.codigo || '',
                articulo: record.nombre || '',
                referencia: record.referencia || '',
                costo: record.ultimoCosto || 0,
                precio: record.precio || 0,
                medida: record.unidadMedida
                  ? {
                      nombre: record.unidadMedida.nombre || '',
                      codigo: record.unidadMedida.codigo || '',
                      factor: record.unidadMedida.factor ?? 1,
                      idExterno: record.unidadMedida.idExterno ?? 0,
                    }
                  : undefined,
                impuesto: record.impuestoCompra
                  ? {
                      nombre: record.impuestoCompra.nombre || '',
                      porcentaje: record.impuestoCompra.porcentaje || 0,
                      codigo: '',
                      idExterno: '',
                    }
                  : undefined,
              };
              onSelectProducto(producto);
              onClose();
            },
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: 'No se encontraron productos' }}
        />
      </div>
    ),
  });

  return (
    <Modal
      title="Agregar producto"
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      destroyOnHidden
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabsItems} />
    </Modal>
  );
};

export default AgregarProductoGORCModal;
