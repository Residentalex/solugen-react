import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, Switch, InputNumber, message, Popconfirm, Space, Tag, Empty, Tooltip, Typography, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileExcelOutlined, SaveOutlined, CloseOutlined, ReloadOutlined, ProfileOutlined, ColumnHeightOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';
import { plantillaImportacionApi } from '../api/plantillaImportacionApi';
import type { PlantillaImportacionDTO } from '../api/plantillaImportacionApi';

export const CAMPOS_SISTEMA = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'numRef', label: 'Referencia' },
  { value: 'monto', label: 'Monto' },
  { value: 'debito', label: 'Débito (columna separada)' },
  { value: 'credito', label: 'Crédito (columna separada)' },
  { value: 'debCred', label: 'Débito/Crédito' },
  { value: 'concepto', label: 'Concepto' },
  { value: 'cotejado', label: 'Cotejado' },
  { value: 'orden', label: 'Orden' },
  { value: 'ctaBanc', label: 'Cuenta Bancaria' },
];

const CAMPOS_LABEL: Record<string, string> = Object.fromEntries(
  CAMPOS_SISTEMA.map((c) => [c.value, c.label])
);

interface Props {
  cuentaBanc: string;
}

interface MapeoFila {
  columna: number;
  campo: string;
}

const PlantillaImportacion: React.FC<Props> = ({ cuentaBanc }) => {
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [plantillas, setPlantillas] = useState<PlantillaImportacionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  const cargarPlantillas = useCallback(async () => {
    if (!cuentaBanc) return;
    setLoading(true);
    try {
      const datos = await plantillaImportacionApi.obtenerPorCuentaContable(sucursalActiva, cuentaBanc);
      setPlantillas(datos);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  }, [cuentaBanc, sucursalActiva]);

  useEffect(() => {
    if (cuentaBanc) {
      cargarPlantillas();
    }
  }, [cuentaBanc, cargarPlantillas]);

  const abrirCrear = () => {
    setEditandoId(null);
    form.resetFields();
    form.setFieldsValue({
      nombre: '',
      filaInicio: 1,
      separador: ',',
      decimalSeparator: '.',
      usarHeader: true,
      activo: true,
      mapeo: [],
    });
    setModalVisible(true);
  };

  const abrirEditar = (plantilla: PlantillaImportacionDTO) => {
    setEditandoId(plantilla.id);
    let mapeoArray: MapeoFila[] = [];
    try {
      const parsed = JSON.parse(plantilla.mapeoCampos || '{}');
      mapeoArray = Object.entries(parsed)
        .map(([columna, campo]) => ({ columna: parseInt(columna), campo: String(campo) }))
        .sort((a, b) => a.columna - b.columna);
    } catch {
      mapeoArray = [];
    }
    form.setFieldsValue({
      nombre: plantilla.nombre,
      filaInicio: plantilla.filaInicio,
      separador: plantilla.separador,
      decimalSeparator: plantilla.decimalSeparator,
      usarHeader: plantilla.usarHeader,
      activo: plantilla.activo,
      mapeo: mapeoArray,
    });
    setModalVisible(true);
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);

      const mapeoCampos: Record<string, string> = {};
      (values.mapeo || []).forEach((m: MapeoFila) => {
        if (m.campo) {
          mapeoCampos[String(m.columna)] = m.campo;
        }
      });

      const dto = {
        cuentaBanc,
        nombre: values.nombre,
        mapeoCampos: JSON.stringify(mapeoCampos),
        filaInicio: values.filaInicio || 1,
        separador: values.separador || ',',
        decimalSeparator: values.decimalSeparator || '.',
        usarHeader: values.usarHeader ?? true,
        activo: values.activo ?? true,
      };

      if (editandoId === null) {
        await plantillaImportacionApi.crear(sucursalActiva, dto);
        message.success('Plantilla creada correctamente');
      } else {
        await plantillaImportacionApi.actualizar(sucursalActiva, editandoId, dto);
        message.success('Plantilla actualizada correctamente');
      }

      setModalVisible(false);
      cargarPlantillas();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar plantilla');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await plantillaImportacionApi.eliminar(sucursalActiva, id);
      message.success('Plantilla eliminada correctamente');
      cargarPlantillas();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar plantilla');
    }
  };

  const columnas = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string, record: PlantillaImportacionDTO) => (
        <Space size={6}>
          <Typography.Text strong>{nombre}</Typography.Text>
          {record.activo && <Tag color="green" style={{ marginInlineEnd: 0 }}>Activa</Tag>}
          {!record.usarHeader && (
            <Tooltip title="Sin fila de encabezado en el archivo">
              <Tag color="orange" style={{ marginInlineEnd: 0 }}>Sin header</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Configuración',
      key: 'configuracion',
      render: (_: any, record: PlantillaImportacionDTO) => (
        <Space size={[4, 4]} wrap>
          <Tag icon={<ColumnHeightOutlined />} style={{ marginInlineEnd: 0 }}>
            Inicia fila {record.filaInicio}
          </Tag>
          <Tag style={{ marginInlineEnd: 0 }}>
            Sep: {record.separador === '\t' ? 'TAB' : `"${record.separador}"`}
          </Tag>
          <Tag style={{ marginInlineEnd: 0 }}>
            Dec: {record.decimalSeparator}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Mapeo',
      key: 'mapeo',
      render: (_: any, record: PlantillaImportacionDTO) => {
        let mapeo: Record<string, string> = {};
        try {
          mapeo = JSON.parse(record.mapeoCampos || '{}');
        } catch {
          mapeo = {};
        }
        const entradas = Object.entries(mapeo).sort(([a], [b]) => parseInt(a) - parseInt(b));
        if (entradas.length === 0) {
          return <Typography.Text type="secondary" style={{ fontSize: 12 }}>Sin mapeo</Typography.Text>;
        }
        return (
          <Space size={[4, 4]} wrap>
            {entradas.map(([col, campo]) => (
              <Tag
                key={col}
                style={{ marginInlineEnd: 0, background: 'rgba(85,110,230,0.08)', borderColor: 'rgba(85,110,230,0.25)', color: '#556ee6' }}
              >
                <span style={{ opacity: 0.7 }}>Col {col}</span>
                {' → '}
                {CAMPOS_LABEL[campo] || campo}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 88,
      align: 'right' as const,
      render: (_: any, record: PlantillaImportacionDTO) => (
        <Space size={2}>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => abrirEditar(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar plantilla?"
            description="Esta acción no se puede revertir."
            okText="Eliminar"
            okButtonProps={{ danger: true }}
            cancelText="Cancelar"
            onConfirm={() => handleEliminar(record.id)}
          >
            <Tooltip title="Eliminar">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      className="paces-card-erp"
      style={{ marginTop: 16, borderRadius: 8, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'rgba(85, 110, 230, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileExcelOutlined style={{ fontSize: 16, color: '#556ee6' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography.Text strong style={{ fontSize: 14, display: 'block' }}>
              Plantillas de Importación CSV
            </Typography.Text>
            {cuentaBanc ? (
              <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ProfileOutlined /> Cuenta: <Tag style={{ marginInlineEnd: 0 }}>{cuentaBanc}</Tag>
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Asigne una cuenta bancaria para gestionar plantillas
              </Typography.Text>
            )}
          </div>
          {cuentaBanc && (
            <Space>
              <Tooltip title="Recargar">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={cargarPlantillas}
                  loading={loading}
                />
              </Tooltip>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={abrirCrear}>
                Nueva Plantilla
              </Button>
            </Space>
          )}
        </div>
      </div>
      <Table
        className="paces-border-top paces-list-table"
        dataSource={plantillas}
        columns={columnas}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                cuentaBanc
                  ? 'No hay plantillas para esta cuenta bancaria'
                  : 'Asigne una cuenta bancaria para poder crear plantillas'
              }
            />
          )
        }}
      />

      <Modal
        title={editandoId === null ? 'Nueva Plantilla de Importación' : 'Editar Plantilla de Importación'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" icon={<CloseOutlined />} onClick={() => setModalVisible(false)}>
            Cancelar
          </Button>,
          <Button key="save" type="primary" icon={<SaveOutlined />} loading={guardando} onClick={handleGuardar}>
            Guardar
          </Button>,
        ]}
        width={760}
        destroyOnClose
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            name="nombre"
            label="Nombre de la Plantilla"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input prefix={<FileExcelOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />} placeholder="Ej: BPD Extracto mensual" />
          </Form.Item>

          <Typography.Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            Configuración del archivo
          </Typography.Text>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="filaInicio" label="Fila de Inicio">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="separador" label="Separador CSV">
                <Select>
                  <Select.Option value=",">Coma (,)</Select.Option>
                  <Select.Option value=";">Punto y coma (;)</Select.Option>
                  <Select.Option value="|">Pipe (|)</Select.Option>
                  <Select.Option value="\t">Tabulación (\t)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="decimalSeparator" label="Separador Decimal">
                <Select>
                  <Select.Option value=".">Punto (.)</Select.Option>
                  <Select.Option value=",">Coma (,)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item name="usarHeader" label="Encabezado" valuePropName="checked">
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item name="activo" label="Plantilla activa" valuePropName="checked" style={{ marginBottom: 8 }}>
                <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
              </Form.Item>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Solo una plantilla activa por cuenta contable se usará automáticamente al importar.
              </Typography.Text>
            </Col>
          </Row>

          <Divider style={{ margin: '16px 0 12px' }} />

          <Form.Item
            name="mapeo"
            label={<Typography.Text strong style={{ fontSize: 13 }}>Mapeo de Columnas</Typography.Text>}
            extra="Defina qué columna del CSV corresponde a cada campo del sistema. Las columnas sin mapear se ignoran."
          >
            <MaploCamposList />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

interface MaploCamposListProps {
  value?: MapeoFila[];
  onChange?: (value: MapeoFila[]) => void;
}

const MaploCamposList: React.FC<MaploCamposListProps> = ({ value = [], onChange }) => {
  const actualizar = (nuevo: MapeoFila[]) => {
    onChange?.([...nuevo].sort((a, b) => a.columna - b.columna));
  };

  const agregarFila = () => {
    const siguienteColumna = value.length === 0 ? 0 : Math.max(...value.map((m) => m.columna)) + 1;
    actualizar([...value, { columna: siguienteColumna, campo: '' }]);
  };

  const actualizarFila = (idx: number, datos: Partial<MapeoFila>) => {
    const nuevo = [...value];
    nuevo[idx] = { ...nuevo[idx], ...datos };
    actualizar(nuevo);
  };

  const eliminarFila = (idx: number) => {
    actualizar(value.filter((_, i) => i !== idx));
  };

  const tablaMapeo = [
    {
      title: 'Columna CSV (0 = primera)',
      key: 'columna',
      width: 190,
      render: (_: any, __: any, idx: number) => (
        <InputNumber
          min={0}
          value={value[idx]?.columna}
          onChange={(val) => actualizarFila(idx, { columna: val ?? 0 })}
          style={{ width: '100%' }}
          placeholder="0, 1, 2..."
        />
      ),
    },
    {
      title: 'Campo del Sistema',
      key: 'campo',
      render: (_: any, __: any, idx: number) => (
        <Select
          value={value[idx]?.campo}
          onChange={(val) => actualizarFila(idx, { campo: val })}
          style={{ width: '100%' }}
          placeholder="Seleccione campo..."
          options={CAMPOS_SISTEMA}
        />
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 56,
      align: 'right' as const,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => eliminarFila(idx)}
        />
      ),
    },
  ];

  return (
    <div>
      <Table
        size="small"
        dataSource={value.map((_, i) => ({ key: i, ..._ }))}
        columns={tablaMapeo}
        pagination={false}
        rowKey="key"
        style={{ marginBottom: 8 }}
        bordered
      />
      <Button type="dashed" block icon={<PlusOutlined />} onClick={agregarFila}>
        Agregar Columna
      </Button>
    </div>
  );
};

export default PlantillaImportacion;
