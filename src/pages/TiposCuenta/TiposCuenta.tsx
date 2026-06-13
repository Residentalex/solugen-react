import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Empty,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { tipoCuentaApi } from '../../api/tipoCuentaApi';
import type { TipoCuentaDTO } from '../../types/contabilidad';
import PermissionGate from '../../components/PermissionGate';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const TiposCuenta: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MTipoCuenta');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<TipoCuentaDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tiposCuenta', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await tipoCuentaApi.obtenerListado(sucursalActiva);
      return result || [];
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MTipoCuenta');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const filteredData = useMemo(() => {
    const list = data || [];
    if (!searchText) return list;
    const lower = searchText.toLowerCase();
    return list.filter(
      (item) =>
        item.idExterno.toLowerCase().includes(lower) ||
        item.nombre.toLowerCase().includes(lower)
    );
  }, [data, searchText]);

  const abrirNuevo = () => {
    if (!puedeCrear) return;
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (tipo: TipoCuentaDTO) => {
    if (!puedeEditar) return;
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
      refetch();
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
      render: (val: string, record: TipoCuentaDTO) =>
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
  ];

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />
        <Table<TipoCuentaDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="idExterno"
          loading={isLoading}
          scroll={{ x: 500 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            showSizeChanger: false,
            pageSize,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay tipos de cuenta registrados" /></div> }}
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
