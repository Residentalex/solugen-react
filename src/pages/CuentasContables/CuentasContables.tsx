import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Tag, Button, message, Card, Modal, Descriptions, Form, Switch, Typography, Select, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
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
}

const { Text } = Typography;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const CuentasContables: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<CuentaContableDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem] = useState<CuentaContableDTO | null>(null);

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<CuentaContableDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
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
      cargarDatos(page, pageSize, filtro);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
    } finally {
      setGuardando(false);
    }
  };

  const cargarDatos = useCallback(async (pag: number, size: number, texto: string) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const skip = (pag - 1) * size;
      const result = await cuentaContableApi.obtenerListadoPaginado(sucursalActiva, skip, size, texto);
      setData(result.data);
      setTotal(result.total);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MCuentaContable');
    updateToolbar({});
    cargarDatos(page, pageSize, filtro);
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos, page, pageSize, filtro]);

  const handleSearch = (value: string) => {
    setFiltro(value);
    setPage(1);
  };

  const columns: ColumnsType<CuentaContableDTO> = [
    {
      title: 'No. Cuenta',
      dataIndex: 'noCuenta',
      key: 'noCuenta',
      width: 140,
      fixed: 'left',
      render: (val: string) => <Text strong className="paces-doc-link" style={{ fontFamily: 'monospace' }} onClick={() => navigate('/MCuentaContable/' + val)}>{val}</Text>,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 280,
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
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
      render: (moneda: { codigo: string }) => <Text>{moneda?.codigo || '-'}</Text>,
    },
    {
      title: 'Origen',
      dataIndex: 'origen',
      key: 'origen',
      width: 100,
      render: (origen: OrigenCuenta) => <Text>{ORIGEN_LABEL[origen] || 'Desconocido'}</Text>,
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

  ];

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    setFiltro('');
    setPage(1);
    cargarDatos(1, pageSize, '');
  }, [cargarDatos, pageSize]);

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar cuentas contables"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
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
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Buscar por número o nombre..."
            allowClear
            onSearch={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleSearch('');
              }
            }}
            style={{ width: 320 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <Select
            style={{ width: 65 }}
            value={pageSize}
            onChange={(v) => { setPageSize(v); setPage(1); }}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
            Nueva
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </div>
      </div>

      <Table<CuentaContableDTO>
        columns={columns}
        dataSource={data}
        rowKey="noCuenta"
        loading={loading}
        scroll={{ x: 1100 }}
        size="middle"
        className="paces-border-top paces-list-table"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        onChange={(pagination) => {
          setPage(pagination.current || 1);
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
