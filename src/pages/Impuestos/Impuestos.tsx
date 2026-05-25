import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, message, Card, Button, Modal, Form, Input, InputNumber, Select, Typography } from 'antd';
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

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const Impuestos: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MImpuesto');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  const [data, setData] = useState<ImpuestoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ImpuestoDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

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
    form.setFieldsValue({
      tipo: 'I',
      ambito: AmbitoImpuesto.Ninguno,
      metodoCalculo: MetodoCalculoImpuesto.Porcentaje,
      baseCalculo: BaseCalculoImpuesto.Indefinido,
    });
    setModalVisible(true);
  };

  const abrirEditar = (item: ImpuestoDTO) => {
    if (!puedeEditar) return;
    setEditando(item);
    form.setFieldsValue({
      codigo: item.codigo,
      nombre: item.nombre,
      porcentaje: item.porcentaje,
      tipo: item.tipo,
      ambito: item.ambito,
      metodoCalculo: item.metodoCalculo,
      baseCalculo: item.baseCalculo,
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
      if (editando) {
        await impuestoApi.actualizar(sucursalActiva, editando.codigo, values);
        message.success('Impuesto actualizado correctamente');
      } else {
        await impuestoApi.crear(sucursalActiva, values);
        message.success('Impuesto creado correctamente');
      }
      setModalVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar impuesto');
    } finally {
      setGuardando(false);
    }
  };

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await impuestoApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar impuestos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MImpuesto');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

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
      title: 'Cuenta Contable',
      dataIndex: 'cuentaContable',
      key: 'cuentaContable',
      width: 220,
      render: (val: string) => <Text>{toTitleCase(val ?? '') || '-'}</Text>,
    },

  ];

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
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
        <Table<ImpuestoDTO>
          columns={columns}
          dataSource={filteredData}
          rowKey="idExterno"
          loading={loading}
          scroll={{ x: 1100 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} impuestos`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
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
          <Form.Item
            name="cuentaContable"
            label="No. Cuenta Contable"
          >
            <Input placeholder="Ej. 2.01.01" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="indicadorDGII"
            label="Indicador DGII"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Impuestos;
