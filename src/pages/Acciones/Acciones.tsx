import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  message,
  Space,
  Tooltip,
  Empty,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { accionApi } from '../../api/accionApi';
import type { AccionDTO } from '../../types/administracion';

const { Text } = Typography;

const Acciones: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);

  const [data, setData] = useState<AccionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<AccionDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await accionApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar acciones');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MAccion');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (accion: AccionDTO) => {
    setEditando(accion);
    form.setFieldsValue({
      codigo: accion.codigo,
      nombre: accion.nombre,
      activo: accion.activo,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload: AccionDTO = {
        id: editando?.id || 0,
        codigo: values.codigo,
        nombre: values.nombre,
        activo: values.activo ?? true,
      };
      if (editando) {
        await accionApi.actualizar(sucursalActiva, editando.id, payload);
        message.success('Acción actualizada correctamente');
      } else {
        await accionApi.crear(sucursalActiva, payload);
        message.success('Acción creada correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar acción');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = (accion: AccionDTO) => {
    Modal.confirm({
      title: 'Eliminar Acción',
      content: `¿Está seguro que desea eliminar la acción "${accion.nombre}"?`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (sucursalActiva === undefined) return;
        try {
          await accionApi.eliminar(sucursalActiva, accion.id);
          message.success('Acción eliminada correctamente');
          cargarDatos();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar acción');
        }
      },
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const toTitleCase = (str: string): string =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const filteredData = searchText
    ? data.filter(
        (item) =>
          item.codigo.toLowerCase().includes(searchText.toLowerCase()) ||
          item.nombre.toLowerCase().includes(searchText.toLowerCase())
      )
    : data;

  const columns: ColumnsType<AccionDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 120,
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string) => <Text>{toTitleCase(nombre ?? '')}</Text>,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 100,
      align: 'center',
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>
          {activo ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Editar acción">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar acción">
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleEliminar(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Acciones</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva Acción
        </Button>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 16px 0 16px' }}>
          <Input.Search
            placeholder="Buscar por código o nombre..."
            allowClear
            onSearch={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleSearch('');
              }
            }}
            style={{ maxWidth: 360 }}
          />
        </div>
        <Table<AccionDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 700 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} acciones`,
            pageSizeOptions: ['10', '20', '50'],
            defaultPageSize: 10,
          }}
          locale={{ emptyText: <Empty description="No hay acciones registradas" /> }}
        />
      </Card>

      <Modal
        title={editando ? 'Editar Acción' : 'Nueva Acción'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={520}
        okText="Guardar"
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input placeholder="Ej. ACC01" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Descripción de la acción" maxLength={80} />
          </Form.Item>
          <Form.Item
            name="activo"
            label="Activo"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Acciones;
