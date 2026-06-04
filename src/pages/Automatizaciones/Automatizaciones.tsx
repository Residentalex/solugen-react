import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Row,
  Col,
  Select,
  Input,
  Tag,
  Badge,
  Typography,
  message,
  notification,
  Modal,
  Space,
  Switch,
  Tooltip,
  Tabs,
  Form,
  InputNumber,
  Segmented,
  Alert,
  Empty,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  RiseOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { hangfireApi } from '../../api/hangfireApi';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import type { JobHangfire, JobTemplate } from '../../types/hangfire';

const { Text, Title } = Typography;

// ── Constantes ──

const MODULO_MAP: Record<string, { label: string; color: string }> = {
  Inventario: { label: 'Inventario', color: 'blue' },
  Compras: { label: 'Compras', color: 'cyan' },
  DGII: { label: 'DGII', color: 'purple' },
  Facturacion: { label: 'Facturacion', color: 'geekblue' },
  Transferencias: { label: 'Transferencias', color: 'orange' },
};

const ESTADO_BADGE: Record<string, { status: 'success' | 'error' | 'processing' | 'default'; text: string }> = {
  Exitoso: { status: 'success', text: 'Exitoso' },
  Fallido: { status: 'error', text: 'Fallido' },
  Ejecutando: { status: 'processing', text: 'Ejecutando' },
  NuncaEjecutado: { status: 'default', text: 'Nunca ejecutado' },
};

const SUCURSALES_FIJAS = ['ElOfertazo', 'HiperRomana', 'OrensePlaza', 'OrenseVillaHermosa'];

type FrecuenciaTipo = 'hours' | 'minutes' | 'custom';

interface TemplateFormState {
  sucursal: string;
  destino: string;
  frecuenciaTipo: FrecuenciaTipo;
  horas: number;
  minutos: number;
  cron: string;
}

// ── Helpers ──

function formatFecha(val: string | null): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return val;
  }
}

function formatDuracion(seg: number | null): string {
  if (seg === null || seg === undefined) return '-';
  return `${seg.toFixed(1)}s`;
}

function detectarFrecuencia(cron: string): { tipo: FrecuenciaTipo; valor: number } {
  const horasMatch = cron.match(/^0 \*\/(\d+) \* \* \*$/);
  if (horasMatch) return { tipo: 'hours', valor: parseInt(horasMatch[1], 10) };

  const minutosMatch = cron.match(/^\*\/(\d+) \* \* \* \*$/);
  if (minutosMatch) return { tipo: 'minutes', valor: parseInt(minutosMatch[1], 10) };

  return { tipo: 'custom', valor: 0 };
}

function describirCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Expresión personalizada';

  const [min, hour, dom, month, dow] = parts;

  // Cada X horas
  if (min === '0' && hour.startsWith('*/')) {
    const h = hour.replace('*/', '');
    return `Cada ${h} horas, todos los días`;
  }
  // Cada X minutos
  if (hour === '*' && min.startsWith('*/')) {
    const m = min.replace('*/', '');
    return `Cada ${m} minutos`;
  }
  // Una hora específica cada día
  if (min === '0' && hour !== '*' && !hour.includes('/') && dom === '*' && month === '*' && dow === '*') {
    return `A las ${hour.padStart(2, '0')}:00, todos los días`;
  }
  return 'Expresión personalizada';
}

function buildInitialFormState(template: JobTemplate): TemplateFormState {
  const freq = detectarFrecuencia(template.cronDefault);
  return {
    sucursal: '',
    destino: '',
    frecuenciaTipo: freq.tipo,
    horas: freq.tipo === 'hours' ? freq.valor : 1,
    minutos: freq.tipo === 'minutes' ? freq.valor : 30,
    cron: template.cronDefault,
  };
}

// ── Componente principal ──

