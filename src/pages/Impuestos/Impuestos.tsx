import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, message, Card, Button, Modal, Form, Input, InputNumber, Select, Switch, Tag, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { impuestoApi } from '../../api/impuestoApi';
import type { ImpuestoDTO } from '../../types/contabilidad';
import {
  MetodoCalculoImpuesto,
  AmbitoImpuesto,
  BaseCalculoImpuesto,
  TipoImpuesto,
} from '../../types/contabilidad';
import { toTitleCase } from '../../utils/formats';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const TIPO_IMPUESTO_LABEL: Record<string, { label: string }> = {
  I: { label: 'Impuesto', color: 'blue' },
  L: { label: 'Liquidación', color: 'orange' },
  V: { label: 'Informativo', color: 'purple' },
  R: { label: 'Retención', color: 'red' },
};

const AMBITO_LABEL: Record<string, string> = {
  [AmbitoImpuesto.Venta]: 'Venta',
  [AmbitoImpuesto.Compra]: 'Compra',
  [AmbitoImpuesto.Ninguno]: 'Ninguno',
};

const { Text } = Typography;

const Impuestos: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MImpuesto');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ImpuestoDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cuentaModalOpen, setCuentaModalOpen] = useState(false);
  const [cuentaDisplay, setCuentaDisplay] = useState('');
  const [form] = Form.useForm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['impuestos', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const { items, total } = await impuestoApi.filtrar(sucursalActiva, params);
      return { datos: items, total };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MImpuesto');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };
  const abrirNuevo = () => {
    if (!puedeCrear) return;
    setEditando(null);
    setModalVisible(true);
  };

  const abrirEditar = (item: ImpuestoDTO) => {
    if (!puedeEditar) return;
    setEditando(item);
    setModalVisible(true);
  };

  useEffect(() => {
    if (!modalVisible) return;
    if (editando) {
      form.setFieldsValue({
        codigo: editando.idExterno,
        nombre: editando.nombre,
        porcentaje: editando.porcentaje,
        tipo: editando.tipo,
        ambito: editando.ambito,
        metodoCalculo: editando.metodoCalculo,
        baseCalculo: editando.baseCalculo,
        noCuenta: editando.noCuenta,
        indicadorDGII: editando.indicadorDGII,
        asientos: editando.asientos,
      });
      setCuentaDisplay(editando.cuentaContable || '');
    } else {
      form.resetFields();
      form.setFieldsValue({
        tipo: 'I',
        ambito: AmbitoImpuesto.Ninguno,
        metodoCalculo: MetodoCalculoImpuesto.Porcentaje,
        baseCalculo: BaseCalculoImpuesto.Indefinido,
        noCuenta: '',
        asientos: true,
      });
      setCuentaDisplay('');
    }
  }, [modalVisible, editando, form]);

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload = { ...values };
      if (editando) {
        await impuestoApi.actualizar(sucursalActiva, editando.idExterno, payload);
        message.success('Impuesto actualizado correctamente');
      } else {
        await impuestoApi.crear(sucursalActiva, payload);
        message.success('Impuesto creado correctamente');
      }
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar impuesto');
    } finally {
      setGuardando(false);
    }
  };

  const columns: ColumnsType<ImpuestoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 100,
      fixed: 'left',
      render: (val: string, record: ImpuestoDTO) =>
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
      width: 220,
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Porcentaje',
      dataIndex: 'porcentaje',
      key: 'porcentaje',
      width: 110,
      align: 'right',
      render: (val: number) => <Text>{`${(val ?? 0).toFixed(2)} %`}</Text>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (tipo: TipoImpuesto) => <Text>{TIPO_IMPUESTO_LABEL[tipo]?.label || tipo}</Text>,
    },
    {
      title: 'Ámbito',
      dataIndex: 'ambito',
      key: 'ambito',
      width: 100,
      render: (ambito: AmbitoImpuesto) => <Text>{AMBITO_LABEL[ambito] || 'Ninguno'}</Text>,
    },
    {
      title: 'Afecta Asientos',
      dataIndex: 'asientos',
      key: 'asientos',
      width: 130,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'red'}>{val ? 'Sí' : 'No'}</Tag>
      ),
    },
    {
      title: 'Cuenta Contable',
      dataIndex: 'cuentaContable',
      key: 'cuentaContable',
      width: 220,
      render: (val: string) => <Text>{toTitleCase(val ?? '') || '-'}</Text>,
    },

  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar impuestos"
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
        <Table<ImpuestoDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="idExterno"
          loading={isLoading}
          scroll={{ x: 1100 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          locale={{
            emptyText: <div style={{ minHeight: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Empty description="No hay impuestos registrados" />
            </div>,
          }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>

      {/* Modal de crear/editar */}
      <Modal
        title={editando ? 'Editar Impuesto' : 'Nuevo Impuesto'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={600}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input placeholder="Ej. ITBIS" maxLength={20} disabled={!!editando} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. ITBIS 18%" maxLength={100} />
          </Form.Item>
          <Form.Item
            name="porcentaje"
            label="Porcentaje"
            rules={[{ required: true, message: 'El porcentaje es obligatorio' }]}
          >
            <InputNumber
              min={0}
              max={100}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0.00"
              addonAfter="%"
            />
          </Form.Item>
          <Form.Item
            name="tipo"
            label="Tipo"
            rules={[{ required: true, message: 'El tipo es obligatorio' }]}
          >
            <Select>
              <Select.Option value="I">Impuesto</Select.Option>
              <Select.Option value="L">Liquidación</Select.Option>
              <Select.Option value="V">Informativo</Select.Option>
              <Select.Option value="R">Retención</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="ambito"
            label="Ámbito"
          >
            <Select>
              <Select.Option value={AmbitoImpuesto.Venta}>Venta</Select.Option>
              <Select.Option value={AmbitoImpuesto.Compra}>Compra</Select.Option>
              <Select.Option value={AmbitoImpuesto.Ninguno}>Ninguno</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="metodoCalculo"
            label="Método Cálculo"
          >
            <Select>
              <Select.Option value={MetodoCalculoImpuesto.Porcentaje}>Porcentaje</Select.Option>
              <Select.Option value={MetodoCalculoImpuesto.Fijo}>Fijo</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="baseCalculo"
            label="Base Cálculo"
          >
            <Select>
              <Select.Option value={BaseCalculoImpuesto.Indefinido}>Indefinido</Select.Option>
              <Select.Option value={BaseCalculoImpuesto.MontoNeto}>Monto Neto</Select.Option>
              <Select.Option value={BaseCalculoImpuesto.MontoTotal}>Monto Total</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="noCuenta" label="No. Cuenta Contable">
            <Input
              placeholder=" "
              readOnly
              value={cuentaDisplay}
              onClick={() => setCuentaModalOpen(true)}
              suffix={<SearchOutlined style={{ cursor: 'pointer' }} onClick={() => setCuentaModalOpen(true)} />}
            />
          </Form.Item>
          <Form.Item
            name="indicadorDGII"
            label="Indicador DGII"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item name="asientos" label="Afecta Asientos" valuePropName="checked">
            <Switch checkedChildren="Sí" unCheckedChildren="No" />
          </Form.Item>
        </Form>
        <BuscarCuentaContableModal
          open={cuentaModalOpen}
          onClose={() => setCuentaModalOpen(false)}
          onSelect={(cuenta) => {
            form.setFieldsValue({ noCuenta: cuenta.noCuenta });
            setCuentaDisplay(`${cuenta.noCuenta} - ${cuenta.nombre}`);
          }}
          sucursal={sucursalActiva}
        />
      </Modal>
    </>
  );
};

export default Impuestos;