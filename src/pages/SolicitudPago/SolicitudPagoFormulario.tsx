import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Spin, Button, Space, Row, Col, Grid, Divider,
  Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, App,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import { conceptosApi } from '../../api/conceptosApi';
import type { SolicitudPagoDTO, SolicitudPagoCrearDTO, SolicitudPagoActualizarDTO } from '../../types/solicitudPago';
import type { ConceptoDTO, EntidadDTO } from '../../types/entradaAlmacen';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import TotalesCard from '../../components/TotalesCard';
import FormularioToolbar from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toTitleCase, extraerMensajeError, toISOFormat, formatNumber } from '../../utils/formats';

const { TextArea } = Input;

// ===== Componente principal =====
const SolicitudPagoFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();
  const { message } = App.useApp();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const [form] = Form.useForm();
  const navigationConfirmedRef = useRef(false);

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SolicitudPagoDTO | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);

  // Concepto modal
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');

  // ===== Watchers =====
  const subTotalValue = Form.useWatch('subTotal', form) ?? 0;
  const descuentoValue = Form.useWatch('descuento', form) ?? 0;
  const impuestosValue = Form.useWatch('impuestos', form) ?? 0;
  const retencionesValue = Form.useWatch('retenciones', form) ?? 0;
  const tasaValue = Form.useWatch('tasa', form) ?? 1;

  // ===== Constantes =====
  const isLarge = screens.xxl === true;

  // Moneda dinámica desde el concepto seleccionado
  const monedaSimbolo = selectedConcepto?.moneda?.simbolo || 'RD$';
  const monedaNombre = selectedConcepto?.moneda?.nombre || 'Peso Dominicano';

  // Total auto-calculado
  const totalCalculado = Math.round(
    (subTotalValue - descuentoValue + impuestosValue - retencionesValue) * 100
  ) / 100;

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule('FSPA');
    const pageTitle = mode === 'crear'
      ? 'Nueva Solicitud de Pago'
      : 'Editar Solicitud de Pago';
    setPageTitleOverride(pageTitle);

    if (mode === 'crear') {
      form.setFieldsValue({
        fechaDocumento: dayjs(),
        tasa: 1,
        subTotal: 0,
        descuento: 0,
        impuestos: 0,
        retenciones: 0,
      });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);

  // ===== Cargar entidades según concepto =====
  const cargarEntidades = useCallback(async (conceptoCodigo?: string) => {
    try {
      const res = await conceptosApi.obtenerEntidades(sucursalActiva, conceptoCodigo);
      setEntidadesCache(res || []);
    } catch {
      message.error('Error al cargar entidades');
    }
  }, [sucursalActiva, message]);

  // ===== Cargar datos en modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    setLoading(true);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          navigate('/FSPA');
          return;
        }

        setData(res);

        // Concepto
        const resAny = res as any;
        const conceptoRaw = resAny.concepto;
        const concepto = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as ConceptoDTO : null;
        if (concepto) {
          setSelectedConcepto(concepto);
          setConceptoSearchText(concepto.nombre || '');
          // Cargar entidades según concepto
          if (concepto.codigo) {
            cargarEntidades(concepto.codigo);
          }
        }

        // Entidad
        const entidadRaw = resAny.entidad;
        const entidad = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as EntidadDTO : null;
        if (entidad) {
          setSelectedEntidad(entidad);
        }

        // Fecha
        const fechaDoc = res.fecha ? dayjs(res.fecha) : null;

        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          concepto: concepto?.codigo || (typeof res.concepto === 'string' ? res.concepto : ''),
          entidad: entidad?.codigo || '',
          cuentaBancaria: res.cuentaBancaria || '',
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          nota: res.nota || '',
          subTotal: res.subTotal ?? 0,
          descuento: res.descuento ?? 0,
          impuestos: res.impuestos ?? 0,
          retenciones: res.retenciones ?? 0,
          tasa: res.tasa ?? 1,
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar la solicitud de pago');
        message.error(msg);
        setLoadingError(true);
        navigate('/FSPA');
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, cargarEntidades, message]);

  // ===== Bloqueo de navegación con cambios sin guardar =====
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
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
    return () => { window.history.pushState = originalPushState; };
  }, []);

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText('');
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: concepto.codigo, entidad: undefined });

    // Cargar entidades según concepto
    if (concepto.codigo) {
      cargarEntidades(concepto.codigo);
    }

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || { nombre: 'Peso Dominicano', simbolo: 'RD$', codigo: 'DOP' };
    form.setFieldsValue({
      moneda: monedaObj.nombre,
      tasa: monedaObj.codigo === 'DOP' ? 1 : 1,
    });
    setData((prev) => {
      if (!prev) return prev;
      return { ...prev, moneda: monedaObj };
    });
  };

  const handleConceptoClear = () => {
    setSelectedConcepto(null);
    setConceptoSearchText('');
    setEntidadesCache([]);
    setSelectedEntidad(null);
    form.setFieldsValue({ concepto: '', entidad: undefined });
  };

  // ===== Handlers de navegación =====
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
          navigate('/FSPA');
        } else if (id) {
          navigate(`/FSPA/${id}`);
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    if (!selectedConcepto) return 'Debe seleccionar un Concepto';
    if (!selectedEntidad) return 'Debe seleccionar una Entidad';

    const values = form.getFieldsValue();
    if (!values.cuentaBancaria) return 'Debe ingresar una Cuenta Bancaria';
    if (subTotalValue < 0) return 'SubTotal no puede ser negativo';

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): SolicitudPagoCrearDTO | SolicitudPagoActualizarDTO => {
    const values = form.getFieldsValue();

    const fechaDoc = values.fechaDocumento
      ? toISOFormat(values.fechaDocumento.toDate())
      : toISOFormat(new Date());

    const dto: SolicitudPagoCrearDTO = {
      fechaDocumento: fechaDoc,
      conceptoCodigo: selectedConcepto?.codigo || '',
      entidadId: selectedEntidad?.codigo || selectedEntidad?.identificacion || '',
      cuentaBancaria: values.cuentaBancaria || '',
      referencia: values.referencia || '',
      ncf: values.ncf || '',
      nota: values.nota || '',
      subTotal: subTotalValue,
      descuento: descuentoValue,
      impuestos: impuestosValue,
      retenciones: retencionesValue,
      total: totalCalculado,
      tasa: tasaValue,
      simboloMoneda: monedaSimbolo,
      nombreMoneda: monedaNombre,
    };

    if (mode === 'editar' && id && data) {
      return { ...dto, id: data.id || parseInt(id) };
    }

    return dto;
  };

  // ===== Guardar =====
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
        const result = await solicitudPagoApi.crear(sucursalActiva, dto as SolicitudPagoCrearDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago creada exitosamente');
        navigate(`/FSPA/${result.id}`);
      } else {
        await solicitudPagoApi.actualizar(sucursalActiva, dto as SolicitudPagoActualizarDTO);
        navigationConfirmedRef.current = true;
        message.success('Solicitud de pago actualizada exitosamente');
        navigate(`/FSPA/${id}`);
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Refresh =====
  const handleRefresh = useCallback(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoadingError(false);
    setLoading(true);
    solicitudPagoApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado.');
          setLoadingError(true);
          return;
        }
        setData(res);
        const resAny = res as any;
        const conceptoRaw = resAny.concepto;
        const conceptoH = typeof conceptoRaw === 'object' && conceptoRaw !== null ? conceptoRaw as ConceptoDTO : null;
        if (conceptoH) {
          setSelectedConcepto(conceptoH);
          setConceptoSearchText(conceptoH.nombre || '');
        }
        const entidadRaw = resAny.entidad;
        const entidadH = typeof entidadRaw === 'object' && entidadRaw !== null ? entidadRaw as EntidadDTO : null;
        if (entidadH) {
          setSelectedEntidad(entidadH);
        }
        const fechaDoc = res.fecha ? dayjs(res.fecha) : null;
        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          concepto: conceptoH?.codigo || '',
          entidad: entidadH?.codigo || '',
          cuentaBancaria: res.cuentaBancaria || '',
          referencia: res.referencia || '',
          ncf: res.ncf || '',
          nota: res.nota || '',
          subTotal: res.subTotal ?? 0,
          descuento: res.descuento ?? 0,
          impuestos: res.impuestos ?? 0,
          retenciones: res.retenciones ?? 0,
          tasa: res.tasa ?? 1,
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al recargar');
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form, mode, message]);

  // ===== Loading state =====
  if (loading) {
    return <LoadingSpinner mensaje="Cargando documento..." />;
  }

  // ===== Estado info =====
  const estado = data?.estado ?? 0;
  const periodo = data?.periodo;

  // ===== Encabezado del formulario =====
  const renderEncabezado = () => (
    <Card
      className="paces-card"
      size="small"
      title="Datos de la Solicitud de Pago"
      style={{ marginBottom: 16 }}
    >
      <Row gutter={16}>
        <Col xs={24} xxl={18}>
          <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
            <Row gutter={[16, 24]}>
              {/* Fila 1: Fecha + Concepto + Entidad */}
              <Col xs={24} sm={12} lg={6}>
                <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Fecha" required>
                    <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={9}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                  <div style={{ flex: 1 }}>
                    <FloatingField label="Concepto" required>
                      <Input
                        placeholder=" "
                        value={
                          selectedConcepto
                            ? toTitleCase(selectedConcepto.nombre)
                            : conceptoSearchText
                        }
                        readOnly
                        onClick={() => setConceptoModalOpen(true)}
                      />
                    </FloatingField>
                  </div>
                  <Button
                    icon={<SearchOutlined />}
                    onClick={() => setConceptoModalOpen(true)}
                  />
                </div>
                <Form.Item name="concepto" hidden>
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={9}>
                <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                  <FloatingField label="Entidad" required>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      notFoundContent="Seleccione un concepto primero"
                      onChange={(val) => {
                        const ent = entidadesCache.find((e: any) => e.codigo === val);
                        setSelectedEntidad(ent || null);
                      }}
                      onDropdownVisibleChange={(open) => {
                        if (open && !selectedConcepto) {
                          message.info('Seleccione un concepto primero');
                        }
                      }}
                    >
                      {entidadesCache.map((ent: any) => (
                        <Select.Option key={ent.codigo} value={ent.codigo}>
                          {toTitleCase(ent.nombre)}
                          {ent.identificacion ? ` (${ent.identificacion})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Fila 2: Cuenta Bancaria + Referencia + NCF */}
              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="cuentaBancaria" style={{ marginBottom: 0 }}>
                  <FloatingField label="Cuenta Bancaria">
                    <Input placeholder="Número de cuenta" />
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="referencia" style={{ marginBottom: 0 }}>
                  <FloatingField label="Referencia">
                    <Input placeholder="Referencia del documento" />
                  </FloatingField>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} lg={8}>
                <Form.Item name="ncf" style={{ marginBottom: 0 }}>
                  <FloatingField label="NCF">
                    <Input placeholder="NCF" maxLength={19} />
                  </FloatingField>
                </Form.Item>
              </Col>

              {/* Fila 3: Nota */}
              <Col xs={24}>
                <Form.Item name="nota" style={{ marginBottom: 0 }}>
                  <FloatingField label="Nota">
                    <TextArea rows={3} maxLength={500} showCount />
                  </FloatingField>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Col>

        <Col xs={24} xxl={6}>
          <div style={{ marginTop: 24 }}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 14, fontWeight: 600 }}>Totales</span>}
              style={{ marginBottom: 16 }}
            >
              <Form form={form} layout="vertical" size="small">
                <Form.Item name="subTotal" style={{ marginBottom: 8 }}>
                  <FloatingField label="SubTotal" required>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                    />
                  </FloatingField>
                </Form.Item>
                <Form.Item name="descuento" style={{ marginBottom: 8 }}>
                  <FloatingField label="Descuento">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                    />
                  </FloatingField>
                </Form.Item>
                <Form.Item name="impuestos" style={{ marginBottom: 8 }}>
                  <FloatingField label="Impuestos">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                    />
                  </FloatingField>
                </Form.Item>
                <Form.Item name="retenciones" style={{ marginBottom: 8 }}>
                  <FloatingField label="Retenciones">
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      step={0.01}
                      precision={2}
                    />
                  </FloatingField>
                </Form.Item>
              </Form>
              <Divider style={{ margin: '8px 0' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                <span>Total</span>
                <span style={{ color: 'var(--paces-primary)' }}>
                  {monedaSimbolo} {formatNumber(totalCalculado)}
                </span>
              </div>
            </Card>
          </div>
        </Col>
      </Row>
    </Card>
  );

  // ===== Render principal =====
  return (
    <div>
      <FormularioToolbar
        saving={saving}
        estado={estado}
        periodo={periodo}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      />

      {loadingError && (
        <Alert
          message="Error al cargar el formulario de solicitud de pago"
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

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        fetchConceptos={() =>
          conceptosApi.obtenerConceptosPorDocumento(sucursalActiva, 'SPA')
        }
      />

      {isLarge ? (
        /* === DESKTOP === */
        <Row gutter={16}>
          <Col xxl={24}>
            {renderEncabezado()}
          </Col>
        </Row>
      ) : (
        /* === MOBILE === */
        <div>
          {renderEncabezado()}
        </div>
      )}
    </div>
  );
};

export default SolicitudPagoFormulario;
