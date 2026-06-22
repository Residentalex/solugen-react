import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Card, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { grupoProductoClienteApi } from '../../../api/grupoProductoClienteApi';
import type { GrupoProductoClienteDTO } from '../../../types/facturacion';

interface Props {
  codigoCliente: string;
  sucursal: number;
}

const GruposProductosTab: React.FC<Props> = ({ codigoCliente, sucursal }) => {
  const [data, setData] = useState<GrupoProductoClienteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<GrupoProductoClienteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    if (!codigoCliente) return;
    setLoading(true);
    try {
      const res = await grupoProductoClienteApi.listar(sucursal, codigoCliente);
      setData(res ?? []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos de productos');
    } finally {
      setLoading(false);
    }
  }, [sucursal, codigoCliente]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleAgregar = () => {
    setEditRecord(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditar = (record: GrupoProductoClienteDTO) => {
    setEditRecord(record);
    form.setFieldsValue({
      codigoGrupo: record.codigoGrupo,
      nombreGrupo: record.nombreGrupo,
      porcentajeDescuento: record.porcentajeDescuento,
    });
    setModalVisible(true);
  };

  const handleEliminar = async (id: string) => {
    try {
      await grupoProductoClienteApi.eliminar(sucursal, codigoCliente, id);
      message.success('Grupo de producto eliminado correctamente');
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: GrupoProductoClienteDTO = {
        codigoGrupo: values.codigoGrupo || '',
        nombreGrupo: values.nombreGrupo || '',
        porcentajeDescuento: values.porcentajeDescuento ?? 0,
      };

      if (editRecord?.id) {
        await grupoProductoClienteApi.actualizar(sucursal, codigoCliente, editRecord.id, payload);
        message.success('Grupo de producto actualizado correctamente');
      } else {
        await grupoProductoClienteApi.crear(sucursal, codigoCliente, payload);
        message.success('Grupo de producto creado correctamente');
      }
      setModalVisible(false);
      cargar();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'CÃ³digo Grupo', dataIndex: 'codigoGrupo', key: 'codigoGrupo', width: 140 },
    { title: 'Nombre Grupo', dataIndex: 'nombreGrupo', key: 'nombreGrupo', ellipsis: true },
    {
      title: '% Descuento',
      dataIndex: 'porcentajeDescuento',
      key: 'porcentajeDescuento',
      width: 130,
      render: (val: number) => (val != null ? `${Number(val).toFixed(2)}%` : '-'),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: any, record: GrupoProductoClienteDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditar(record)} />
          <Popconfirm title="Â¿Eliminar este grupo de producto?" onConfirm={() => handleEliminar(record.id!)} okText="SÃ­" cancelText="No">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card className="paces-card" styles={{ body: { padding: 0 } }}>
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregar}>
            Agregar
          </Button>
          <div style={{ flex: 1 }} />
          <Button icon={<ReloadOutlined />} onClick={cargar} />
        </div>
      </div>
      <Table
        className="paces-border-top paces-list-table"
        dataSource={data}
        columns={columns}
        rowKey={(r) => r.id || r.codigoGrupo || ''}
        loading={loading}
        size="middle"
        scroll={{ x: 600 }}
        pagination={{ showTotal: (t) => `${t} registros` }}
      />
      <Modal
        title={editRecord ? 'Editar Grupo de Producto' : 'Nuevo Grupo de Producto'}
        open={modalVisible}
        onOk={handleGuardar}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnHidden
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="codigoGrupo" label="CÃ³digo Grupo">
            <Input placeholder="CÃ³digo del grupo" maxLength={20} />
          </Form.Item>
          <Form.Item name="nombreGrupo" label="Nombre Grupo" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Nombre del grupo" maxLength={100} />
          </Form.Item>
          <Form.Item name="porcentajeDescuento" label="% Descuento">
            <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GruposProductosTab;