const Automatizaciones: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);

  // ── Jobs state ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [jobs, setJobs] = useState<JobHangfire[]>([]);
  const [resumen, setResumen] = useState<{ total: number; fallidos: number; exitosos: number }>({
    total: 0,
    fallidos: 0,
    exitosos: 0,
  });
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<string | undefined>(undefined);
  const [kpiActiveCell, setKpiActiveCell] = useState<'total' | 'exitosos' | 'fallidos' | 'activos' | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; job: JobHangfire | null }>({
    visible: false,
    job: null,
  });
  const [detalleJobModal, setDetalleJobModal] = useState<{ visible: boolean; job: JobHangfire | null }>({
    visible: false,
    job: null,
  });

  // ── Templates state ──
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState | null>(null);
  const [initialFormData, setInitialFormData] = useState<TemplateFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [templateFiltroModulo, setTemplateFiltroModulo] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  // ── UI state ──
  const [activeTab, setActiveTab] = useState('jobs');

  // ── Sucursales ──
  const sucursalOptions = useMemo(() => {
    // Mapa de nombre mostrado a nombre del enum (sin espacios)
    const nombreAEnum: Record<string, string> = {
      'El Ofertazo': 'ElOfertazo',
      'Hiper Romana': 'HiperRomana',
      'Orense Plaza': 'OrensePlaza',
      'Orense Villa Hermosa': 'OrenseVillaHermosa',
    };

    if (sucursalesPermitidas.length > 0) {
      return sucursalesPermitidas.map((s) => ({
        value: nombreAEnum[s.nombre] || s.nombre.replace(/\s+/g, ''),
        label: s.nombre,
      }));
    }
    return SUCURSALES_FIJAS.map((s) => ({ value: s, label: s }));
  }, [sucursalesPermitidas]);

  // ── Computed ──
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.tipoJobId === selectedTemplateId) || null,
    [templates, selectedTemplateId],
  );

  const isFormDirty = useMemo(() => {
    if (!initialFormData || !templateForm) return false;
    return (
      templateForm.sucursal !== initialFormData.sucursal ||
      templateForm.destino !== initialFormData.destino ||
      templateForm.frecuenciaTipo !== initialFormData.frecuenciaTipo ||
      templateForm.horas !== initialFormData.horas ||
      templateForm.minutos !== initialFormData.minutos ||
      templateForm.cron !== initialFormData.cron
    );
  }, [templateForm, initialFormData]);

  const jobsActivos = useMemo(() => jobs.filter((j) => j.activo).length, [jobs]);

  // ── Cargar jobs ──
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hangfireApi.obtenerJobs();
      setJobs(data.jobs || []);
      setResumen({
        total: data.total ?? data.jobs?.length ?? 0,
        fallidos: data.fallidos ?? 0,
        exitosos: data.exitosos ?? 0,
      });
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Cargar templates ──
  const cargarTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await hangfireApi.obtenerTemplates();
      setTemplates(data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar plantillas');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // ── Inicializar ──
  useEffect(() => {
    setActiveModule('MAutomatizacion');
    updateToolbar({});
    cargarDatos();
    cargarTemplates();
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos, cargarTemplates]);

  // ── Auto-refresh (solo en tab jobs y sin modal abierto) ──
  useEffect(() => {
    if (autoRefresh && activeTab === 'jobs') {
      intervalRef.current = setInterval(() => {
        if (!errorModal.visible) {
          cargarDatos();
        }
      }, 30000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, activeTab, errorModal.visible, cargarDatos]);

  // ── Auto-seleccionar primer template al entrar al tab registrar ──
  useEffect(() => {
    if (activeTab === 'registrar' && templates.length > 0 && !selectedTemplateId) {
      handleSelectTemplate(templates[0].tipoJobId);
    }
  }, [activeTab, templates, selectedTemplateId]);

  // ── Handlers jobs ──

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const handleReRegistrarTodos = () => {
    Modal.confirm({
      title: 'Re-registrar todos los jobs',
      content:
        '¿Está seguro de re-registrar todos los jobs? Esto actualizará las definiciones para que incluyan notificaciones automáticas.',
      okText: 'Re-registrar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          const result = await hangfireApi.reRegistrarTodos();
          if (result.errores && result.errores.length > 0) {
            message.warning(
              `Procesados ${result.procesados} jobs, pero ocurrieron ${result.errores.length} errores`,
            );
          } else {
            message.success(`${result.procesados} jobs re-registrados correctamente`);
          }
          cargarDatos();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al re-registrar jobs');
        }
      },
    });
  };

  const handleTrigger = (job: JobHangfire) => {
    Modal.confirm({
      title: 'Ejecutar automatización',
      content: `¿Está seguro de ejecutar "${job.nombre}" manualmente?`,
      okText: 'Ejecutar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await hangfireApi.triggerJob(job.id);
          message.success(`Job "${job.nombre}" disparado correctamente`);
          cargarDatos();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al ejecutar job');
        }
      },
    });
  };

  const handleEliminar = (job: JobHangfire) => {
    Modal.confirm({
      title: 'Eliminar job',
      content: `¿Está seguro de eliminar "${job.nombre}"?`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await hangfireApi.eliminarJob(job.id);
          message.success(`Job "${job.nombre}" eliminado`);
          cargarDatos();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar job');
        }
      },
    });
  };

  const handleRowClick = (record: JobHangfire) => {
    if (record.ultimoEstado === 'Fallido' && record.error) {
      setErrorModal({ visible: true, job: record });
    }
  };

  const abrirDetalleJob = (job: JobHangfire) => {
    setDetalleJobModal({ visible: true, job });
  };

  // ── Handlers KPI ──

  const handleKpiClick = (cell: 'total' | 'exitosos' | 'fallidos' | 'activos') => {
    if (kpiActiveCell === cell) {
      setKpiActiveCell(null);
    } else {
      setKpiActiveCell(cell);
    }
  };

  const handleCopyError = () => {
    if (errorModal.job?.error) {
      navigator.clipboard.writeText(errorModal.job.error).then(
        () => message.success('Error copiado al portapapeles'),
        () => message.error('No se pudo copiar el error'),
      );
    }
  };

  // ── Handlers templates ──

  const handleSelectTemplate = (tipoJobId: string) => {
    if (isFormDirty) {
      Modal.confirm({
        title: 'Cambiar de plantilla',
        content: 'Se perderán los cambios no guardados. ¿Desea continuar?',
        okText: 'Descartar cambios',
        okType: 'danger',
        cancelText: 'Cancelar',
        onOk: () => {
          doSelectTemplate(tipoJobId);
        },
      });
    } else {
      doSelectTemplate(tipoJobId);
    }
  };

  const doSelectTemplate = (tipoJobId: string) => {
    const template = templates.find((t) => t.tipoJobId === tipoJobId);
    if (!template) return;
    setSelectedTemplateId(tipoJobId);
    setFormError(null);
    const initForm = buildInitialFormState(template);
    setTemplateForm(initForm);
    setInitialFormData(initForm);
  };

  const updateFormField = (field: keyof TemplateFormState, value: any) => {
    setTemplateForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleFrecuenciaChange = (tipo: FrecuenciaTipo) => {
    if (!templateForm) return;
    if (tipo === 'hours') {
      const h = templateForm.horas || 1;
      setTemplateForm({ ...templateForm, frecuenciaTipo: tipo, cron: `0 */${h} * * *` });
    } else if (tipo === 'minutes') {
      const m = templateForm.minutos || 1;
      setTemplateForm({ ...templateForm, frecuenciaTipo: tipo, cron: `*/${m} * * * *` });
    } else {
      setTemplateForm({ ...templateForm, frecuenciaTipo: tipo });
    }
  };

  const handleHorasChange = (val: number | null) => {
    if (!templateForm) return;
    const h = val || 1;
    setTemplateForm({ ...templateForm, horas: h, cron: `0 */${h} * * *` });
  };

  const handleMinutosChange = (val: number | null) => {
    if (!templateForm) return;
    const m = val || 1;
    setTemplateForm({ ...templateForm, minutos: m, cron: `*/${m} * * * *` });
  };

  const handleRegistrar = async () => {
    if (!selectedTemplate || !templateForm) return;

    setFormError(null);

    // Validar campos requeridos
    const missing: string[] = [];
    selectedTemplate.parametros.forEach((p) => {
      if (p.requerido) {
        let val = '';
        if (p.tipo === 'sucursal') val = templateForm.sucursal;
        else if (p.tipo === 'destino') val = templateForm.destino;
        else if (p.tipo === 'horas') val = String(templateForm.horas);
        else if (p.tipo === 'minutos') val = String(templateForm.minutos);
        if (!val || val === '0') missing.push(p.label);
      }
    });

    if (missing.length > 0) {
      setFormError(`Complete los campos requeridos: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      await hangfireApi.registrarJob({
        tipoJobId: selectedTemplate.tipoJobId,
        sucursal: templateForm.sucursal,
        destino: templateForm.destino || undefined,
        cron: templateForm.cron,
      });

      notification.success({
        message: 'Job registrado correctamente',
        description: (
          <span>
            <Text strong>{selectedTemplate.nombre}</Text> ya está activo
          </span>
        ),
        duration: 4.5,
        btn: (
          <Button
            size="small"
            type="primary"
            onClick={() => {
              notification.destroy();
              setActiveTab('jobs');
            }}
          >
            Ver jobs
          </Button>
        ),
      });

      // Resetear formulario
      const initForm = buildInitialFormState(selectedTemplate);
      setTemplateForm(initForm);
      setInitialFormData(initForm);
      cargarDatos();
    } catch (err: any) {
      setFormError(err?.response?.data?.errorMessage || `Error al registrar job "${selectedTemplate.nombre}"`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    if (!selectedTemplate) return;
    const initForm = buildInitialFormState(selectedTemplate);
    setTemplateForm(initForm);
    setInitialFormData(initForm);
    setFormError(null);
  };

  const handleTemplateSearch = (value: string) => {
    setTemplateSearchText(value);
  };

  // ── Verificar si form es valido para habilitar boton ──
  const isFormValid = useMemo(() => {
    if (!selectedTemplate || !templateForm) return false;
    for (const p of selectedTemplate.parametros) {
      if (p.requerido) {
        if (p.tipo === 'sucursal' && !templateForm.sucursal) return false;
        if (p.tipo === 'destino' && !templateForm.destino) return false;
        if (p.tipo === 'horas' && !templateForm.horas) return false;
        if (p.tipo === 'minutos' && !templateForm.minutos) return false;
      }
    }
    return true;
  }, [selectedTemplate, templateForm]);

  // ── Filtros de jobs ──
  const modulosDisponibles = useMemo(() => {
    const modulos = new Set<string>();
    jobs.forEach((j) => {
      if (j.modulo) modulos.add(j.modulo);
    });
    return Array.from(modulos).sort();
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let result = jobs;

    if (kpiActiveCell === 'exitosos') {
      result = result.filter((j) => j.ultimoEstado === 'Exitoso');
    } else if (kpiActiveCell === 'fallidos') {
      result = result.filter((j) => j.ultimoEstado === 'Fallido');
    } else if (kpiActiveCell === 'activos') {
      result = result.filter((j) => j.activo);
    }
    // 'total' = sin filtro de KPI

    if (filtroModulo) {
      result = result.filter((j) => j.modulo === filtroModulo);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((j) => j.nombre.toLowerCase().includes(lower));
    }
    return result;
  }, [jobs, kpiActiveCell, filtroModulo, searchText]);

  // ── Templates modulos y filtro ──
  const modulosTemplates = useMemo(() => {
    const modulos = new Set<string>();
    templates.forEach((t) => {
      if (t.modulo) modulos.add(t.modulo);
    });
    return Array.from(modulos).sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (templateFiltroModulo) {
      result = result.filter((t) => t.modulo === templateFiltroModulo);
    }
    if (templateSearchText) {
      const lower = templateSearchText.toLowerCase();
      result = result.filter(
        (t) =>
          t.nombre.toLowerCase().includes(lower) ||
          (t.descripcion && t.descripcion.toLowerCase().includes(lower)),
      );
    }
    return result;
  }, [templates, templateFiltroModulo, templateSearchText]);

  // ── Columnas de la tabla ──
  const columns: ColumnsType<JobHangfire> = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      fixed: 'left',
      width: 220,
      render: (nombre: string, record: JobHangfire) => (
        <span
          className="paces-doc-link"
          style={{ cursor: 'pointer', color: 'var(--paces-primary)', fontWeight: 600 }}
          onClick={(e) => {
            e.stopPropagation();
            abrirDetalleJob(record);
          }}
        >
          <InfoCircleOutlined style={{ marginRight: 6, fontSize: 13 }} />
          {nombre}
        </span>
      ),
    },
    {
      title: 'Módulo',
      dataIndex: 'modulo',
      key: 'modulo',
      width: 140,
      render: (modulo: string | null) => {
        if (!modulo) return <Text className="paces-text-secondary">-</Text>;
        const info = MODULO_MAP[modulo];
        return info ? (
          <Tag color={info.color}>{info.label}</Tag>
        ) : (
          <Tag>{modulo}</Tag>
        );
      },
    },
    {
      title: 'Sucursal',
      dataIndex: 'sucursal',
      key: 'sucursal',
      width: 130,
      render: (sucursal: string | null) =>
        sucursal ? <Tag color="default">{sucursal}</Tag> : <Text className="paces-text-secondary">-</Text>,
    },
    {
      title: 'Último Estado',
      dataIndex: 'ultimoEstado',
      key: 'ultimoEstado',
      width: 150,
      render: (estado: string) => {
        const info = ESTADO_BADGE[estado] || { status: 'default', text: estado };
        return (
          <Space>
            <Badge status={info.status} />
            <Text>{info.text}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Última Ejecución',
      dataIndex: 'ultimaEjecucion',
      key: 'ultimaEjecucion',
      width: 160,
      render: (val: string | null) => (
        <Text className="paces-text-secondary">{formatFecha(val)}</Text>
      ),
    },
    {
      title: 'Próxima Ejecución',
      dataIndex: 'proximaEjecucion',
      key: 'proximaEjecucion',
      width: 160,
      render: (val: string | null) => (
        <Text className="paces-text-secondary">{formatFecha(val)}</Text>
      ),
    },
    {
      title: 'Duración',
      dataIndex: 'duracionSegundos',
      key: 'duracionSegundos',
      width: 90,
      align: 'right',
      render: (val: number | null) => (
        <Text className="paces-text-secondary">{formatDuracion(val)}</Text>
      ),
    },
    {
      title: 'Cron',
      dataIndex: 'cron',
      key: 'cron',
      width: 110,
      render: (cron: string) => (
        <Tooltip title={`Expresión Cron: ${cron}`}>
          <Space size={4}>
            <ClockCircleOutlined style={{ fontSize: 12, color: 'var(--paces-text-secondary)' }} />
            <Text code className="paces-text-secondary" style={{ fontSize: 10 }}>
              {cron}
            </Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      align: 'center',
      render: (activo: boolean) => (
        <Switch size="small" checked={activo} disabled />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 90,
      render: (_: unknown, record: JobHangfire) => (
        <Space>
          <Tooltip title="Ejecutar ahora">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined style={{ color: 'var(--paces-primary)', fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleTrigger(record);
              }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined style={{ fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleEliminar(record);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Render: Cabecera de pagina ──
  const renderPageHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <Space>
        <Tooltip title="Re-registrar todos los jobs para incluir notificaciones automáticas">
          <Button icon={<SyncOutlined />} onClick={handleReRegistrarTodos}>
            Re-registrar Jobs
          </Button>
        </Tooltip>
        <Tooltip title="Ir a Hangfire Dashboard">
          <Button icon={<SyncOutlined />} onClick={() => window.open('/hangfire', '_blank')}>
            Hangfire Dashboard
          </Button>
        </Tooltip>
      </Space>
    </div>
  );

  // ── Render: KPI Strip ──
  const renderKpiStrip = () => {
    const cells = [
      {
        key: 'total' as const,
        icon: <SyncOutlined />,
        value: resumen.total,
        label: 'jobs',
        color: 'var(--paces-primary)',
        bgColor: 'rgba(85,110,230,0.08)',
      },
      {
        key: 'exitosos' as const,
        icon: <CheckCircleOutlined />,
        value: resumen.exitosos,
        label: 'últimas ejecuciones',
        color: '#34c38f',
        bgColor: 'rgba(52,195,143,0.08)',
      },
      {
        key: 'fallidos' as const,
        icon: <AlertOutlined />,
        value: resumen.fallidos,
        label: 'últimas ejecuciones',
        color: '#f46a6a',
        bgColor: 'rgba(244,106,106,0.08)',
      },
      {
        key: 'activos' as const,
        icon: <RiseOutlined />,
        value: jobsActivos,
        label: 'programados',
        color: '#f0b345',
        bgColor: 'rgba(240,179,69,0.08)',
      },
    ];

    return (
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, height: 92, marginBottom: 16, overflow: 'hidden' }}
        styles={{ body: { padding: '16px 20px', height: '100%' } }}
      >
        <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
          {cells.map((cell, idx) => {
            const isActive = kpiActiveCell === cell.key;
            return (
              <div
                key={cell.key}
                onClick={() => handleKpiClick(cell.key)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '0 16px',
                  cursor: 'pointer',
                  borderRight: idx < cells.length - 1 ? '1px solid var(--paces-border)' : 'none',
                  borderTop: isActive ? `2px solid ${cell.color}` : '2px solid transparent',
                  background: isActive ? cell.bgColor : 'transparent',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--paces-row-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${cell.color}15`,
                    color: cell.color,
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {cell.icon}
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>{cell.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--paces-text-secondary)', lineHeight: 1.3 }}>
                    {cell.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // ── Render: Toolbar de tabla ──
  const renderTableToolbar = () => (
    <div style={{ padding: '16px 24px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Input.Search
          placeholder="Buscar..."
          allowClear
          onSearch={handleSearch}
          style={{ width: 320 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        <Select
          style={{ width: 160 }}
          placeholder="Todos los módulos"
          allowClear
          value={filtroModulo}
          onChange={(val) => setFiltroModulo(val)}
          options={modulosDisponibles.map((m) => ({ value: m, label: m }))}
        />
        <Select
          style={{ width: 65 }}
          value={pageSize}
          onChange={(v) => { setPageSize(v); setPage(1); }}
          options={[
            { value: 25, label: '25' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
          ]}
        />
        <div style={{ flex: 1 }} />
        <Space size={8}>
          <Text className="paces-text-secondary" style={{ fontSize: 13 }}>
            Auto · 30s
          </Text>
          <Switch
            size="small"
            checked={autoRefresh}
            onChange={(checked) => setAutoRefresh(checked)}
          />
        </Space>
        <Tooltip title="Recargar">
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
        </Tooltip>
      </div>
    </div>
  );

  // ── Render: Tabla de jobs ──
  const renderJobsTable = () => {
    const noJobsAtAll = jobs.length === 0 && !loading;
    const noResults = filteredJobs.length === 0 && jobs.length > 0 && !loading;

    const emptyText = noJobsAtAll ? (
      <Empty
        description="No hay jobs registrados"
        style={{ padding: '40px 0' }}
      >
        <Button type="primary" onClick={() => setActiveTab('registrar')}>
          Registrar primer job
        </Button>
      </Empty>
    ) : noResults ? (
      <Empty
        description="No se encontraron jobs con los filtros actuales"
        style={{ padding: '40px 0' }}
      >
        <Button
          onClick={() => {
            setSearchText('');
            setFiltroModulo(undefined);
            setKpiActiveCell(null);
          }}
        >
          Limpiar filtros
        </Button>
      </Empty>
    ) : undefined;

    return (
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        {renderTableToolbar()}

        <Table<JobHangfire>
          columns={columns}
          dataSource={filteredJobs}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          size="small"
          locale={{ emptyText }}
          rowClassName={(record) =>
            record.ultimoEstado === 'Fallido' ? 'paces-row-hover' : 'paces-row-hover'
          }
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: {
              cursor: 'pointer',
              background:
                record.ultimoEstado === 'Fallido' ? 'rgba(244,106,106,0.04)' : undefined,
            },
          })}
          pagination={{
            current: page,
            pageSize,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} jobs`,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    );
  };

  // ── Render: Modal de detalle de job ──
  const renderDetalleJobModal = () => (
    <Modal
      open={detalleJobModal.visible}
      onCancel={() => setDetalleJobModal({ visible: false, job: null })}
      width={600}
      title={
        <Space>
          <InfoCircleOutlined style={{ color: 'var(--paces-primary)', fontSize: 18 }} />
          <span>
            Detalle del Job: <Text strong>{detalleJobModal.job?.nombre || ''}</Text>
          </span>
        </Space>
      }
      footer={
        <Button type="primary" onClick={() => setDetalleJobModal({ visible: false, job: null })}>
          Cerrar
        </Button>
      }
    >
      {detalleJobModal.job && (
        <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Nombre">{detalleJobModal.job.nombre}</Descriptions.Item>
          <Descriptions.Item label="Módulo">{detalleJobModal.job.modulo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Sucursal">{detalleJobModal.job.sucursal || '-'}</Descriptions.Item>
          <Descriptions.Item label="Cron">
            <Text code>{detalleJobModal.job.cron}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Último Estado">
            <Badge status={ESTADO_BADGE[detalleJobModal.job.ultimoEstado]?.status || 'default'} />
            {ESTADO_BADGE[detalleJobModal.job.ultimoEstado]?.text || detalleJobModal.job.ultimoEstado}
          </Descriptions.Item>
          <Descriptions.Item label="Última Ejecución">{formatFecha(detalleJobModal.job.ultimaEjecucion)}</Descriptions.Item>
          <Descriptions.Item label="Próxima Ejecución">{formatFecha(detalleJobModal.job.proximaEjecucion)}</Descriptions.Item>
          <Descriptions.Item label="Duración">{formatDuracion(detalleJobModal.job.duracionSegundos)}</Descriptions.Item>
          <Descriptions.Item label="Activo">
            <Switch size="small" checked={detalleJobModal.job.activo} disabled />
          </Descriptions.Item>
          {detalleJobModal.job.ultimoEstado === 'Fallido' && detalleJobModal.job.error && (
            <Descriptions.Item label="Error">
              <pre style={{
                background: 'var(--paces-topbar-search-bg)',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
                color: '#f46a6a',
                border: '1px solid var(--paces-border)',
                margin: 0,
              }}>
                {detalleJobModal.job.error}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );

  // ── Render: Modal de error mejorado ──
  const renderErrorModal = () => (
    <Modal
      open={errorModal.visible}
      onCancel={() => setErrorModal({ visible: false, job: null })}
      width={720}
      title={
        <Space>
          <AlertOutlined style={{ color: '#f46a6a', fontSize: 18 }} />
          <span>
            Error del job: <Text strong>{errorModal.job?.nombre || ''}</Text>
          </span>
        </Space>
      }
      footer={
        <Space>
          <Button icon={<CopyOutlined />} onClick={handleCopyError}>
            Copiar error
          </Button>
          <Button type="primary" onClick={() => setErrorModal({ visible: false, job: null })}>
            Cerrar
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Row gutter={[24, 8]}>
          <Col span={12}>
            <Text className="paces-text-secondary" style={{ fontSize: 12, display: 'block' }}>
              Última ejecución
            </Text>
            <Text>{formatFecha(errorModal.job?.ultimaEjecucion || null)}</Text>
          </Col>
          <Col span={12}>
            <Text className="paces-text-secondary" style={{ fontSize: 12, display: 'block' }}>
              Duración
            </Text>
            <Text>{formatDuracion(errorModal.job?.duracionSegundos || null)}</Text>
          </Col>
        </Row>
      </div>
      <pre
        style={{
          background: 'var(--paces-topbar-search-bg)',
          padding: 16,
          borderRadius: 8,
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 400,
          overflow: 'auto',
          color: '#f46a6a',
          border: '1px solid var(--paces-border)',
          margin: 0,
        }}
      >
        {errorModal.job?.error || 'Sin detalle de error disponible'}
      </pre>
    </Modal>
  );

  // ── Render: Template List (columna izquierda) ──
  const renderTemplateList = () => {
    return (
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, height: '100%' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--paces-border)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <Text strong style={{ fontSize: 15 }}>
              Tipos disponibles
            </Text>
            <Tag>{templates.length}</Tag>
          </div>
          <Input.Search
            placeholder="Buscar..."
            allowClear
            onSearch={handleTemplateSearch}
            prefix={<SearchOutlined className="paces-text-icon" />}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <Select
            style={{ width: '100%' }}
            placeholder="Filtrar por módulo"
            allowClear
            value={templateFiltroModulo}
            onChange={(val) => setTemplateFiltroModulo(val)}
            options={modulosTemplates.map((m) => ({ value: m, label: m }))}
          />
        </div>
        <div
          style={{
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto',
            padding: 0,
          }}
        >
          {filteredTemplates.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <Text className="paces-text-secondary">No hay plantillas disponibles</Text>
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isSelected = template.tipoJobId === selectedTemplateId;
              const modInfo = template.modulo ? MODULO_MAP[template.modulo] : null;
              return (
                <div
                  key={template.tipoJobId}
                  onClick={() => handleSelectTemplate(template.tipoJobId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderLeft: isSelected
                      ? `3px solid var(--paces-primary)`
                      : '3px solid transparent',
                    background: isSelected ? 'var(--paces-row-hover)' : 'transparent',
                    transition: 'background 0.15s, border-color 0.15s',
                    minHeight: 64,
                    borderBottom: '1px solid var(--paces-border)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--paces-row-hover)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: modInfo
                        ? `var(--paces-primary)15`
                        : 'var(--paces-topbar-search-bg)',
                      color: 'var(--paces-primary)',
                      fontSize: 14,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {template.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      strong={isSelected}
                      style={{
                        display: 'block',
                        fontSize: 13,
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {template.nombre}
                    </Text>
                    <Text
                      className="paces-text-secondary"
                      style={{
                        display: 'block',
                        fontSize: 12,
                        lineHeight: '16px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {(template.descripcion || '').substring(0, 60)}
                    </Text>
                  </div>
                  {modInfo && (
                    <Tag color={modInfo.color} style={{ margin: 0, flexShrink: 0 }}>
                      {modInfo.label}
                    </Tag>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>
    );
  };

  // ── Render: Template Detail (columna derecha) ──
  const renderTemplateDetail = () => {
    if (!selectedTemplate || !templateForm) {
      return (
        <Card className="paces-card-erp" style={{ borderRadius: 8, height: '100%' }}>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Text className="paces-text-secondary">Seleccione una plantilla para configurarla</Text>
          </div>
        </Card>
      );
    }

    const modInfo = selectedTemplate.modulo ? MODULO_MAP[selectedTemplate.modulo] : null;

    // Calcular campos faltantes para tooltip
    const missingFields: string[] = [];
    selectedTemplate.parametros.forEach((p) => {
      if (p.requerido) {
        if (p.tipo === 'sucursal' && !templateForm.sucursal) missingFields.push(p.label);
        if (p.tipo === 'destino' && !templateForm.destino) missingFields.push(p.label);
      }
    });
    const formInvalidTooltip =
      missingFields.length > 0
        ? `Complete los campos requeridos: ${missingFields.join(', ')}`
        : undefined;

    return (
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, height: '100%' }}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        {/* ── Zona A: Header compacto + descripción ── */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--paces-border)',
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: modInfo
                ? `var(--paces-primary)15`
                : 'var(--paces-topbar-search-bg)',
              color: 'var(--paces-primary)',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {selectedTemplate.nombre.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Title level={5} style={{ margin: 0 }}>
                {selectedTemplate.nombre}
              </Title>
              {modInfo && (
                <Tag color={modInfo.color} style={{ margin: 0, flexShrink: 0 }}>
                  {modInfo.label}
                </Tag>
              )}
            </div>
            <Text
              type="secondary"
              style={{
                fontSize: 13,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: '18px',
                maxHeight: 36,
              }}
            >
              {selectedTemplate.descripcion}
            </Text>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Error inline */}
          {formError && (
            <Alert
              type="error"
              message={formError}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          {/* ── Zona B: ¿Donde se ejecuta? ── */}
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
              1. ¿Donde se ejecuta?
            </Text>
            <Row gutter={16}>
              {selectedTemplate.parametros.map((param) => {
                if (param.tipo === 'sucursal') {
                  return (
                    <Col xs={24} md={12} key={param.nombre}>
                      <Form.Item
                        label={param.label}
                        required={param.requerido}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          value={templateForm.sucursal || undefined}
                          onChange={(val) => updateFormField('sucursal', val)}
                          options={sucursalOptions}
                          placeholder={`Seleccionar ${param.label}`}
                          style={{ width: '100%' }}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>
                  );
                }
                if (param.tipo === 'destino') {
                  return (
                    <Col xs={24} md={12} key={param.nombre}>
                      <Form.Item
                        label={param.label}
                        required={param.requerido}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          value={templateForm.destino || undefined}
                          onChange={(val) => updateFormField('destino', val)}
                          options={sucursalOptions}
                          placeholder={`Seleccionar ${param.label}`}
                          style={{ width: '100%' }}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>
                  );
                }
                return null;
              })}
            </Row>
          </div>

          {/* ── Zona C: ¿Con que frecuencia? ── */}
          <div>
            <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
              2. ¿Con que frecuencia?
            </Text>
            <Segmented
              value={templateForm.frecuenciaTipo}
              onChange={(val) => handleFrecuenciaChange(val as FrecuenciaTipo)}
              options={[
                { label: 'Cada X horas', value: 'hours' },
                { label: 'Cada X minutos', value: 'minutes' },
                { label: 'Avanzado (cron)', value: 'custom' },
              ]}
              block
              disabled={submitting}
              style={{ marginBottom: 16 }}
            />

            {templateForm.frecuenciaTipo === 'hours' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <InputNumber
                  min={1}
                  max={24}
                  value={templateForm.horas}
                  onChange={handleHorasChange}
                  style={{ width: 100 }}
                  disabled={submitting}
                />
                <Text>hora(s)</Text>
              </div>
            )}

            {templateForm.frecuenciaTipo === 'minutes' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <InputNumber
                  min={1}
                  max={59}
                  value={templateForm.minutos}
                  onChange={handleMinutosChange}
                  style={{ width: 100 }}
                  disabled={submitting}
                />
                <Text>minuto(s)</Text>
              </div>
            )}

            {templateForm.frecuenciaTipo === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Input
                  value={templateForm.cron}
                  onChange={(e) => updateFormField('cron', e.target.value)}
                  placeholder="0 * * * *"
                  style={{ width: 240 }}
                  disabled={submitting}
                />
                <Tooltip title="https://crontab.guru">
                  <Button
                    type="link"
                    size="small"
                    style={{ fontSize: 12 }}
                    onClick={() => window.open('https://crontab.guru', '_blank')}
                    disabled={submitting}
                  >
                    ¿Ayuda?
                  </Button>
                </Tooltip>
              </div>
            )}

            {/* Preview integrado */}
            <div
              style={{
                background: 'var(--paces-topbar-search-bg)',
                borderRadius: 6,
                padding: '10px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ClockCircleOutlined style={{ fontSize: 13, color: 'var(--paces-text-secondary)' }} />
                <Text className="paces-text-secondary" style={{ fontSize: 13 }}>
                  {describirCron(templateForm.cron)}
                </Text>
              </div>
              <Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                Cron:{' '}
                <code
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--paces-primary)',
                  }}
                >
                  {templateForm.cron}
                </code>
              </Text>
            </div>
          </div>
        </div>

        {/* ── Zona D: Footer sticky ── */}
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'inherit',
            borderTop: '1px solid var(--paces-border)',
            padding: '12px 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button disabled={!isFormDirty} onClick={handleCancelForm}>
              Restablecer
            </Button>
            <Tooltip title={formInvalidTooltip}>
              <Button
                type="primary"
                disabled={!isFormValid}
                loading={submitting}
                onClick={handleRegistrar}
              >
                Registrar automatización
              </Button>
            </Tooltip>
          </div>
        </div>
      </Card>
    );
  };

  // ── Render: Contenido del tab Jobs ──
  const renderJobsTab = () => (
    <>
      {renderKpiStrip()}
      {renderJobsTable()}
      {renderErrorModal()}
      {renderDetalleJobModal()}
    </>
  );

  // ── Render: Contenido del tab Registrar ──
  const renderRegistrarTab = () => {
    if (templatesLoading && templates.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <SyncOutlined spin style={{ fontSize: 32, color: 'var(--paces-primary)' }} />
          <br />
          <Text className="paces-text-secondary" style={{ marginTop: 12, display: 'block' }}>
            Cargando plantillas...
          </Text>
        </div>
      );
    }

    if (templates.length === 0) {
      return (
        <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
          <Empty description="No hay plantillas de jobs disponibles." />
        </Card>
      );
    }

    return (
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} lg={7}>
          {renderTemplateList()}
        </Col>
        <Col xs={24} md={16} lg={17}>
          {renderTemplateDetail()}
        </Col>
      </Row>
    );
  };

  // ── Render principal ──
  // Memoizar tabs para evitar re-render completo al escribir en el formulario
  const jobsContent = useMemo(() => renderJobsTab(), [
    jobs, resumen, loading, searchText, filtroModulo,
    kpiActiveCell, autoRefresh, filteredJobs, columns, errorModal
  ]);

  const registrarContent = useMemo(() => renderRegistrarTab(), [
    templates, templatesLoading, filteredTemplates, selectedTemplateId,
    templateForm, initialFormData, submitting, formError, templateFiltroModulo,
    sucursalOptions, isFormValid, isFormDirty, templateForm?.frecuenciaTipo
  ]);

  return (
    <div>
      {loadingError && (
        <Alert
          message="Error al cargar automatizaciones"
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
      {renderPageHeader()}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        type="line"
        tabBarStyle={{ marginBottom: 16 }}
        items={[
          {
            key: 'jobs',
            label: (
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Jobs Registrados{' '}
                <Badge
                  count={resumen.total}
                  size="small"
                  style={{ backgroundColor: 'var(--paces-primary)' }}
                />
              </span>
            ),
            children: jobsContent,
          },
          {
            key: 'registrar',
            label: (
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Registrar Nuevo{' '}
                <Badge
                  count={templates.length}
                  size="small"
                  style={{ backgroundColor: 'var(--paces-primary)' }}
                />
              </span>
            ),
            children: registrarContent,
          },
        ]}
        style={{ marginTop: 0 }}
      />
    </div>
  );
};

export default Automatizaciones;
