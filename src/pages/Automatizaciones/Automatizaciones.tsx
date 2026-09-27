import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Drawer,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  RiseOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  CopyOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { hangfireApi } from '../../api/hangfireApi';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import type { JobHangfire, JobTemplate } from '../../types/hangfire';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { KPICard } from './components/KPICard';
import { EstadoActualBadge } from './components/EstadoActualBadge';
import { SwitchProgramado } from './components/SwitchProgramado';
import { FechaEjecucionCell } from './components/FechaEjecucionCell';
import { TiempoEjecucionCell } from './components/TiempoEjecucionCell';

const { Text, Title } = Typography;

// â”€â”€ Constantes â”€â”€

const MODULO_MAP: Record<string, { label: string; color: string }> = {
  Inventario: { label: 'Inventario', color: 'blue' },
  Compras: { label: 'Compras', color: 'cyan' },
  DGII: { label: 'DGII', color: 'purple' },
  Facturacion: { label: 'Facturacion', color: 'geekblue' },
  Transferencias: { label: 'Transferencias', color: 'orange' },
};

type FrecuenciaTipo = 'hours' | 'minutes' | 'custom';

interface TemplateFormState {
  sucursal: string;
  destino: string;
  frecuenciaTipo: FrecuenciaTipo;
  horas: number;
  minutos: number;
  cron: string;
}

// â”€â”€ Helpers â”€â”€

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

// â”€â”€ Componente principal â”€â”€

