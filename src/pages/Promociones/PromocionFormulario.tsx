import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Switch,
  Table,
  TimePicker,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Select } from '../../components/Select';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { promocionApi, mensajeErrorPromocion } from '../../api/promocionApi';
import type {
  PromocionDTO,
  PromocionRangoDTO,
  PromocionCatalogoFamiliaDTO,
  PromocionCatalogoGrupoDTO,
} from '../../types/promocion';
import { toTitleCase } from '../../utils/formats';

// `dayjs('07:00 AM', 'hh:mm A')` requiere el plugin customParseFormat.
// dayjs.extend es idempotente, por lo que es seguro llamarlo aquí aunque otros módulos lo extiendan.
dayjs.extend(customParseFormat);

const HORA_INICIO_DEFECTO = '07:00 AM';
const HORA_FINAL_DEFECTO = '11:00 PM';

type TramoCampo = 'montoInicio' | 'montoFin' | 'cuponPct' | 'cuponMonto' | 'compraMinima';

/** Acumula el catálogo de grupos sin descartar opciones ya cargadas (preserva las seleccionadas). */
function mergeCatalogoGrupos(
  prev: PromocionCatalogoGrupoDTO[],
  nuevos: PromocionCatalogoGrupoDTO[]
): PromocionCatalogoGrupoDTO[] {
  const mapa = new Map<string, PromocionCatalogoGrupoDTO>();
  prev.forEach((g) => mapa.set(g.codigo, g));
  nuevos.forEach((g) => mapa.set(g.codigo, g));
  return Array.from(mapa.values());
}

/** Acumula el catálogo de familias por `id` con el mismo criterio que grupos: sin descartar entradas y sin duplicar. */
function mergeCatalogoFamilias(
  prev: PromocionCatalogoFamiliaDTO[],
  nuevos: PromocionCatalogoFamiliaDTO[]
): PromocionCatalogoFamiliaDTO[] {
  const mapa = new Map<string, PromocionCatalogoFamiliaDTO>();
  prev.forEach((f) => mapa.set(f.id, f));
  nuevos.forEach((f) => mapa.set(f.id, f));
  return Array.from(mapa.values());
}

function labelGrupo(g: PromocionCatalogoGrupoDTO): string {
  const base = g.descripcion ? `${g.codigo} - ${g.descripcion}` : g.codigo;
  return `${base} · nivel ${g.nivel} · ${g.productos} productos`;
}

