import React, { useEffect, useState, useCallback } from 'react';
import { Table, Input, Tag, Button, message, Space, Row, Col, Card, Modal, Descriptions, Tooltip, Form, Switch } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { CuentaContableDTO } from '../../types/contabilidad';
import { OrigenCuenta } from '../../types/contabilidad';

const ORIGEN_LABEL: Record<number, string> = {
  [OrigenCuenta.Debito]: 'Débito',
  [OrigenCuenta.Credito]: 'Crédito',
  [OrigenCuenta.Desconocido]: 'Desconocido',
};

const CuentasContables: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<CuentaContableDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<CuentaContableDTO | null>(null);

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<CuentaContableDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const abrirDetalle = (item: CuentaContableDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (item: CuentaContableDTO) => {
    setEditando(item);
    form.setFieldsValue({
      noCuenta: item.noCuenta,
      nombre: item.nombre,
      nota: item.nota,
      activo: item.activo,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      if (editando) {
        await cuentaContableApi.actualizar(sucursalActiva, editando.noCuenta, values);
        message.success('Cuenta contable actualizada correctamente');
      } else {
        await cuentaContableApi.crear(sucursalActiva, values);
        message.success('Cuenta contable creada correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
    } finally {
      setGuardando(false);
    }
  };

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await cuentaContableApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCuentaContable');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const handleSearch = () => {
    if (!searchText.trim()) {
      cargarDatos();
      return;
    }
    const text = searchText.trim().toLowerCase();
    const filtered = data.filter(
      (item) =>
        item.noCuenta.toLowerCase().includes(text) ||
        item.nombre.toLowerCase().includes(text)
    );
    setData(filtered);
  };

  const columns: ColumnsType<CuentaContableDTO> = [
    {
      title: 'No. Cuenta',
      dataIndex: 'noCuenta',
      key: 'noCuenta',
      width: 140,
      fixed: 'left',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val}</span>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <span style={{ fontWeight: 500 }}>{val}</span>,
    },
    {
      title: 'Tipo Cuenta',
      dataIndex: 'tipoCuenta',
      key: 'tipoCuenta',
      width: 160,
      render: (tipo: { nombre: string }) =>
        tipo?.nombre ? <Tag style={{ fontSize: 11 }}>{tipo.nombre}</Tag> : '-',
    },
    {
      title: 'Grupo',
      dataIndex: 'grupo',
      key: 'grupo',
      width: 160,
      render: (grupo: { nombre: string }) =>
        grupo?.nombre ? <Tag color="geekblue" style={{ fontSize: 11 }}>{grupo.nombre}</Tag> : '-',
    },
    {
      title: 'Moneda',
      dataIndex: 'moneda',
      key: 'moneda',
      width: 90,
      render: (moneda: { codigo: string }) => moneda?.codigo || '-',
    },
    {
      title: 'Origen',
      dataIndex: 'origen',
      key: 'origen',
      width: 100,
      render: (origen: OrigenCuenta) => ORIGEN_LABEL[origen] || 'Desconocido',
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'default'}>{activo ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 120,
      render: (_: any, record: CuentaContableDTO) => (
        <Space size={0}>
          <Tooltip title="Editar cuenta contable">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
          <Tooltip title="Ver detalle">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => abrirDetalle(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Cuentas Contables</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nueva Cuenta Contable
        </Button>
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 16 }} align="middle">
        <Col>
          <Input
            placeholder="Buscar por número o nombre..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
            allowClear
            onClear={() => { setSearchText(''); cargarDatos(); }}
          />
        </Col>
        <Col>
          <Button icon={<SearchOutlined />} onClick={handleSearch}>Buscar</Button>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); cargarDatos(); }}>
            Recargar
          </Button>
        </Col>
      </Row>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<CuentaContableDTO>
          columns={columns}
          dataSource={data}
          rowKey="noCuenta"
          loading={loading}
          scroll={{ x: 1100 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} cuentas contables`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }}
        />
      </Card>

      <Modal
        title={`Detalle de Cuenta: ${detalleItem?.noCuenta || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={640}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="No. Cuenta">{detalleItem.noCuenta}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
            <Descriptions.Item label="Tipo Cuenta">{detalleItem.tipoCuenta?.nombre || '-'}</Descriptions.Item>
            <Descriptions.Item label="Grupo">{detalleItem.grupo?.nombre || '-'}</Descriptions.Item>
            <Descriptions.Item label="Moneda">{detalleItem.moneda?.codigo || '-'}</Descriptions.Item>
            <Descriptions.Item label="Origen">{ORIGEN_LABEL[detalleItem.origen] || 'Desconocido'}</Descriptions.Item>
            <Descriptions.Item label="Cuenta Control">{detalleItem.cuentaControl?.noCuenta ? `${detalleItem.cuentaControl.noCuenta} - ${detalleItem.cuentaControl.nombre}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Cuenta Prima">{detalleItem.cuentaPrima?.noCuenta ? `${detalleItem.cuentaPrima.noCuenta} - ${detalleItem.cuentaPrima.nombre}` : '-'}</Descriptions.Item>
            <Descriptions.Item label="Centro Costo">{detalleItem.utilizaCentroCosto ? 'Sí' : 'No'}</Descriptions.Item>
            <Descriptions.Item label="Estado">{detalleItem.activo ? 'Activo' : 'Inactivo'}</Descriptions.Item>
            <Descriptions.Item label="Nota">{detalleItem.nota || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Modal de crear/editar */}
      <Modal
        title={editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={560}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="noCuenta"
            label="No. Cuenta"
            rules={[{ required: true, message: 'El número de cuenta es obligatorio' }]}
          >
            <Input placeholder="Ej. 1.01.01" maxLength={20} disabled={!!editando} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. Caja General" maxLength={150} />
          </Form.Item>
          <Form.Item
            name="nota"
            label="Nota"
          >
            <Input.TextArea rows={3} placeholder="Nota opcional" maxLength={500} />
          </Form.Item>
          <Form.Item name="activo" label="Activo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CuentasContables;
