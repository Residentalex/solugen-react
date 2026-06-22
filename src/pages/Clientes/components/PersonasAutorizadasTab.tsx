import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Tag, Card, message, Popconfirm, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { personaAutorizadaApi } from '../../../api/personaAutorizadaApi';
import type { PersonaAutorizadaDTO } from '../../../types/facturacion';

interface Props {
  codigoCliente: string;
  sucursal: number;
}

const PersonasAutorizadasTab: React.FC<Props> = ({ codigoCliente, sucursal }) => {
  const [data, setData] = useState<PersonaAutorizadaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<PersonaAutorizadaDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    if (!codigoCliente) return;
    setLoading(true);
    try {
      const res = await personaAutorizadaApi.listar(sucursal, codigoCliente);
      setData(res ?? []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar personas autorizadas');
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
    form.setFieldsValue({ creditoFiscal: false });
    setModalVisible(true);
  };

  const handleEditar = (record: PersonaAutorizadaDTO) => {
    setEditRecord(record);
    form.setFieldsValue({
      codigo: record.codigo,
      nombre: record.nombre,
      cedula: record.cedula,
      telefono: record.telefono,
      fax: record.fax,
      email: record.email,
      direccion: record.direccion,
      noContrato: record.noContrato,
      creditoFiscal: record.creditoFiscal ?? false,
    });
    setModalVisible(true);
  };

  const handleEliminar = async (id: string) => {
    try {
      await personaAutorizadaApi.eliminar(sucursal, codigoCliente, id);
      message.success('Persona autorizada eliminada correctamente');
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: PersonaAutorizadaDTO = {
        codigo: values.codigo || '',
        nombre: values.nombre,
        cedula: values.cedula || '',
        telefono: values.telefono || '',
        fax: values.fax || '',
        email: values.email || '',
        direccion: values.direccion || '',
        noContrato: values.noContrato || '',
        creditoFiscal: values.creditoFiscal ?? false,
      };

      if (editRecord?.id) {
        await personaAutorizadaApi.actualizar(sucursal, codigoCliente, editRecord.id, payload);
        message.success('Persona autorizada actualizada correctamente');
      } else {
        await personaAutorizadaApi.crear(sucursal, codigoCliente, payload);
        message.success('Persona autorizada creada correctamente');
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
    { title: 'CÃ³digo', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    { title: 'CÃ©dula', dataIndex: 'cedula', key: 'cedula', width: 140 },
    { title: 'TelÃ©fono', dataIndex: 'telefono', key: 'telefono', width: 130 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200, ellipsis: true },
    {
      title: 'Cred. Fiscal',
      dataIndex: 'creditoFiscal',
      key: 'creditoFiscal',
      width: 120,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'SÃ­' : 'No'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: any, record: PersonaAutorizadaDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditar(record)} />
          <Popconfirm title="Â¿Eliminar esta persona autorizada?" onConfirm={() => handleEliminar(record.id!)} okText="SÃ­" cancelText="No">
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
        rowKey={(r) => r.id || r.codigo || ''}
        loading={loading}
        size="middle"
        scroll={{ x: 800 }}
        pagination={{ showTotal: (t) => `${t} registros` }}
      />
      <Modal
        title={editRecord ? 'Editar Persona Autorizada' : 'Nueva Persona Autorizada'}
        open={modalVisible}
        onOk={handleGuardar}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnHidden
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="codigo" label="CÃ³digo">
            <Input placeholder="CÃ³digo" maxLength={20} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Nombre completo" maxLength={100} />
          </Form.Item>
          <Form.Item name="cedula" label="CÃ©dula">
            <Input placeholder="CÃ©dula" maxLength={20} />
          </Form.Item>
          <Form.Item name="telefono" label="TelÃ©fono">
            <Input placeholder="TelÃ©fono" maxLength={20} />
          </Form.Item>
          <Form.Item name="fax" label="Fax">
            <Input placeholder="Fax" maxLength={20} />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input placeholder="correo@ejemplo.com" maxLength={80} />
          </Form.Item>
          <Form.Item name="direccion" label="DirecciÃ³n">
            <Input.TextArea placeholder="DirecciÃ³n" rows={2} maxLength={200} />
          </Form.Item>
          <Form.Item name="noContrato" label="No. Contrato">
            <Input placeholder="NÃºmero de contrato" maxLength={50} />
          </Form.Item>
          <Form.Item name="creditoFiscal" label="CrÃ©dito Fiscal" valuePropName="checked">
            <Switch checkedChildren="SÃ­" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default PersonasAutorizadasTab;
