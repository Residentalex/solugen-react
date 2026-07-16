import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Row, Col, Grid,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Tag, Alert,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionApi } from '../../api/transaccionApi';
import { conceptosApi } from '../../api/conceptosApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { TransaccionDTO, TransaccionAsientoDTO } from '../../types/transaccion';
import type { ConceptoDTO, EntidadDTO } from '../../types/entradaAlmacen';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { toTitleCase, formatNumber, extraerMensajeError, toISOFormat } from '../../utils/formats';
import { toPeriodoNum } from '../../utils/estadoDocumento';
import { esDebito, esCredito } from '../../utils/contabilidad';
import FormularioToolbar, { EstadoTag } from '../../components/FormularioToolbar';
import LoadingSpinner from '../../components/LoadingSpinner';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import FloatingField from '../../components/FloatingLabel/FloatingField';
import '../../components/FloatingLabel/FloatingField.css';

const { TextArea } = Input;

// ===== Helper: asiento vacío =====
function asientoVacio(): TransaccionAsientoDTO {
  return {
    id: 0,
    noCuenta: '',
    monto: 0,
    tipoAsiento: 0,
    descripcion: '',
  };
}

// ===== Componente principal =====
const AsientoContableFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FAsientoContable');

  // ===== States =====
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TransaccionDTO | null>(null);
  const [asientos, setAsientos] = useState<TransaccionAsientoDTO[]>([]);
  const [entidadesCache, setEntidadesCache] = useState<EntidadDTO[]>([]);
  const [cuentasCache, setCuentasCache] = useState<CuentaContableResumenDTO[]>([]);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [selectedEntidad, setSelectedEntidad] = useState<EntidadDTO | null>(null);

  // Campos rápidos (NCF, Referencia)
  const [editingField, setEditingField] = useState<string | null>(null);
  const editingOriginalValue = useRef<string | number>('');
  const editingValueRef = useRef<string | number>('');
  const fieldCloseHandledRef = useRef(false);

  const [form] = Form.useForm();
  const ncfValue = Form.useWatch('ncf', form) || '';
  const refValue = Form.useWatch('referencia', form) || '';

  // ===== Totales derivados =====
  const totalDebitos = useMemo(
    () => asientos.reduce((s, a) => s + (esDebito(a.tipoAsiento) ? (a.monto || 0) : 0), 0),
    [asientos]
  );
  const totalCreditos = useMemo(
    () => asientos.reduce((s, a) => s + (esCredito(a.tipoAsiento) ? (a.monto || 0) : 0), 0),
    [asientos]
  );
  const diferencia = Math.abs(totalDebitos - totalCreditos);
  const esCuadrado = diferencia < 0.01;

  // ===== Carga inicial =====
  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nuevo Asiento Contable' : '';
    setPageTitleOverride(pageTitle);

    // Cargar cuentas contables auxiliares
    cuentaContableApi.obtenerAuxiliares(sucursalActiva)
      .then(setCuentasCache)
      .catch((err: any) => {
        console.warn('Error al cargar cuentas contables', err);
      });

    // Inicializar fecha en modo crear
    if (mode === 'crear') {
      form.setFieldsValue({ fechaDocumento: dayjs() });
    }

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva, form, screenCode]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      message.error('ID de transacción inválido');
      return;
    }

    setLoading(true);
    transaccionApi.obtenerPorId(sucursalActiva, idNum)
      .then((res) => {
        if (!res) {
          message.error('Documento no encontrado');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(`Editar - ${res.noDocumento || `Transacción #${res.id}`}`);
        setAsientos((res.asientos || []).map((a: TransaccionAsientoDTO) => ({
          ...a,
          noCuenta: a.cuentaContable?.noCuenta || a.noCuenta || '',
          cuentaContable: a.cuentaContable || { noCuenta: a.noCuenta || '', nombre: '' },
        })));
        setSelectedConcepto(res.concepto ? { codigo: res.concepto.codigo || '', nombre: res.concepto.nombre || '' } : null);
        setConceptoSearchText(res.concepto?.codigo ? `${res.concepto.codigo} - ${toTitleCase(res.concepto.nombre || '')}` : '');

        const entidad: EntidadDTO | null = res.entidad
          ? { codigo: res.entidad.codigo || res.codigoEntidad || '', nombre: res.entidad.nombre || res.nombreEntidad || '', identificacion: '' }
          : null;
        setSelectedEntidad(entidad);

        // Poblar formulario
        const fechaDoc = res.fechaDocumento ? dayjs(res.fechaDocumento) : null;
        form.setFieldsValue({
          fechaDocumento: fechaDoc,
          conceptoNombre: res.concepto?.nombre || '',
          concepto: res.concepto?.codigo || '',
          entidad: entidad?.codigo || '',
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          nota: res.nota || '',
          tipoDocumento: res.documento?.codigo || documentCode,
          noDocumento: res.noDocumento || '',
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el asiento contable';
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FAsientoContable', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate, setPageTitleOverride, documentCode]);

  // ===== Cargar entidades al seleccionar concepto =====
  useEffect(() => {
    if (!selectedConcepto?.codigo) return;
    conceptosApi.obtenerEntidades(sucursalActiva, selectedConcepto.codigo, true)
      .then(setEntidadesCache)
      .catch((err: any) => {
        console.warn('Error al cargar entidades para concepto', err);
      });
  }, [selectedConcepto?.codigo, sucursalActiva]);

  const navigationConfirmedRef = useFormularioNavigation();

  // ===== Handlers de campos rápidos =====
  const openFieldEditor = (field: string) => {
    const val = form.getFieldValue(field);
    editingOriginalValue.current = val ?? '';
    editingValueRef.current = val ?? '';
    setEditingField(field);
    fieldCloseHandledRef.current = false;
  };

  const commitFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      const newValue = editingValueRef.current;
      form.setFieldsValue({ [field]: newValue });
    }
    setEditingField(null);
  };

  const cancelFieldEditor = () => {
    if (fieldCloseHandledRef.current) return;
    fieldCloseHandledRef.current = true;
    const field = editingField;
    if (field) {
      form.setFieldsValue({ [field]: editingOriginalValue.current });
    }
    setEditingField(null);
  };

  // ===== Handlers de navegación =====
  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        if (mode === 'crear') {
          navigationConfirmedRef.current = true;
          navigate('/FAsientoContable', { replace: true });
        } else {
          navigationConfirmedRef.current = true;
          navigate(`/FAsientoContable/${id}`, { replace: true });
        }
      },
    });
  };

  // ===== Validación =====
  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!values.fechaDocumento) return 'La fecha es requerida';
    if (!selectedConcepto) return 'El concepto es requerido';
    if (!selectedEntidad) return 'La entidad es requerida';
    if (asientos.length === 0) return 'Debe agregar al menos un asiento';
    if (!esCuadrado) return `Los asientos no cuadran. Diferencia: ${formatNumber(diferencia)}`;

    // Validar que todos los asientos tengan cuenta contable
    const sinCuenta = asientos.some((a) => !a.noCuenta);
    if (sinCuenta) return 'Todos los asientos deben tener una cuenta contable';

    // Validar que todos los asientos tengan monto > 0
    const sinMonto = asientos.some((a) => !a.monto || a.monto <= 0);
    if (sinMonto) return 'Todos los asientos deben tener un monto mayor a 0';

    return null;
  };

  // ===== Construir DTO =====
  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {};

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    return {
      id: (base as any).id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: (base as any).noDocumento || '',
      codigoEntidad: selectedEntidad?.codigo || '',
      nombreEntidad: selectedEntidad?.nombre || '',
      codigoConcepto: selectedConcepto?.codigo || '',
      ncf: values.ncf || '',
      ncfModificado: (base as any).ncfModificado || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      codigoSucursal: (base as any).codigoSucursal || '',
      debitos: totalDebitos,
      creditos: totalCreditos,
      subTotal: totalDebitos,
      descuento: 0,
      impuestos: 0,
      retenciones: 0,
      total: totalDebitos,
      tasa: 1,
      estado: (base as any).estado || 0,
      periodo: (base as any).periodo || new Date().getMonth() + 1,
      documento: (base as any).documento || { codigo: documentCode },
      concepto: selectedConcepto ? { codigo: selectedConcepto.codigo, nombre: selectedConcepto.nombre } : { codigo: '', nombre: '' },
      entidad: selectedEntidad ? { codigo: selectedEntidad.codigo, nombre: selectedEntidad.nombre } : { codigo: '', nombre: '' },
      asientos: asientos.map((a) => ({
        id: a.id || 0,
        noCuenta: a.noCuenta || '',
        monto: a.monto || 0,
        tipoAsiento: a.tipoAsiento ?? 0,
        descripcion: a.descripcion || '',
        cuentaContable: a.noCuenta ? { noCuenta: a.noCuenta, nombre: cuentasCache.find((c) => c.noCuenta === a.noCuenta)?.nombre || '' } : undefined,
      })),
      logs: (base as any).logs || [],
    };
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
        const result = await transaccionApi.crear(sucursalActiva, dto);
        message.success('Asiento contable creado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FAsientoContable/${result.id}`, { replace: true });
      } else {
        await transaccionApi.actualizar(sucursalActiva, dto);
        message.success('Asiento contable actualizado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FAsientoContable/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ===== Handlers de concepto =====
  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);
    form.setFieldsValue({ conceptoNombre: concepto.nombre, concepto: concepto.codigo });
    setEditingField(null);

    // Cargar entidades del concepto
    conceptosApi.obtenerEntidades(sucursalActiva, concepto.codigo, true)
      .then(setEntidadesCache)
      .catch((err: any) => {
        console.warn('Error al cargar entidades para concepto', err);
      });
  };

  const handleConceptoSearchClick = () => {
    setConceptoModalOpen(true);
  };

  // ===== Handlers de asientos =====
  const handleAgregarAsiento = () => {
    setAsientos((prev) => [...prev, { ...asientoVacio(), id: -(prev.length + 1) }]);
  };

  const handleEliminarAsiento = (idx: number) => {
    Modal.confirm({
      title: 'Eliminar asiento',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro de eliminar este asiento?',
      okText: 'Sí',
      cancelText: 'No',
      okButtonProps: { danger: true },
      onOk: () => {
        setAsientos((prev) => prev.filter((_, i) => i !== idx));
      },
    });
  };

  const handleAsientoChange = (idx: number, field: string, value: any) => {
    setAsientos((prev) =>
      prev.map((a, i) => (i !== idx ? a : { ...a, [field]: value }))
    );
  };

  // ===== Estado y periodo cerrado =====
  const estado = data?.estado ?? 0;
  const estadoNum = typeof estado === 'number' ? estado : 0;
  const esCerrado = toPeriodoNum(data?.periodo) === 6;

  if (loading) return <LoadingSpinner mensaje="Cargando asiento contable..." />;

  // ===== Columnas de la tabla de asientos editable =====
  const asientoColumns = [
    {
      title: '#',
      key: 'index',
      width: 44,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => (
        <span className="paces-text-secondary" style={{ fontSize: 11 }}>{idx + 1}</span>
      ),
    },
    {
      title: 'No. Cuenta',
      key: 'noCuenta',
      width: 150,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Select
            size="small"
            style={{ width: '100%' }}
            showSearch
            allowClear
            placeholder="Buscar cuenta..."
            optionFilterProp="label"
            value={fila.noCuenta || undefined}
            onChange={(val) => handleAsientoChange(idx, 'noCuenta', val || '')}
            options={cuentasCache.map((c) => ({
              value: c.noCuenta,
              label: `${c.noCuenta} - ${toTitleCase(c.nombre || '')}`,
            }))}
          />
        );
      },
    },
    {
      title: 'Nombre',
      key: 'nombre',
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        const cuenta = cuentasCache.find((c) => c.noCuenta === fila.noCuenta);
        return (
          <div style={{ fontSize: 13 }}>
            {cuenta ? toTitleCase(cuenta.nombre) : (
              <span className="paces-text-secondary">Seleccione una cuenta</span>
            )}
            {fila.descripcion && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
                {fila.descripcion}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 100,
      align: 'center' as const,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Select
            size="small"
            style={{ width: 80 }}
            value={fila.tipoAsiento ?? 0}
            onChange={(val) => handleAsientoChange(idx, 'tipoAsiento', val)}
            options={[
              { value: 0, label: 'Debe' },
              { value: 1, label: 'Haber' },
            ]}
          />
        );
      },
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 140,
      align: 'right' as const,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            styles={{ input: { textAlign: 'right' } }}
            min={0}
            step={0.01}
            precision={2}
            controls={false}
            value={fila.monto}
            onChange={(val) => handleAsientoChange(idx, 'monto', val || 0)}
          />
        );
      },
    },
    {
      title: 'Descripción',
      key: 'descripcion',
      width: 200,
      render: (_: any, __: any, idx: number) => {
        const fila = asientos[idx];
        if (!fila) return null;
        return (
          <Input
            size="small"
            style={{ width: '100%' }}
            placeholder="Descripción opcional"
            value={fila.descripcion || ''}
            onChange={(e) => handleAsientoChange(idx, 'descripcion', e.target.value)}
          />
        );
      },
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      render: (_: any, __: any, idx: number) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleEliminarAsiento(idx)}
        />
      ),
    },
  ];

  // ===== Render =====
  return (
    <div>
      <FormularioToolbar
        saving={saving}
        estado={mode === 'editar' ? estadoNum : undefined}
        periodo={data?.periodo}
        mode={mode}
        onGuardar={handleGuardar}
        onCancelar={handleCancelar}
      />

      {loadingError && (
        <Alert
          message="Error al cargar formulario de asiento contable"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); window.location.reload(); }}>
              Reintentar
            </Button>
          }
        />
      )}

      {esCerrado && mode === 'editar' && (
        <Alert
          message="Este documento pertenece a un período contable cerrado. Los cambios podrían estar restringidos."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento={documentCode}
      />

      {/* Encabezado */}
      <Card
        className="paces-card"
        size="small"
        title="Datos Generales"
        extra={mode === 'editar' ? <EstadoTag estado={estadoNum} periodo={data?.periodo} /> : undefined}
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col xs={24} xxl={18}>
            <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                {/* Fila 1: Concepto + Fecha */}
                <Col xs={24} sm={12} lg={15}>
                  <FloatingField label="Concepto" required externalValue={conceptoSearchText}>
                    <Input
                      placeholder=" "
                      value={conceptoSearchText}
                      readOnly
                      suffix={<SearchOutlined style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }} />}
                      onClick={handleConceptoSearchClick}
                    />
                  </FloatingField>
                  <Form.Item name="concepto" hidden><Input /></Form.Item>
                  <Form.Item name="conceptoNombre" hidden><Input /></Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }}>
                    <FloatingField label="Fecha" required>
                      <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 2: Entidad + Tipo Documento */}
                <Col xs={24} sm={12} lg={15}>
                  <Form.Item name="entidad" required style={{ marginBottom: 0 }}>
                    <FloatingField label="Entidad" required>
                      <Select
                        allowClear
                        showSearch
                        placeholder="Seleccionar entidad"
                        optionFilterProp="children"
                        onChange={(val) => {
                          const ent = entidadesCache.find((e) => e.codigo === val);
                          setSelectedEntidad(ent || null);
                        }}
                      >
                        {entidadesCache.map((ent) => (
                          <Select.Option key={ent.codigo} value={ent.codigo}>
                            {toTitleCase(ent.nombre)}{ent.identificacion ? ` (${ent.identificacion})` : ''}
                          </Select.Option>
                        ))}
                      </Select>
                    </FloatingField>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="tipoDocumento" style={{ marginBottom: 0 }}>
                    <FloatingField label="Tipo Documento">
                      <Input placeholder=" " value={documentCode || ''} readOnly />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 3: No Documento */}
                <Col xs={24} sm={12} lg={9}>
                  <Form.Item name="noDocumento" style={{ marginBottom: 0 }}>
                    <FloatingField label="No. Documento">
                      <Input
                        placeholder=" "
                        readOnly
                      />
                    </FloatingField>
                  </Form.Item>
                </Col>

                {/* Fila 4: Campos rápidos (NCF, Referencia) */}
                <Col xs={24}>
                  <div style={{ marginBottom: 16 }}>
                    <Space size={[8, 8]} wrap>
                      {/* NCF */}
                      {editingField === 'ncf' ? (
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          placeholder="NCF"
                          maxLength={19}
                          autoFocus
                          defaultValue={editingValueRef.current as string}
                          onChange={(e) => { editingValueRef.current = e.target.value; }}
                          onPressEnter={() => commitFieldEditor()}
                          onBlur={() => commitFieldEditor()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                          }}
                        />
                      ) : ncfValue ? (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                          NCF: {ncfValue} <EditOutlined />
                        </Tag>
                      ) : (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('ncf')}>
                          <PlusOutlined /> NCF
                        </Tag>
                      )}

                      {/* Referencia */}
                      {editingField === 'referencia' ? (
                        <Input
                          size="small"
                          style={{ width: 200 }}
                          placeholder="Referencia"
                          autoFocus
                          defaultValue={editingValueRef.current as string}
                          onChange={(e) => { editingValueRef.current = e.target.value; }}
                          onPressEnter={() => commitFieldEditor()}
                          onBlur={() => commitFieldEditor()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') { e.stopPropagation(); cancelFieldEditor(); }
                          }}
                        />
                      ) : refValue ? (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                          Ref: {refValue} <EditOutlined />
                        </Tag>
                      ) : (
                        <Tag style={{ cursor: 'pointer', fontSize: 14, padding: '6px 16px' }} onClick={() => openFieldEditor('referencia')}>
                          <PlusOutlined /> Referencia
                        </Tag>
                      )}
                    </Space>
                  </div>
                  <Form.Item name="ncf" hidden><Input /></Form.Item>
                  <Form.Item name="referencia" hidden><Input /></Form.Item>
                </Col>

                {/* Fila 5: Nota */}
                <Col xs={24}>
                  <Form.Item name="nota" style={{ marginBottom: 0 }}>
                    <FloatingField label="Nota">
                      <TextArea rows={3} />
                    </FloatingField>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Col>

          {/* Sidebar: Totales Debe/Haber */}
          <Col xs={24} xxl={6}>
            <div style={{ marginTop: 24 }}>
              <Card className="paces-card" size="small">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="paces-text-secondary">Total Débito</span>
                    <span style={{ color: '#f46a6a', fontWeight: 600 }}>{formatNumber(totalDebitos)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="paces-text-secondary">Total Crédito</span>
                    <span style={{ color: '#34c38f', fontWeight: 600 }}>{formatNumber(totalCreditos)}</span>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', margin: '12px 0 8px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Diferencia</span>
                  <span style={{ color: esCuadrado ? '#34c38f' : '#f46a6a' }}>
                    {formatNumber(diferencia)}
                    {esCuadrado ? ' ✓' : ' ✗'}
                  </span>
                </div>
                {esCuadrado && (
                  <div style={{ fontSize: 12, color: '#34c38f', marginTop: 4, textAlign: 'right' }}>
                    Asiento cuadrado
                  </div>
                )}
              </Card>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabla de Asientos */}
      <Card
        className="paces-card"
        size="small"
        title="Asientos Contables"
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 8 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAgregarAsiento}>
            Agregar asiento
          </Button>
        </div>
        <Table
          dataSource={asientos}
          columns={asientoColumns}
          rowKey={(_, idx) => `${idx}`}
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography.Text className="paces-text-secondary">
                  No hay asientos. Haga clic en "Agregar asiento" para comenzar.
                </Typography.Text>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default AsientoContableFormulario;
