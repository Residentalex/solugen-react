import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Alert, Modal, Form, Input, InputNumber, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { toTitleCase } from '../../utils/formats';
import type { ModuloDTO } from '../../types/auth';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const Modulos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('Mmodulo');

  const [data, setData] = useState<ModuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<ModuloDTO | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModulo, setEditingModulo] = useState<ModuloDTO | null>(null);
  const [form] = Form.useForm();

  const cargar = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await moduloApi.obtenerTodo(sucursalActiva);
      setData(Array.isArray(res) ? res : []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride('Módulos');
    cargar();
    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, cargar, screenCode]);

  useEffect(() => {
    if (modalOpen) {
      if (editingModulo) {
        form.setFieldsValue({
          codigo: editingModulo.codigo,
          nombre: editingModulo.nombre,
          orden: editingModulo.orden,
        });
      } else {
        form.resetFields();
      }
    }
  }, [modalOpen, editingModulo, form]);

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const cols = columns.filter((c) => c.key !== 'acciones');
    exportToExcel({
      fileName: `Modulos_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`,
      sheetName: 'Módulos',
      companyName,
      columnHeaders: cols.map((c) => c.title as string),
      dataRows: filtered.map((item: any) =>
        cols.map((col) => {
          const val = item[col.dataIndex as string];
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
  };

  const handleSearch = (val: string) => {
    setSearchText(val);
    setSelectedRow(null);
  };

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
  }, []);

  const handleNuevo = () => {
    setEditingModulo(null);
    setModalOpen(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      if (editingModulo) {
        await moduloApi.actualizar(sucursalActiva, editingModulo.id, values);
        message.success('Módulo actualizado correctamente');
      } else {
        await moduloApi.crear(sucursalActiva, values);
        message.success('Módulo creado correctamente');
      }
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar');
    }
  };

  const handleCancelar = () => {
    setModalOpen(false);
    form.resetFields();
  };

  const filtered = searchText.trim()
    ? data.filter((r) =>
        r.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
        String(r.id).includes(searchText))
    : data;

  const handleDelete = (record: ModuloDTO) => {
    Modal.confirm({
      title: 'Eliminar módulo',
      icon: <ExclamationCircleOutlined />,
      content: `¿Está seguro de eliminar el módulo "${record.nombre}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await moduloApi.eliminar(sucursalActiva, record.id);
          message.success('Módulo eliminado');
          cargar();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v: string, record: ModuloDTO) => (
        <a onClick={() => navigate(`/Mmodulo/${record.id}`)}>
          {toTitleCase(v || '')}
        </a>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 100,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      render: (_: any, record: ModuloDTO) => (
        <Button type="link" danger onClick={(e) => { e.stopPropagation(); handleDelete(record); }}>
          Eliminar
        </Button>
      ),
    },
  ];

  return (
    <>
      {loadingError && <Alert message="Error al cargar módulos" type="error" showIcon style={{ marginBottom: 16 }} />}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          placeholder="Buscar módulo..."
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onNuevo={handleNuevo}
          onReload={cargar}
          onExportarExcel={handleExportarExcel}
        />
        <Table
          className="paces-border-top paces-list-table"
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'}
          onRow={(record) => ({
            onClick: () => setSelectedRow(record),
            onDoubleClick: () => navigate(`/Mmodulo/${record.id}`),
          })}
          pagination={{ showTotal: (t) => `${t} registros` }}
          locale={{ emptyText: 'No hay módulos registrados' }}
        />
      </Card>

      <Modal
        open={modalOpen}
        title={editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}
        okText="Guardar"
        cancelText="Cancelar"
        onOk={handleGuardar}
        onCancel={handleCancelar}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input placeholder="Código del módulo (ej: CONTAB)" />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Nombre del módulo" />
          </Form.Item>
          <Form.Item
            name="orden"
            label="Orden"
            rules={[{ required: true, message: 'El orden es obligatorio' }]}
          >
            <InputNumber min={0} placeholder="Orden de aparición" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Modulos;