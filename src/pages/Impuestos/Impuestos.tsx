import React, { useEffect, useState, useCallback } from 'react';
import { Table, Tag, message, Card, Button, Modal, Descriptions, Tooltip, Form, Input, InputNumber, Select, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
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

const METODO_LABEL: Record<number, string> = {
  [MetodoCalculoImpuesto.Porcentaje]: 'Porcentaje',
  [MetodoCalculoImpuesto.Fijo]: 'Fijo',
};

const BASE_CALCULO_LABEL: Record<number, string> = {
  [BaseCalculoImpuesto.Indefinido]: 'Indefinido',
  [BaseCalculoImpuesto.MontoNeto]: 'Monto Neto',
  [BaseCalculoImpuesto.MontoTotal]: 'Monto Total',
};

const Impuestos: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ImpuestoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<ImpuestoDTO | null>(null);

  // Estados para crear/editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<ImpuestoDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const abrirDetalle = (item: ImpuestoDTO) => {
    setDetalleItem(item);
    setDetalleVisible(true);
  };

  const abrirNuevo = () => {
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
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      width: 220,
    },
    {
      title: 'Porcentaje',
      dataIndex: 'porcentaje',
      key: 'porcentaje',
      width: 110,
      align: 'right',
      render: (val: number) => `${(val ?? 0).toFixed(2)} %`,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 120,
      render: (tipo: TipoImpuesto) => {
        const info = TIPO_IMPUESTO_LABEL[tipo];
        return info ? <Tag color={info.color}>{info.label}</Tag> : tipo;
      },
    },
    {
      title: 'Ámbito',
      dataIndex: 'ambito',
      key: 'ambito',
      width: 100,
      render: (ambito: AmbitoImpuesto) => AMBITO_LABEL[ambito] || 'Ninguno',
    },
    {
      title: 'Método Cálculo',
      dataIndex: 'metodoCalculo',
      key: 'metodoCalculo',
      width: 140,
      render: (metodo: MetodoCalculoImpuesto) => METODO_LABEL[metodo] || '-',
    },
    {
      title: 'Cuenta Contable',
      dataIndex: 'cuentaContable',
      key: 'cuentaContable',
      width: 140,
      render: (val: string) => val || '-',
    },
    {
      title: 'Base Cálculo',
      dataIndex: 'baseCalculo',
      key: 'baseCalculo',
      width: 120,
      render: (val?: BaseCalculoImpuesto) =>
        val !== undefined && val !== null ? BASE_CALCULO_LABEL[val] || '-' : '-',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 120,
      render: (_: any, record: ImpuestoDTO) => (
        <Space size={0}>
          <Tooltip title="Editar impuesto">
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Impuestos</h4>
        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
          Nuevo Impuesto
        </Button>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<ImpuestoDTO>
          columns={columns}
          dataSource={data}
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

      <Modal
        title={`Detalle de Impuesto: ${detalleItem?.nombre || ''}`}
        open={detalleVisible}
        onCancel={() => setDetalleVisible(false)}
        footer={null}
        width={640}
      >
        {detalleItem && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Código">{detalleItem.codigo}</Descriptions.Item>
            <Descriptions.Item label="Nombre">{detalleItem.nombre}</Descriptions.Item>
            <Descriptions.Item label="Porcentaje">{`${(detalleItem.porcentaje ?? 0).toFixed(2)} %`}</Descriptions.Item>
            <Descriptions.Item label="Tipo">{TIPO_IMPUESTO_LABEL[detalleItem.tipo]?.label || detalleItem.tipo}</Descriptions.Item>
            <Descriptions.Item label="Ámbito">{AMBITO_LABEL[detalleItem.ambito] || 'Ninguno'}</Descriptions.Item>
            <Descriptions.Item label="Método Cálculo">{METODO_LABEL[detalleItem.metodoCalculo] || '-'}</Descriptions.Item>
            <Descriptions.Item label="Cuenta Contable">{detalleItem.cuentaContable || '-'}</Descriptions.Item>
            <Descriptions.Item label="Base Cálculo">{detalleItem.baseCalculo !== undefined && detalleItem.baseCalculo !== null ? BASE_CALCULO_LABEL[detalleItem.baseCalculo] || '-' : '-'}</Descriptions.Item>
            <Descriptions.Item label="Indicador DGII">{detalleItem.indicadorDGII ?? '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

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
