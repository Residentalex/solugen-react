import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { tipoCuentaApi } from '../../api/tipoCuentaApi';
import type { TipoCuentaDTO } from '../../types/contabilidad';

const TiposCuenta: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<TipoCuentaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<TipoCuentaDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await tipoCuentaApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos de cuenta');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MTipoCuenta');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (tipo: TipoCuentaDTO) => {
    setEditando(tipo);
    form.setFieldsValue({
      idExterno: tipo.idExterno,
      nombre: tipo.nombre,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload: TipoCuentaDTO = {
        id: editando?.id || 0,
        nombre: values.nombre,
        idExterno: values.idExterno,
      };
      if (editando) {
        await tipoCuentaApi.actualizar(sucursalActiva, editando.idExterno, payload);
        message.success('Tipo de cuenta actualizado correctamente');
      } else {
        await tipoCuentaApi.crear(sucursalActiva, payload);
        message.success('Tipo de cuenta creado correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar tipo de cuenta');
    } finally {
      setGuardando(false);
    }
  };

  const toTitleCase = (str: string): string =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const columns: ColumnsType<TipoCuentaDTO> = [
    {
      title: 'Código',
      dataIndex: 'idExterno',
      key: 'idExterno',
      fixed: 'left',
      width: 120,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string) => toTitleCase(nombre ?? ''),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Editar tipo de cuenta">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Tipos de Cuenta</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nuevo Tipo de Cuenta
        </Button>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<TipoCuentaDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 500 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} tipos de cuenta`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
          }}
          locale={{ emptyText: <Empty description="No hay tipos de cuenta registrados" /> }}
        />
      </Card>

      <Modal
        title={editando ? 'Editar Tipo de Cuenta' : 'Nuevo Tipo de Cuenta'}
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
            name="idExterno"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input
              placeholder="Ej. T01"
              maxLength={20}
              disabled={!!editando}
            />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. Efectivo y Equivalentes" maxLength={100} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TiposCuenta;
