import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Spin, Button, Space, Row, Col, Grid,
  message, Form, Input, DatePicker, Typography, Modal, Alert, Select, Empty,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, DeleteOutlined, PlusOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { plantillaSuplidorApi } from '../../api/plantillaSuplidorApi';
import { conceptosApi } from '../../api/conceptosApi';
import { Sucursal } from '../../types/auth';
import PermissionGate from '../../components/PermissionGate';
import type { PlantillaSuplidorDTO, DetallePlantillaSuplidorDTO } from '../../types/plantillaSuplidor';

const { Text } = Typography;
const { TextArea } = Input;

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function toISOFormat(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}

function filaVacia(orden: number): DetallePlantillaSuplidorDTO {
  return {
    id: `nuevo-${orden}`,
    orden,
    codigoProducto: '',
    descripcion: '',
    referencia: '',
  };
}

const PlantillaSuplidorFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<PlantillaSuplidorDTO | null>(null);
  const [detalles, setDetalles] = useState<DetallePlantillaSuplidorDTO[]>([]);
  const [suplidores, setSuplidores] = useState<{ codigo: string; nombre: string }[]>([]);

  const [form] = Form.useForm();
  const navigationConfirmedRef = useRef(false);

  const isLarge = screens.lg ?? true;

  const pageTitle = mode === 'crear' ? 'Nueva Plantilla de Suplidor' : 'Editar Plantilla de Suplidor';

  // ===== Cargar datos si es edición =====
  useEffect(() => {
    setActiveModule('mplantillasup');
    setPageTitleOverride(pageTitle);

    if (mode === 'crear') {
      form.setFieldsValue({ fecha: dayjs() });
    }

    conceptosApi.obtenerSuplidores(Sucursal.Compra)
      .then(setSuplidores)
      .catch(() => message.error('Error al cargar suplidores'));

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, pageTitle]);

  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    plantillaSuplidorApi.obtenerPorId(sucursalActiva, id)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar Plantilla #${res.numero}`);
        setDetalles(res.detalles || []);

        const fechaVal = res.fecha ? parseDateRaw(res.fecha) : null;
        form.setFieldsValue({
          numero: res.numero || '',
          fecha: fechaVal ? dayjs(fechaVal) : dayjs(),
          codigoSuplidor: res.codigoSuplidor || '',
          nombreSuplidor: res.nombreSuplidor || '',
          notas: res.notas || '',
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la plantilla');
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/mplantillasup');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);

  // ===== Bloqueo de salida =====
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
      if (!leave) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
      const currentPath = window.location.pathname;
      const newPath = typeof url === 'string' ? url.split('?')[0] : (url instanceof URL ? url.pathname : null);
      if (newPath && currentPath !== newPath && !navigationConfirmedRef.current) {
        const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
        if (!leave) return;
        navigationConfirmedRef.current = true;
      }
      return originalPushState(data, unused, url);
    };
    return () => {
      window.history.pushState = originalPushState;
    };
  }, []);

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
        navigate('/mplantillasup');
      },
    });
  };

  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!values.numero) return 'El número es requerido';
    if (!values.nombreSuplidor) return 'El nombre del suplidor es requerido';
    if (detalles.length === 0) return 'Debe agregar al menos un detalle';
    const incompletos = detalles.some((d) => !d.codigoProducto || !d.descripcion);
    if (incompletos) return 'Todos los detalles deben tener código de producto y descripción';
    return null;
  };

  const construirDTO = (): PlantillaSuplidorDTO => {
    const values = form.getFieldsValue();
    const base = data || ({} as PlantillaSuplidorDTO);

    const fechaStr = values.fecha
      ? (typeof values.fecha === 'object' && values.fecha.toDate
        ? toISOFormat(values.fecha.toDate())
        : values.fecha)
      : toISOFormat(new Date());

    return {
      id: base.id || '',
      numero: values.numero || '',
      fecha: fechaStr,
      codigoSuplidor: values.codigoSuplidor || '',
      nombreSuplidor: values.nombreSuplidor || '',
      notas: values.notas || '',
      detalles: detalles.map((d, idx) => ({
        ...d,
        orden: idx + 1,
      })),
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
        const nuevoId = await plantillaSuplidorApi.crear(sucursalActiva, dto);
        message.success('Plantilla creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/mplantillasup/${nuevoId}`);
      } else {
        await plantillaSuplidorApi.actualizar(sucursalActiva, dto);
        message.success('Plantilla actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/mplantillasup/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de detalles =====
  const handleAgregarFila = () => {
    setDetalles((prev) => [...prev, filaVacia(prev.length + 1)]);
  };

  const handleEliminarFila = (index: number) => {
    setDetalles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((d, i) => ({ ...d, orden: i + 1 }));
    });
  };

  const handleDetalleChange = (index: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d, i) => (i !== index ? d : { ...d, [field]: value } as DetallePlantillaSuplidorDTO))
    );
  };

  // ===== Loading state =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando plantilla...</div>
      </div>
    );
  }

  // ===== Columnas de detalle editable =====
  const detalleColumns = [
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 70,
      align: 'right' as const,
      onCell: () => ({ style: { paddingLeft: 16 } }),
      onHeaderCell: () => ({ style: { paddingLeft: 16 } }),
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Código Producto',
      dataIndex: 'codigoProducto',
      key: 'codigoProducto',
      width: 150,
      render: (_: any, __: any, index: number) => (
        <Input
          size="small"
          value={detalles[index]?.codigoProducto || ''}
          onChange={(e) => handleDetalleChange(index, 'codigoProducto', e.target.value)}
          placeholder="Código"
        />
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      ellipsis: true,
      render: (_: any, __: any, index: number) => (
        <Input
          size="small"
          value={detalles[index]?.descripcion || ''}
          onChange={(e) => handleDetalleChange(index, 'descripcion', e.target.value)}
          placeholder="Descripción del producto"
        />
      ),
    },
    {
      title: 'Referencia',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 130,
      render: (_: any, __: any, index: number) => (
        <Input
          size="small"
          value={detalles[index]?.referencia || ''}
          onChange={(e) => handleDetalleChange(index, 'referencia', e.target.value)}
          placeholder="Referencia"
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 60,
      onCell: () => ({ style: { paddingRight: 16 } }),
      onHeaderCell: () => ({ style: { paddingRight: 16 } }),
      render: (_: any, __: any, index: number) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarFila(index)}
        />
      ),
    },
  ];

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar formulario de plantilla"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <PermissionGate accion={id ? 'EDITAR' : 'CREAR'}>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
              Guardar
            </Button>
          </PermissionGate>
          <Button icon={<CloseOutlined />} onClick={handleCancelar}>
            Cancelar
          </Button>
        </Space>
      </div>

      {isLarge ? (
        <Row gutter={16}>
          <Col lg={18}>
            {/* Datos Generales */}
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
              style={{ marginBottom: 16 }}
            >
              <Form
                form={form}
                layout="vertical"
                size="middle"
                style={{ paddingTop: 24 }}
              >
                <Row gutter={[16, 24]}>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="numero"
                      label="Número"
                      rules={[{ required: true, message: 'El número es requerido' }]}
                    >
                      <Input placeholder="Número de plantilla" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="fecha"
                      label="Fecha"
                      rules={[{ required: true, message: 'La fecha es requerida' }]}
                    >
                      <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item name="codigoSuplidor" label="Suplidor" rules={[{ required: true, message: 'El suplidor es requerido' }]}>
                      <Select
                        showSearch
                        placeholder="Buscar suplidor..."
                        optionFilterProp="label"
                        onChange={(value, option: any) => {
                          form.setFieldsValue({ nombreSuplidor: option?.label || '' });
                        }}
                        options={suplidores.map((s) => ({
                          value: s.codigo,
                          label: `${s.codigo} - ${s.nombre}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item name="nombreSuplidor" hidden>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24}>
                    <Form.Item name="notas" label="Notas">
                      <TextArea rows={2} placeholder="Notas opcionales" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* Detalles */}
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Detalles</span>}
              style={{ marginBottom: 16 }}
            >
              <div style={{ marginBottom: 12 }}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarFila}>
                  Agregar producto
                </Button>
              </div>
              <Table
                dataSource={detalles}
                columns={detalleColumns}
                rowKey={(r, idx) => r.id || `row-${idx}`}
                size="small"
                pagination={false}
                scroll={{ x: 650 }}
                locale={{
                  emptyText: (
                    <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Empty description="Sin registros" />
                    </div>
                  ),
                }}
              />
            </Card>
          </Col>

          <Col lg={6}>
            <Card
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Información</span>}
              className="paces-card"
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span className="paces-text-secondary">Total productos: </span>
                  <span>{detalles.length}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile */
        <div>
          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
            style={{ marginBottom: 16 }}
          >
            <Form
              form={form}
              layout="vertical"
              size="middle"
              style={{ paddingTop: 24 }}
            >
              <Row gutter={[16, 24]}>
                <Col xs={24}>
                  <Form.Item
                    name="numero"
                    label="Número"
                    rules={[{ required: true, message: 'El número es requerido' }]}
                  >
                    <Input placeholder="Número de plantilla" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="fecha"
                    label="Fecha"
                    rules={[{ required: true, message: 'La fecha es requerida' }]}
                  >
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="codigoSuplidor" label="Suplidor" rules={[{ required: true, message: 'El suplidor es requerido' }]}>
                    <Select
                      showSearch
                      placeholder="Buscar suplidor..."
                      optionFilterProp="label"
                      onChange={(value, option: any) => {
                        form.setFieldsValue({ nombreSuplidor: option?.label || '' });
                      }}
                      options={suplidores.map((s) => ({
                        value: s.codigo,
                        label: `${s.codigo} - ${s.nombre}`,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="nombreSuplidor" hidden>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="notas" label="Notas">
                    <TextArea rows={2} placeholder="Notas opcionales" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Detalles</span>}
            style={{ marginBottom: 16 }}
          >
            <div style={{ marginBottom: 12 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarFila}>
                Agregar producto
              </Button>
            </div>
            <Table
              dataSource={detalles}
              columns={detalleColumns}
              rowKey={(r, idx) => r.id || `row-${idx}`}
              size="small"
              pagination={false}
              scroll={{ x: 650 }}
              locale={{
                emptyText: (
                  <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty description="Sin registros" />
                  </div>
                ),
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default PlantillaSuplidorFormulario;
