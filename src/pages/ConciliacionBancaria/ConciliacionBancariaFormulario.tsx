import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Row, Col, Grid, Form, Input, InputNumber, Select, DatePicker, Typography, message, Modal, Alert, Spin, Upload, Divider,
} from 'antd';
import {
  SaveOutlined, CloseOutlined, UploadOutlined, PlusOutlined, DeleteOutlined, CheckCircleFilled, CloseCircleFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import { extraerMensajeError, formatCurrency } from '../../utils/formats';
import type {
  ConciliacionBancariaDTO, MovimientoBancarioDTO, CuentaBancariaDTO,
} from '../../types/conciliacionBancaria';

const { Text } = Typography;
const { TextArea } = Input;

const ConciliacionBancariaFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ConciliacionBancariaDTO | null>(null);
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancariaDTO[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBancarioDTO[]>([]);
  const [archivoImportado, setArchivoImportado] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);

  const [form] = Form.useForm();

  const isLarge = screens.xxl === true;

  // ===== Cargar cuentas bancarias =====
  useEffect(() => {
    if (sucursalActiva) {
      conciliacionBancariaApi.obtenerCuentasBancarias(sucursalActiva)
        .then(setCuentasBancarias)
        .catch(() => message.warning('No se pudieron cargar las cuentas bancarias'));
    }
  }, [sucursalActiva]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    conciliacionBancariaApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar Conciliación N° ${res.concilID}`);
        setMovimientos(res.movimientos || []);

        form.setFieldsValue({
          numeroCta: res.numeroCta,
          fecha: res.fecha ? dayjs(res.fecha) : null,
          fechaAnt: res.fechaAnt ? dayjs(res.fechaAnt) : null,
          balBancos: res.balBancos,
          balLibros: res.balLibros,
          notas: res.notas || '',
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la conciliación');
        message.error(msg);
        setLoadingError(true);
        navigate('/FConcil', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride]);

  // ===== Module & cleanup =====
  useEffect(() => {
    setActiveModule('FConcil');
    const title = mode === 'crear' ? 'Nueva Conciliación Bancaria' : '';
    setPageTitleOverride(title);
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, resetToolbar, setPageTitleOverride, mode]);

  // ===== Handlers =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      content: 'Los cambios no guardados se perderán. ¿Está seguro que desea salir?',
      okText: 'Sí, cancelar',
      cancelText: 'No, continuar',
      okButtonProps: { danger: true },
      onOk: () => {
        navigate('/FConcil', { replace: true });
      },
    });
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: values.balLibros || 0,
        notas: values.notas || '',
        aplicada: false,
      };

      if (mode === 'crear') {
        // Incluir movimientos locales en la creación
        if (movimientos.length > 0) {
          dto.movimientos = movimientos;
        }
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        message.success('Conciliación creada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        dto.concilID = parseInt(id!);
        await conciliacionBancariaApi.actualizar(sucursalActiva, dto);
        message.success('Conciliación actualizada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return; // Validation error
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarYAplicar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const dto: Partial<ConciliacionBancariaDTO> = {
        numeroCta: values.numeroCta,
        fecha: values.fecha ? values.fecha.format('YYYY-MM-DD') : '',
        fechaAnt: values.fechaAnt ? values.fechaAnt.format('YYYY-MM-DD') : '',
        balBancos: values.balBancos || 0,
        balLibros: values.balLibros || 0,
        notas: values.notas || '',
        aplicada: true,
      };

      if (mode === 'crear') {
        // Incluir movimientos locales en la creación
        if (movimientos.length > 0) {
          dto.movimientos = movimientos;
        }
        const nuevoId = await conciliacionBancariaApi.crear(sucursalActiva, dto);
        await conciliacionBancariaApi.aplicar(sucursalActiva, nuevoId);
        message.success('Conciliación creada y aplicada exitosamente');
        navigate(`/FConcil/${nuevoId}`, { replace: true });
      } else {
        dto.concilID = parseInt(id!);
        await conciliacionBancariaApi.actualizar(sucursalActiva, dto);
        await conciliacionBancariaApi.aplicar(sucursalActiva, parseInt(id!));
        message.success('Conciliación actualizada y aplicada exitosamente');
        navigate(`/FConcil/${id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      const msg = extraerMensajeError(err, 'Error al guardar y aplicar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Parsear CSV a movimientos =====
  const parseCSVaMovimientos = (text: string): MovimientoBancarioDTO[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Saltar encabezado si la primera línea contiene encabezados conocidos
    const firstLower = lines[0]?.toLowerCase() || '';
    const startIdx = (firstLower.includes('fecha') || firstLower.includes('fec') || firstLower.includes('numref')) ? 1 : 0;
    return lines.slice(startIdx).map((line, idx) => {
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      return {
        orden: idx + 1,
        ctaBanc: '',
        fecha: parts[0] || '',
        numRef: parts[1] || '',
        monto: parseFloat(parts[2]?.replace(/[^0-9.\-]/g, '')) || 0,
        debCred: (parts[3] || 'D').toUpperCase() === 'C' ? 'C' : 'D',
        concepto: parts[4] || '',
        cotejado: false,
        referencia: '',
      };
    });
  };

  // ===== Importar archivo (parseo local, envio JSON al backend) =====
  const handleImportarArchivo = async (file: File) => {
    setArchivoImportado(file);
    setImportando(true);
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(file);
      });

      const movsLocal = parseCSVaMovimientos(text);

      if (mode === 'editar' && id) {
        // En edición: enviar movimientos al backend vía POST JSON
        const movsDesdeApi = await conciliacionBancariaApi.importarMovimientos(
          sucursalActiva,
          parseInt(id),
          movsLocal.map((m) => ({
            fecha: m.fecha,
            numRef: m.numRef,
            monto: m.monto,
            debCred: m.debCred,
            concepto: m.concepto,
          }))
        );
        setMovimientos(movsDesdeApi);
      } else {
        // En creación: mantener movimientos en estado local
        setMovimientos(movsLocal);
      }
      message.success(`${movsLocal.length} movimientos importados`);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al importar archivo');
      message.error(msg);
    } finally {
      setImportando(false);
    }
  };

  const handleEliminarMovimiento = (orden: number) => {
    setMovimientos((prev) => prev.filter((m) => m.orden !== orden));
  };

  // ===== Columnas =====
  const movimientoColumns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => f || '-',
    },
    {
      title: 'Referencia',
      dataIndex: 'numRef',
      key: 'numRef',
      width: 120,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      ellipsis: true,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 130,
      align: 'right' as const,
      render: (val: number) => <Text strong>{formatCurrency(val)}</Text>,
    },
    {
      title: 'D/C',
      dataIndex: 'debCred',
      key: 'debCred',
      width: 80,
      render: (val: string) => (val === 'D' ? 'Débito' : 'Crédito'),
    },
    {
      title: 'Cotejado',
      dataIndex: 'cotejado',
      key: 'cotejado',
      width: 90,
      render: (cotejado: boolean) => (
        cotejado
          ? <CheckCircleFilled style={{ color: '#34c38f', fontSize: 16 }} />
          : <CloseCircleFilled style={{ color: '#d9d9d9', fontSize: 16 }} />
      ),
    },
    {
      title: 'Acción',
      key: 'accion',
      width: 60,
      render: (_: any, record: MovimientoBancarioDTO) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarMovimiento(record.orden)}
        />
      ),
    },
  ];

  // ===== Loading =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando conciliación...</div>
      </div>
    );
  }

  // Calcular diferencia
  const balBancos = Form.useWatch('balBancos', form) || 0;
  const balLibros = Form.useWatch('balLibros', form) || 0;
  const diferencia = Number(balBancos) - Number(balLibros);

  return (
    <div>
      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button size="small" onClick={() => window.location.reload()}>Reintentar</Button>}
        />
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div style={{ flex: 1 }} />
        <Space wrap>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
          {mode === 'crear' && (
            <Button icon={<SaveOutlined />} loading={saving} onClick={handleGuardarYAplicar}>
              Guardar y Aplicar
            </Button>
          )}
          <Button icon={<CloseOutlined />} onClick={handleCancelar}>
            Cancelar
          </Button>
        </Space>
      </div>

      {/* Formulario */}
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
                <Row gutter={[16, 24]}>
                  {/* Primera columna */}
                  <Col xs={24} sm={12} lg={9}>
                    {/* Cuenta bancaria */}
                    <Form.Item
                      name="numeroCta"
                      label="Cuenta Bancaria"
                      rules={[{ required: true, message: 'Seleccione una cuenta bancaria' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Seleccionar cuenta"
                        optionFilterProp="children"
                        disabled={mode === 'editar'}
                      >
                        {cuentasBancarias.map((cta) => (
                          <Select.Option key={cta.numeroCta} value={cta.numeroCta}>
                            {cta.numeroCta} - {cta.nombre}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={9}>
                    <Form.Item
                      name="fecha"
                      label="Fecha"
                      rules={[{ required: true, message: 'Seleccione la fecha' }]}
                    >
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Form.Item name="fechaAnt" label="Fecha Período Anterior">
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </Form.Item>
                  </Col>

                  {/* Segunda fila */}
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="balBancos"
                      label="Balance según Banco"
                      rules={[{ required: true, message: 'Ingrese el balance' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="balLibros"
                      label="Balance según Libros"
                      rules={[{ required: true, message: 'Ingrese el balance' }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <div style={{ padding: '4px 0' }}>
                      <div className="paces-text-secondary" style={{ fontSize: 13, marginBottom: 4 }}>Diferencia</div>
                      <Text strong style={{ fontSize: 16, color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                        {formatCurrency(diferencia)}
                      </Text>
                    </div>
                  </Col>

                  {/* Nota */}
                  <Col xs={24}>
                    <Form.Item name="notas" label="Notas">
                      <TextArea rows={3} />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* Importación de archivo */}
            <Card className="paces-card" size="small" title="Importar Estado de Cuenta" style={{ marginBottom: 16 }}>
              <Upload
                accept=".csv,.txt"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleImportarArchivo(file);
                  return false;
                }}
                disabled={importando}
              >
                <Button icon={<UploadOutlined />} loading={importando}>
                  {archivoImportado ? 'Reemplazar archivo...' : 'Seleccionar archivo .csv o .txt'}
                </Button>
              </Upload>
              {archivoImportado && (
                <Text className="paces-text-secondary" style={{ marginLeft: 12 }}>
                  {archivoImportado.name}
                </Text>
              )}
            </Card>
          </Col>

          <Col xxl={6}>
            {/* Sidebar: Totales */}
            <Card className="paces-card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Bancos</span>
                  <span>{formatCurrency(Number(balBancos))}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span className="paces-text-secondary">Balance Libros</span>
                  <span>{formatCurrency(Number(balLibros))}</span>
                </div>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                    {formatCurrency(diferencia)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Resumen */}
            <Card className="paces-card" style={{ marginTop: 16 }} title={<span style={{ fontSize: 14, fontWeight: 600 }}>Movimientos</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Total</span>
                  <span>{movimientos.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="paces-text-secondary">Cotejados</span>
                  <span>{movimientos.filter((m) => m.cotejado).length}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* Mobile */
        <div>
          <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                <Col xs={24}>
                  <Form.Item
                    name="numeroCta"
                    label="Cuenta Bancaria"
                    rules={[{ required: true, message: 'Seleccione una cuenta bancaria' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Seleccionar cuenta"
                      optionFilterProp="children"
                      disabled={mode === 'editar'}
                    >
                      {cuentasBancarias.map((cta) => (
                        <Select.Option key={cta.numeroCta} value={cta.numeroCta}>
                          {cta.numeroCta} - {cta.nombre}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="fecha"
                    label="Fecha"
                    rules={[{ required: true, message: 'Seleccione la fecha' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="fechaAnt" label="Fecha Período Anterior">
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="balBancos"
                    label="Balance según Banco"
                    rules={[{ required: true, message: 'Ingrese el balance' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="balLibros"
                    label="Balance según Libros"
                    rules={[{ required: true, message: 'Ingrese el balance' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} precision={2} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="notas" label="Notas">
                    <TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Diferencia card */}
          <Card className="paces-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 16, fontWeight: 700 }}>
              <span>Diferencia</span>
              <span style={{ color: diferencia !== 0 ? '#ff4d4f' : 'var(--paces-primary)' }}>
                {formatCurrency(diferencia)}
              </span>
            </div>
          </Card>

          {/* Importación */}
          <Card className="paces-card" size="small" title="Importar Estado de Cuenta" style={{ marginBottom: 16 }}>
            <Upload
              accept=".csv,.txt"
              showUploadList={false}
              beforeUpload={(file) => {
                handleImportarArchivo(file);
                return false;
              }}
              disabled={importando}
            >
              <Button icon={<UploadOutlined />} loading={importando}>
                {archivoImportado ? 'Reemplazar archivo...' : 'Seleccionar archivo .csv o .txt'}
              </Button>
            </Upload>
            {archivoImportado && (
              <Text className="paces-text-secondary" style={{ marginLeft: 12 }}>
                {archivoImportado.name}
              </Text>
            )}
          </Card>
        </div>
      )}

      {/* Tabla de movimientos importados */}
      {movimientos.length > 0 && (
        <Card className="paces-card" size="small" title={`Movimientos Importados (${movimientos.length})`} style={{ marginTop: 16 }}>
          <Table
            dataSource={movimientos}
            columns={movimientoColumns}
            rowKey="orden"
            size="small"
            pagination={false}
            scroll={{ x: 800 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ConciliacionBancariaFormulario;
