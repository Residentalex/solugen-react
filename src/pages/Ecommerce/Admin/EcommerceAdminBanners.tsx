import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Card, Modal, Form, Input, InputNumber, Switch, Typography, Tooltip, message, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminBannerDTO } from '../../../api/ecommerceApi';

const { Text } = Typography;

const EcommerceAdminBanners: React.FC = () => {
  const [data, setData] = useState<AdminBannerDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBannerDTO | null>(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ecommerceApi.adminObtenerBanners();
      setData(result);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar banners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const openCrear = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditar = (record: AdminBannerDTO) => {
    setEditing(record);
    form.setFieldsValue({
      titulo: record.titulo,
      descripcion: record.descripcion,
      imagenUrl: record.imagenUrl,
      ctaTexto: record.ctaTexto,
      ctaLink: record.ctaLink,
      orden: record.orden,
      activo: record.activo,
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await ecommerceApi.adminActualizarBanner(editing.id, values);
        message.success('Banner actualizado');
      } else {
        await ecommerceApi.adminCrearBanner(values);
        message.success('Banner creado');
      }
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await ecommerceApi.adminEliminarBanner(id);
      message.success('Banner eliminado');
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const columns: ColumnsType<AdminBannerDTO> = [
    {
      title: 'Imagen',
      dataIndex: 'imagenUrl',
      key: 'imagenUrl',
      width: 100,
      render: (url: string) =>
        url ? (
          <img src={url} alt="banner" style={{ width: 80, height: 48, objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <Text type="secondary">Sin imagen</Text>
        ),
    },
    {
      title: 'Título',
      dataIndex: 'titulo',
      key: 'titulo',
      render: (val: string) => <Text strong>{val}</Text>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (val: string) => <Text type="secondary">{val || '-'}</Text>,
    },
    {
      title: 'CTA',
      dataIndex: 'ctaTexto',
      key: 'ctaTexto',
      width: 120,
      render: (val: string, record: AdminBannerDTO) => (
        <div>
          <Text>{val || '-'}</Text>
          {record.ctaLink && (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>{record.ctaLink}</Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 80,
      align: 'center',
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      align: 'center',
      render: (val: boolean) => (
        <span style={{ color: val ? '#34c38f' : '#f46a6a', fontWeight: 600 }}>{val ? 'Sí' : 'No'}</span>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 100,
      fixed: 'right',
      render: (_: any, record: AdminBannerDTO) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditar(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar banner?"
            onConfirm={() => handleEliminar(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCrear}>
              Nuevo Banner
            </Button>
            <Button icon={<ReloadOutlined />} onClick={cargar} />
          </div>
        </div>
        <Table<AdminBannerDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          className="paces-border-top paces-list-table"
          rowClassName="paces-row-hover"
          pagination={{ showTotal: (t) => `${t} registros` }}
        />
      </Card>

      <Modal
        title={editing ? 'Editar Banner' : 'Nuevo Banner'}
        open={modalOpen}
        onOk={handleGuardar}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="titulo" label="Título" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="imagenUrl" label="URL de Imagen" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          {form.getFieldValue('imagenUrl') && (
            <div style={{ marginBottom: 16 }}>
              <img
                src={form.getFieldValue('imagenUrl')}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 4, objectFit: 'cover' }}
              />
            </div>
          )}
          <Form.Item name="ctaTexto" label="Texto CTA">
            <Input placeholder="Ej: Comprar ahora" />
          </Form.Item>
          <Form.Item name="ctaLink" label="Link CTA">
            <Input placeholder="Ej: /store/ofertas" />
          </Form.Item>
          <Form.Item name="orden" label="Orden" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          {editing && (
            <Form.Item name="activo" label="Activo" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default EcommerceAdminBanners;