const PromocionFormulario: React.FC = () => {
  const { codigo } = useParams<{ codigo?: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MPromocion');

  const [form] = Form.useForm();

  const [data, setData] = useState<PromocionDTO | null>(null);
  const [familiasCatalogo, setFamiliasCatalogo] = useState<PromocionCatalogoFamiliaDTO[]>([]);
  const [familiasSeleccionadas, setFamiliasSeleccionadas] = useState<string[]>([]);
  const [gruposCatalogo, setGruposCatalogo] = useState<PromocionCatalogoGrupoDTO[]>([]);
  const [gruposSeleccionados, setGruposSeleccionados] = useState<string[]>([]);
  const [tramos, setTramos] = useState<PromocionRangoDTO[]>([]);
  const [cuponesEmitidos, setCuponesEmitidos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [buscandoGrupos, setBuscandoGrupos] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  const guardandoRef = useRef(false);
  const tramoIdRef = useRef(0);
  const gruposSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationConfirmedRef = useFormularioNavigation();

  const modo: 'crear' | 'editar' = codigo ? 'editar' : 'crear';

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride(modo === 'crear' ? 'Nueva Promoción' : 'Editar Promoción');

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, screenCode, modo]);

  const buscarGrupos = useCallback(
    async (busqueda: string) => {
      try {
        const resultados = await promocionApi.catalogoGrupos(sucursalActiva, {
          busqueda,
          cantidad: 50,
        });
        setGruposCatalogo((prev) => mergeCatalogoGrupos(prev, resultados || []));
      } catch (err: any) {
        message.error(mensajeErrorPromocion(err, 'Error al cargar el catálogo de grupos'));
      }
    },
    [sucursalActiva]
  );

  const nuevoTramo = useCallback((): PromocionRangoDTO => {
    tramoIdRef.current += 1;
    return {
      id: `t-${tramoIdRef.current}`,
      montoInicio: 0,
      montoFin: 0,
      cuponPct: 0,
      cuponMonto: 0,
      compraMinima: 0,
    };
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    setErrorCarga(false);
    setMensajeError('');

    // Catálogo de familias (fire-and-forget; no bloquea la carga). Se hace merge con lo ya
    // sembrado para no descartar las familias asociadas de FAMPROM ni duplicarlas por `id`.
    promocionApi
      .catalogoFamilias(sucursalActiva)
      .then((listado) =>
        setFamiliasCatalogo((prev) => mergeCatalogoFamilias(prev, listado || []))
      )
      .catch((err: any) => message.error(mensajeErrorPromocion(err, 'Error al cargar el catálogo de familias')));

    try {
      if (!codigo) {
        setData(null);
        setCuponesEmitidos(0);
        setFamiliasSeleccionadas([]);
        setGruposSeleccionados([]);
        setGruposCatalogo([]);
        setTramos([nuevoTramo()]);
        form.resetFields();
        form.setFieldsValue({
          horaInicio: dayjs(HORA_INICIO_DEFECTO, 'hh:mm A'),
          horaFinal: dayjs(HORA_FINAL_DEFECTO, 'hh:mm A'),
        });
        // Precarga las primeras opciones del selector de grupos.
        buscarGrupos('');
        return;
      }

      const datos = await promocionApi.obtenerPorId(sucursalActiva, codigo);

      if (!datos) {
        setErrorCarga(true);
        setMensajeError('La promoción no existe en esta sucursal.');
        return;
      }

      setData(datos);
      setPageTitleOverride(`Editando: ${datos.id || codigo} - ${toTitleCase(datos.descripcion || '')}`);

      form.setFieldsValue({
        descripcion: datos.descripcion || '',
        referencia: datos.referencia || '',
        fechaInicio: datos.fechaInicio ? dayjs(datos.fechaInicio) : undefined,
        fechaFinal: datos.fechaFinal ? dayjs(datos.fechaFinal) : undefined,
        fechaCuponInicio: datos.fechaCuponInicio ? dayjs(datos.fechaCuponInicio) : undefined,
        fechaCuponFinal: datos.fechaCuponFinal ? dayjs(datos.fechaCuponFinal) : undefined,
        horaInicio: datos.horaInicio
          ? dayjs(datos.horaInicio, 'hh:mm A')
          : dayjs(HORA_INICIO_DEFECTO, 'hh:mm A'),
        horaFinal: datos.horaFinal
          ? dayjs(datos.horaFinal, 'hh:mm A')
          : dayjs(HORA_FINAL_DEFECTO, 'hh:mm A'),
        credito: datos.credito,
        cupones: datos.cupones ?? undefined,
        formato: datos.formato || '',
      });

      setFamiliasSeleccionadas((datos.familias || []).map((f) => f.familiaId));
      // Siembra el catálogo de familias con las ya asociadas (FAMPROM) para que el selector
      // y el payload tengan nombre aunque el catálogo completo aún no termine de cargar.
      // El catálogo (FAMILIA) es la fuente canónica, por eso se pasa en la posición `nuevos`
      // del merge: gana sobre lo sembrado sin descartar entradas ni duplicar por `id`.
      setFamiliasCatalogo((actual) =>
        mergeCatalogoFamilias(
          (datos.familias || []).map((f) => ({ id: f.familiaId, nombre: f.nombre })),
          actual
        )
      );
      setGruposSeleccionados((datos.grupos || []).map((g) => g.grupoId));
      setGruposCatalogo(
        (datos.grupos || []).map((g) => ({
          codigo: g.grupoId,
          descripcion: g.descripcion,
          nivel: g.nivel,
          productos: g.productos,
        }))
      );
      setTramos(datos.tramos || []);

      // Precarga el selector de grupos conservando los ya asociados.
      buscarGrupos('');

      // Cupones emitidos (informativo; no bloquea).
      promocionApi
        .obtenerCupones(sucursalActiva, codigo)
        .then((n) => setCuponesEmitidos(n ?? 0))
        .catch((err: any) => message.error(mensajeErrorPromocion(err, 'Error al consultar los cupones emitidos')));
    } catch (err: any) {
      setErrorCarga(true);
      setMensajeError(mensajeErrorPromocion(err, 'Error al cargar la promoción'));
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalActiva, form, setPageTitleOverride, buscarGrupos, nuevoTramo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleBuscarGrupos = useCallback(
    (busqueda: string) => {
      // Firebird revienta con CAST largos en el catálogo de grupos; el backend trunca,
      // pero recortamos aquí para que el texto buscado y el enviado coincidan.
      const recortada = busqueda.slice(0, 40);
      if (gruposSearchRef.current) clearTimeout(gruposSearchRef.current);
      gruposSearchRef.current = setTimeout(() => {
        setBuscandoGrupos(true);
        buscarGrupos(recortada).finally(() => setBuscandoGrupos(false));
      }, 300);
    },
    [buscarGrupos]
  );

  useEffect(() => {
    return () => {
      if (gruposSearchRef.current) clearTimeout(gruposSearchRef.current);
    };
  }, []);

  const actualizarTramo = (id: string, campo: TramoCampo, valor: number) => {
    setTramos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, [campo]: valor } as PromocionRangoDTO;
      })
    );
  };

  const eliminarTramo = (id: string) => {
    setTramos((prev) => prev.filter((t) => t.id !== id));
  };

  const agregarTramo = () => {
    setTramos((prev) => [...prev, nuevoTramo()]);
  };

  const igualarFechasCupon = () => {
    const fechaInicio = form.getFieldValue('fechaInicio');
    const fechaFinal = form.getFieldValue('fechaFinal');
    form.setFieldsValue({
      fechaCuponInicio: fechaInicio ?? undefined,
      fechaCuponFinal: fechaFinal ?? undefined,
    });
  };

  const validarTramos = (): string | null => {
    if (tramos.length === 0) {
      return 'La promoción debe tener al menos un tramo.';
    }

    for (let i = 0; i < tramos.length; i++) {
      const t = tramos[i];
      const numero = i + 1;
      if (t.montoFin < t.montoInicio) {
        return `En el tramo ${numero}, el monto final no puede ser menor que el monto inicial.`;
      }
      if (t.cuponPct <= 0 && t.cuponMonto <= 0) {
        return `En el tramo ${numero}, debe indicar un porcentaje de cupón o un monto de cupón mayor que cero.`;
      }
    }

    const ordenados = [...tramos].sort((a, b) => a.montoInicio - b.montoInicio);
    for (let i = 1; i < ordenados.length; i++) {
      const anterior = ordenados[i - 1];
      const actual = ordenados[i];
      if (actual.montoInicio <= anterior.montoFin) {
        return (
          `Los tramos se solapan: el tramo que inicia en ${actual.montoInicio.toFixed(2)} ` +
          `debe iniciar después de ${anterior.montoFin.toFixed(2)}. Debe haber separación entre tramos.`
        );
      }
    }

    return null;
  };

  const handleGuardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();

      const errorTramos = validarTramos();
      if (errorTramos) {
        message.warning(errorTramos);
        return;
      }

      if (familiasSeleccionadas.length === 0) {
        message.warning('Debe seleccionar al menos una familia; sin familias la promoción no emitiría cupones.');
        return;
      }

      if (
        values.fechaInicio &&
        values.fechaFinal &&
        values.fechaFinal.isBefore(values.fechaInicio, 'day')
      ) {
        message.warning('La fecha final no puede ser menor que la fecha de inicio.');
        return;
      }

      // El backend usa DateTime estándar: se envía ISO 8601 en el body (mismo precedente
      // que AjusteAlmacenFormulario). Las fechas de cupón vacías se igualan a las de la promoción.
      const fechaInicio = values.fechaInicio.format('YYYY-MM-DDTHH:mm:ss');
      const fechaFinal = values.fechaFinal.format('YYYY-MM-DDTHH:mm:ss');
      const fechaCuponInicio = values.fechaCuponInicio
        ? values.fechaCuponInicio.format('YYYY-MM-DDTHH:mm:ss')
        : fechaInicio;
      const fechaCuponFinal = values.fechaCuponFinal
        ? values.fechaCuponFinal.format('YYYY-MM-DDTHH:mm:ss')
        : fechaFinal;

      const payload: PromocionDTO = {
        id: codigo ?? '',
        descripcion: (values.descripcion ?? '').trim(),
        referencia: (values.referencia ?? '').trim(),
        fechaInicio,
        fechaFinal,
        fechaCuponInicio,
        fechaCuponFinal,
        horaInicio: values.horaInicio
          ? values.horaInicio.format('hh:mm A')
          : HORA_INICIO_DEFECTO,
        horaFinal: values.horaFinal ? values.horaFinal.format('hh:mm A') : HORA_FINAL_DEFECTO,
        activa: data?.activa ?? false,
        credito: values.credito ?? false,
        cupones: values.cupones == null ? 0 : values.cupones,
        cupComp: data?.cupComp ?? 1,
        formato: (values.formato ?? '').trim(),
        familias: familiasSeleccionadas.map((familiaId) => {
          const delCatalogo = familiasCatalogo.find((f) => f.id === familiaId);
          const asociada = (data?.familias || []).find((f) => f.familiaId === familiaId);
          return {
            familiaId,
            // Orden de prioridad: nombre del catálogo acumulado → nombre ya guardado en
            // FAMPROM (`datos.familias`) → cadena vacía.
            nombre: delCatalogo?.nombre || asociada?.nombre || '',
            promocion: true,
            consumo: false,
          };
        }),
        grupos: gruposSeleccionados.map((cod) => {
          const g = gruposCatalogo.find((x) => x.codigo === cod);
          return {
            grupoId: cod,
            descripcion: g?.descripcion || '',
            nivel: g?.nivel || 0,
            productos: g?.productos || 0,
            promocion: true,
          };
        }),
        tramos: [...tramos]
          .sort((a, b) => a.montoInicio - b.montoInicio)
          .map((t) => ({ ...t, id: '' })),
        advertencias: [],
      };

      const res =
        modo === 'crear'
          ? await promocionApi.crear(sucursalActiva, payload)
          : await promocionApi.actualizar(sucursalActiva, codigo!, payload);

      if (res.advertencias && res.advertencias.length > 0) {
        Modal.warning({
          title: 'Promoción guardada con advertencias',
          content: (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {res.advertencias.map((adv, idx) => (
                <li key={idx}>{adv}</li>
              ))}
            </ul>
          ),
          onOk: () => {
            navigationConfirmedRef.current = true;
            navigate('/MPromocion', { replace: true });
          },
        });
      } else {
        message.success(modo === 'crear' ? 'Promoción creada correctamente' : 'Promoción actualizada correctamente');
        navigationConfirmedRef.current = true;
        navigate('/MPromocion', { replace: true });
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(mensajeErrorPromocion(err, 'Error al guardar la promoción'));
    } finally {
      setGuardando(false);
      guardandoRef.current = false;
    }
  };

  const handleVolver = () => {
    if (guardando) return;
    navigationConfirmedRef.current = true;
    navigate('/MPromocion', { replace: true });
  };

  const tramoColumns: ColumnsType<PromocionRangoDTO> = [
    {
      title: 'Monto desde',
      dataIndex: 'montoInicio',
      width: 130,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          value={t.montoInicio}
          onChange={(v) => actualizarTramo(t.id, 'montoInicio', v ?? 0)}
        />
      ),
    },
    {
      title: 'Monto hasta',
      dataIndex: 'montoFin',
      width: 130,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          value={t.montoFin}
          onChange={(v) => actualizarTramo(t.id, 'montoFin', v ?? 0)}
        />
      ),
    },
    {
      title: '% cupón',
      dataIndex: 'cuponPct',
      width: 110,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          value={t.cuponPct}
          onChange={(v) => actualizarTramo(t.id, 'cuponPct', v ?? 0)}
        />
      ),
    },
    {
      title: 'Monto cupón',
      dataIndex: 'cuponMonto',
      width: 130,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          value={t.cuponMonto}
          onChange={(v) => actualizarTramo(t.id, 'cuponMonto', v ?? 0)}
        />
      ),
    },
    {
      title: 'Compra mínima',
      dataIndex: 'compraMinima',
      width: 130,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <InputNumber
          size="small"
          min={0}
          precision={2}
          style={{ width: '100%' }}
          value={t.compraMinima}
          onChange={(v) => actualizarTramo(t.id, 'compraMinima', v ?? 0)}
        />
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 60,
      render: (_: unknown, t: PromocionRangoDTO) => (
        <Button
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => eliminarTramo(t.id)}
        />
      ),
    },
  ];

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MPromocion"
      loading={loading}
      mensajeLoading={modo === 'crear' ? 'Preparando formulario...' : 'Cargando promoción...'}
      loadingError={errorCarga}
      mensajeError={mensajeError || 'Error al cargar formulario de promoción'}
      onRecargar={cargar}
      dataDisponible={modo === 'crear' || !!data}
      modo={modo}
      onGuardar={handleGuardar}
      guardando={guardando}
      onVolver={handleVolver}
    >
      {modo === 'editar' && cuponesEmitidos > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Esta promoción ya tiene ${cuponesEmitidos} cupón(es) emitido(s). Los cambios aplican solo a los cupones nuevos.`}
        />
      )}

      <Form form={form} layout="vertical" size="small" style={{ marginBottom: 16 }} disabled={guardando}>
        <Card title="Datos generales" className="paces-card" style={{ marginBottom: 16 }}>
          {modo === 'crear' && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="La promoción se creará sin diseño de boleto asignado. El cupón no podrá imprimirse hasta que se asigne el reporte."
            />
          )}
          <Row gutter={[16, 0]}>
            {modo === 'editar' && (
              <Col xs={24} sm={12} lg={8}>
                <Form.Item label="ID">
                  <Input value={data?.id || codigo} disabled />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12} lg={modo === 'editar' ? 16 : 24}>
              <Form.Item
                name="descripcion"
                label="Descripción"
                rules={[
                  { required: true, message: 'La descripción es obligatoria' },
                  { max: 60, message: 'Máximo 60 caracteres' },
                ]}
              >
                <Input placeholder="Ej: Promoción de aniversario" maxLength={60} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="referencia" label="Referencia" rules={[{ max: 20, message: 'Máximo 20 caracteres' }]}>
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="fechaInicio"
                label="Fecha inicio"
                rules={[{ required: true, message: 'La fecha de inicio es obligatoria' }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="fechaFinal"
                label="Fecha final"
                rules={[{ required: true, message: 'La fecha final es obligatoria' }]}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="horaInicio"
                label="Hora inicio"
                tooltip="Ventana horaria en la que la factura acumula."
              >
                <TimePicker format="hh:mm A" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="horaFinal"
                label="Hora final"
                tooltip="Ventana horaria en la que la factura acumula."
              >
                <TimePicker format="hh:mm A" minuteStep={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="fechaCuponInicio"
                label="Fecha inicio de cupón"
                tooltip="Si se deja vacía, se iguala a la fecha de inicio de la promoción."
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="fechaCuponFinal"
                label="Fecha final de cupón"
                tooltip="Si se deja vacía, se iguala a la fecha final de la promoción."
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item label=" ">
                <Button size="small" onClick={igualarFechasCupon}>
                  Igualar a las fechas de la promoción
                </Button>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="credito"
                label="Aplica a ventas a crédito"
                valuePropName="checked"
                tooltip="Si está apagado, solo acumula en ventas de contado."
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item name="cupones" label="Cupones" tooltip="0 = sin tope">
                <InputNumber min={0} precision={0} max={32767} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Form.Item
                name="formato"
                label="Formato"
                rules={[{ max: 40, message: 'Máximo 40 caracteres' }]}
                tooltip="Nombre del formato de impresión del boleto. El diseño del reporte se asigna después; no se modifica desde aquí."
              >
                <Input maxLength={40} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Tramos (RANGOPROM)" className="paces-card" style={{ marginBottom: 16 }}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Debe haber separación entre tramos: el monto inicial de un tramo debe ser mayor que el monto final del anterior (no pueden ser contiguos)."
          />
          <Table<PromocionRangoDTO>
            columns={tramoColumns}
            dataSource={tramos}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ x: 800 }}
          />
          <Button type="dashed" icon={<PlusOutlined />} onClick={agregarTramo} style={{ marginTop: 12 }}>
            Agregar tramo
          </Button>
        </Card>

        <Card title="Familias (FAMPROM)" className="paces-card" style={{ marginBottom: 16 }}>
          <Form.Item label="Familias" required help="Solo estas familias acumulan para la promoción.">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Seleccione las familias"
              value={familiasSeleccionadas}
              onChange={(vals: string[]) => setFamiliasSeleccionadas(vals)}
              options={familiasCatalogo.map((f) => ({
                value: f.id,
                label: `${f.id} - ${f.nombre}`,
              }))}
            />
          </Form.Item>
        </Card>

        <Card title="Grupos (GRUPPROM)" className="paces-card" style={{ marginBottom: 16 }}>
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="El motor no hereda jerarquía: un grupo padre no incluye a sus hijos. Selecciona los códigos exactos que deben acumular."
          />
          <Form.Item label="Grupos" help="Opcional. Los grupos seleccionados también acumulan para la promoción.">
            <Select
              mode="multiple"
              showSearch
              filterOption={false}
              placeholder="Buscar grupos..."
              value={gruposSeleccionados}
              onChange={(vals: string[]) => setGruposSeleccionados(vals)}
              onSearch={handleBuscarGrupos}
              loading={buscandoGrupos}
              notFoundContent={buscandoGrupos ? 'Buscando...' : 'Escriba para buscar grupos'}
              options={gruposCatalogo.map((g) => ({
                value: g.codigo,
                label: labelGrupo(g),
              }))}
            />
          </Form.Item>
        </Card>
      </Form>
    </DetalleCatalogoLayout>
  );
};

export default PromocionFormulario;