const Automatizaciones: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
  const sucursalesData = useCompanyStore((s) => s.data.sucursales);

  // â”€â”€ Jobs state â”€â”€
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<string | undefined>(undefined);
  const [kpiActiveCell, setKpiActiveCell] = useState<'total' | 'exitosos' | 'fallidos' | 'activos' | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [resumenInfo, setResumenInfo] = useState({ total: 0, exitosos: 0, fallidos: 0 });

  const { data: jobsQuery, isLoading, isError, refetch } = useQuery({
    queryKey: ['automatizacionesJobs'],
    queryFn: async () => {
      const data = await hangfireApi.obtenerJobs();
      const resumen = {
        total: data.total ?? data.jobs?.length ?? 0,
        fallidos: data.fallidos ?? 0,
        exitosos: data.exitosos ?? 0,
      };
      setResumenInfo(resumen);
      return {
        jobs: data.jobs || [],
        resumen,
      };
    },
    placeholderData: (prev) => prev,
  });

  const jobs = useMemo(() => jobsQuery?.jobs || [], [jobsQuery?.jobs]);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; job: JobHangfire | null }>({
    visible: false,
    job: null,
  });
  const [detalleJobModal, setDetalleJobModal] = useState<{ visible: boolean; job: JobHangfire | null }>({
    visible: false,
    job: null,
  });

  // â”€â”€ Templates state â”€â”€
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState | null>(null);
  const [initialFormData, setInitialFormData] = useState<TemplateFormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [templateFiltroModulo, setTemplateFiltroModulo] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);

  // â”€â”€ UI state â”€â”€
  const [activeTab, setActiveTab] = useState('jobs');
  const [templateConfigModal, setTemplateConfigModal] = useState({ visible: false });

  // â”€â”€ Sucursales â”€â”€
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
    return (sucursalesData || [])
      .filter((s) => s.sucursal >= 0 && s.sucursal <= 3)
      .map((s) => ({ value: s.nombre, label: s.nombre }));
  }, [sucursalesPermitidas, sucursalesData]);

  // â”€â”€ Computed â”€â”€
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


  // â”€â”€ Cargar templates â”€â”€
  const cargarTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await hangfireApi.obtenerTemplates();
      setTemplates(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar plantillas';
      message.error(errorMessage);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  // â”€â”€ Inicializar â”€â”€
  useEffect(() => {
    setActiveModule('MAutomatizacion');
    updateToolbar({});
    refetch();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarTemplates();
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar, cargarTemplates, refetch]);

  // â”€â”€ Auto-refresh (solo en tab jobs y sin modal abierto) â”€â”€
  useEffect(() => {
    if (autoRefresh && activeTab === 'jobs') {
      intervalRef.current = setInterval(() => {
        if (!errorModal.visible) {
          refetch();
        }
      }, 30000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, activeTab, errorModal.visible, refetch]);

  // â”€â”€ Exportar Excel â”€â”€
  // Aplana columnas agrupadas (children) y excluye acciones, sin conversiones
  // forzadas: trabaja sobre ColumnsType<T> con angostamiento por 'in'.
  interface ColumnaExportPlana<T extends object> {
    titulo: string;
    clave: string;
    leer: (item: T) => unknown;
  }
  const columnasExportables = <T extends object>(cols: ColumnsType<T>): Array<ColumnaExportPlana<T>> => {
    const planas: Array<ColumnaExportPlana<T>> = [];
    cols.forEach((c) => {
      if (!c) return;
      if ('key' in c && c.key === 'acciones') return;
      if ('children' in c && Array.isArray(c.children)) {
        planas.push(...columnasExportables(c.children));
        return;
      }
      const titulo = 'title' in c && typeof c.title === 'string' ? c.title : undefined;
      const dataIndex = 'dataIndex' in c ? c.dataIndex : undefined;
      if (!titulo || (typeof dataIndex !== 'string' && typeof dataIndex !== 'number')) return;
      const clave = String(dataIndex);
      planas.push({
        titulo,
        clave,
        leer: (item: T): unknown => {
          if (!(clave in item)) return undefined;
          return item[clave as keyof T];
        },
      });
    });
    return planas;
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columnasExportables(columns);
    exportToExcel({
      fileName: `Automatizaciones_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`,
      sheetName: 'Automatizaciones',
      companyName,
      columnHeaders: exportCols.map((c) => c.titulo),
      dataRows: filteredJobs.map((item) =>
        exportCols.map((col) => {
          const val = col.leer(item);
          if (typeof val === 'boolean') return val ? 'Sí' : 'No';
          return val !== null && val !== undefined ? String(val) : '';
        })
      ),
    });
  };

  // â”€â”€ Handlers jobs â”€â”€

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleRefresh = () => {
    refetch();
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
          refetch();
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Error al re-registrar jobs';
          message.error(errorMessage);
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

  // â”€â”€ Handlers KPI â”€â”€

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

  // â”€â”€ Handlers templates â”€â”€

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
          setTemplateConfigModal({ visible: true });
        },
      });
    } else {
      doSelectTemplate(tipoJobId);
      setTemplateConfigModal({ visible: true });
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

  const updateFormField = (field: keyof TemplateFormState, value: string | number) => {
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
    if (!selectedTemplate || !templateForm || submitting) return;

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
      refetch();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Error al registrar job "${selectedTemplate.nombre}"`;
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    if (!selectedTemplate || submitting) return;
    const initForm = buildInitialFormState(selectedTemplate);
    setTemplateForm(initForm);
    setInitialFormData(initForm);
    setFormError(null);
  };

  const handleTemplateSearch = (value: string) => {
    setTemplateSearchText(value);
  };

  // â”€â”€ Verificar si form es valido para habilitar boton â”€â”€
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

  // â”€â”€ Filtros de jobs â”€â”€
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

  // â”€â”€ Templates modulos y filtro â”€â”€
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

  // â”€â”€ Columnas de la tabla â”€â”€
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
        title: 'Estado',
        dataIndex: 'ultimoEstado',
        key: 'ultimoEstado',
        width: 160,
        render: (estado: string) => <EstadoActualBadge estado={estado} />,
      },
    {
      title: 'Última ejecución',
      dataIndex: 'ultimaEjecucion',
      key: 'ultimaEjecucion',
      width: 170,
      render: (val: string | null) => (
        <FechaEjecucionCell value={val} label="Última ejecución" />
      ),
    },
    {
      title: 'Próxima ejecución',
      dataIndex: 'proximaEjecucion',
      key: 'proximaEjecucion',
      width: 170,
      render: (val: string | null) => (
        <FechaEjecucionCell value={val} label="Próxima ejecución" />
      ),
    },
    {
      title: 'Duración',
      dataIndex: 'duracionSegundos',
      key: 'duracionSegundos',
      width: 90,
      align: 'right',
      render: (val: number | null) => <TiempoEjecucionCell value={val} />,
    },
    {
      title: 'Frecuencia',
      dataIndex: 'cron',
      key: 'cron',
      width: 110,
      render: (cron: string) => (
        <Tooltip title={`Programación: ${describirCron(cron)}`}>
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
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 80,
      align: 'center',
      render: (activo: boolean) => <SwitchProgramado activo={activo} />,
    },
  ];

  // â”€â”€ Render: Cabecera de pagina â”€â”€
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
          <PermissionGate accion="CREAR">
            <Tooltip title="Re-registrar todas las automatizaciones para incluir notificaciones automáticas">
              <Button icon={<SyncOutlined />} onClick={handleReRegistrarTodos}>
                Re-registrar automatizaciones
              </Button>
            </Tooltip>
          </PermissionGate>
          <Tooltip title="Ir al dashboard de ejecuciones">
            <Button icon={<SyncOutlined />} onClick={() => window.open('/hangfire', '_blank')}>
              Dashboard de ejecuciones
            </Button>
          </Tooltip>
      </Space>
    </div>
  );

  // â”€â”€ Render: KPI Strip â”€â”€
  const renderKpiStrip = () => {
    const cells = [
      {
        key: 'total' as const,
        icon: <SyncOutlined />,
        value: (jobsQuery?.resumen || resumenInfo).total,
        label: 'Automatizaciones activas',
        variant: 'primary' as const,
      },
      {
        key: 'exitosos' as const,
        icon: <CheckCircleOutlined />,
        value: (jobsQuery?.resumen || resumenInfo).exitosos,
        label: 'Últimas ejecuciones',
        variant: 'success' as const,
      },
      {
        key: 'fallidos' as const,
        icon: <AlertOutlined />,
        value: (jobsQuery?.resumen || resumenInfo).fallidos,
        label: 'Últimas ejecuciones',
        variant: 'danger' as const,
      },
      {
        key: 'activos' as const,
        icon: <RiseOutlined />,
        value: jobsActivos,
        label: 'Programadas',
        variant: 'warning' as const,
      },
    ];

    return (
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, height: 92, marginBottom: 16, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
          {cells.map((cell) => {
            const isActive = kpiActiveCell === cell.key;
            return (
              <KPICard
                key={cell.key}
                icon={cell.icon}
                value={cell.value}
                label={cell.label}
                variant={cell.variant}
                onClick={() => handleKpiClick(cell.key)}
                active={isActive}
              />
            );
          })}
        </div>
      </Card>
    );
  };

  // â”€â”€ Render: Toolbar de tabla â”€â”€
  const renderTableToolbar = () => (
    <CatalogoListadoToolbar
      onSearch={handleSearch}
      pageSize={pageSize}
      onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
      onReload={handleRefresh}
      onExportarExcel={handleExportarExcel}
      filtros={
        <Select
          style={{ width: 160 }}
          placeholder="Todos los módulos"
          allowClear
          value={filtroModulo}
          onChange={(val) => setFiltroModulo(val)}
          options={modulosDisponibles.map((m) => ({ value: m, label: m }))}
        />
      }
      acciones={
        <Space size={8}>
          <Text className="paces-text-secondary" style={{ fontSize: 13 }}>
            AutoActualización (30s)
          </Text>
          <Switch
            size="small"
            checked={autoRefresh}
            onChange={(checked) => setAutoRefresh(checked)}
          />
        </Space>
      }
    />)

  // â”€â”€ Render: Tabla de jobs â”€â”€
  const renderJobsTable = () => {
    const noJobsAtAll = jobs.length === 0 && !isLoading;
    const noResults = filteredJobs.length === 0 && jobs.length > 0 && !isLoading;

    const emptyText = noJobsAtAll ? (
      <Empty
        description="No hay jobs registrados"
        style={{ padding: '40px 0' }}
      >
        <PermissionGate accion="CREAR">
          <Button type="primary" onClick={() => setActiveTab('registrar')}>
            Registrar primer job
          </Button>
        </PermissionGate>
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
          loading={isLoading}
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

  // â”€â”€ Render: Drawer de detalle de job â”€â”€
  const renderDetalleJobDrawer = () => (
    <Drawer
      open={detalleJobModal.visible}
      onClose={() => setDetalleJobModal({ visible: false, job: null })}
      width={600}
      title={
        <Space>
          <InfoCircleOutlined style={{ color: 'var(--paces-primary)', fontSize: 18 }} />
          <span>
            Detalle del job: <Text strong>{detalleJobModal.job?.nombre || ''}</Text>
          </span>
        </Space>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" onClick={() => setDetalleJobModal({ visible: false, job: null })}>
            Cerrar
          </Button>
        </div>
      }
    >
      {detalleJobModal.job && (
        <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
          <Descriptions.Item label="Nombre">{detalleJobModal.job.nombre}</Descriptions.Item>
          <Descriptions.Item label="Módulo">{detalleJobModal.job.modulo || '-'}</Descriptions.Item>
          <Descriptions.Item label="Sucursal">{detalleJobModal.job.sucursal || '-'}</Descriptions.Item>
          <Descriptions.Item label="Frecuencia">
            <Text code>{detalleJobModal.job.cron}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Estado actual">
            <EstadoActualBadge estado={detalleJobModal.job.ultimoEstado} />
          </Descriptions.Item>
          <Descriptions.Item label="Última ejecución">{formatFecha(detalleJobModal.job.ultimaEjecucion)}</Descriptions.Item>
          <Descriptions.Item label="Próxima ejecución">{formatFecha(detalleJobModal.job.proximaEjecucion)}</Descriptions.Item>
          <Descriptions.Item label="Duración">{formatDuracion(detalleJobModal.job.duracionSegundos)}</Descriptions.Item>
          <Descriptions.Item label="Activo">
            <SwitchProgramado activo={detalleJobModal.job.activo} />
          </Descriptions.Item>
          {detalleJobModal.job.ultimoEstado === 'Fallido' && detalleJobModal.job.error && (
            <Descriptions.Item label="Error de ejecución">
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
    </Drawer>
  );

  // â”€â”€ Render: Drawer de error mejorado â”€â”€
  const renderErrorDrawer = () => (
    <Drawer
      open={errorModal.visible}
      onClose={() => setErrorModal({ visible: false, job: null })}
      width={720}
      title={
        <Space>
          <AlertOutlined style={{ color: '#f46a6a', fontSize: 18 }} />
          <span>
            Error de ejecución: <Text strong>{errorModal.job?.nombre || ''}</Text>
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
    </Drawer>
  );

  // â”€â”€ Render: Template List (columna izquierda) â”€â”€
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
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleTemplateSearch('');
              }
            }}
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

  // â”€â”€ Render: Contenido interno del formulario de plantilla (sin Card wrapper) â”€â”€
  const renderTemplateFormContent = () => {
    if (!selectedTemplate || !templateForm) {
      return <Text className="paces-text-secondary">Seleccione una plantilla para configurarla</Text>;
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

    return (
      <>
        {/* Header */}
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

        {/* Scrollable content */}
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

          {/* ─── Zona B: ¿Donde se ejecuta? ─── */}
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

          {/* ─── Zona C: ¿Con que frecuencia? ─── */}
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
      </>
    );
  };

  // â”€â”€ Render: Contenido del tab Jobs â”€â”€
  const renderJobsTab = () => (
    <>
      {renderJobsTable()}
      {renderErrorDrawer()}
      {renderDetalleJobDrawer()}
    </>
  );

  // â”€â”€ Render: Drawer de configuración de plantilla â”€â”€
  const renderTemplateConfigDrawer = () => (
    <Drawer
      open={templateConfigModal.visible}
      onClose={() => { if (!submitting) setTemplateConfigModal({ visible: false }); }}
      closable={!submitting}
      maskClosable={!submitting}
      width={900}
      title={
        <Space>
          <InfoCircleOutlined style={{ color: 'var(--paces-primary)', fontSize: 18 }} />
          <span>
            Configurar automatización: <Text strong>{selectedTemplate?.nombre || ''}</Text>
          </span>
        </Space>
      }
      extra={
        <Space>
          <Button disabled={!isFormDirty || submitting} onClick={handleCancelForm}>
            Restablecer
          </Button>
          <Button onClick={() => setTemplateConfigModal({ visible: false })} disabled={submitting}>
            Cerrar
          </Button>
          <PermissionGate accion="CREAR">
            <Button
              type="primary"
              disabled={!isFormValid || submitting}
              loading={submitting}
              onClick={handleRegistrar}
            >
              Registrar automatización
            </Button>
          </PermissionGate>
        </Space>
      }
    >
      {renderTemplateFormContent()}
    </Drawer>
  );

  // â”€â”€ Render: Contenido del tab Registrar â”€â”€
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
          <Empty description="No hay plantillas de automatizaciones disponibles." />
        </Card>
      );
    }

    return (
      <>
        {renderTemplateList()}
        {renderTemplateConfigDrawer()}
      </>
    );
  };

  // â”€â”€ Render principal â”€â”€
  // Memoizar tabs para evitar re-render completo al escribir en el formulario
  // Se renderiza directo (sin useMemo intermedio): las funciones render se recrean
  // en cada render y memoizarlas con deps parciales dejaba closures obsoletos.
  // El filtrado costoso sigue memoizado en filteredJobs/filteredTemplates.
  const jobsContent = renderJobsTab();

  const registrarContent = renderRegistrarTab();

  return (
    <div>
      {isError && (
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
            key: 'resumen',
            label: (
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Resumen
              </span>
            ),
            children: renderKpiStrip(),
          },
          {
            key: 'jobs',
            label: (
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Ejecuciones{' '}
                <Badge
                  count={resumenInfo.total}
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
                Configuración{' '}
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





