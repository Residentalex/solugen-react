import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Tag, Button, Space, Row, Col, Grid,
  Form, Input, InputNumber, Select, DatePicker, Typography,
  Modal, message, Alert, Spin, Skeleton, Switch,
} from 'antd';
import {
  PlusOutlined, SaveOutlined, CloseOutlined, SearchOutlined,
  DeleteOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { actualizacionPrecioApi } from '../../api/actualizacionPrecioApi';
import BuscarProductoModal from '../../components/BuscarProductoModal/BuscarProductoModal';
import TotalesCard from '../../components/TotalesCard';
import { formatNumber, toTitleCase, extraerMensajeError, toISOFormat } from '../../utils/formats';
import type { ActualizacionPrecioDetalleDTO, ActualizacionPrecioCrearDTO, ActualizacionPrecioLineaCrearDTO } from '../../types/actualizacionPrecio';

const { Text } = Typography;
const { TextArea } = Input;

const ESTADO_TAG: Record<string, { color: string; label: string }> = {
  Pendiente: { color: 'warning', label: 'Pendiente' },
  P: { color: 'warning', label: 'Pendiente' },
  Aplicado: { color: 'success', label: 'Aplicado' },
  A: { color: 'success', label: 'Aplicado' },
  Anulado: { color: 'error', label: 'Anulado' },
  N: { color: 'error', label: 'Anulado' },
};

const BASE_OPTIONS = [
  { value: 'Precio', label: 'Precio' },
  { value: 'Costo', label: 'Costo' },
];

function lineaVacia(): ActualizacionPrecioLineaCrearDTO {
  return {
    codPro: '',
    descripcion: '',
    precio: 0,
    pAumento: 0,
    aumento: 0,
    precioSug: 0,
    marcada: false,
    costoPiv: 0,
    pMargen: 0,
    impMargen: 0,
    pMargPM: 0,
    precioMinSug: 0,
    precioMin: 0,
  };
}

const ActualizacionPrecioFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ActualizacionPrecioDetalleDTO | null>(null);
  const [lineas, setLineas] = useState<ActualizacionPrecioLineaCrearDTO[]>([]);
  const [productoModalOpen, setProductoModalOpen] = useState(false);

  const [form] = Form.useForm();
  const navigationConfirmedRef = useRef(false);

  const isLarge = screens.xxl === true;

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule('FActPrecio');
    const pageTitle = mode === 'crear' ? 'Nueva Actualización de Precio' : '';
    setPageTitleOverride(pageTitle);

    // Inicializar valores por defecto en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({
        fecha: dayjs(),
        fechaParaAplicar: dayjs(),
        redondear: false,
        ajuste: 0,
        base: 'Precio',
        porPivote: 0,
        porPrecioMin: 0,
        precioAct: true,
        todosAlm: false,
        todasFam: false,
        docReferencia: '',
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);

  // ===== Cargar datos si es edición =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    actualizacionPrecioApi.obtenerDetalle(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.documento}`);
        setLineas(res.lineas.map((l) => ({
          codPro: l.codPro,
          descripcion: l.descripcion,
          precio: l.precio,
          pAumento: l.pAumento,
          aumento: l.aumento,
          precioSug: l.precioSug,
          marcada: l.marcada,
          costoPiv: l.costoPiv,
          pMargen: l.pMargen,
          impMargen: l.impMargen,
          pMargPM: l.pMargPM,
          precioMinSug: l.precioMinSug,
          precioMin: l.precioMin,
        })));

        form.setFieldsValue({
          fecha: res.fecha ? dayjs(res.fecha) : dayjs(),
          fechaParaAplicar: res.fechaParaAplicar ? dayjs(res.fechaParaAplicar) : dayjs(),
          almacenId: res.almacenId || undefined,
          familiaId: res.familiaId || undefined,
          docReferencia: res.docReferencia || '',
          redondear: res.redondear,
          ajuste: res.ajuste,
          base: res.base || 'Precio',
          porPivote: res.porPivote,
          porPrecioMin: res.porPrecioMin,
          precioAct: res.precioAct,
          todosAlm: res.todosAlm,
          todasFam: res.todasFam,
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el documento');
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FActPrecio', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        if (mode === 'crear') {
          navigate('/FActPrecio', { replace: true });
        } else {
          navigate(`/FActPrecio/${id}`, { replace: true });
        }
      },
    });
  };

  const validarFormulario = (): string | null => {
    if (lineas.length === 0) return 'Debe agregar al menos un producto';
    return null;
  };

  const construirDTO = (): ActualizacionPrecioCrearDTO => {
    const values = form.getFieldsValue();
    const base = data || ({} as ActualizacionPrecioDetalleDTO);

    const fecha = values.fecha
      ? (typeof values.fecha === 'object' && values.fecha.toDate
        ? toISOFormat(values.fecha.toDate())
        : values.fecha)
      : toISOFormat(new Date());

    const fechaParaAplicar = values.fechaParaAplicar
      ? (typeof values.fechaParaAplicar === 'object' && values.fechaParaAplicar.toDate
        ? toISOFormat(values.fechaParaAplicar.toDate())
        : values.fechaParaAplicar)
      : toISOFormat(new Date());

    return {
      fecha,
      fechaParaAplicar,
      almacenId: values.almacenId || base.almacenId || undefined,
      familiaId: values.familiaId || base.familiaId || undefined,
      docReferencia: values.docReferencia || '',
      redondear: values.redondear ?? false,
      ajuste: values.ajuste ?? 0,
      base: values.base || 'Precio',
      porPivote: values.porPivote ?? 0,
      porPrecioMin: values.porPrecioMin ?? 0,
      precioAct: values.precioAct ?? true,
      todosAlm: values.todosAlm ?? false,
      todasFam: values.todasFam ?? false,
      lineas,
    };
  };

  const handleGuardar = async () => {
    const error = validarFormulario();
    if (error) {
      message.error(error);
      return;
    }

    setSaving(true);
    try {
      const dto = construirDTO();
      if (mode === 'crear') {
        const resultId = await actualizacionPrecioApi.crear(sucursalActiva, dto);
        message.success('Actualización de precio creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FActPrecio/${resultId}`, { replace: true });
      } else {
        await actualizacionPrecioApi.actualizar(sucursalActiva, id!, dto);
        message.success('Actualización de precio actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FActPrecio/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSeleccionarProducto = (producto: any) => {
    // Verificar duplicado
    const yaExiste = lineas.some((l) => l.codPro === producto.codigo);
    if (yaExiste) {
      message.warning(`El producto ${producto.codigo} ya está agregado`);
      return;
    }

    setLineas((prev) => [
      ...prev,
      {
        codPro: producto.codigo,
        descripcion: producto.articulo || producto.descripcion || '',
        precio: producto.precio || producto.costo || 0,
        pAumento: 0,
        aumento: 0,
        precioSug: producto.precio || producto.costo || 0,
        marcada: true,
        costoPiv: producto.costo || 0,
        pMargen: 0,
        impMargen: 0,
        pMargPM: 0,
        precioMinSug: producto.precio || producto.costo || 0,
        precioMin: producto.precio || producto.costo || 0,
      },
    ]);
  };

  const handleEliminarLinea = (codPro: string) => {
    Modal.confirm({
      title: 'Eliminar producto',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este producto?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setLineas((prev) => prev.filter((l) => l.codPro !== codPro));
      },
    });
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  // Totales calculados
  const totalPrecioActual = lineas.reduce((s, l) => s + (l.precio || 0), 0);
  const totalPrecioSug = lineas.reduce((s, l) => s + (l.precioSug || 0), 0);
  const totalAumento = lineas.reduce((s, l) => s + (l.aumento || 0), 0);

  const columnasLineas = [
    {
      title: 'Código',
      dataIndex: 'codPro',
      key: 'codPro',
      width: 120,
      fixed: 'left' as const,
      render: (val: string) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val || '')}</Text>,
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: '% Aumento',
      key: 'pAumento',
      width: 110,
      align: 'right' as const,
      render: (_: any, record: ActualizacionPrecioLineaCrearDTO, idx: number) => (
        <InputNumber
          size="small"
          style={{ width: '100%' }}
          styles={{ input: { textAlign: 'right' } }}
          min={0}
          step={0.01}
          precision={2}
          controls={false}
          defaultValue={record.pAumento}
          onChange={(val) => {
            const aumentoPorc = val || 0;
            const aumento = (record.precio * aumentoPorc) / 100;
            const precioSug = record.precio + aumento;
            setLineas((prev) => prev.map((l, i) =>
              i === idx ? { ...l, pAumento: aumentoPorc, aumento, precioSug } : l
            ));
          }}
        />
      ),
    },
    {
      title: 'Aumento',
      dataIndex: 'aumento',
      key: 'aumento',
      width: 110,
      align: 'right' as const,
      render: (val: number) => <Text style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: 'Precio Sugerido',
      dataIndex: 'precioSug',
      key: 'precioSug',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong style={{ fontFamily: 'monospace' }}>{formatNumber(val)}</Text>,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 60,
      render: (_: any, record: ActualizacionPrecioLineaCrearDTO) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarLinea(record.codPro)}
        />
      ),
    },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar el formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div style={{ flex: 1 }} />
        <Space wrap>
          {mode === 'editar' && data && (
            <Tag color={(ESTADO_TAG[data.estado] || { color: 'default' }).color}>
              {data.estado}
            </Tag>
          )}
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleCancelar}>
            Cancelar
          </Button>
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Encabezado */}
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
                <Row gutter={[16, 24]}>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Requerido' }]}>
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                        disabledDate={(current) => {
                          if (!current) return false;
                          const cierre = fechasCierre?.[sucursalActiva];
                          if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                          const cierreInv = fechasCierreInv?.[sucursalActiva];
                          if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                          return false;
                        }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="fechaParaAplicar" label="Fecha para Aplicar" rules={[{ required: true, message: 'Requerido' }]}>
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                        disabledDate={(current) => {
                          if (!current) return false;
                          const cierre = fechasCierre?.[sucursalActiva];
                          if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                          const cierreInv = fechasCierreInv?.[sucursalActiva];
                          if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                          return false;
                        }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="docReferencia" label="Doc. Referencia">
                      <Input placeholder="Documento de referencia" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="base" label="Base" rules={[{ required: true, message: 'Requerido' }]}>
                      <Select options={BASE_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="ajuste" label="Ajuste %">
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="porPivote" label="% Pivote">
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="porPrecioMin" label="% Precio Mín">
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="almacenId" label="Almacén">
                      <Input placeholder="ID del almacén" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="familiaId" label="Familia">
                      <Input placeholder="ID de la familia" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6} lg={8}>
                    <Form.Item name="redondear" label="Redondear" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6} lg={8}>
                    <Form.Item name="todosAlm" label="Todos Almacenes" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6} lg={8}>
                    <Form.Item name="todasFam" label="Todas Familias" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={6} lg={8}>
                    <Form.Item name="precioAct" label="Precio Actual" valuePropName="checked">
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* Líneas */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
                  Agregar Producto
                </Button>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {lineas.length} producto(s)
                </Text>
              </div>
              <Table
                dataSource={lineas}
                columns={columnasLineas}
                rowKey="codPro"
                size="small"
                pagination={false}
                scroll={{ x: 1100 }}
                locale={{ emptyText: 'No hay productos agregados' }}
              />
            </div>
          </Col>

          <Col xxl={6}>
            <TotalesCard
              subTotal={totalPrecioActual}
              descuento={0}
              impuestos={0}
              total={totalPrecioSug}
              nota={`Aumento total: ${formatNumber(totalAumento)}`}
              monedaSimbolo="RD$"
              monedaNombre="Peso Dominicano"
              tasa={1}
            />
          </Col>
        </Row>
      ) : (
        <div>
          {/* Encabezado */}
          <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="fecha" label="Fecha" rules={[{ required: true, message: 'Requerido' }]}>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        if (!current) return false;
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="fechaParaAplicar" label="Fecha para Aplicar" rules={[{ required: true, message: 'Requerido' }]}>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        if (!current) return false;
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="docReferencia" label="Doc. Referencia">
                    <Input placeholder="Documento de referencia" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="base" label="Base" rules={[{ required: true, message: 'Requerido' }]}>
                    <Select options={BASE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="ajuste" label="Ajuste %">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="porPivote" label="% Pivote">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="porPrecioMin" label="% Precio Mín">
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="almacenId" label="Almacén">
                    <Input placeholder="ID del almacén" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="familiaId" label="Familia">
                    <Input placeholder="ID de la familia" />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item name="redondear" label="Redondear" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item name="todosAlm" label="Todos Almacenes" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item name="todasFam" label="Todas Familias" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item name="precioAct" label="Precio Actual" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Líneas */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setProductoModalOpen(true)}>
                Agregar Producto
              </Button>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {lineas.length} producto(s)
              </Text>
            </div>
            <Table
              dataSource={lineas}
              columns={columnasLineas}
              rowKey="codPro"
              size="small"
              pagination={false}
              scroll={{ x: 1100 }}
              locale={{ emptyText: 'No hay productos agregados' }}
            />
          </div>

          {/* Totales en mobile */}
          <div style={{ marginTop: 24 }}>
            <TotalesCard
              subTotal={totalPrecioActual}
              descuento={0}
              impuestos={0}
              total={totalPrecioSug}
              alignRight
              nota={`Aumento total: ${formatNumber(totalAumento)}`}
              monedaSimbolo="RD$"
              monedaNombre="Peso Dominicano"
              tasa={1}
            />
          </div>
        </div>
      )}

      {/* Modal de búsqueda de productos */}
      <BuscarProductoModal
        open={productoModalOpen}
        onClose={() => setProductoModalOpen(false)}
        onSelect={handleSeleccionarProducto}
        mode="inventario"
      />
    </div>
  );
};

export default ActualizacionPrecioFormulario;
