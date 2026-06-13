import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  Button,
  Card,
  Modal,
  Form,
  Input,
  Switch,
  Tag,
  message,
  Descriptions,
  Spin,
  Alert,
  Typography,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { Sucursal } from '../../types/auth';
import type { AuthPermisoEspecialDTO } from '../../types/auth';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const SUCURSAL_SEGURIDAD = Sucursal.Consolidado;

const PermisosEspeciales: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<AuthPermisoEspecialDTO | null>(null);

  // Modal crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<AuthPermisoEspecialDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  // Modal detalle
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<AuthPermisoEspecialDTO | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['permisosEspeciales'],
    queryFn: async () => {
      const result = await permisoEspecialApi.obtenerListado(SUCURSAL_SEGURIDAD);
      return result || [];
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MPermiso');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText) return list;
    const term = searchText.toLowerCase();
    return list.filter(
      (p) =>
        p.codigo.toLowerCase().includes(term) ||
        (p.nombre && p.nombre.toLowerCase().includes(term)),
    );
  }, [data, searchText]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setSelectedRow(null);
  };

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setModalVisible(true);
  };

  const abrirEditar = (permiso: AuthPermisoEspecialDTO) => {
    setEditando(permiso);
    form.setFieldsValue({
      codigo: permiso.codigo,
      nombre: permiso.nombre || '',
      activo: permiso.activo,
    });
    setModalVisible(true);
  };

  const abrirDetalle = async (permiso: AuthPermisoEspecialDTO) => {
    setDetalleItem(permiso);
    setDetalleVisible(true);
    setCargandoDetalle(true);
    try {
      const completo = await permisoEspecialApi.obtenerPorId(SUCURSAL_SEGURIDAD, permiso.id);
      setDetalleItem(completo);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar detalle del permiso');
    } finally {
      setCargandoDetalle(false);
    }
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);

      const payload = {
        id: editando?.id || 0,
        codigo: values.codigo,
        nombre: values.nombre || undefined,
        activo: values.activo ?? true,
      };

      if (editando) {
        await permisoEspecialApi.actualizar(SUCURSAL_SEGURIDAD, payload);
        message.success('Permiso actualizado correctamente');
      } else {
        await permisoEspecialApi.crear(SUCURSAL_SEGURIDAD, payload);
        message.success('Permiso creado correctamente');
      }

      setModalVisible(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar permiso');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<AuthPermisoEspecialDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 200,
      render: (val: string, record: AuthPermisoEspecialDTO) => (
        <Text strong className="paces-doc-link" style={{ cursor: 'pointer' }} onClick={() => abrirDetalle(record)}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre?: string) => <Text>{nombre || '-'}</Text>,
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 100,
      align: 'center',
      render: (activo: boolean) =>
        activo ? (
          <Tag color="green">Activo</Tag>
        ) : (
          <Tag color="red">Inactivo</Tag>
        ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar permisos especiales"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      )}

      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={25}
          onPageSizeChange={(v) => {}}
          ocultarPageSize
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />

        <Table<AuthPermisoEspecialDTO>
          className="paces-border-top paces-list-table"
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 800 }}
          size="middle"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay permisos especiales registrados" />
            </div>,
          }}
          rowClassName={(record) =>
            selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'
          }
          onRow={(record) => ({
            onClick: () => setSelectedRow(record),
            onDoubleClick: () => abrirDetalle(record),
          })}
          pagination={{
            showTotal: (total) => `${total} registros`,
            pageSize: 25,
          }}
        />
      </Card>

      {/* Modal crear/editar */}
      <Modal
        title={editando ? 'Editar Permiso' : 'Nuevo Permiso'}
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
            <Input placeholder="Ej. PERMISO_ESPECIAL" maxLength={50} />
          </Form.Item>

          <Form.Item name="nombre" label="Nombre">
            <Input placeholder="Nombre descriptivo del permiso" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="activo"
            label="Activo"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detalle */}
      <Modal
        title={`Detalle: ${detalleItem?.codigo || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={
          detalleItem ? [
            <Button key="editar" type="primary" onClick={() => { setDetalleVisible(false); abrirEditar(detalleItem); }}>
              Editar
            </Button>,
          ] : null
        }
        width={520}
      >
        <Spin spinning={cargandoDetalle}>
          {detalleItem && (
            <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
              <Descriptions.Item label="Nombre">{detalleItem.nombre || '-'}</Descriptions.Item>
              <Descriptions.Item label="Activo">
                <Tag color={detalleItem.activo ? 'green' : 'red'}>
                  {detalleItem.activo ? 'Activo' : 'Inactivo'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
        </Spin>
      </Modal>
    </>
  );
};

export default PermisosEspeciales;
