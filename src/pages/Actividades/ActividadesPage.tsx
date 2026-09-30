import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Input, message, Select, Tabs, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { actividadApi } from '../../api/actividadApi';
import { usuarioApi } from '../../api/usuarioApi';
import { extraerMensajeError } from '../../utils/formats';
import CalendarioActividades from './components/CalendarioActividades';
import DrawerFormularioActividad from './components/DrawerFormularioActividad';
import ModalDetalleActividad from './components/ModalDetalleActividad';
import { calcularRango } from './utils/calendario';
import type { CriterioColor, VistaCalendario } from './utils/calendario';
import type {
  ActividadDTO,
  ActividadTotalesDTO,
  ActividadServicioDTO,
  CrearActividadRequest,
} from '../../types/actividad';
import type { UsuarioDTO } from '../../types/administracion';

// Pantalla publica para todo usuario autenticado: sin PermissionGate,
// sin AUTH_PANTALLA y sin roles. Solo se protege por el PantallaGuard global
// (la lista blanca de App.tsx incluye 'Actividades').

const TOTALES_VACIO: ActividadTotalesDTO = {
  total: 0,
  pendiente: 0,
  confirmado: 0,
  enProceso: 0,
  completado: 0,
  cancelado: 0,
  reprogramado: 0,
};

