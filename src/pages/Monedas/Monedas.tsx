import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Space,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { monedaApi } from '../../api/monedaApi';
import type { MonedaDTO } from '../../types/contabilidad';

const Monedas: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [data, setData] = useState<MonedaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<MonedaDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await monedaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MMoneda');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (moneda: MonedaDTO) => {
    setEditando(moneda);
    form.setFieldsValue({
      nombre: moneda.nombre,
      simbolo: moneda.simbolo,
      codigo: moneda.codigo,
      tasa: moneda.tasa,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload: MonedaDTO = {
        id: editando?.id || 0,
        nombre: values.nombre,
        simbolo: values.simbolo,
        codigo: values.codigo,
        tasa: values.tasa ?? 1,
      };
      if (editando) {
        await monedaApi.actualizar(sucursalActiva, editando.id, payload);
        message.success('Moneda actualizada correctamente');
      } else {
        await monedaApi.crear(sucursalActiva, payload);
        message.success('Moneda creada correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar moneda');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (moneda: MonedaDTO) => {
    if (sucursalActiva === undefined) return;
    try {
      await monedaApi.eliminar(sucursalActiva, moneda.id);
      message.success('Moneda eliminada correctamente');
      cargarDatos();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar moneda');
    }
  };

  const columns: ColumnsType<MonedaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 120,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Símbolo',
      dataIndex: 'simbolo',
      key: 'simbolo',
      width: 100,
      align: 'center',
    },
    {
      title: 'Tasa',
      dataIndex: 'tasa',
      key: 'tasa',
      width: 120,
      align: 'right',
      render: (tasa: number) => tasa?.toFixed(2),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Editar moneda">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar moneda?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleEliminar(record)}
            okText="Eliminar"
            okType="danger"
            cancelText="Cancelar"
          >
            <Tooltip title="Eliminar moneda">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Monedas</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva Moneda
        </Button>
      </div>

      <Card style={{ borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} styles={{ body: { padding: 0 } }}>
        <Table<MonedaDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 700 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} monedas`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
          }}
          locale={{ emptyText: <Empty description="No hay monedas registradas" /> }}
        />
      </Card>

      <Modal
        title={editando ? 'Editar Moneda' : 'Nueva Moneda'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={520}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. Pesos Dominicanos" maxLength={40} />
          </Form.Item>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input placeholder="Ej. DOP" maxLength={10} />
          </Form.Item>
          <Form.Item
            name="simbolo"
            label="Símbolo"
            rules={[{ required: true, message: 'El símbolo es obligatorio' }]}
          >
            <Input placeholder="Ej. RD$" maxLength={3} />
          </Form.Item>
          <Form.Item
            name="tasa"
            label="Tasa"
            rules={[{ required: true, message: 'La tasa es obligatoria' }]}
            initialValue={1}
          >
            <InputNumber
              min={0}
              step={0.01}
              precision={2}
              style={{ width: '100%' }}
              placeholder="1.00"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Monedas;
