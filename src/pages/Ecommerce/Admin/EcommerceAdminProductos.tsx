import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table, Input, Button, Card, Switch, Modal, Form, InputNumber, Select, Typography, Tooltip, message,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, PictureOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminProductoListadoDTO, AdminCategoriaDTO } from '../../../api/ecommerceApi';
import { formatCurrency } from '../../../utils/formats';
import { useAuthStore } from '../../../stores/authStore';
import PermissionGate from '../../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../../utils/exportToExcel';

const { Text } = Typography;

const EcommerceAdminProductos: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [data, setData] = useState<AdminProductoListadoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [catalogoFiltro, setCatalogoFiltro] = useState<string>('todos');
  const [destacadoFiltro, setDestacadoFiltro] = useState<string>('todos');
  const [categorias, setCategorias] = useState<AdminCategoriaDTO[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<AdminProductoListadoDTO | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [precioOfertaForm] = Form.useForm();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProducto, setUploadProducto] = useState<AdminProductoListadoDTO | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [toggleKey, setToggleKey] = useState<string | null>(null);
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const operacionRef = useRef(false);
  const ocupado = toggleKey !== null || guardandoPrecio || uploading || refrescando || exportando || loading;

  const cargarCategorias = useCallback(async () => {
    try {
      const cats = await ecommerceApi.adminObtenerCategorias();
      setCategorias(cats.filter((c) => c.activo));
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías');
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    setLoading(true);
    try {
      const params: {
        buscar?: string;
        categoria?: string;
        enCatalogo?: boolean;
        destacado?: boolean;
        pagina?: number;
        tamano?: number;
      } = { pagina: page, tamano: pageSize };

      if (searchText) params.buscar = searchText;
      if (categoriaFiltro) params.categoria = categoriaFiltro;
      if (catalogoFiltro !== 'todos') params.enCatalogo = catalogoFiltro === 'si';
      if (destacadoFiltro !== 'todos') params.destacado = destacadoFiltro === 'si';

      const result = await ecommerceApi.adminObtenerProductos(params);
      setData(result.items);
      setTotal(result.total);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchText, categoriaFiltro, catalogoFiltro, destacadoFiltro]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleExportarExcel = async () => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setExportando(true);
    try {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columns.filter((c) => c.key !== 'acciones' && c.dataIndex !== 'imagenUrl');
    exportToExcel({
      fileName: `ProductosEcommerce_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`,
      sheetName: 'Productos Ecommerce',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: data.map((item: any) =>
        cols.map((col) => {
          const val = item[col.dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
    } finally {
      setExportando(false);
      operacionRef.current = false;
    }
  };

  const handleSearch = (value: string) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = async () => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setRefrescando(true);
    try {
      setPage(1);
      await cargarProductos();
    } finally {
      setRefrescando(false);
      operacionRef.current = false;
    }
  };

  const handleToggleCatalogo = async (record: AdminProductoListadoDTO) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setToggleKey(`catalogo:${record.id}`);
    try {
      await ecommerceApi.adminToggleCatalogo(record.id, !record.enCatalogo);
      setData((prev) =>
        prev.map((p) => (p.id === record.id ? { ...p, enCatalogo: !p.enCatalogo } : p))
      );
      message.success('Estado actualizado');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
    } finally {
      setToggleKey(null);
      operacionRef.current = false;
    }
  };

  const handleToggleDestacado = async (record: AdminProductoListadoDTO) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setToggleKey(`destacado:${record.id}`);
    try {
      await ecommerceApi.adminToggleDestacado(record.id, !record.destacado);
      setData((prev) =>
        prev.map((p) => (p.id === record.id ? { ...p, destacado: !p.destacado } : p))
      );
      message.success('Estado actualizado');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
    } finally {
      setToggleKey(null);
      operacionRef.current = false;
    }
  };

  const openPrecioOferta = (record: AdminProductoListadoDTO) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    setSelectedProducto(record);
    precioOfertaForm.setFieldsValue({ precioOferta: record.precioOferta });
    setModalOpen(true);
  };

  const handleGuardarPrecioOferta = async () => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setGuardandoPrecio(true);
    try {
      const values = await precioOfertaForm.validateFields();
      if (!selectedProducto) return;
      await ecommerceApi.adminActualizarPrecioOferta(selectedProducto.id, values.precioOferta ?? null);
      setData((prev) =>
        prev.map((p) => (p.id === selectedProducto.id ? { ...p, precioOferta: values.precioOferta ?? null } : p))
      );
      message.success('Precio de oferta actualizado');
      setModalOpen(false);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar precio');
    } finally {
      setGuardandoPrecio(false);
      operacionRef.current = false;
    }
  };

  const openUploadModal = (record: AdminProductoListadoDTO) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    setUploadProducto(record);
    setUploadFile(null);
    setUploadPreview('');
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    if (!uploadFile || !uploadProducto) return;
    operacionRef.current = true;
    setUploading(true);
    try {
      const result = await ecommerceApi.adminSubirImagen(uploadProducto.id, uploadFile);
      setData((prev) =>
        prev.map((p) => (p.id === uploadProducto.id ? { ...p, imagenUrl: result.imagenUrl } : p))
      );
      message.success('Imagen subida correctamente');
      setUploadModalOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al subir imagen');
    } finally {
      setUploading(false);
      operacionRef.current = false;
    }
  };

  const columns: ColumnsType<AdminProductoListadoDTO> = [
    {
      title: 'Imagen',
      dataIndex: 'imagenUrl',
      key: 'imagenUrl',
      width: 120,
      render: (val: string, record: AdminProductoListadoDTO) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {val ? (
            <img src={val} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} alt="producto" />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--paces-hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              <PictureOutlined />
            </div>
          )}
          <Tooltip title="Subir imagen">
            <Button type="text" size="small" icon={<UploadOutlined />} disabled={ocupado} onClick={() => openUploadModal(record)} />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Código',
      dataIndex: 'codPro',
      key: 'codPro',
      width: 120,
      fixed: 'left',
      render: (val: string) => <Text style={{ fontFamily: 'monospace' }}>{val}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Categoría',
      dataIndex: 'categoriaNombre',
      key: 'categoriaNombre',
      width: 140,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Precio Base',
      dataIndex: 'precioBase',
      key: 'precioBase',
      width: 130,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Precio Venta',
      dataIndex: 'precioVenta',
      key: 'precioVenta',
      width: 130,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Precio Oferta',
      dataIndex: 'precioOferta',
      key: 'precioOferta',
      width: 130,
      align: 'right',
      render: (val: number | null, record: AdminProductoListadoDTO) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <Text style={{ color: val ? '#34c38f' : undefined }}>{val ? formatCurrency(val) : '-'}</Text>
          <Tooltip title="Editar precio oferta">
            <Button type="text" size="small" icon={<EditOutlined />} disabled={ocupado} onClick={() => openPrecioOferta(record)} />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Existencia',
      dataIndex: 'existencia',
      key: 'existencia',
      width: 100,
      align: 'right',
      render: (val: number) => <Text>{val}</Text>,
    },
    {
      title: 'En Catálogo',
      dataIndex: 'enCatalogo',
      key: 'enCatalogo',
      width: 110,
      align: 'center',
      render: (val: boolean, record: AdminProductoListadoDTO) => (
        <Switch size="small" checked={val} disabled={ocupado} loading={toggleKey === `catalogo:${record.id}`} onChange={() => handleToggleCatalogo(record)} />
      ),
    },
    {
      title: 'Destacado',
      dataIndex: 'destacado',
      key: 'destacado',
      width: 100,
      align: 'center',
      render: (val: boolean, record: AdminProductoListadoDTO) => (
        <Switch size="small" checked={val} disabled={ocupado} loading={toggleKey === `destacado:${record.id}`} onChange={() => handleToggleDestacado(record)} />
      ),
    },
  ];

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar producto..."
              allowClear
              onSearch={handleSearch}
              disabled={ocupado}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              placeholder="Categoría"
              allowClear
              style={{ width: 180 }}
              value={categoriaFiltro || undefined}
              disabled={ocupado}
              onChange={(v) => { if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; } setCategoriaFiltro(v || ''); setPage(1); }}
              options={categorias.map((c) => ({ value: c.nombre, label: c.nombre }))}
            />
            <Select
              placeholder="En Catálogo"
              style={{ width: 140 }}
              value={catalogoFiltro}
              disabled={ocupado}
              onChange={(v) => { if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; } setCatalogoFiltro(v); setPage(1); }}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Select
              placeholder="Destacado"
              style={{ width: 140 }}
              value={destacadoFiltro}
              disabled={ocupado}
              onChange={(v) => { if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; } setDestacadoFiltro(v); setPage(1); }}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} disabled={ocupado} loading={exportando} />
            </PermissionGate>
            <Button icon={<ReloadOutlined spin={refrescando} />} onClick={handleRefresh} disabled={ocupado} loading={refrescando} />
          </div>
        </div>
        <Table<AdminProductoListadoDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading || ocupado}
          size="middle"
          scroll={{ x: 1400 }}
          className="paces-border-top paces-list-table"
          rowClassName="paces-row-hover"
          pagination={{
            current: page,
            pageSize,
            total,
            disabled: ocupado,
            onChange: (p, ps) => {
              if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
              if (ps !== pageSize) {
                setPageSize(ps || 25);
                setPage(1);
              } else {
                setPage(p);
              }
            },
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      <Modal
        title={`Editar Precio Oferta - ${selectedProducto?.nombre ?? ''}`}
        open={modalOpen}
        onOk={handleGuardarPrecioOferta}
        onCancel={() => { if (operacionRef.current || guardandoPrecio) return; setModalOpen(false); }}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardandoPrecio}
        okButtonProps={{ disabled: guardandoPrecio }}
        cancelButtonProps={{ disabled: guardandoPrecio }}
        closable={!guardandoPrecio}
        maskClosable={!guardandoPrecio}
        keyboard={!guardandoPrecio}
      >
        <Form form={precioOfertaForm} layout="vertical" disabled={guardandoPrecio}>
          <Form.Item
            name="precioOferta"
            label="Precio de Oferta"
            rules={[{ required: false }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              precision={2}
              prefix="$"
              disabled={guardandoPrecio}
              placeholder="Dejar vacío para quitar oferta"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Subir Imagen - ${uploadProducto?.nombre ?? ''}`}
        open={uploadModalOpen}
        onCancel={() => { if (operacionRef.current || uploading) return; setUploadModalOpen(false); }}
        footer={null}
        destroyOnHidden
        closable={!uploading}
        maskClosable={!uploading}
        keyboard={!uploading}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
          <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading || ocupado} />
          {uploadPreview && (
            <img
              src={uploadPreview}
              style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }}
              alt="preview"
            />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={handleUpload}
            disabled={!uploadFile || uploading || ocupado}
          >
            Subir
          </Button>
          <Button onClick={() => { if (operacionRef.current || uploading) return; setUploadModalOpen(false); }} disabled={uploading}>
            Cerrar
          </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default EcommerceAdminProductos;
