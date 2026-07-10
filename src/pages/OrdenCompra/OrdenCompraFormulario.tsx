import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tabs, Spin, Button, Space, Row, Col, Divider,
  message, Form, Input, InputNumber, Select, DatePicker, Typography, Modal, Alert, Empty,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useCompanyStore } from '../../stores/companyStore';
import CampoTipo from '../../components/CampoTipo/CampoTipo';
import { Sucursal } from '../../types/auth';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import { conceptosApi } from '../../api/conceptosApi';
import { proveedorApi } from '../../api/proveedorApi';
import { apiClient } from '../../api/client';
import type { SuplidorDTO, ConceptoDTO } from '../../types/entradaAlmacen';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { formatCurrency } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';
import PermissionGate from '../../components/PermissionGate';
import ConceptoInfoLabel from '../../components/ConceptoInfoLabel/ConceptoInfoLabel';

const { Text } = Typography;
const { TextArea } = Input;

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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

interface DetalleOrcEditable {
  id: number;
  codigo: string;
  articulo: string;
  referencia: string;
  cantidad: number;
  costo: number;
  subTotal: number;
  descuento: number;
  porcentajeDescuento: number;
  impuestos: number;
  porcentajeImpuesto: number;
  total: number;
  cantidadBonificable: number;
  tipoArticulo: string;
  medida?: { id: number; nombre: string; factor: number };
}

function filaVacia(): DetalleOrcEditable {
  return {
    id: 0,
    codigo: '',
    articulo: '',
    referencia: '',
    cantidad: 0,
    costo: 0,
    subTotal: 0,
    descuento: 0,
    porcentajeDescuento: 0,
    impuestos: 0,
    porcentajeImpuesto: 0,
    total: 0,
    cantidadBonificable: 0,
    tipoArticulo: 'Producto',
    medida: undefined,
  };
}

function calcularFila(fila: DetalleOrcEditable): DetalleOrcEditable {
  const cantidad = fila.cantidad || 0;
  const costo = fila.costo || 0;
  const pctDesc = fila.porcentajeDescuento || 0;
  const subTotal = Math.round(cantidad * costo * 100) / 100;
  const descuento = Math.round(subTotal * (pctDesc / 100) * 100) / 100;
  const total = Math.round((subTotal - descuento) * 100) / 100;
  return { ...fila, subTotal, descuento, total };
}

