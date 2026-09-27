import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table, Button, Card, Modal, Form, Input, InputNumber, Switch, Typography, Tooltip, message, Popconfirm,
} from 'antd';
import { PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { ecommerceApi } from '../../../api/ecommerceApi';
import type { AdminCategoriaDTO } from '../../../api/ecommerceApi';
import { useAuthStore } from '../../../stores/authStore';
import PermissionGate from '../../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../../utils/exportToExcel';

const { Text } = Typography;

const EcommerceAdminCategorias: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [data, setData] = useState<AdminCategoriaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategoriaDTO | null>(null);
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const operacionRef = useRef(false);
  const ocupado = guardando || eliminandoId !== null || exportando || loading;

  const handleExportarExcel = async () => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setExportando(true);
    try {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columns.filter((c) => c.key !== 'acciones');
    exportToExcel({
      fileName: `Categorias_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`,
      sheetName: 'Categorías Ecommerce',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: data.map((item: any) =>
        cols.map((col) => {
           const val = item[(col as any).dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
    } finally {
      setExportando(false);
      operacionRef.current = false;
    }
  };

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
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditar = (record: AdminCategoriaDTO) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
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
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();
      if (editing) {
        await ecommerceApi.adminActualizarCategoria(editing.id, values);
        message.success('Categoría actualizada');
      } else {
        await ecommerceApi.adminCrearCategoria(values);
        message.success('Categoría creada');
      }
      setModalOpen(false);
      await cargar();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    } finally {
      setGuardando(false);
      operacionRef.current = false;
    }
  };

  const handleEliminar = async (id: string) => {
    if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; }
    operacionRef.current = true;
    setEliminandoId(id);
    try {
      await ecommerceApi.adminEliminarCategoria(id);
      message.success('Categoría eliminada');
      await cargar();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
    } finally {
      setEliminandoId(null);
      operacionRef.current = false;
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
            <Button type="text" size="small" icon={<EditOutlined />} disabled={ocupado} onClick={() => openEditar(record)} />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar categoría?"
            description={record.totalProductos > 0 ? 'Esta categoría tiene productos asignados.' : undefined}
            onConfirm={() => handleEliminar(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true, disabled: ocupado, loading: eliminandoId === record.id }}
            cancelButtonProps={{ disabled: ocupado }}
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} disabled={ocupado} loading={eliminandoId === record.id} />
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
            <Button type="primary" icon={<PlusOutlined />} onClick={openCrear} disabled={ocupado}>
              Nueva Categoría
            </Button>
            <PermissionGate accion="EXPORTAR">
              <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} disabled={ocupado} loading={exportando} />
            </PermissionGate>
            <Button icon={<ReloadOutlined spin={loading} />} onClick={() => { if (operacionRef.current || ocupado) { message.warning('Hay una operación en curso, espere a que termine'); return; } cargar(); }} disabled={ocupado} loading={loading} />
          </div>
        </div>
        <Table<AdminCategoriaDTO>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading || ocupado}
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
        onCancel={() => { if (operacionRef.current || guardando) return; setModalOpen(false); }}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={guardando}
        okButtonProps={{ disabled: guardando }}
        cancelButtonProps={{ disabled: guardando }}
        closable={!guardando}
        maskClosable={!guardando}
        keyboard={!guardando}
      >
        <Form form={form} layout="vertical" disabled={guardando}>
          <Form.Item name="nombre" label="Nombre" rules={[{ required: true, message: 'Requerido' }]}>
            <Input disabled={guardando} />
          </Form.Item>
          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} disabled={guardando} />
          </Form.Item>
          <Form.Item name="orden" label="Orden" rules={[{ required: true, message: 'Requerido' }]}>
            <InputNumber style={{ width: '100%' }} min={0} disabled={guardando} />
          </Form.Item>
          {editing && (
            <Form.Item name="activo" label="Activo" valuePropName="checked">
              <Switch disabled={guardando} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default EcommerceAdminCategorias;
