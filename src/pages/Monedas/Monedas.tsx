import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Empty,
  Typography,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { monedaApi } from '../../api/monedaApi';
import type { MonedaDTO } from '../../types/contabilidad';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Monedas: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MMoneda');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;


  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<MonedaDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['monedas', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await monedaApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MMoneda');
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
        item.codigo.toLowerCase().includes(lower) ||
        item.nombre.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return [];
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const abrirNuevo = () => {
    if (!puedeCrear) return;
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (moneda: MonedaDTO) => {
    if (!puedeEditar) return;
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
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar moneda');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<MonedaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 120,
      render: (val: string, record: MonedaDTO) =>
        puedeEditar ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => abrirEditar(record)}
          >
            {val}
          </Button>
        ) : (
          <Text>{val}</Text>
        ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string) => <Text>{toTitleCase(nombre ?? '')}</Text>,
    },
    {
      title: 'Símbolo',
      dataIndex: 'simbolo',
      key: 'simbolo',
      width: 100,
      align: 'center',
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Tasa',
      dataIndex: 'tasa',
      key: 'tasa',
      width: 120,
      align: 'right',
      render: (tasa: number) => <Text>{tasa?.toFixed(2)}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar monedas"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />
        <Table<MonedaDTO>
          columns={columns}
          dataSource={paginatedData}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 700 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            total: filteredData?.length || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay monedas registradas" /></div> }}
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