const OrdenCompraFormulario: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();

  const mode: 'crear' | 'editar' = id ? 'editar' : 'crear';
  const { screenCode, documentCode } = useScreenConfig('FORC');
  const destino = Sucursal.Compra;
  const navigationConfirmedRef = useFormularioNavigation();
  const impuestosBackupRef = useRef<Map<number, { impuesto?: any; porcentajeImpuesto: number }>>(new Map());

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [detalles, setDetalles] = useState<DetalleOrcEditable[]>([]);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoDTO | null>(null);
  const [conceptoSearchText, setConceptoSearchText] = useState('');
  const [selectedSuplidor, setSelectedSuplidor] = useState<SuplidorDTO | null>(null);
  const [suplidoresCache, setSuplidoresCache] = useState<SuplidorDTO[]>([]);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [form] = Form.useForm();

  useEffect(() => {
    setActiveModule(screenCode);
    const pageTitle = mode === 'crear' ? 'Nueva Orden de Compra' : 'Editar Orden de Compra';
    setPageTitleOverride(pageTitle);
    if (mode === 'crear') {
      form.setFieldsValue({ fechaDocumento: dayjs() });
    }
    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, form]);

  useEffect(() => {
    if (mode === 'crear') return;
    if (!id) return;
    setLoading(true);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res);
        const detallesMap = (res.detalles || []).map((d: any, idx: number) => ({
          id: -(idx + 1),
          codigo: d.codigo || '',
          articulo: d.articulo || '',
          referencia: d.referencia || '',
          cantidad: d.cantidad || 0,
          costo: d.costo || 0,
          subTotal: d.subTotal || 0,
          descuento: d.descuento || 0,
          porcentajeDescuento: d.porcentajeDescuento || 0,
          impuestos: d.impuestos || 0,
          porcentajeImpuesto: d.porcentajeImpuesto || 0,
          total: d.total || 0,
          cantidadBonificable: d.cantidadBonificable || 0,
          tipoArticulo: d.tipoArticulo || 'Producto',
          medida: d.medida || undefined,
        }));
        setDetalles(detallesMap);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedSuplidor(res.suplidor || null);

        form.setFieldsValue({
          conceptoNombre: res.concepto?.nombre || '',
          suplidor: res.suplidor?.codigo || '',
          fechaDocumento: res.fechaDocumento ? dayjs(res.fechaDocumento) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          nota: res.nota || '',
          diasCredito: res.diasCredito || 0,
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar la orden';
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/FORC', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, id, sucursalActiva, form, navigate]);

  useEffect(() => {
    // Cargar suplidores para el selector
    proveedorApi.obtenerListado(sucursalActiva)
      .then(setSuplidoresCache)
      .catch(() => {});
  }, [sucursalActiva]);

  const handleCancelar = () => {
    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navigationConfirmedRef.current = true;
        if (mode === 'crear') {
          navigate('/FORC', { replace: true });
        } else if (id) {
          navigate(`/FORC/${id}`, { replace: true });
        }
      },
    });
  };

  const validarFormulario = (): string | null => {
    const values = form.getFieldsValue();
    if (!selectedConcepto) return 'El concepto es requerido';
    if (!values.suplidor) return 'El suplidor es requerido';
    if (detalles.length === 0) return 'Debe agregar al menos un detalle';
    if (!detalles.some((d) => (d.cantidad || 0) > 0)) return 'Debe tener al menos un detalle con cantidad > 0';
    return null;
  };

  const construirDTO = (): any => {
    const values = form.getFieldsValue();
    const base = data || {};

    const fechaDoc = values.fechaDocumento
      ? (typeof values.fechaDocumento === 'object' && values.fechaDocumento.toDate
        ? toISOFormat(values.fechaDocumento.toDate())
        : values.fechaDocumento)
      : toISOFormat(new Date());

    const totalSub = detalles.reduce((s, d) => s + (d.subTotal || 0), 0);
    const totalDesc = detalles.reduce((s, d) => s + (d.descuento || 0), 0);
    const total = Math.round((totalSub - totalDesc) * 100) / 100;

    return {
      id: base.id || 0,
      fechaDocumento: fechaDoc,
      noDocumento: base.noDocumento || values.noDocumento || '',
      estado: base.estado || 0,
      periodo: base.periodo || 0,
      ncf: values.ncf || '',
      referencia: values.referencia || '',
      nota: values.nota || '',
      total: total,
      subTotal: totalSub,
      descuento: totalDesc,
      impuestos: 0,
      retenciones: 0,
      diasCredito: values.diasCredito || 0,
      tasa: 1,
      concepto: selectedConcepto ? { codigo: selectedConcepto.codigo, nombre: selectedConcepto.nombre } : { codigo: '', nombre: '' },
      suplidor: selectedSuplidor ? { codigo: selectedSuplidor.codigo, nombre: selectedSuplidor.nombre, identificacion: selectedSuplidor.identificacion || '' } : { codigo: '', nombre: '', identificacion: '' },
      entidad: selectedSuplidor ? { codigo: selectedSuplidor.codigo, nombre: selectedSuplidor.nombre, identificacion: selectedSuplidor.identificacion || '' } : { codigo: '', nombre: '', identificacion: '' },
      moneda: base.moneda || getMonedaSucursalActiva(),
      detalles: detalles.map(calcularFila),
      asientos: base.asientos || [],
      logs: base.logs || [],
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
        const { data: result } = await apiClient.post(`/ORC/${sucursalActiva}?destino=${destino}`, dto);
        message.success('Orden de compra creada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FORC/${result.data?.id || result.id}`, { replace: true });
      } else {
        await apiClient.put(`/ORC/${sucursalActiva}`, dto);
        message.success('Orden de compra actualizada exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/FORC/${id}`, { replace: true });
      }
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al guardar');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAgregarFila = () => {
    setDetalles((prev) => [{ ...filaVacia(), id: -(prev.length + 1) }, ...prev]);
  };

  const handleEliminarFila = (filaId: number) => {
    setDetalles((prev) => prev.filter((d) => d.id !== filaId));
  };

  const handleDetalleChange = (filaId: number, field: string, value: any) => {
    setDetalles((prev) =>
      prev.map((d) => {
        if (d.id !== filaId) return d;
        const updated = { ...d, [field]: value };
        return calcularFila(updated);
      })
    );
  };

  const totales = {
    subTotal: detalles.reduce((s, d) => s + (d.subTotal || 0), 0),
    descuento: detalles.reduce((s, d) => s + (d.descuento || 0), 0),
    total: detalles.reduce((s, d) => s + (d.total || 0), 0),
  };

  const handleConceptoSelect = (concepto: ConceptoDTO) => {
    setSelectedConcepto(concepto);
    setConceptoSearchText(`${concepto.codigo || ''} - ${toTitleCase(concepto.nombre)}`);

    // === ConfigurarMoneda ===
    const monedaObj = concepto.moneda || getMonedaSucursalActiva();
    setData((prev: any) => {
      if (!prev) return prev;
      return { ...prev, moneda: { ...monedaObj, simbolo: (monedaObj as any).simbolo || getMonedaSucursalActiva().simbolo } };
    });

    form.setFieldsValue({
      conceptoNombre: concepto.nombre,
      moneda: monedaObj.nombre,
      tasa: monedaObj.tasa ?? 1,
    });

    // === NoImpuesto: si el concepto no acepta impuestos, limpiarlos ===
    const prevNoImpuesto = selectedConcepto?.noImpuesto;
    if (concepto.noImpuesto) {
      const hayImpuestos = detalles.some((d) => (d.porcentajeImpuesto || 0) > 0);
      if (hayImpuestos) {
        const backup = new Map<number, { impuesto?: any; porcentajeImpuesto: number }>();
        detalles.forEach((d) => {
          if ((d.porcentajeImpuesto || 0) > 0) {
            backup.set(d.id, { impuesto: d.impuesto, porcentajeImpuesto: d.porcentajeImpuesto || 0 });
          }
        });
        impuestosBackupRef.current = backup;
        message.warning('El Concepto no acepta Impuestos, por lo que serán eliminados.');
        setDetalles((prev) =>
          prev.map((d) => calcularFila({ ...d, porcentajeImpuesto: 0, impuesto: undefined }))
        );
      }
    } else if (prevNoImpuesto && !concepto.noImpuesto) {
      const backup = impuestosBackupRef.current;
      if (backup.size > 0) {
        setDetalles((prev) =>
          prev.map((d) => {
            const saved = backup.get(d.id);
            if (saved) {
              return calcularFila({ ...d, impuesto: saved.impuesto, porcentajeImpuesto: saved.porcentajeImpuesto });
            }
            return d;
          })
        );
        impuestosBackupRef.current = new Map();
      }
    }
  };

  const handleRefresh = useCallback(() => {
    setLoadingError(false);
    if (!id) return;
    setLoading(true);
    ordenCompraApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((_res) => {
        const res = _res as any;
        setData(res);
        const detallesMap = (res.detalles || []).map((d: any, idx: number) => ({
          id: -(idx + 1),
          codigo: d.codigo || '',
          articulo: d.articulo || '',
          referencia: d.referencia || '',
          cantidad: d.cantidad || 0,
          costo: d.costo || 0,
          subTotal: d.subTotal || 0,
          descuento: d.descuento || 0,
          porcentajeDescuento: d.porcentajeDescuento || 0,
          impuestos: d.impuestos || 0,
          porcentajeImpuesto: d.porcentajeImpuesto || 0,
          total: d.total || 0,
          cantidadBonificable: d.cantidadBonificable || 0,
          tipoArticulo: d.tipoArticulo || 'Producto',
          medida: d.medida || undefined,
        }));
        setDetalles(detallesMap);
        setSelectedConcepto(res.concepto || null);
        setConceptoSearchText(`${res.concepto?.codigo || ''} - ${toTitleCase(res.concepto?.nombre || '')}`);
        setSelectedSuplidor(res.suplidor || null);

        form.setFieldsValue({
          conceptoNombre: res.concepto?.nombre || '',
          suplidor: res.suplidor?.codigo || '',
          fechaDocumento: res.fechaDocumento ? dayjs(res.fechaDocumento) : null,
          ncf: res.ncf || '',
          referencia: res.referencia || '',
          nota: res.nota || '',
          diasCredito: res.diasCredito || 0,
        });
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al recargar';
        message.error(msg);
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, form]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando orden de compra...</div>
      </div>
    );
  }

  const detalleColumns = [
    {
      title: 'Artículo',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      onCell: () => ({ style: { verticalAlign: 'top', paddingLeft: 8 } }),
      render: (_: any, __: any, idx: number) => (
        <div style={{ fontSize: 13 }}>
          <Input size="small" placeholder="Artículo" value={detalles[idx]?.articulo || ''}
            onChange={(e) => handleDetalleChange(detalles[idx].id, 'articulo', e.target.value)} />
          <div className="paces-text-secondary" style={{ fontSize: 11, marginTop: 2 }}>
            <Input size="small" placeholder="Código" value={detalles[idx]?.codigo || ''}
              onChange={(e) => handleDetalleChange(detalles[idx].id, 'codigo', e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: 'Cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, __: any, idx: number) => (
        <InputNumber size="small" style={{ width: '100%' }} styles={{ input: { textAlign: 'right' } }} min={0} step={0.01} precision={2} controls={false}
          value={detalles[idx]?.cantidad}
          onChange={(val) => handleDetalleChange(detalles[idx].id, 'cantidad', val || 0)} />
      ),
    },
    {
      title: 'Costo',
      key: 'costo',
      width: 130,
      align: 'right' as const,
      responsive: ['sm' as const, 'md' as const, 'lg' as const],
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, __: any, idx: number) => {
        const costoBase = Number(detalles[idx]?.costo) || 0;
        const pctDesc = Number(detalles[idx]?.porcentajeDescuento) || 0;
        const factor = Number(detalles[idx]?.medida?.factor) || 1;
        const costoConDescuento = costoBase - ((costoBase * pctDesc) / 100);
        const costoUnitario = costoConDescuento / factor;
        return (
          <div>
            <InputNumber size="small" style={{ width: '100%' }} styles={{ input: { textAlign: 'right' } }} min={0} step={0.01} precision={2} controls={false}
              value={detalles[idx]?.costo}
              onChange={(val) => handleDetalleChange(detalles[idx].id, 'costo', val || 0)} />
            <div style={{ fontSize: 11, lineHeight: 1.5, color: '#999' }}>
              {formatNumber(costoUnitario)} × {factor}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descuento %',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, __: any, idx: number) => (
        <InputNumber size="small" style={{ width: '100%' }} min={0} max={100} step={0.01} precision={2}
          value={detalles[idx]?.porcentajeDescuento}
          onChange={(val) => handleDetalleChange(detalles[idx].id, 'porcentajeDescuento', val || 0)}
          addonAfter="%" />
      ),
    },
    {
      title: 'SubTotal',
      key: 'subTotal',
      width: 120,
      align: 'right' as const,
      responsive: ['md' as const, 'lg' as const],
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleOrcEditable) => <Text>{formatNumber(record.subTotal || 0)}</Text>,
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right' as const,
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_: any, record: DetalleOrcEditable) => <Text strong>{formatNumber(record.total || 0)}</Text>,
    },
    {
      title: '',
      key: 'acciones',
      width: 50,
      onCell: () => ({ style: { paddingRight: 8 } }),
      render: (_: any, __: any, idx: number) => (
        <Button type="text" size="small" danger icon={<DeleteOutlined />}
          onClick={() => handleEliminarFila(detalles[idx].id)} />
      ),
    },
  ];

  const renderToolbar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
      <SucursalDocumentoSelector value={sucursalDestino} onChange={setSucursalDestino} />
      <div style={{ flex: 1 }} />
      <Space wrap>
        <PermissionGate accion={mode === 'editar' ? 'EDITAR' : 'CREAR'}>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleGuardar}>
            Guardar
          </Button>
        </PermissionGate>
        <Button icon={<CloseOutlined />} onClick={handleCancelar}>
          Cancelar
        </Button>
      </Space>
    </div>
  );

  return (
    <div>
      {renderToolbar()}

      {loadingError && (
        <Alert
          message="Error al cargar formulario de orden de compra"
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

      <Row gutter={16}>
        <Col xxl={24} xs={24}>
          <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" size="small" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="tipo" style={{ marginBottom: 0 }}>
                    <CampoTipo tipoDocumento="ORC" sucursal={sucursalActiva} disabled />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <div>
                    <Form.Item name="conceptoNombre" style={{ marginBottom: 0 }}>
                      <Input placeholder=" " value={conceptoSearchText} readOnly suffix={<SearchOutlined />} onClick={() => setConceptoModalOpen(true)} />
                    </Form.Item>
                    <div className="paces-text-secondary" style={{ fontSize: 11, marginTop: 2 }}>Concepto</div>
                  </div>
                  <Form.Item name="concepto" hidden><Input /></Form.Item>
                  <ConceptoInfoLabel concepto={selectedConcepto} />
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Form.Item name="fechaDocumento" required style={{ marginBottom: 0 }} label="Fecha Documento">
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      disabledDate={(current) => {
                        if (!current) return false;
                        if (data?.documento?.fechaPermitida === 'MenorIgualFechaDia') {
                          if (current.isAfter(dayjs(), 'day')) return true;
                        }
                        const cierre = fechasCierre?.[sucursalActiva];
                        if (cierre && current.isBefore(dayjs(cierre).startOf('day'), 'day')) return true;
                        const cierreInv = fechasCierreInv?.[sucursalActiva];
                        if (cierreInv && current.isBefore(dayjs(cierreInv).startOf('day'), 'day')) return true;
                        return false;
                      }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Form.Item name="suplidor" required style={{ marginBottom: 0 }} label="Suplidor">
                    <Select
                      allowClear showSearch optionFilterProp="children"
                      onChange={(val) => {
                        const ent = suplidoresCache.find((e) => e.codigo === val);
                        setSelectedSuplidor(ent || null);
                      }}
                    >
                      {suplidoresCache.map((s) => (
                        <Select.Option key={s.codigo} value={s.codigo}>
                          {toTitleCase(s.nombre)} ({s.codigo})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Form.Item name="ncf" style={{ marginBottom: 0 }} label="NCF">
                    <Input placeholder="NCF" maxLength={20} />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Form.Item name="referencia" style={{ marginBottom: 0 }} label="Referencia">
                    <Input placeholder="Referencia" maxLength={50} />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Form.Item name="diasCredito" style={{ marginBottom: 0 }} label="Días Crédito">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="nota" style={{ marginBottom: 0 }} label="Nota">
                    <TextArea rows={2} placeholder="Nota..." />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Tabs defaultActiveKey="detalles" type="card"
            items={[{
              key: 'detalles',
              label: `Detalles (${detalles.length})`,
              children: (
                <>
                  <Button type="dashed" icon={<PlusOutlined />} onClick={handleAgregarFila} style={{ marginBottom: 8, width: '100%' }}>
                    Agregar Fila
                  </Button>
                  <Table dataSource={detalles} columns={detalleColumns} rowKey="id" size="small" pagination={false} scroll={{ x: 1000 }}
                    locale={{
                      emptyText: (
                        <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Empty description="Sin registros" />
                        </div>
                      ),
                    }}
                  />
                </>
              ),
            }]}
          />
        </Col>
      </Row>

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={handleConceptoSelect}
        sucursal={sucursalActiva}
        documento={documentCode}
      />
    </div>
  );
};

export default OrdenCompraFormulario;
