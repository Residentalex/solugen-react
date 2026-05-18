import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Switch,
  message,
  Space,
  Tooltip,
  Row,
  Col,
} from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { clienteApi } from '../../api/clienteApi';
import type { ClienteDTO } from '../../types/facturacion';

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const Clientes: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ClienteDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ClienteDTO | null>(null);
  const [vistaItem, setVistaItem] = useState<ClienteDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const esVista = vistaItem !== null;

  const cargarDatos = useCallback(async (
    busqueda?: string,
    soloActivos?: boolean,
    pagina?: number,
    tamano?: number
  ) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const currentPage = pagina ?? page;
      const currentSize = tamano ?? pageSize;
      const salto = (currentPage - 1) * currentSize;

      let resultados: ClienteDTO[];
      let totalCount: number;

      if (busqueda && busqueda.length > 2) {
        // Usar endpoint filtrar que busca por código Y nombre
        resultados = await clienteApi.filtrar(sucursalActiva, {
          cantidad: currentSize,
          salto,
          codigo: busqueda,
          activo: soloActivos,
        });
        totalCount = await clienteApi.obtenerTotal(sucursalActiva, { codigo: busqueda, activo: soloActivos });
      } else {
        const params: { filas?: number; salto?: number; codigo?: string; activo?: boolean } = {
          filas: currentSize,
          salto,
        };
        if (soloActivos !== undefined) params.activo = soloActivos;
        resultados = await clienteApi.obtenerListado(sucursalActiva, params);
        totalCount = await clienteApi.obtenerTotal(sucursalActiva, { activo: soloActivos });
      }

      setData(resultados || []);
      setTotal(totalCount ?? 0);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, page, pageSize]);

  useEffect(() => {
    setActiveModule('MCliente');
    updateToolbar({});
    cargarDatos(undefined, undefined, 1, pageSize);
    return () => resetToolbar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, updateToolbar, resetToolbar, sucursalActiva]);

  // Recargar cuando cambian filtroActivo, page o pageSize (no searchText, eso va por onSearch)
  useEffect(() => {
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(searchText.trim() || undefined, soloActivos, page, pageSize);
  }, [filtroActivo, page, pageSize]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(value.trim() || undefined, soloActivos, 1, pageSize);
  };

  const handleReload = () => {
    const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
    cargarDatos(searchText.trim() || undefined, soloActivos, page, pageSize);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
      const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
      cargarDatos(searchText.trim() || undefined, soloActivos, 1, newPageSize);
    } else {
      setPage(newPage);
      const soloActivos = filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined;
      cargarDatos(searchText.trim() || undefined, soloActivos, newPage, pageSize);
    }
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditando(null);
    setVistaItem(null);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setVistaItem(null);
    form.resetFields();
    form.setFieldsValue({ activo: true });
    setModalVisible(true);
  };

  const abrirEditar = (cliente: ClienteDTO) => {
    setVistaItem(null);
    setEditando(cliente);
    form.setFieldsValue({
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      tipoIdentificacion: cliente.tipoIdentificacion,
      identificacion: cliente.identificacion,
      correoElectronico: cliente.correoElectronico,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      activo: cliente.activo,
      limiteCredito: cliente.limiteCredito,
      diasCredito: cliente.diasCredito,
      margen: cliente.margen,
      porcientoDescuento: cliente.porcientoDescuento,
    });
    setModalVisible(true);
  };

  const abrirVisualizar = (cliente: ClienteDTO) => {
    setEditando(null);
    setVistaItem(cliente);
    form.setFieldsValue({
      codigo: cliente.codigo,
      nombre: cliente.nombre,
      tipoIdentificacion: cliente.tipoIdentificacion,
      identificacion: cliente.identificacion,
      correoElectronico: cliente.correoElectronico,
      telefono: cliente.telefono,
      direccion: cliente.direccion,
      activo: cliente.activo,
      limiteCredito: cliente.limiteCredito,
      diasCredito: cliente.diasCredito,
      margen: cliente.margen,
      porcientoDescuento: cliente.porcientoDescuento,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);

      const payload: ClienteDTO = {
        codigo: values.codigo,
        nombre: values.nombre,
        tipoIdentificacion: values.tipoIdentificacion || 'RNC',
        identificacion: values.identificacion || '',
        correoElectronico: values.correoElectronico || '',
        telefono: values.telefono || '',
        telefonoAdicional: '',
        direccion: values.direccion || '',
        nota: '',
        activo: values.activo ?? true,
        limiteCredito: values.limiteCredito ?? 0,
        diasCredito: values.diasCredito ?? 0,
        creditoSuspendido: false,
        exentoImpuesto: false,
        margen: values.margen ?? 0,
        porcientoDescuento: values.porcientoDescuento ?? 0,
      };

      if (editando) {
        await clienteApi.actualizar(sucursalActiva, { ...editando, ...payload });
        message.success('Cliente actualizado correctamente');
      } else {
        await clienteApi.crear(sucursalActiva, payload);
        message.success('Cliente creado correctamente');
      }
      setModalVisible(false);
      setEditando(null);
      cargarDatos(
        searchText.trim() || undefined,
        filtroActivo === 'activos' ? true : filtroActivo === 'inactivos' ? false : undefined,
        page,
        pageSize
      );
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cliente');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<ClienteDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <span style={{ fontWeight: 500 }}>{toTitleCase(val ?? '')}</span>,
    },
    {
      title: 'Identificación',
      dataIndex: 'identificacion',
      key: 'identificacion',
      width: 150,
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val || '-'}</span>,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 130,
      render: (val: string) => val || '-',
    },
    {
      title: 'Email',
      dataIndex: 'correoElectronico',
      key: 'correoElectronico',
      width: 200,
      render: (val: string) => val ? (
        <span className="paces-text-muted" style={{ fontSize: 12 }}>{val}</span>
      ) : '-',
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Tooltip title="Ver cliente">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => abrirVisualizar(record)}
            />
          </Tooltip>
          <Tooltip title="Editar cliente">
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Clientes</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nuevo Cliente
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Input.Search
            placeholder="Buscar por código o nombre..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 260 }}
          />
        </Col>
        <Col>
          <Select
            value={filtroActivo}
            onChange={(val) => {
              setFiltroActivo(val);
              setPage(1);
            }}
            style={{ width: 130 }}
            size="middle"
            options={[
              { value: 'todos', label: 'Todos' },
              { value: 'activos', label: 'Solo activos' },
              { value: 'inactivos', label: 'Solo inactivos' },
            ]}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={handleReload}>
            Recargar
          </Button>
        </Col>
      </Row>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<ClienteDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 1000 }}
          size="middle"
          onRow={(record) => ({
            onDoubleClick: () => abrirVisualizar(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: handlePageChange,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} clientes`,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>

      <Modal
        title={
          esVista
            ? `Cliente: ${vistaItem?.codigo || ''}`
            : editando
              ? 'Editar Cliente'
              : 'Nuevo Cliente'
        }
        open={modalVisible}
        onCancel={cerrarModal}
        onOk={esVista ? undefined : guardar}
        confirmLoading={guardando}
        width={640}
        okText="Guardar"
        cancelText="Cancelar"
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            {!esVista && <OkBtn />}
          </>
        )}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="codigo"
                label="Código"
                rules={[{ required: true, message: 'Obligatorio' }]}
              >
                <Input placeholder="Código del cliente" maxLength={20} disabled={esVista} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'Obligatorio' }]}
              >
                <Input placeholder="Nombre del cliente" maxLength={100} disabled={esVista} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tipoIdentificacion" label="Tipo ID" initialValue="RNC">
                <Select
                  disabled={esVista}
                  options={[
                    { value: 'RNC', label: 'RNC' },
                    { value: 'CEDULA', label: 'Cédula' },
                    { value: 'PASAPORTE', label: 'Pasaporte' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="identificacion" label="Identificación">
                <Input placeholder="Número de ID" maxLength={20} disabled={esVista} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="telefono" label="Teléfono">
                <Input placeholder="Teléfono" maxLength={20} disabled={esVista} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="correoElectronico" label="Email">
                <Input placeholder="correo@ejemplo.com" maxLength={80} disabled={esVista} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="direccion" label="Dirección">
            <Input.TextArea placeholder="Dirección del cliente" rows={2} maxLength={200} disabled={esVista} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="limiteCredito" label="Límite crédito" initialValue={0}>
                <Input type="number" min={0} step={0.01} disabled={esVista} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="diasCredito" label="Días crédito" initialValue={0}>
                <Input type="number" min={0} disabled={esVista} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="porcientoDescuento" label="% Descuento" initialValue={0}>
                <Input type="number" min={0} max={100} step={0.01} disabled={esVista} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="activo" label="Activo" valuePropName="checked" initialValue={true}>
            <Switch disabled={esVista} checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Clientes;
