import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Button, Space, Row, Col, Grid,
  message, Form, Input, Select, Switch, Typography, Modal, Alert, Spin,
  Table, Empty,
} from 'antd';
import {
  SearchOutlined, SaveOutlined, CloseOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conceptosApi } from '../../api/conceptosApi';
import { documentosApi } from '../../api/documentosApi';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { entidadApi } from '../../api/entidadApi';
import { tipoApi } from '../../api/tipoApi';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import { toTitleCase, extraerMensajeError } from '../../utils/formats';
import PermissionGate from '../../components/PermissionGate';
import type { ConceptoDTO, CompaniaDTO, AlmacenDTO, TipoEntidadDTO } from '../../types/entradaAlmacen';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';
import type { DocumentoDTO } from '../../types/documento';
import type { TipoDocumentoDTO } from '../../types/transaccion';

const { Text } = Typography;

// ===== Modal inline para buscar cuenta contable =====
interface BuscarCuentaInlineModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cta: CuentaContableResumenDTO) => void;
  buscarCuentas: (filtro: string) => Promise<CuentaContableResumenDTO[]>;
}

const BuscarCuentaInlineModal: React.FC<BuscarCuentaInlineModalProps> = ({ open, onClose, onSelect, buscarCuentas }) => {
  const [filtered, setFiltered] = useState<CuentaContableResumenDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const handleSearch = async (val: string) => {
    const trimmed = (val || '').trim();
    setSearchText(trimmed);
    if (!trimmed) {
      setFiltered([]);
      return;
    }
    setLoading(true);
    try {
      const result = await buscarCuentas(trimmed);
      setFiltered(result);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al buscar cuentas contables');
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) {
      setSearchText('');
      setFiltered([]);
    }
  };

  const columnas = [
    { title: 'No. Cuenta', dataIndex: 'noCuenta', key: 'noCuenta', width: 140 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true },
  ];

  return (
    <Modal title="Buscar Cuenta Contable" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Input.Search
        placeholder="Buscar por número o nombre..."
        allowClear
        onSearch={handleSearch}
        onChange={handleChange}
        style={{ marginBottom: 16 }}
      />
      <Spin spinning={loading}>
        <Table
          dataSource={filtered}
          columns={columnas}
          rowKey="noCuenta"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => { onSelect(record); },
            style: { cursor: 'pointer' },
          })}
          locale={{
            emptyText: !searchText
              ? <Empty description="Escriba para buscar cuentas" />
              : <Empty description="Sin resultados" />,
          }}
        />
      </Spin>
    </Modal>
  );
};

// ===== Modal inline para buscar documentos (catálogo) =====
interface BuscarDocumentoInlineModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentoDTO) => void;
  documentos: DocumentoDTO[];
}

const BuscarDocumentoInlineModal: React.FC<BuscarDocumentoInlineModalProps> = ({ open, onClose, onSelect, documentos }) => {
  const [filtered, setFiltered] = useState<DocumentoDTO[]>(documentos);

  useEffect(() => { setFiltered(documentos); }, [documentos, open]);

  const handleSearch = (val: string) => {
    if (!val) { setFiltered(documentos); return; }
    const f = val.toLowerCase();
    setFiltered(documentos.filter(d => d.codigo.toLowerCase().includes(f) || (d.nombre || '').toLowerCase().includes(f)));
  };

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true, render: (v: string) => toTitleCase(v) },
  ];

  return (
    <Modal title="Buscar Documento" open={open} onCancel={onClose} footer={null} width={600} destroyOnHidden>
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={filtered}
        columns={columnas}
        rowKey="codigo"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No hay documentos" /> }}
      />
    </Modal>
  );
};

const TIPO_INGRESO_OPTIONS = [
  { value: 0, label: 'Ninguno' },
  { value: 1, label: 'Operaciones' },
  { value: 2, label: 'Financieros' },
  { value: 3, label: 'Extraordinarios' },
  { value: 4, label: 'Arrendamientos' },
  { value: 5, label: 'Venta Activo' },
  { value: 6, label: 'Otros Ingresos' },
];

const ConceptoFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const screens = Grid.useBreakpoint();

  const mode: 'crear' | 'editar' = codigo && codigo !== 'nuevo' ? 'editar' : 'crear';

  const [form] = Form.useForm();
  const navigationConfirmedRef = useFormularioNavigation();

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ConceptoDTO | null>(null);

  // Catálogos
  const [almacenes, setAlmacenes] = useState<AlmacenDTO[]>([]);
  const [sucursales, setSucursales] = useState<CompaniaDTO[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);
  const [tiposMap, setTiposMap] = useState<Record<string, string>>({});
  const [tiposDocMap, setTiposDocMap] = useState<Record<string, string>>({});
  const [tiposList, setTiposList] = useState<TipoDocumentoDTO[]>([]);

  // Modales
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [conceptoDestinoModalOpen, setConceptoDestinoModalOpen] = useState(false);
  const [conceptoReplicaModalOpen, setConceptoReplicaModalOpen] = useState(false);
  const [cuentaContableText, setCuentaContableText] = useState('');
  const [cuentaModalOpen, setCuentaModalOpen] = useState(false);

  // Entidades y Documentos del concepto
  const [entidades, setEntidades] = useState<TipoEntidadDTO[]>([]);
  const [documentosForm, setDocumentosForm] = useState<DocumentoDTO[]>([]);

  // Modal buscar entidad (inline)
  const [entidadBuscarText, setEntidadBuscarText] = useState('');
  const [entidadResultados, setEntidadResultados] = useState<any[]>([]);
  const [entidadBuscarModalOpen, setEntidadBuscarModalOpen] = useState(false);

  // Modal agregar documento al concepto
  const [agregarDocModalOpen, setAgregarDocModalOpen] = useState(false);

  // Textos de display
  const [docAGenerarText, setDocAGenerarText] = useState('');
  const [conceptoDestinoText, setConceptoDestinoText] = useState('');
  const [conceptoReplicaText, setConceptoReplicaText] = useState('');

  const isLarge = screens.xxl === true;

  // Watchers reactivos
  const replicarValue = Form.useWatch('replicar', form);
  const sucDestValue = Form.useWatch('sucDest', form);
  const docAGenerarValue = Form.useWatch('docAGenerar', form);
  const noImpuestoValue = Form.useWatch('noImpuesto', form);
  const noActualizaCostosValue = Form.useWatch('noActualizaCostos', form);
  const noAsientosValue = Form.useWatch('noAsientos', form);
  const activoValue = Form.useWatch('activo', form);

  // ===== Cargar catálogos al montar =====
  useEffect(() => {
    setActiveModule('MConcepto');
    const pageTitle = mode === 'crear' ? 'Nuevo Concepto' : '';
    setPageTitleOverride(pageTitle);

    conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenes).catch((err) => console.warn('Error al cargar almacenes cache', err));
    conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursales).catch((err) => console.warn('Error al cargar sucursales cache', err));
    documentosApi.obtenerListado(sucursalActiva).then(setDocumentos).catch((err) => console.warn('Error al cargar documentos cache', err));
    tipoApi.obtenerTodo(sucursalActiva).then((tipos) => {
      const map: Record<string, string> = {};
      const docMap: Record<string, string> = {};
      tipos.forEach((t: TipoDocumentoDTO) => {
        map[t.codigo] = t.nombre;
        if (t.documento) docMap[`${t.documento}-${t.codigo}`] = t.nombre;
      });
      setTiposMap(map);
      setTiposDocMap(docMap);
      setTiposList(tipos);
    }).catch((err) => console.warn('Error al cargar tipos cache', err));

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, mode, sucursalActiva]);

  // ===== Cargar datos si es modo editar =====
  useEffect(() => {
    if (mode === 'crear') return;
    if (!codigo || codigo === 'nuevo') return;

    setLoading(true);
    conceptosApi.obtenerConcepto(sucursalActiva, codigo)
      .then((res) => {
        setData(res);
        setPageTitleOverride(`Editar - ${res.codigo}`);
        setEntidades(res.entidades || []);
        const docsRaw = res.documentos || [];
        const docsGrouped: DocumentoDTO[] = [];
        docsRaw.forEach((d: any) => {
          const existing = docsGrouped.find(x => x.codigo === d.codigo);
          if (existing) {
            const tiposArr = Array.isArray(existing.tipo) ? existing.tipo : (existing.tipo ? [existing.tipo] : []);
            if (d.tipo && !tiposArr.includes(d.tipo)) {
              tiposArr.push(d.tipo);
            }
            existing.tipo = tiposArr;
          } else {
            docsGrouped.push({ ...d, tipo: d.tipo ? [d.tipo] : [] });
          }
        });
        setDocumentosForm(docsGrouped);

        // Poblar display texts
        const docGenEncontrado = documentos.find(d => d.codigo === res.docAGenerar);
        setDocAGenerarText(docGenEncontrado
          ? `${docGenEncontrado.codigo} - ${toTitleCase(docGenEncontrado.nombre || '')}`
          : (res.docAGenerar || ''));

        if (res.sucursalDestino?.codigo && res.conceptoDestino) {
          const encontrada = res.sucursalDestino;
          const sucDestSucursal = (encontrada as any)?.sucursal ?? (encontrada as any)?.id ?? sucursalActiva;
          conceptosApi.obtenerConcepto(sucDestSucursal, res.conceptoDestino)
            .then(cd => {
              setConceptoDestinoText(`${cd.codigo}-${toTitleCase(cd.nombre || '')}`);
            })
            .catch(() => {
              setConceptoDestinoText(res.conceptoDestino || '');
            });
        }

        if (res.sucursalReplica?.codigo && res.conceptoReplica) {
          const encontrada = res.sucursalReplica;
          const sucReplicaSucursal = (encontrada as any)?.sucursal ?? (encontrada as any)?.id ?? sucursalActiva;
          conceptosApi.obtenerConcepto(sucReplicaSucursal, res.conceptoReplica)
            .then(cr => {
              setConceptoReplicaText(`${cr.codigo}-${toTitleCase(cr.nombre || '')}`);
            })
            .catch(() => {
              setConceptoReplicaText(res.conceptoReplica || '');
            });
        }

        // Poblar formulario
        if (res.cuentaContable) {
          setCuentaContableText(`${res.cuentaContable.noCuenta} - ${res.cuentaContable.nombre}`);
        }
        form.setFieldsValue({
          codigo: res.codigo,
          nombre: res.nombre,
          activo: res.activo ?? true,
          docAGenerar: res.docAGenerar,
          noImpuesto: res.noImpuesto ?? false,
          noAsientos: res.noAsientos ?? false,
          noActualizaCostos: res.noActualizaCostos ?? false,
          replicar: res.replicar ?? false,
          sucursalReplica: res.sucursalReplica?.codigo,
          tipoIngreso: res.tipoIngreso,
          codAlm: res.almacen?.codigo,
          sucDest: res.sucursalDestino?.codigo,
          conceptoDestino: res.conceptoDestino,
          conceptoReplica: res.conceptoReplica,
          cuentaContable: res.cuentaContable?.noCuenta,
        });
      })
      .catch((err: any) => {
        const msg = extraerMensajeError(err, 'Error al cargar el concepto');
        message.error(msg);
        setLoadingError(true);
        navigationConfirmedRef.current = true;
        navigate('/MConcepto', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [mode, codigo, sucursalActiva, form, navigate, documentos, setPageTitleOverride, navigationConfirmedRef]);

  // ===== Handlers =====
  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Custom validaciones de negocio
      const docAGenerarVal = values.docAGenerar;
      const sucDestVal = values.sucDest;
      const replicarVal = values.replicar;
      const sucursalReplicaVal = values.sucursalReplica;
      const conceptoReplicaVal = values.conceptoReplica;
      const conceptoDestinoVal = values.conceptoDestino;

      if (docAGenerarVal) {
        if (!sucDestVal) {
          message.error('Debe seleccionar una Sucursal Destino cuando hay un Documento a Generar');
          setSaving(false);
          return;
        }
        // Si sucDest es distinta a la sucursal actual, conceptoDestino es requerido
        const encontrada = sucursales.find(s => s.codigo === sucDestVal);
        const sucDestNum = (encontrada as any)?.sucursal ?? (encontrada as any)?.id ?? -1;
        if (sucDestNum !== sucursalActiva && !conceptoDestinoVal) {
          message.error('Debe seleccionar un Concepto Destino cuando la Sucursal Destino es diferente');
          setSaving(false);
          return;
        }
      }

      if (replicarVal) {
        if (!sucursalReplicaVal) {
          message.error('Debe seleccionar una Sucursal Réplica');
          setSaving(false);
          return;
        }
        if (!conceptoReplicaVal) {
          message.error('Debe seleccionar un Concepto Réplica');
          setSaving(false);
          return;
        }
      }

      const dto: ConceptoDTO = {
        codigo: values.codigo,
        nombre: values.nombre,
        activo: values.activo,
        docAGenerar: values.docAGenerar,
        noImpuesto: values.noImpuesto,
        noAsientos: values.noAsientos,
        noActualizaCostos: values.noActualizaCostos,
        replicar: values.replicar,
        sucursalReplica: values.sucursalReplica
          ? sucursales.find(s => s.codigo === values.sucursalReplica) as any
          : undefined,
        tipoIngreso: values.tipoIngreso,
        noCuenta: values.cuentaContable,
        almacen: values.codAlm
          ? almacenes.find(a => a.codigo === values.codAlm)
          : undefined,
        sucursalDestino: values.sucDest
          ? sucursales.find(s => s.codigo === values.sucDest) as any
          : undefined,
        conceptoDestino: values.conceptoDestino,
        conceptoReplica: values.conceptoReplica,
        entidades: entidades,
        documentos: documentosForm.flatMap(d => {
            const tipos = Array.isArray(d.tipo) && d.tipo.length > 0 ? d.tipo : [''];
            return tipos.map(t => ({ codigo: d.codigo, nombre: d.nombre, tipo: t }));
          }),
      };

      if (mode === 'crear') {
        const result = await conceptosApi.crearConcepto(sucursalActiva, dto);
        message.success('Concepto creado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/MConcepto/${result.codigo}`, { replace: true });
      } else {
        await conceptosApi.actualizarConcepto(sucursalActiva, codigo!, dto);
        message.success('Concepto actualizado exitosamente');
        navigationConfirmedRef.current = true;
        navigate(`/MConcepto/${codigo}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return; // error de validación del form
      const msg = extraerMensajeError(err, 'Error al guardar el concepto');
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    if (form.isFieldsTouched()) {
      Modal.confirm({
        title: 'Cancelar',
        icon: <ExclamationCircleOutlined />,
        content: '¿Está seguro que desea descartar los cambios realizados?',
        okText: 'Sí, descartar',
        cancelText: 'No, continuar editando',
        okButtonProps: { danger: true },
        onOk: () => {
          navigationConfirmedRef.current = true;
          if (mode === 'editar' && codigo) {
            navigate(`/MConcepto/${codigo}`, { replace: true });
          } else {
            navigate('/MConcepto', { replace: true });
          }
        },
      });
    } else {
      navigationConfirmedRef.current = true;
      if (mode === 'editar' && codigo) {
        navigate(`/MConcepto/${codigo}`, { replace: true });
      } else {
        navigate('/MConcepto', { replace: true });
      }
    }
  };

  const handleLimpiarDocAGenerar = () => {
    setDocAGenerarText('');
    form.setFieldsValue({ docAGenerar: undefined });
    // Limpiar dependientes
    handleSucDestChange(undefined);
    setConceptoDestinoText('');
    form.setFieldsValue({ conceptoDestino: undefined });
  };

  const handleDocumentoSelect = (doc: DocumentoDTO) => {
    setDocAGenerarText(`${doc.codigo} - ${toTitleCase(doc.nombre || '')}`);
    form.setFieldsValue({ docAGenerar: doc.codigo });
  };

  const handleCuentaContableSelect = (cta: CuentaContableResumenDTO) => {
    setCuentaContableText(`${cta.noCuenta} - ${cta.nombre}`);
    form.setFieldsValue({ cuentaContable: cta.noCuenta });
    setCuentaModalOpen(false);
  };

  const handleCuentaContableClear = () => {
    setCuentaContableText('');
    form.setFieldsValue({ cuentaContable: undefined });
  };

  const handleConceptoDestinoSelect = (concepto: ConceptoDTO) => {
    setConceptoDestinoText(`${concepto.codigo}-${toTitleCase(concepto.nombre)}`);
    form.setFieldsValue({ conceptoDestino: concepto.codigo });
  };

  const handleBuscarConceptoDestino = () => {
    if (!sucDestValue) {
      message.warning('Primero seleccione una Sucursal Destino');
      return;
    }
    const docAGenerar = form.getFieldValue('docAGenerar');
    if (!docAGenerar) {
      message.warning('Primero seleccione un Documento a Generar');
      return;
    }
    setConceptoDestinoModalOpen(true);
  };

  const handleConceptoReplicaSelect = (concepto: ConceptoDTO) => {
    setConceptoReplicaText(`${concepto.codigo}-${toTitleCase(concepto.nombre)}`);
    form.setFieldsValue({ conceptoReplica: concepto.codigo });
  };

  const handleBuscarConceptoReplica = () => {
    const sucReplica = form.getFieldValue('sucursalReplica');
    if (!sucReplica) {
      message.warning('Primero seleccione una Sucursal Réplica');
      return;
    }
    setConceptoReplicaModalOpen(true);
  };

  const handleSucursalReplicaChange = (value: string | undefined) => {
    if (!value) {
      setConceptoReplicaText('');
      form.setFieldValue('conceptoReplica', undefined);
    }
  };

  // ===== Loading state =====
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }} className="paces-text-secondary">Cargando concepto...</div>
      </div>
    );
  }

  // ===== Error state =====
  if (loadingError) {
    return (
      <div>
        <Alert
          message="Error al cargar el formulario"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Button onClick={() => navigate('/MConcepto', { replace: true })}>Volver al listado</Button>
      </div>
    );
  }

  const handleReplicarChange = (checked: boolean) => {
    if (!checked) {
      form.setFieldValue('sucursalReplica', undefined);
      setConceptoReplicaText('');
      form.setFieldValue('conceptoReplica', undefined);
    }
  };

  const handleSucDestChange = (value: string | undefined) => {
    if (!value) {
      setConceptoDestinoText('');
      form.setFieldValue('conceptoDestino', undefined);
    }
  };

  // ===== Handlers para Entidades y Documentos =====
  const handleAgregarEntidad = (ent: any) => {
    if (entidades.find(e => e.codigo === ent.codigo)) {
      message.warning('La entidad ya está agregada');
      return;
    }
    setEntidades(prev => [...prev, { codigo: ent.codigo, nombre: ent.nombre || ent.descripcion || '', tipo: '' }]);
    setEntidadBuscarModalOpen(false);
    setEntidadBuscarText('');
    setEntidadResultados([]);
  };

  const handleQuitarEntidad = (codigo: string) => {
    setEntidades(prev => prev.filter(e => e.codigo !== codigo));
  };

  const handleEntidadTipoChange = (codigo: string, tipo: string) => {
    setEntidades(prev => prev.map(e => e.codigo === codigo ? { ...e, tipo } : e));
  };

  const handleAgregarDocumentoForm = (doc: DocumentoDTO) => {
    // Permitir mismo documento con distintos tipos
    setDocumentosForm(prev => [...prev, { codigo: doc.codigo, nombre: doc.nombre || '', tipo: '' }]);
  };

  const handleQuitarDocumentoForm = (codigo: string) => {
    setDocumentosForm(prev => prev.filter(d => d.codigo !== codigo));
  };

  const handleDocumentoTipoChange = (codigo: string, tipo: string) => {
    setDocumentosForm(prev => prev.map(d => d.codigo === codigo ? { ...d, tipo } : d));
  };

  const handleBuscarEntidad = async () => {
    if (!entidadBuscarText) return;
    try {
      const resultados = await entidadApi.buscar(sucursalActiva, entidadBuscarText, 20);
      setEntidadResultados(resultados);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al buscar entidades');
    }
  };

  return (
    <div>
      {/* Toolbar inline */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div style={{ flex: 1 }} />
        <Space wrap>
          {mode === 'editar' && data && (
            <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
          )}
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

      {isLarge ? (<>
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Datos Generales */}
            <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
              <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
                <Row gutter={[16, 24]}>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="codigo"
                      label="Código"
                      rules={mode === 'crear' ? [{ required: true, message: 'El código es requerido' }] : []}
                    >
                      <Input disabled={mode === 'editar'} placeholder="Código del concepto" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={8}>
                    <Form.Item
                      name="nombre"
                      label="Nombre"
                      rules={[{ required: true, message: 'El nombre es requerido' }]}
                    >
                      <Input placeholder="Nombre del concepto" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12} lg={4}>
                    <Form.Item name="activo" valuePropName="checked" label="Activo" initialValue={true}>
                      <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* Tabs */}
            <Tabs
              type="card"
              items={[
                {
                  key: 'inventario',
                  label: 'Inventario',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Form form={form} layout="vertical" size="middle">
                        <Row gutter={[16, 24]}>
                          <Col xs={24} sm={12} lg={8}>
                            <Form.Item name="noImpuesto" valuePropName="checked" label="Sin Impuesto" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={8}>
                            <Form.Item name="noActualizaCostos" valuePropName="checked" label="No Actualiza Costos" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={8}>
                            <Form.Item name="codAlm" label="Almacén">
                              <Select
                                allowClear
                                placeholder="Seleccionar almacén..."
                                showSearch
                                optionFilterProp="label"
                                options={almacenes.map(a => ({ value: a.codigo, label: a.nombre }))}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Card: GENERAR DOCUMENTO */}
                        <Card className="paces-card" size="small" title="GENERAR DOCUMENTO" style={{ marginBottom: 16 }}>
                          <Row gutter={[16, 24]}>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item name="docAGenerar" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Documento a generar</Text>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                  <div style={{ flex: 1 }}>
                                    <Input
                                      placeholder="Buscar documento..."
                                      value={docAGenerarText}
                                      readOnly
                                      suffix={<SearchOutlined />}
                                      onClick={() => setDocModalOpen(true)}
                                    />
                                  </div>
                                  {docAGenerarText && (
                                    <Button icon={<CloseOutlined />} onClick={handleLimpiarDocAGenerar} />
                                  )}
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Genera otro documento al aplicar</Text>
                              </div>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item
                                name="sucDest"
                                label="Sucursal destino"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Obligatorio si hay documento a generar</Text>}
                              >
                                <Select
                                  allowClear
                                  placeholder="Seleccionar sucursal..."
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!docAGenerarValue}
                                  options={sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) }))}
                                  onChange={handleSucDestChange}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item name="conceptoDestino" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Concepto destino</Text>
                                <div>
                                  <Input
                                    placeholder="Buscar concepto destino..."
                                    value={conceptoDestinoText}
                                    readOnly
                                    disabled={!sucDestValue}
                                    suffix={<SearchOutlined />}
                                    onClick={() => sucDestValue && handleBuscarConceptoDestino()}
                                  />
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Obligatorio si la sucursal destino es diferente</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>

                        {/* Card: REPLICAR A OTRA SUCURSAL */}
                        <Card className="paces-card" size="small" title="REPLICAR A OTRA SUCURSAL">
                          <Row gutter={[16, 24]}>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item
                                name="replicar"
                                valuePropName="checked"
                                label="Replicar"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Replica el mismo documento a otra sucursal</Text>}
                                initialValue={false}
                              >
                                <Switch onChange={handleReplicarChange} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item
                                name="sucursalReplica"
                                label="Sucursal réplica"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Obligatorio si Replicar está activo</Text>}
                                rules={replicarValue ? [{ required: true, message: 'Debe seleccionar una sucursal réplica' }] : []}
                              >
                                <Select
                                  allowClear
                                  placeholder="Seleccionar sucursal..."
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!replicarValue}
                                  options={sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) }))}
                                  onChange={handleSucursalReplicaChange}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item name="conceptoReplica" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Concepto réplica</Text>
                                <div>
                                  <Input
                                    placeholder="Buscar concepto réplica..."
                                    value={conceptoReplicaText}
                                    readOnly
                                    disabled={!replicarValue}
                                    suffix={<SearchOutlined />}
                                    onClick={() => replicarValue && handleBuscarConceptoReplica()}
                                  />
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Concepto que usará en la sucursal réplica</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'contabilidad',
                  label: 'Contabilidad',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Form form={form} layout="vertical" size="middle">
                        <Row gutter={[16, 24]}>
                          <Col xs={24} sm={12} lg={8}>
                            <Form.Item name="noAsientos" valuePropName="checked" label="No genera asientos" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} lg={8}>
                            <Form.Item name="tipoIngreso" label="Tipo Ingreso">
                              <Select
                                allowClear
                                placeholder="Seleccionar tipo..."
                                options={TIPO_INGRESO_OPTIONS}
                              />
                            </Form.Item>
                          </Col>
                            <Col xs={24} sm={12} lg={8}>
                              <Form.Item name="cuentaContable" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Cuenta Contable</Text>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                  <div style={{ flex: 1 }}>
                                    <Input
                                      placeholder="Buscar cuenta contable..."
                                      value={cuentaContableText}
                                      readOnly
                                      suffix={<SearchOutlined />}
                                      onClick={() => setCuentaModalOpen(true)}
                                    />
                                  </div>
                                  {cuentaContableText && (
                                    <Button icon={<CloseOutlined />} onClick={handleCuentaContableClear} />
                                  )}
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Form>
                      </div>
                  ),
                },
                {
                  key: 'entidad',
                  label: 'Entidad',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Button
                        type="dashed"
                        icon={<SearchOutlined />}
                        onClick={() => setEntidadBuscarModalOpen(true)}
                        style={{ marginBottom: 16 }}
                      >
                        Agregar Entidad
                      </Button>
                      {entidades.length > 0 ? (
                        <Table
                          dataSource={entidades}
                          rowKey="codigo"
                          size="small"
                          pagination={false}
                          columns={[
                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                            { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                            {
                              title: 'Tipo',
                              dataIndex: 'tipo',
                              width: 200,
                              render: (v: string, _: any, idx: number) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Input
                                    size="small"
                                    value={v}
                                    onChange={(e) => {
                                      const newEntidades = [...entidades];
                                      newEntidades[idx] = { ...newEntidades[idx], tipo: e.target.value };
                                      setEntidades(newEntidades);
                                    }}
                                    placeholder="Tipo"
                                    style={{ width: 60 }}
                                  />
                                  {v && tiposMap[v] && (
                                    <Tag style={{ margin: 0 }}>{v} - {toTitleCase(tiposMap[v])}</Tag>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Acción',
                              width: 80,
                              render: (_: any, record: any) => (
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => handleQuitarEntidad(record.codigo)}
                                />
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Text type="secondary">No hay entidades agregadas</Text>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'documentos',
                  label: 'Documentos',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Button
                        type="dashed"
                        icon={<SearchOutlined />}
                        onClick={() => setAgregarDocModalOpen(true)}
                        style={{ marginBottom: 16 }}
                      >
                        Agregar Documento
                      </Button>
                      {documentosForm.length > 0 ? (
                        <Table
                          dataSource={documentosForm}
                          rowKey="codigo"
                          size="small"
                          pagination={false}
                          columns={[
                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                            { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                            {
                              title: 'Tipos',
                              dataIndex: 'tipo',
                              width: 300,
                              render: (v: string, record: any, idx: number) => {
                                const tiposFiltrados = tiposList.filter(t => t.documento === record?.codigo);
                                const tiposParaSelect = tiposFiltrados.length > 0 ? tiposFiltrados : tiposList;
                                const valor = v ? (Array.isArray(v) ? v : [v]) : [];
                                return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Select
                                    size="small"
                                    mode="multiple"
                                    value={valor}
                                    onChange={(val) => {
                                      const newDocs = [...documentosForm];
                                      newDocs[idx] = { ...newDocs[idx], tipo: val };
                                      setDocumentosForm(newDocs);
                                    }}
                                    placeholder="Seleccionar tipos..."
                                    style={{ width: 250 }}
                                    showSearch
                                    optionFilterProp="label"
                                    allowClear
                                    options={tiposParaSelect.map(t => ({ value: t.codigo, label: `${t.codigo} - ${t.nombre}` }))}
                                  />
                                </div>
                              );},
                            },
                            {
                              title: 'Acción',
                              width: 80,
                              render: (_: any, record: any) => (
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => handleQuitarDocumentoForm(record.codigo)}
                                />
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Text type="secondary">No hay entidades agregadas</Text>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Opciones</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Activo</Text>
                  <br />
                  <Tag color={activoValue !== false ? 'green' : 'default'}>
                    {activoValue !== false ? 'Activo' : 'Inactivo'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Sin Impuesto</Text>
                  <br />
                  <Tag color={noImpuestoValue ? 'orange' : 'default'}>
                    {noImpuestoValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No Actualiza Costos</Text>
                  <br />
                  <Tag color={noActualizaCostosValue ? 'orange' : 'default'}>
                    {noActualizaCostosValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No genera asientos</Text>
                  <br />
                  <Tag color={noAsientosValue ? 'orange' : 'default'}>
                    {noAsientosValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Replicar</Text>
                  <br />
                  <Tag color={replicarValue ? 'blue' : 'default'}>
                    {replicarValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
        </>) : (
        /* === COMPACT/MOBILE LAYOUT (< xxl) === */
        <div>
          <Card className="paces-card" size="small" title="Datos Generales" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical" size="middle" style={{ paddingTop: 24 }}>
              <Row gutter={[16, 24]}>
                <Col xs={24}>
                  <Form.Item
                    name="codigo"
                    label="Código"
                    rules={mode === 'crear' ? [{ required: true, message: 'El código es requerido' }] : []}
                  >
                    <Input disabled={mode === 'editar'} placeholder="Código del concepto" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="nombre"
                    label="Nombre"
                    rules={[{ required: true, message: 'El nombre es requerido' }]}
                  >
                    <Input placeholder="Nombre del concepto" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="activo" valuePropName="checked" label="Activo" initialValue={true}>
                    <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          <Tabs
            type="card"
            items={[
              {
                  key: 'inventario',
                  label: 'Inventario',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Form form={form} layout="vertical" size="middle">
                        <Row gutter={[16, 24]}>
                          <Col xs={24}>
                            <Form.Item name="noImpuesto" valuePropName="checked" label="Sin Impuesto" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item name="noActualizaCostos" valuePropName="checked" label="No Actualiza Costos" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item name="codAlm" label="Almacén">
                              <Select
                                allowClear
                                placeholder="Seleccionar almacén..."
                                showSearch
                                optionFilterProp="label"
                                options={almacenes.map(a => ({ value: a.codigo, label: a.nombre }))}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Card: GENERAR DOCUMENTO */}
                        <Card className="paces-card" size="small" title="GENERAR DOCUMENTO" style={{ marginBottom: 16 }}>
                          <Row gutter={[16, 24]}>
                            <Col xs={24}>
                              <Form.Item name="docAGenerar" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Documento a generar</Text>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                  <div style={{ flex: 1 }}>
                                    <Input
                                      placeholder="Buscar documento..."
                                      value={docAGenerarText}
                                      readOnly
                                      suffix={<SearchOutlined />}
                                      onClick={() => setDocModalOpen(true)}
                                    />
                                  </div>
                                  {docAGenerarText && (
                                    <Button icon={<CloseOutlined />} onClick={handleLimpiarDocAGenerar} />
                                  )}
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Genera otro documento al aplicar</Text>
                              </div>
                            </Col>
                            <Col xs={24}>
                              <Form.Item
                                name="sucDest"
                                label="Sucursal destino"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Obligatorio si hay documento a generar</Text>}
                              >
                                <Select
                                  allowClear
                                  placeholder="Seleccionar sucursal..."
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!docAGenerarValue}
                                  options={sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) }))}
                                  onChange={handleSucDestChange}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item name="conceptoDestino" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Concepto destino</Text>
                                <div>
                                  <Input
                                    placeholder="Buscar concepto destino..."
                                    value={conceptoDestinoText}
                                    readOnly
                                    disabled={!sucDestValue}
                                    suffix={<SearchOutlined />}
                                    onClick={() => sucDestValue && handleBuscarConceptoDestino()}
                                  />
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Obligatorio si la sucursal destino es diferente</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>

                        {/* Card: REPLICAR A OTRA SUCURSAL */}
                        <Card className="paces-card" size="small" title="REPLICAR A OTRA SUCURSAL">
                          <Row gutter={[16, 24]}>
                            <Col xs={24}>
                              <Form.Item
                                name="replicar"
                                valuePropName="checked"
                                label="Replicar"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Replica el mismo documento a otra sucursal</Text>}
                                initialValue={false}
                              >
                                <Switch onChange={handleReplicarChange} />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item
                                name="sucursalReplica"
                                label="Sucursal réplica"
                                extra={<Text type="secondary" style={{ fontSize: 11 }}>Obligatorio si Replicar está activo</Text>}
                                rules={replicarValue ? [{ required: true, message: 'Debe seleccionar una sucursal réplica' }] : []}
                              >
                                <Select
                                  allowClear
                                  placeholder="Seleccionar sucursal..."
                                  showSearch
                                  optionFilterProp="label"
                                  disabled={!replicarValue}
                                  options={sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) }))}
                                  onChange={handleSucursalReplicaChange}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24}>
                              <Form.Item name="conceptoReplica" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Concepto réplica</Text>
                                <div>
                                  <Input
                                    placeholder="Buscar concepto réplica..."
                                    value={conceptoReplicaText}
                                    readOnly
                                    disabled={!replicarValue}
                                    suffix={<SearchOutlined />}
                                    onClick={() => replicarValue && handleBuscarConceptoReplica()}
                                  />
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>Concepto que usará en la sucursal réplica</Text>
                              </div>
                            </Col>
                          </Row>
                        </Card>
                      </Form>
                    </div>
                  ),
                },
                {
                  key: 'contabilidad',
                  label: 'Contabilidad',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Form form={form} layout="vertical" size="middle">
                        <Row gutter={[16, 24]}>
                          <Col xs={24}>
                            <Form.Item name="noAsientos" valuePropName="checked" label="No genera asientos" initialValue={false}>
                              <Switch />
                            </Form.Item>
                          </Col>
                          <Col xs={24}>
                            <Form.Item name="tipoIngreso" label="Tipo Ingreso">
                              <Select
                                allowClear
                                placeholder="Seleccionar tipo..."
                                options={TIPO_INGRESO_OPTIONS}
                              />
                            </Form.Item>
                          </Col>
                            <Col xs={24}>
                              <Form.Item name="cuentaContable" hidden>
                                <Input />
                              </Form.Item>
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>Cuenta Contable</Text>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                  <div style={{ flex: 1 }}>
                                    <Input
                                      placeholder="Buscar cuenta contable..."
                                      value={cuentaContableText}
                                      readOnly
                                      suffix={<SearchOutlined />}
                                      onClick={() => setCuentaModalOpen(true)}
                                    />
                                  </div>
                                  {cuentaContableText && (
                                    <Button icon={<CloseOutlined />} onClick={handleCuentaContableClear} />
                                  )}
                                </div>
                              </div>
                            </Col>
                          </Row>
                        </Form>
                      </div>
                  ),
                },
                {
                  key: 'entidad',
                  label: 'Entidad',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Button
                        type="dashed"
                        icon={<SearchOutlined />}
                        onClick={() => setEntidadBuscarModalOpen(true)}
                        style={{ marginBottom: 16 }}
                      >
                        Agregar Entidad
                      </Button>
                      {entidades.length > 0 ? (
                        <Table
                          dataSource={entidades}
                          rowKey="codigo"
                          size="small"
                          pagination={false}
                          columns={[
                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                            { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                            {
                              title: 'Tipo',
                              dataIndex: 'tipo',
                              render: (v: string, _: any, idx: number) => (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  <Input
                                    size="small"
                                    value={v}
                                    onChange={(e) => {
                                      const newEntidades = [...entidades];
                                      newEntidades[idx] = { ...newEntidades[idx], tipo: e.target.value };
                                      setEntidades(newEntidades);
                                    }}
                                    placeholder="Tipo"
                                    style={{ width: 60 }}
                                  />
                                  {v && tiposMap[v] && (
                                    <Tag style={{ margin: 0 }}>{v} - {toTitleCase(tiposMap[v])}</Tag>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Acción',
                              width: 80,
                              render: (_: any, record: any) => (
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => handleQuitarEntidad(record.codigo)}
                                />
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Text type="secondary">No hay entidades agregadas</Text>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'documentos',
                  label: 'Documentos',
                  children: (
                    <div style={{ paddingTop: 16 }}>
                      <Button
                        type="dashed"
                        icon={<SearchOutlined />}
                        onClick={() => setAgregarDocModalOpen(true)}
                        style={{ marginBottom: 16 }}
                      >
                        Agregar Documento
                      </Button>
                      {documentosForm.length > 0 ? (
                        <Table
                          dataSource={documentosForm}
                          rowKey="codigo"
                          size="small"
                          pagination={false}
                          columns={[
                            { title: 'Código', dataIndex: 'codigo', width: 120 },
                            { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                            {
                              title: 'Tipo',
                              dataIndex: 'tipo',
                              render: (v: string, record: any, idx: number) => {
                                const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                                const docNombre = tiposDocMap[docKey] || tiposMap[v];
                                return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  <Input
                                    size="small"
                                    value={v}
                                    onChange={(e) => {
                                      const newDocs = [...documentosForm];
                                      newDocs[idx] = { ...newDocs[idx], tipo: e.target.value };
                                      setDocumentosForm(newDocs);
                                    }}
                                    placeholder="Tipo"
                                    style={{ width: 60 }}
                                  />
                                  {v && docNombre && (
                                    <Tag color="geekblue" style={{ margin: 0 }}>{v} - {toTitleCase(docNombre)}</Tag>
                                  )}
                                </div>
                              );},
                            },
                            {
                              title: 'Acción',
                              width: 80,
                              render: (_: any, record: any) => (
                                <Button
                                  size="small"
                                  danger
                                  icon={<CloseOutlined />}
                                  onClick={() => handleQuitarEntidad(record.codigo)}
                                />
                              ),
                            },
                          ]}
                        />
                      ) : (
                        <Text type="secondary">No hay entidades agregadas</Text>
                      )}
                    </div>
                  ),
                },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Opciones</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Activo</Text>
                  <br />
                  <Tag color={activoValue !== false ? 'green' : 'default'}>
                    {activoValue !== false ? 'Activo' : 'Inactivo'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Sin Impuesto</Text>
                  <br />
                  <Tag color={noImpuestoValue ? 'orange' : 'default'}>
                    {noImpuestoValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No Actualiza Costos</Text>
                  <br />
                  <Tag color={noActualizaCostosValue ? 'orange' : 'default'}>
                    {noActualizaCostosValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No genera asientos</Text>
                  <br />
                  <Tag color={noAsientosValue ? 'orange' : 'default'}>
                    {noAsientosValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Replicar</Text>
                  <br />
                  <Tag color={replicarValue ? 'blue' : 'default'}>
                    {replicarValue ? 'Sí' : 'No'}
                  </Tag>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Buscar Cuenta Contable */}
      <BuscarCuentaInlineModal
        open={cuentaModalOpen}
        onClose={() => setCuentaModalOpen(false)}
        onSelect={handleCuentaContableSelect}
        buscarCuentas={(filtro) => cuentaContableApi.obtenerListadoPaginado(sucursalActiva, 50, 0, filtro).then(r => r.data)}
      />

      {/* Modal Buscar Documento (doc a generar) */}
      <BuscarDocumentoInlineModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        onSelect={handleDocumentoSelect}
        documentos={documentos}
      />

      {/* Modal Agregar Documento al concepto */}
      <BuscarDocumentoInlineModal
        open={agregarDocModalOpen}
        onClose={() => setAgregarDocModalOpen(false)}
        onSelect={handleAgregarDocumentoForm}
        documentos={documentos}
      />

      {/* Modal Buscar Entidad */}
      <Modal
        title="Buscar Entidad"
        open={entidadBuscarModalOpen}
        onCancel={() => { setEntidadBuscarModalOpen(false); setEntidadBuscarText(''); setEntidadResultados([]); }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Input.Search
          placeholder="Buscar por código o nombre..."
          allowClear
          value={entidadBuscarText}
          onChange={(e) => setEntidadBuscarText(e.target.value)}
          onSearch={handleBuscarEntidad}
          style={{ marginBottom: 16 }}
        />
        {entidadResultados.length > 0 ? (
          <Table
            dataSource={entidadResultados}
            rowKey="codigo"
            size="small"
            pagination={false}
            columns={[
              { title: 'Código', dataIndex: 'codigo', width: 120 },
              { title: 'Nombre', dataIndex: 'nombre', ellipsis: true, render: (v: string) => toTitleCase(v) },
            ]}
            onRow={(record) => ({
              onClick: () => handleAgregarEntidad(record),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: <Empty description="No hay resultados" /> }}
          />
        ) : (
          entidadBuscarText && <Empty description="No se encontraron entidades" />
        )}
      </Modal>

      {/* Modal Buscar Concepto Destino */}
      <BuscarConceptoModal
        open={conceptoDestinoModalOpen}
        onClose={() => setConceptoDestinoModalOpen(false)}
        onSelect={handleConceptoDestinoSelect}
        title="Buscar Concepto Destino"
        fetchConceptos={() => {
          const encontrada = sucDestValue ? sucursales.find(s => s.codigo === sucDestValue) : undefined;
          const sucDestSucursal = (encontrada as any)?.sucursal ?? (encontrada as any)?.id ?? sucursalActiva;
          return conceptosApi.obtenerConceptos(sucDestSucursal);
        }}
      />

      {/* Modal Buscar Concepto Réplica */}
      <BuscarConceptoModal
        open={conceptoReplicaModalOpen}
        onClose={() => setConceptoReplicaModalOpen(false)}
        onSelect={handleConceptoReplicaSelect}
        title="Buscar Concepto Réplica"
        fetchConceptos={() => {
          const sucReplicaCod = form.getFieldValue('sucursalReplica');
          const encontrada = sucReplicaCod ? sucursales.find(s => s.codigo === sucReplicaCod) : undefined;
          const sucReplicaSucursal = (encontrada as any)?.sucursal ?? (encontrada as any)?.id ?? sucursalActiva;
          return conceptosApi.obtenerConceptos(sucReplicaSucursal);
        }}
      />
    </div>
  );
};

export default ConceptoFormulario;
