import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Input, Select, Button, Modal, Form, InputNumber, message, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { unidadMedidaApi } from '../../api/unidadMedidaApi';
import type { UnidadMedidaDTO } from '../../types/productos';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const UnidadesMedida: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MMedida');
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['unidadesMedida', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await unidadMedidaApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MUnidadMedida');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (item) =>
        item.codigo?.toLowerCase().includes(lower) ||
        item.nombre?.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const abrirNuevo = () => {
    if (!puedeCrear) return;
    form.resetFields();
    form.setFieldsValue({ factor: 1 });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload: UnidadMedidaDTO = {
        nombre: values.nombre,
        codigo: values.codigo,
        factor: values.factor ?? 1,
        idExterno: 0,
      };
      await unidadMedidaApi.crear(sucursalActiva, payload);
      message.success('Unidad de medida creada correctamente');
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar unidad de medida');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<UnidadMedidaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 260,
      render: (val: string) => <Text>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Factor',
      dataIndex: 'factor',
      key: 'factor',
      width: 120,
      align: 'right',
      render: (val: number) => <Text>{(val ?? 1).toFixed(4)}</Text>,
    },
    {
      title: 'ID Externo',
      dataIndex: 'idExterno',
      key: 'idExterno',
      width: 120,
      render: (val: number) => <Text>{val ?? '-'}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar unidades de medida"
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
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />
        <Table<UnidadMedidaDTO>
          columns={columns}
          dataSource={paginatedData}
          rowKey={(r) => r.codigo || r.nombre || ''}
          loading={isLoading}
          scroll={{ x: 700 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay unidades de medida registradas" />
            </div>,
          }}
          pagination={{
            current: page,
            pageSize,
            total: filteredData?.length || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      <Modal
        title="Nueva Unidad de Medida"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={480}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input placeholder="Ej. UNI" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. Unidad" maxLength={50} />
          </Form.Item>
          <Form.Item
            name="factor"
            label="Factor"
            rules={[{ required: true, message: 'El factor es obligatorio' }]}
            initialValue={1}
          >
            <InputNumber
              min={0}
              step={0.0001}
              precision={4}
              style={{ width: '100%' }}
              placeholder="1.0000"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UnidadesMedida;
