import React, { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Table, Input, Tag, Button, message, Card, Modal, Form, Switch, Typography, Select, Alert, Row, Col, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { monedaApi } from '../../api/monedaApi';
import PermissionGate from '../../components/PermissionGate';
import type { CuentaContableDTO, TipoCuentaDTO, GrupoCuentaContableDTO, MonedaDTO } from '../../types/contabilidad';
import { OrigenCuenta } from '../../types/contabilidad';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const ORIGEN_LABEL: Record<number, string> = {
  [OrigenCuenta.Debito]: 'Débito',
  [OrigenCuenta.Credito]: 'Crédito',
  [OrigenCuenta.Desconocido]: 'Desconocido',
}

const ORIGEN_OPTIONS = [
  { label: 'Débito', value: OrigenCuenta.Debito },
  { label: 'Crédito', value: OrigenCuenta.Credito },
  { label: 'Desconocido', value: OrigenCuenta.Desconocido },
];

const { Text } = Typography;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const CuentasContables: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRow, setSelectedRow] = useState<CuentaContableDTO | null>(null);

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<CuentaContableDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  // Opciones para selects del modal
  const [tipos, setTipos] = useState<TipoCuentaDTO[]>([]);
  const [grupos, setGrupos] = useState<GrupoCuentaContableDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cuentasContables', sucursalActiva, page, pageSize, filtro],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { data: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const result = await cuentaContableApi.obtenerListadoPaginado(sucursalActiva, pageSize, salto, filtro);
      setSelectedRow((actual) =>
        actual ? result.data.find((item) => item.noCuenta === actual.noCuenta) ?? null : null
      );
      return result;
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MCuentaContable');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  // Cargar opciones de catálogo cuando se abre el modal
  useEffect(() => {
    if (!modalVisible || sucursalActiva === undefined) return;
    cuentaContableApi.obtenerTipos(sucursalActiva)
      .then(setTipos)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos de cuenta'));
    cuentaContableApi.obtenerGrupos(sucursalActiva)
      .then(setGrupos)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos'));
    monedaApi.obtenerListado(sucursalActiva)
      .then(setMonedas)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas'));
  }, [modalVisible, sucursalActiva]);

  // Manejar navegación desde detalle (Editar)
  useEffect(() => {
    const noCuentaEditar = (location.state as any)?.editarNoCuenta;
    if (noCuentaEditar && sucursalActiva !== undefined) {
      const encontrada = (data?.data || []).find(c => c.noCuenta === noCuentaEditar);
      if (encontrada) {
        abrirEdicion(encontrada);
      } else {
        cuentaContableApi.obtenerPorId(sucursalActiva, noCuentaEditar)
          .then(cta => abrirEdicion(cta))
          .catch(() => message.error('Error al cargar cuenta para editar'));
      }
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEdicion = (cuenta: CuentaContableDTO) => {
    setEditando(cuenta);
    form.setFieldsValue({
      noCuenta: cuenta.noCuenta,
      nombre: cuenta.nombre,
      nota: cuenta.nota || '',
      activo: cuenta.activo,
      origen: cuenta.origen,
      utilizaCentroCosto: cuenta.utilizaCentroCosto,
      tipoCuentaCodigo: cuenta.tipoCuenta?.idExterno || undefined,
      grupoCodigo: cuenta.grupo?.codigo || undefined,
      monedaCodigo: cuenta.moneda?.codigo || undefined,
      cuentaControlNo: cuenta.cuentaControl?.noCuenta || undefined,
      cuentaPrimaNo: cuenta.cuentaPrima?.noCuenta || undefined,
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
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
    } finally {
      setGuardando(false);
    }
  };

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
      render: (val: string) => <Link to={'/MCuentaContable/' + val} className="paces-doc-link" style={{ fontFamily: 'monospace' }}><Text strong>{val}</Text></Link>,
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
      ellipsis: true,
      render: (grupo: { nombre: string }) =>
        grupo?.nombre
          ? <Tag color="geekblue" style={{ fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{grupo.nombre}</Tag>
          : '-',
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

  return (
    <>
      {isError && (
        <Alert
          title="Error al cargar cuentas contables"
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
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />

      <Table<CuentaContableDTO>
        columns={columns}
        dataSource={data?.data || []}
        rowKey="noCuenta"
        loading={isLoading}
        scroll={{ x: 1100 }}
        size="middle"
        rowClassName={(record) =>
          selectedRow?.noCuenta === record.noCuenta ? 'paces-row-selected' : 'paces-row-hover'
        }
        className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay cuentas contables registradas" />
            </div>,
          }}
          pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        onRow={(record) => ({
          onClick: () => setSelectedRow(record),
          style: { cursor: 'pointer' },
        })}
        onChange={(pagination) => {
          setPage(pagination.current || 1);
        }}
      />
    </Card>

      {/* Modal de crear/editar */}
      <Modal
        title={editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={640}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="noCuenta"
                label="No. Cuenta"
                rules={[{ required: true, message: 'El número de cuenta es obligatorio' }]}
              >
                <Input placeholder="Ej. 1.01.01" maxLength={20} disabled={!!editando} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Caja General" maxLength={150} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tipoCuentaCodigo"
                label="Tipo Cuenta"
                rules={[{ required: true, message: 'Seleccione un tipo de cuenta' }]}
              >
                <Select
                  placeholder="Seleccionar tipo"
                  showSearch
                  optionFilterProp="label"
                  options={tipos.map(t => ({ label: t.nombre, value: t.idExterno }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="grupoCodigo"
                label="Grupo"
                rules={[{ required: true, message: 'Seleccione un grupo' }]}
              >
                <Select
                  placeholder="Seleccionar grupo"
                  showSearch
                  optionFilterProp="label"
                  options={grupos.map(g => ({ label: g.nombre, value: g.codigo }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monedaCodigo"
                label="Moneda"
                rules={[{ required: true, message: 'Seleccione una moneda' }]}
              >
                <Select
                  placeholder="Seleccionar moneda"
                  showSearch
                  optionFilterProp="label"
                  options={monedas.map(m => ({ label: `${m.nombre} (${m.codigo})`, value: m.codigo }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="origen"
                label="Origen"
                rules={[{ required: true, message: 'Seleccione el origen' }]}
              >
                <Select placeholder="Seleccionar origen" options={ORIGEN_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cuentaControlNo"
                label="Cuenta Control"
              >
                <Input placeholder="No. cuenta control" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cuentaPrimaNo"
                label="Cuenta Prima"
              >
                <Input placeholder="No. cuenta prima" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="utilizaCentroCosto" label="Centro Costo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activo" label="Activo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="nota"
            label="Nota"
          >
            <Input.TextArea rows={3} placeholder="Nota opcional" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CuentasContables;
