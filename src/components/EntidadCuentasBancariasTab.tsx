import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input,  Switch, Tag, Card, message, Popconfirm, Space } from 'antd';
import { Select } from '../components/Select';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { cuentaBancariaClienteApi } from '../api/cuentaBancariaClienteApi';
import type { CuentaBancariaClienteDTO } from '../types/facturacion';
import { useMonedasCatalogo } from '../hooks/useMonedasCatalogo';
import { toTitleCase } from '../utils/formats';

interface Props {
  codigoEntidad: string;
  sucursal: number;
}

const CuentasBancariasTab: React.FC<Props> = ({ codigoEntidad, sucursal }) => {
  const [data, setData] = useState<CuentaBancariaClienteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRecord, setEditRecord] = useState<CuentaBancariaClienteDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Catalogo MONEDAS real de la sucursal. Antes el Select traia una lista fija embebida
  // (DOP/USD/EUR) que se desactualizaba contra el maestro MONEDAS.
  const { monedas, loading: monedasLoading } = useMonedasCatalogo(sucursal);
  const opcionesMoneda = useMemo(
    () => monedas.map((m) => ({ value: m.codigo, label: `${m.codigo} - ${toTitleCase(m.nombre || '')}` })),
    [monedas],
  );

  const cargar = useCallback(async () => {
    if (!codigoEntidad) return;
    setLoading(true);
    try {
      const res = await cuentaBancariaClienteApi.listar(sucursal, codigoEntidad);
      setData(res ?? []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas bancarias');
    } finally {
      setLoading(false);
    }
  }, [sucursal, codigoEntidad]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleAgregar = () => {
    setEditRecord(null);
    form.resetFields();
    form.setFieldsValue({ inactiva: false, porDefecto: false });
    setModalVisible(true);
  };

  const handleEditar = (record: CuentaBancariaClienteDTO) => {
    setEditRecord(record);
    form.setFieldsValue({
      codigo: record.codigo,
      nombre: record.nombre,
      codigoBanco: record.codigoBanco,
      cuentaBancaria: record.cuentaBancaria,
      tipoCuenta: record.tipoCuenta,
      codigoMoneda: record.codigoMoneda,
      inactiva: record.inactiva ?? false,
      porDefecto: record.porDefecto ?? false,
      numeroCuentaContable: record.numeroCuentaContable,
    });
    setModalVisible(true);
  };

  const handleEliminar = async (id: string) => {
    try {
      await cuentaBancariaClienteApi.eliminar(sucursal, codigoEntidad, id);
      message.success('Cuenta bancaria eliminada correctamente');
      cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    }
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: CuentaBancariaClienteDTO = {
        codigo: values.codigo || '',
        nombre: values.nombre || '',
        codigoBanco: values.codigoBanco || '',
        cuentaBancaria: values.cuentaBancaria || '',
        tipoCuenta: values.tipoCuenta || '',
        codigoMoneda: values.codigoMoneda || '',
        inactiva: values.inactiva ?? false,
        porDefecto: values.porDefecto ?? false,
        numeroCuentaContable: values.numeroCuentaContable || '',
      };

      if (editRecord?.id) {
        await cuentaBancariaClienteApi.actualizar(sucursal, codigoEntidad, editRecord.id, payload);
        message.success('Cuenta bancaria actualizada correctamente');
      } else {
        await cuentaBancariaClienteApi.crear(sucursal, codigoEntidad, payload);
        message.success('Cuenta bancaria creada correctamente');
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
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
    { title: 'Banco', dataIndex: 'codigoBanco', key: 'codigoBanco', width: 120 },
    { title: 'No. Cuenta', dataIndex: 'cuentaBancaria', key: 'cuentaBancaria', width: 160 },
    { title: 'Tipo', dataIndex: 'tipoCuenta', key: 'tipoCuenta', width: 100 },
    { title: 'Moneda', dataIndex: 'codigoMoneda', key: 'codigoMoneda', width: 100 },
    {
      title: 'Activo',
      dataIndex: 'inactiva',
      key: 'inactiva',
      width: 100,
      render: (val: boolean) => (
        <Tag color={val ? 'red' : 'green'}>{val ? 'Inactiva' : 'Activa'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (_: any, record: CuentaBancariaClienteDTO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditar(record)} />
          <Popconfirm title="¿Eliminar esta cuenta bancaria?" onConfirm={() => handleEliminar(record.id!)} okText="Sí" cancelText="No">
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
        scroll={{ x: 900 }}
        pagination={{ showTotal: (t) => `${t} registros` }}
      />
      <Modal
        title={editRecord ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
        open={modalVisible}
        onOk={handleGuardar}
        onCancel={() => setModalVisible(false)}
        confirmLoading={saving}
        destroyOnHidden
        okText="Guardar"
        cancelText="Cancelar"
        width={560}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="codigo" label="Código">
            <Input placeholder="Código" maxLength={20} />
          </Form.Item>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Nombre de la cuenta" maxLength={100} />
          </Form.Item>
          <Form.Item name="codigoBanco" label="Banco">
            <Input placeholder="Código del banco" maxLength={20} />
          </Form.Item>
          <Form.Item name="cuentaBancaria" label="No. Cuenta" rules={[{ required: true, message: 'Obligatorio' }]}>
            <Input placeholder="Número de cuenta" maxLength={30} />
          </Form.Item>
          <Form.Item name="tipoCuenta" label="Tipo Cuenta">
            <Select placeholder="Seleccione tipo"
              options={[
                { value: 'A', label: 'Ahorros' },
                { value: 'C', label: 'Corriente' },
              ]}
            />
          </Form.Item>
          <Form.Item name="codigoMoneda" label="Moneda">
            <Select placeholder="Seleccione moneda" loading={monedasLoading}
              options={opcionesMoneda}
            />
          </Form.Item>
          <Form.Item name="numeroCuentaContable" label="No. Cuenta Contable">
            <Input placeholder="Cuenta contable" maxLength={30} />
          </Form.Item>
          <Space size={24}>
            <Form.Item name="inactiva" label="Inactiva" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
            <Form.Item name="porDefecto" label="Por Defecto" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default CuentasBancariasTab;
