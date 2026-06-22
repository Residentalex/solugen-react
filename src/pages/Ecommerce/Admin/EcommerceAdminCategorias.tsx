import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Card, Modal, Form, Input, InputNumber, Switch, Typography, Tooltip, message, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminCategoriaDTO } from '../../../api/ecommerceApi';

const { Text } = Typography;

const EcommerceAdminCategorias: React.FC = () => {
  const [data, setData] = useState<AdminCategoriaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategoriaDTO | null>(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await ecommerceApi.adminObtenerCategorias();
      setData(result);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías');
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

  const openEditar = (record: AdminCategoriaDTO) => {
    setEditing(record);
    form.setFieldsValue({
      nombre: record.nombre,
      descripcion: record.descripcion,
      orden: record.orden,
      activo: record.activo,
    });
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await ecommerceApi.adminActualizarCategoria(editing.id, values);
        message.success('Categoría actualizada');
      } else {
        await ecommerceApi.adminCrearCategoria(values);
        message.success('Categoría creada');
      }
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    }
  };

  const handleEliminar = async (id: string) => {
    try {
      await ecommerceApi.adminEliminarCategoria(id);
      message.success('Categoría eliminada');
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const columns: ColumnsType<AdminCategoriaDTO> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
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
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 80,
      align: 'center',
    },
    {
      title: 'Productos',
      dataIndex: 'totalProductos',
      key: 'totalProductos',
      width: 100,
      align: 'center',
      render: (val: number) => <Text>{val}</Text>,
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
      render: (_: any, record: AdminCategoriaDTO) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditar(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar categoría?"
            description={record.totalProductos > 0 ? 'Esta categoría tiene productos asignados.' : undefined}
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
              Nueva Categoría
            </Button>
            <Button icon={<ReloadOutlined />} onClick={cargar} />
          </div>
        </div>
        <Table<AdminCategoriaDTO>
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
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
        open={modalOpen}
        onOk={handleGuardar}
        onCancel={() => setModalOpen(false)}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} />
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

export default EcommerceAdminCategorias;
