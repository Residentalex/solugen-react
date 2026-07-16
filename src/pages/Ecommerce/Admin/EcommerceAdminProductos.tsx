import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Input, Button, Card, Switch, Modal, Form, InputNumber, Select, Typography, Tooltip, message,
} from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminProductoListadoDTO, AdminCategoriaDTO } from '../../../api/ecommerceApi';
import { formatCurrency } from '../../../utils/formats';

const { Text } = Typography;

const EcommerceAdminProductos: React.FC = () => {
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

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleRefresh = () => {
    setPage(1);
    cargarProductos();
  };

  const handleToggleCatalogo = async (record: AdminProductoListadoDTO) => {
    try {
      await ecommerceApi.adminToggleCatalogo(record.id, !record.enCatalogo);
      setData((prev) =>
        prev.map((p) => (p.id === record.id ? { ...p, enCatalogo: !p.enCatalogo } : p))
      );
      message.success('Estado actualizado');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
    }
  };

  const handleToggleDestacado = async (record: AdminProductoListadoDTO) => {
    try {
      await ecommerceApi.adminToggleDestacado(record.id, !record.destacado);
      setData((prev) =>
        prev.map((p) => (p.id === record.id ? { ...p, destacado: !p.destacado } : p))
      );
      message.success('Estado actualizado');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar');
    }
  };

  const openPrecioOferta = (record: AdminProductoListadoDTO) => {
    setSelectedProducto(record);
    precioOfertaForm.setFieldsValue({ precioOferta: record.precioOferta });
    setModalOpen(true);
  };

  const handleGuardarPrecioOferta = async () => {
    const values = await precioOfertaForm.validateFields();
    if (!selectedProducto) return;
    try {
      await ecommerceApi.adminActualizarPrecioOferta(selectedProducto.id, values.precioOferta ?? null);
      setData((prev) =>
        prev.map((p) => (p.id === selectedProducto.id ? { ...p, precioOferta: values.precioOferta ?? null } : p))
      );
      message.success('Precio de oferta actualizado');
      setModalOpen(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar precio');
    }
  };

  const openUploadModal = (record: AdminProductoListadoDTO) => {
    setUploadProducto(record);
    setUploadFile(null);
    setUploadPreview('');
    setUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadProducto) return;
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
            <Button type="text" size="small" icon={<UploadOutlined />} onClick={() => openUploadModal(record)} />
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
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openPrecioOferta(record)} />
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
        <Switch size="small" checked={val} onChange={() => handleToggleCatalogo(record)} />
      ),
    },
    {
      title: 'Destacado',
      dataIndex: 'destacado',
      key: 'destacado',
      width: 100,
      align: 'center',
      render: (val: boolean, record: AdminProductoListadoDTO) => (
        <Switch size="small" checked={val} onChange={() => handleToggleDestacado(record)} />
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
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              placeholder="Categoría"
              allowClear
              style={{ width: 180 }}
              value={categoriaFiltro || undefined}
              onChange={(v) => { setCategoriaFiltro(v || ''); setPage(1); }}
              options={categorias.map((c) => ({ value: c.nombre, label: c.nombre }))}
            />
            <Select
              placeholder="En Catálogo"
              style={{ width: 140 }}
              value={catalogoFiltro}
              onChange={(v) => { setCatalogoFiltro(v); setPage(1); }}
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
              onChange={(v) => { setDestacadoFiltro(v); setPage(1); }}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'si', label: 'Sí' },
                { value: 'no', label: 'No' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
          </div>
        </div>
        <Table<AdminProductoListadoDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1400 }}
          className="paces-border-top paces-list-table"
          rowClassName="paces-row-hover"
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
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
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={precioOfertaForm} layout="vertical">
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
              placeholder="Dejar vacío para quitar oferta"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Subir Imagen - ${uploadProducto?.nombre ?? ''}`}
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '16px 0' }}>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {uploadPreview && (
            <img
              src={uploadPreview}
              style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }}
              alt="preview"
            />
          )}
          <Button
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            onClick={handleUpload}
            disabled={!uploadFile}
          >
            Subir
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default EcommerceAdminProductos;
