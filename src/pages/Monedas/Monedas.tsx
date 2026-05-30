import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { monedaApi } from '../../api/monedaApi';
import type { MonedaDTO } from '../../types/contabilidad';
import PermissionGate from '../../components/PermissionGate';

const { Text } = Typography;

const Monedas: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.usuario?.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MMoneda');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [data, setData] = useState<MonedaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
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

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const lower = searchText.toLowerCase();
    return data.filter(
      (item) =>
        item.codigo.toLowerCase().includes(lower) ||
        item.nombre.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

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
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar moneda');
    } finally {
      setGuardando(false);
    }
  };

  const toTitleCase = (str: string): string =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
              allowClear
              onSearch={handleSearch}
            style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                Nuevo
              </Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={() => cargarDatos()} />
          </div>
        </div>
        <Table<MonedaDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 700 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            showSizeChanger: false,
            pageSize,
            showTotal: (t) => `${t} registros`,
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
