import {
  Alert,
  Button,
  Empty,
  Grid,
  Popover,
  Segmented,
  Select,
  Spin,
  theme,
  Typography,
} from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { ActividadDTO } from '../../../types/actividad';
import {
  ALTURA_HORA,
  DIAS_SEMANA,
  HORAS_DIA,
  MESES,
  agruparPorDia,
  aclararColor,
  calcularBloqueHora,
  claveDia,
  colorBaseActividad,
  densidadDia,
  inicioSemana,
  navegarPeriodo,
  tituloPeriodo,
} from '../utils/calendario';
import type { CriterioColor, VistaCalendario } from '../utils/calendario';

interface CalendarioActividadesProps {
  vista: VistaCalendario;
  fechaAncla: Dayjs;
  actividades: ActividadDTO[];
  colorearPor: CriterioColor;
  cargando: boolean;
  error: string | null;
  onCambiarVista: (vista: VistaCalendario) => void;
  onNavegar: (fecha: Dayjs) => void;
  onReintentar: () => void;
  onSeleccionarActividad: (actividad: ActividadDTO) => void;
  onIrAMes?: (fecha: Dayjs) => void;
  onIrADia?: (fecha: Dayjs) => void;
}

export default function CalendarioActividades(props: CalendarioActividadesProps) {
  const {
    vista,
    fechaAncla,
    actividades,
    colorearPor,
    cargando,
    error,
    onCambiarVista,
    onNavegar,
    onReintentar,
    onSeleccionarActividad,
    onIrAMes,
    onIrADia,
  } = props;

  const screens = Grid.useBreakpoint();

  const porDia = agruparPorDia(actividades);

  // En pantallas angostas se reduce el numero de bloques visibles por celda.
  const maxVisible = screens.lg ? 3 : screens.sm ? 2 : 1;

  const anioActual = dayjs().year();
  const opcionesAnio = Array.from({ length: 11 }, (_, i) => ({
    value: anioActual - 5 + i,
    label: String(anioActual - 5 + i),
  }));
  const opcionesMes = MESES.map((m, i) => ({ value: i, label: m }));

  const handleCambiarMes = (mes: number) => {
    // date(1) evita desbordes de dia (ej: 31 de enero -> febrero).
    onNavegar(fechaAncla.date(1).month(mes));
  };
  const handleCambiarAnio = (anio: number) => {
    onNavegar(fechaAncla.year(anio));
  };

  const cuerpo = (() => {
    if (cargando) {
      return (
        <div style={{ minHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <Spin size="large" />
          <Typography.Text type="secondary">Cargando actividades...</Typography.Text>
        </div>
      );
    }
    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          message="No se pudieron cargar las actividades"
          description={error}
          action={
            <Button size="small" onClick={onReintentar}>
              Reintentar
            </Button>
          }
        />
      );
    }
    if (actividades.length === 0) {
      return (
        <Empty
          description="No hay actividades en este periodo"
          style={{ padding: '48px 0' }}
        />
      );
    }
    switch (vista) {
      case 'mes':
        return (
          <VistaMes
            fechaAncla={fechaAncla}
            porDia={porDia}
            colorearPor={colorearPor}
            maxVisible={maxVisible}
            onSeleccionar={onSeleccionarActividad}
          />
        );
      case 'semana':
        return (
          <VistaSemana
            fechaAncla={fechaAncla}
            porDia={porDia}
            colorearPor={colorearPor}
            onSeleccionar={onSeleccionarActividad}
          />
        );
      case 'dia':
        return (
          <VistaDia
            fechaAncla={fechaAncla}
            porDia={porDia}
            colorearPor={colorearPor}
            onSeleccionar={onSeleccionarActividad}
          />
        );
      case 'ano':
        return (
          <VistaAno
            fechaAncla={fechaAncla}
            porDia={porDia}
            onIrAMes={onIrAMes}
            onIrADia={onIrADia}
          />
        );
    }
  })();

  return (
    <div>
      {/* Barra de navegacion del periodo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Button
          icon={<LeftOutlined />}
          onClick={() => onNavegar(navegarPeriodo(vista, fechaAncla, -1))}
          aria-label="Periodo anterior"
        />
        <Button onClick={() => onNavegar(dayjs())}>Hoy</Button>
        <Button
          icon={<RightOutlined />}
          onClick={() => onNavegar(navegarPeriodo(vista, fechaAncla, 1))}
          aria-label="Periodo siguiente"
        />
        <Typography.Text strong style={{ minWidth: 180, textAlign: 'center' }}>
          {tituloPeriodo(vista, fechaAncla)}
        </Typography.Text>
        <div style={{ flex: 1 }} />
        {vista !== 'ano' && (
          <Select
            size="small"
            style={{ width: 128 }}
            value={fechaAncla.month()}
            onChange={handleCambiarMes}
            options={opcionesMes}
            aria-label="Seleccionar mes"
          />
        )}
        <Select
          size="small"
          style={{ width: 92 }}
          value={fechaAncla.year()}
          onChange={handleCambiarAnio}
          options={opcionesAnio}
          aria-label="Seleccionar año"
        />
        <Segmented
          value={vista}
          onChange={(valor) => onCambiarVista(valor as VistaCalendario)}
          options={[
            { label: 'Mes', value: 'mes' },
            { label: 'Semana', value: 'semana' },
            { label: 'Día', value: 'dia' },
            { label: 'Año', value: 'ano' },
          ]}
        />
      </div>

      {cuerpo}
    </div>
  );
}

/* ── Vista Mes ──────────────────────────────────────────────────────── */

interface VistaMesProps {
  fechaAncla: Dayjs;
  porDia: Map<string, ActividadDTO[]>;
  colorearPor: CriterioColor;
  maxVisible: number;
  onSeleccionar: (actividad: ActividadDTO) => void;
}

function VistaMes({ fechaAncla, porDia, colorearPor, maxVisible, onSeleccionar }: VistaMesProps) {
  const { token } = theme.useToken();
  const inicio = fechaAncla.startOf('month');
  // La grilla arranca el lunes anterior al 1 del mes y muestra 42 dias (6 semanas).
  const inicioGrilla = inicioSemana(inicio);
  const celdas = Array.from({ length: 42 }, (_, i) => inicioGrilla.add(i, 'day'));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div
        role="grid"
        aria-label="Calendario mensual"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          minWidth: 700,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
        }}
      >
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            role="columnheader"
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontWeight: 600,
              fontSize: token.fontSizeSM,
              color: token.colorTextSecondary,
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              background: token.colorBgLayout,
            }}
          >
            {dia}
          </div>
        ))}

        {celdas.map((dia) => {
          const esMesActual = dia.month() === inicio.month();
          const actividadesDia = porDia.get(claveDia(dia)) ?? [];
          return (
            <div
              key={claveDia(dia)}
              role="gridcell"
              style={{
                minHeight: 96,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                background: esMesActual ? token.colorBgContainer : token.colorBgLayout,
                padding: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div
                style={{
                  fontSize: token.fontSizeSM,
                  fontWeight: esMesActual ? 500 : 400,
                  color: esMesActual ? token.colorText : token.colorTextQuaternary,
                  textAlign: 'right',
                  padding: '0 2px 2px',
                }}
              >
                {dia.date()}
              </div>

              {esMesActual &&
                actividadesDia.slice(0, maxVisible).map((actividad) => (
                  <BloqueActividad
                    key={actividad.id}
                    actividad={actividad}
                    colorearPor={colorearPor}
                    onSeleccionar={onSeleccionar}
                  />
                ))}

              {esMesActual && actividadesDia.length > maxVisible && (
                <Popover
                  trigger="click"
                  content={
                    <div style={{ maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {actividadesDia.slice(maxVisible).map((actividad) => (
                        <button
                          key={actividad.id}
                          type="button"
                          onClick={() => onSeleccionar(actividad)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            textAlign: 'left',
                            padding: '2px 0',
                            color: token.colorText,
                            fontSize: token.fontSizeSM,
                          }}
                        >
                          {dayjs(actividad.fechaInicio).format('HH:mm')} · {actividad.titulo}
                        </button>
                      ))}
                    </div>
                  }
                >
                  <button
                    type="button"
                    aria-label={`Ver ${actividadesDia.length - maxVisible} actividades más`}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                      color: token.colorPrimary,
                      fontSize: token.fontSizeSM - 1,
                    }}
                  >
                    +{actividadesDia.length - maxVisible} más
                  </button>
                </Popover>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Bloque de actividad ────────────────────────────────────────────── */

interface BloqueActividadProps {
  actividad: ActividadDTO;
  colorearPor: CriterioColor;
  onSeleccionar: (actividad: ActividadDTO) => void;
}

function BloqueActividad({ actividad, colorearPor, onSeleccionar }: BloqueActividadProps) {
  const { token } = theme.useToken();
  const base = colorBaseActividad(actividad, colorearPor, token.colorPrimary);
  const fondo = aclararColor(base);
  return (
    <button
      type="button"
      onClick={() => onSeleccionar(actividad)}
      aria-label={`Actividad ${actividad.numero || actividad.id}: ${actividad.titulo}`}
      title={actividad.titulo}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        width: '100%',
        border: 'none',
        borderRadius: token.borderRadiusSM,
        borderLeft: `3px solid ${base}`,
        background: fondo,
        padding: '2px 4px',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: token.fontSizeSM,
        color: token.colorText,
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <span style={{ whiteSpace: 'nowrap', color: token.colorTextSecondary, fontSize: 10, flexShrink: 0 }}>
        {dayjs(actividad.fechaInicio).format('HH:mm')}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {actividad.titulo}
      </span>
    </button>
  );
}

/* ── Vista Semana / Dia (columna de horas) ──────────────────────────── */

interface VistaSemanaProps {
  fechaAncla: Dayjs;
  porDia: Map<string, ActividadDTO[]>;
  colorearPor: CriterioColor;
  onSeleccionar: (actividad: ActividadDTO) => void;
}

function VistaSemana({ fechaAncla, porDia, colorearPor, onSeleccionar }: VistaSemanaProps) {
  const { token } = theme.useToken();
  const inicio = inicioSemana(fechaAncla);
  const dias = Array.from({ length: 7 }, (_, i) => inicio.add(i, 'day'));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 720 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderBottom: 0,
            borderTopLeftRadius: token.borderRadiusLG,
            borderTopRightRadius: token.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div />
          {dias.map((dia) => (
            <div
              key={claveDia(dia)}
              role="columnheader"
              style={{
                padding: '8px 4px',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: token.fontSizeSM,
                color: token.colorTextSecondary,
                borderLeft: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {DIAS_SEMANA[dia.day() === 0 ? 6 : dia.day() - 1]} {dia.format('D')}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderBottomLeftRadius: token.borderRadiusLG,
            borderBottomRightRadius: token.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <ColumnaHoras />
          {dias.map((dia) => (
            <ColumnaDia
              key={claveDia(dia)}
              dia={dia}
              actividades={porDia.get(claveDia(dia)) ?? []}
              colorearPor={colorearPor}
              onSeleccionar={onSeleccionar}
              conBorde={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VistaDia({ fechaAncla, porDia, colorearPor, onSeleccionar }: VistaSemanaProps) {
  const { token } = theme.useToken();
  const dia = fechaAncla.startOf('day');
  const actividadesDia = porDia.get(claveDia(dia)) ?? [];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 480, maxWidth: 760 }}>
        <div
          role="columnheader"
          style={{
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: token.fontSize,
            color: token.colorText,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderBottom: 0,
            borderTopLeftRadius: token.borderRadiusLG,
            borderTopRightRadius: token.borderRadiusLG,
          }}
        >
          {dia.format('dddd, D [de] MMMM YYYY')}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr',
            border: `1px solid ${token.colorBorderSecondary}`,
            borderBottomLeftRadius: token.borderRadiusLG,
            borderBottomRightRadius: token.borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <ColumnaHoras />
          <ColumnaDia
            dia={dia}
            actividades={actividadesDia}
            colorearPor={colorearPor}
            onSeleccionar={onSeleccionar}
            conBorde={false}
          />
        </div>
      </div>
    </div>
  );
}

function ColumnaHoras() {
  const { token } = theme.useToken();
  return (
    <div>
      {HORAS_DIA.map((hora) => (
        <div
          key={hora}
          style={{
            height: ALTURA_HORA,
            fontSize: 10,
            color: token.colorTextSecondary,
            textAlign: 'right',
            paddingRight: 6,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {String(hora).padStart(2, '0')}:00
        </div>
      ))}
    </div>
  );
}

interface ColumnaDiaProps {
  dia: Dayjs;
  actividades: ActividadDTO[];
  colorearPor: CriterioColor;
  onSeleccionar: (actividad: ActividadDTO) => void;
  conBorde: boolean;
}

function ColumnaDia({ dia, actividades, colorearPor, onSeleccionar, conBorde }: ColumnaDiaProps) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        position: 'relative',
        height: HORAS_DIA.length * ALTURA_HORA,
        borderLeft: conBorde ? `1px solid ${token.colorBorderSecondary}` : undefined,
      }}
    >
      {HORAS_DIA.map((hora) => (
        <div
          key={hora}
          style={{
            position: 'absolute',
            top: hora * ALTURA_HORA,
            left: 0,
            right: 0,
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {actividades.map((actividad) => {
        const bloque = calcularBloqueHora(actividad, dia);
        const base = colorBaseActividad(actividad, colorearPor, token.colorPrimary);
        return (
          <button
            key={actividad.id}
            type="button"
            onClick={() => onSeleccionar(actividad)}
            aria-label={`Actividad ${actividad.numero || actividad.id}: ${actividad.titulo}`}
            title={actividad.titulo}
            style={{
              position: 'absolute',
              top: bloque.top,
              left: 2,
              right: 2,
              height: bloque.alto,
              border: 'none',
              borderLeft: `3px solid ${base}`,
              background: aclararColor(base),
              borderRadius: token.borderRadiusSM,
              padding: bloque.delgada ? 0 : '2px 4px',
              overflow: 'hidden',
              cursor: 'pointer',
              textAlign: 'left',
              color: token.colorText,
              fontSize: token.fontSizeSM,
              minWidth: 0,
              display: 'block',
            }}
          >
            {!bloque.delgada && (
              <>
                <span
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {actividad.titulo}
                </span>
                <span style={{ display: 'block', fontSize: 10, color: token.colorTextSecondary }}>
                  {dayjs(actividad.fechaInicio).format('HH:mm')}
                  {actividad.fechaFin ? ` - ${dayjs(actividad.fechaFin).format('HH:mm')}` : ''}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Vista Anual ────────────────────────────────────────────────────── */

interface VistaAnoProps {
  fechaAncla: Dayjs;
  porDia: Map<string, ActividadDTO[]>;
  onIrAMes?: (fecha: Dayjs) => void;
  onIrADia?: (fecha: Dayjs) => void;
}

function VistaAno({ fechaAncla, porDia, onIrAMes, onIrADia }: VistaAnoProps) {
  const anio = fechaAncla.year();
  const meses = Array.from({ length: 12 }, (_, i) => dayjs().year(anio).month(i).startOf('month'));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
      {meses.map((mes) => (
        <MiniMes
          key={mes.month()}
          mesInicio={mes}
          porDia={porDia}
          onIrAMes={onIrAMes}
          onIrADia={onIrADia}
        />
      ))}
    </div>
  );
}

interface MiniMesProps {
  mesInicio: Dayjs;
  porDia: Map<string, ActividadDTO[]>;
  onIrAMes?: (fecha: Dayjs) => void;
  onIrADia?: (fecha: Dayjs) => void;
}

function MiniMes({ mesInicio, porDia, onIrAMes, onIrADia }: MiniMesProps) {
  const { token } = theme.useToken();
  const inicioGrilla = inicioSemana(mesInicio);
  const celdas = Array.from({ length: 42 }, (_, i) => inicioGrilla.add(i, 'day'));
  const iniciales = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 8,
        background: token.colorBgContainer,
      }}
    >
      <button
        type="button"
        onClick={() => onIrAMes?.(mesInicio)}
        aria-label={`Ver ${mesInicio.format('MMMM YYYY')}`}
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: '2px 4px 8px',
          fontWeight: 600,
          fontSize: token.fontSizeSM,
          color: token.colorText,
          display: 'block',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {mesInicio.format('MMMM YYYY')}
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {iniciales.map((inicial, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: token.colorTextSecondary,
              paddingBottom: 2,
            }}
          >
            {inicial}
          </div>
        ))}
        {celdas.map((dia) => {
          const esMesActual = dia.month() === mesInicio.month();
          const cantidad = (porDia.get(claveDia(dia)) ?? []).length;
          return (
            <button
              key={claveDia(dia)}
              type="button"
              onClick={() => {
                if (esMesActual) onIrADia?.(dia);
              }}
              aria-label={`${dia.format('D [de] MMMM')}: ${cantidad} actividad${cantidad === 1 ? '' : 'es'}`}
              style={{
                height: 26,
                borderRadius: token.borderRadiusSM,
                border: 'none',
                cursor: esMesActual ? 'pointer' : 'default',
                background: esMesActual ? densidadDia(cantidad, token.colorPrimary) : 'transparent',
                color: esMesActual ? token.colorText : token.colorTextQuaternary,
                fontSize: 11,
                opacity: esMesActual ? 1 : 0.45,
              }}
            >
              {dia.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
