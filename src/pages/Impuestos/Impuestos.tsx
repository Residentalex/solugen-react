import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, message, Card, Button, Modal, Form, Input, InputNumber, Select, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { impuestoApi } from '../../api/impuestoApi';
import type { ImpuestoDTO } from '../../types/contabilidad';
import {
  MetodoCalculoImpuesto,
  TipoImpuesto,
  AmbitoImpuesto,
  BaseCalculoImpuesto,
} from '../../types/contabilidad';
import PermissionGate from '../../components/PermissionGate';
import { toTitleCase } from '../../utils/formats';
import BuscarCuentaContableModal from '../../components/BuscarCuentaContableModal/BuscarCuentaContableModal';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const TIPO_IMPUESTO_LABEL: Record<string, { label: string; color: string }> = {
  I: { label: 'Impuesto', color: 'blue' },
  L: { label: 'Liquidación', color: 'orange' },
  V: { label: 'Informativo', color: 'purple' },
  R: { label: 'Retención', color: 'red' },
};

const AMBITO_LABEL: Record<number, string> = {
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
  const [form] = Form.useForm();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['impuestos', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      const result = await impuestoApi.obtenerListado(sucursalActiva);
      return result || [];
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
    form.setFieldsValue({
      tipo: 'I',
      ambito: AmbitoImpuesto.Ninguno,
      metodoCalculo: MetodoCalculoImpuesto.Porcentaje,
      baseCalculo: BaseCalculoImpuesto.Indefinido,
      noCuenta: '',
      cuentaContable: '',
    });
    setModalVisible(true);
  };

  const abrirEditar = (item: ImpuestoDTO) => {
    if (!puedeEditar) return;
    setEditando(item);
    const TIPO_MAP_REVERSE: Record<number, string> = { 0: 'I', 1: 'L', 2: 'V', 3: 'R' };
    form.setFieldsValue({
      codigo: item.codigo,
      nombre: item.nombre,
      porcentaje: item.porcentaje,
      tipo: TIPO_MAP_REVERSE[item.tipo as unknown as number] ?? item.tipo,
      ambito: item.ambito,
      metodoCalculo: item.metodoCalculo,
      baseCalculo: item.baseCalculo,
      noCuenta: item.noCuenta,
      cuentaContable: item.cuentaContable,
      indicadorDGII: item.indicadorDGII,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      // Convertir tipo de string a numero (I=0, L=1, V=2, R=3)
      const TIPO_MAP: Record<string, number> = { I: 0, L: 1, V: 2, R: 3 };
      const payload = { ...values, tipo: TIPO_MAP[values.tipo] ?? values.tipo };
      if (editando) {
        await impuestoApi.actualizar(sucursalActiva, editando.codigo, payload);
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
      render: (tipo: number) => {
        const TIPO_NUM_MAP: Record<number, string> = { 0: 'I', 1: 'L', 2: 'V', 3: 'R' };
        const key = TIPO_NUM_MAP[tipo] ?? tipo;
        return <Text>{TIPO_IMPUESTO_LABEL[key]?.label || key}</Text>;
      },
    },
    {
      title: 'Ámbito',
      dataIndex: 'ambito',
      key: 'ambito',
      width: 100,
      render: (ambito: AmbitoImpuesto) => <Text>{AMBITO_LABEL[ambito] || 'Ninguno'}</Text>,
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
          dataSource={paginatedData}
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
            total: filteredData?.length || 0,
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
              value={form.getFieldValue('cuentaContable') || form.getFieldValue('noCuenta') || ''}
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
        </Form>
        <BuscarCuentaContableModal
          open={cuentaModalOpen}
          onClose={() => setCuentaModalOpen(false)}
          onSelect={(cuenta) => {
            form.setFieldsValue({ noCuenta: cuenta.noCuenta, cuentaContable: `${cuenta.noCuenta} - ${cuenta.nombre}` });
          }}
          sucursal={sucursalActiva}
        />
      </Modal>
    </>
  );
};

export default Impuestos;