export default function ActividadesPage() {
  const sucursal = useAuthStore((s) => s.compania);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const navigate = useNavigate();

  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [fechaAncla, setFechaAncla] = useState<Dayjs>(() => dayjs());
  const [colorearPor, setColorearPor] = useState<CriterioColor>('servicio');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');

  const [servicios, setServicios] = useState<ActividadServicioDTO[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);

  const [modalDetalle, setModalDetalle] = useState<ActividadDTO | null>(null);
  const [drawerForm, setDrawerForm] = useState<{ abierto: boolean; editar: ActividadDTO | null }>({
    abierto: false,
    editar: null,
  });
  const queryClient = useQueryClient();

  // Rango semiabierto del periodo visible; las claves del query usan strings.
  const rango = calcularRango(vista, fechaAncla);
  const claveDesde = rango.desde.format('YYYYMMDDHHmmss');
  const claveHasta = rango.hasta.format('YYYYMMDDHHmmss');

  const calendarioQuery = useQuery({
    queryKey: ['actividades', 'calendario', vista, claveDesde, claveHasta, estadoFiltro, busquedaDebounced],
    queryFn: () => actividadApi.obtenerCalendario(rango, { estado: estadoFiltro, q: busquedaDebounced }),
  });

  const totalesQuery = useQuery({
    queryKey: ['actividades', 'totales', vista, claveDesde, claveHasta],
    queryFn: () => actividadApi.obtenerTotales(rango),
  });

  // Catalogos estaticos (servicios y responsables).
  useEffect(() => {
    let activo = true;
    actividadApi
      .obtenerServicios()
      .then((data) => {
        if (activo) setServicios(data);
      })
      .catch((err) => message.error(extraerMensajeError(err, 'Error al cargar los servicios')));
    usuarioApi
      .obtenerListado(sucursal)
      .then((data) => {
        if (activo) setUsuarios(data);
      })
      .catch((err) => message.error(extraerMensajeError(err, 'Error al cargar los usuarios')));
    return () => {
      activo = false;
    };
  }, [sucursal]);

  // Debounce del buscador (~350ms) antes de pedir datos.
  useEffect(() => {
    const timer = setTimeout(() => setBusquedaDebounced(busqueda.trim()), 350);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const totalesErrorMensaje = totalesQuery.isError
    ? extraerMensajeError(totalesQuery.error, 'Error al cargar los totales')
    : null;
  useEffect(() => {
    if (totalesErrorMensaje) message.error(totalesErrorMensaje);
  }, [totalesErrorMensaje]);

  const actividades = calendarioQuery.data ?? [];
  const cargando = calendarioQuery.isLoading;
  const error = calendarioQuery.isError
    ? extraerMensajeError(calendarioQuery.error, 'Error al cargar las actividades')
    : null;
  const totales = totalesQuery.data ?? null;

  const recargarDatos = () => {
    queryClient.invalidateQueries({ queryKey: ['actividades'] });
  };

  const pestanas = useMemo(() => {
    const t = totales ?? TOTALES_VACIO;
    return [
      { key: '', label: 'Todas', conteo: t.total },
      { key: 'Pendiente', label: 'Pendiente', conteo: t.pendiente },
      { key: 'Confirmado', label: 'Confirmado', conteo: t.confirmado },
      { key: 'EnProceso', label: 'En proceso', conteo: t.enProceso },
      { key: 'Completado', label: 'Completado', conteo: t.completado },
      { key: 'Cancelado', label: 'Cancelado', conteo: t.cancelado },
      { key: 'Reprogramado', label: 'Reprogramado', conteo: t.reprogramado },
    ];
  }, [totales]);

  const handleNueva = () => setDrawerForm({ abierto: true, editar: null });
  const handleEditar = (actividad: ActividadDTO) => {
    setModalDetalle(null);
    setDrawerForm({ abierto: true, editar: actividad });
  };
  const handleIrAMes = (fecha: Dayjs) => {
    setVista('mes');
    setFechaAncla(fecha);
  };
  const handleIrADia = (fecha: Dayjs) => {
    setVista('dia');
    setFechaAncla(fecha);
  };

  const handleGuardar = async (request: CrearActividadRequest) => {
    const editar = drawerForm.editar;
    try {
      if (editar) {
        await actividadApi.actualizar(editar.id, request);
        message.success('Actividad actualizada');
      } else {
        await actividadApi.crear(request);
        message.success('Actividad creada');
      }
      recargarDatos();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al guardar la actividad'));
      throw err;
    }
  };

  const handleCambiarEstado = async (actividad: ActividadDTO, estado: string) => {
    try {
      const actualizada = await actividadApi.cambiarEstado(actividad.id, { estado });
      message.success(`Estado cambiado a ${estado}`);
      setModalDetalle(actualizada);
      recargarDatos();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al cambiar el estado'));
    }
  };

  const handleEliminar = async (actividad: ActividadDTO) => {
    try {
      await actividadApi.eliminar(actividad.id);
      message.success('Actividad eliminada');
      setModalDetalle(null);
      recargarDatos();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al eliminar la actividad'));
    }
  };

  return (
    <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Actividades
          </Typography.Title>
          <Input.Search
            placeholder="Buscar actividades..."
            allowClear
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onSearch={(valor) => setBusquedaDebounced(valor.trim())}
            style={{ width: '100%', maxWidth: 360 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Colorear por
          </Typography.Text>
          <Select
            value={colorearPor}
            onChange={(valor) => setColorearPor(valor)}
            style={{ width: 150 }}
            aria-label="Colorear por"
            options={[
              { value: 'servicio', label: 'Servicio' },
              { value: 'responsable', label: 'Responsable' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <Button
            icon={<TagsOutlined />}
            onClick={() => navigate('/Actividades/Servicios')}
            aria-label="Tipos de servicio"
          >
            Tipos de servicio
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleNueva}>
            Nueva actividad
          </Button>
        </div>

        <Tabs
          activeKey={estadoFiltro}
          onChange={(key) => setEstadoFiltro(key)}
          items={pestanas.map((p) => ({
            key: p.key,
            // Con conteo 0 no se dibuja nada: ni el badge ni su padding,
            // para que la pestana no quede con un numero que no informa.
            label:
              p.conteo > 0 ? (
                <Badge count={p.conteo} size="small" offset={[6, -2]}>
                  <span style={{ paddingRight: 4 }}>{p.label}</span>
                </Badge>
              ) : (
                <span>{p.label}</span>
              ),
          }))}
        />

        <CalendarioActividades
          vista={vista}
          fechaAncla={fechaAncla}
          actividades={actividades}
          colorearPor={colorearPor}
          cargando={cargando}
          error={error}
          onCambiarVista={setVista}
          onNavegar={setFechaAncla}
          onReintentar={recargarDatos}
          onSeleccionarActividad={setModalDetalle}
          onIrAMes={handleIrAMes}
          onIrADia={handleIrADia}
        />
      </div>

      <DrawerFormularioActividad
        abierto={drawerForm.abierto}
        editar={drawerForm.editar}
        servicios={servicios}
        usuarios={usuarios}
        sucursalActiva={sucursalActiva}
        onGuardar={handleGuardar}
        onCancelar={() => setDrawerForm({ abierto: false, editar: null })}
      />

      <ModalDetalleActividad
        actividad={modalDetalle}
        abierto={modalDetalle !== null}
        onCerrar={() => setModalDetalle(null)}
        onEditar={handleEditar}
        onCambiarEstado={handleCambiarEstado}
        onEliminar={handleEliminar}
      />
    </Card>
  );
}
