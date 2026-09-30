import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Space,
  Spin,
  Switch,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { rolApi } from '../../api/rolApi';
import { permisoEspecialApi } from '../../api/permisoEspecialApi';
import { useAuthStore } from '../../stores/authStore';
import { useFormularioNavigation } from '../../hooks/useFormularioNavigation';
import PermissionGate from '../../components/PermissionGate';
import type { RolFullDTO } from '../../types/administracion';
import type {
  AuthPermisoEspecialDTO,
  PantallaDTO,
  PermisoEspecialConRolDTO,
} from '../../types/auth';

const { Text, Title } = Typography;

type RolFormValues = Pick<RolFullDTO, 'nombre' | 'descripcion' | 'activo'>;

type PermisoValor = {
  valor: boolean;
  valorNumerico?: number;
};

type PermisosPorPantalla = Record<number, Record<number, PermisoValor>>;

type GrupoModulo = {
  key: string;
  nombre: string;
  orden: number;
  pantallas: PantallaDTO[];
};

type ApiError = {
  response?: {
    data?: {
      errorMessage?: string;
      message?: string;
    };
  };
};

const obtenerMensajeError = (error: unknown, mensajePredeterminado: string) => {
  const apiError = error as ApiError;
  return (
    apiError.response?.data?.errorMessage ??
    apiError.response?.data?.message ??
    (error instanceof Error ? error.message : mensajePredeterminado)
  );
};

const normalizarTexto = (texto?: string) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const obtenerFirmaRol = (
  rol: Pick<RolFullDTO, 'nombre' | 'descripcion' | 'activo' | 'pantallas'>,
) =>
  JSON.stringify({
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    activo: rol.activo,
    pantallas: rol.pantallas,
  });

const fusionarPantallas = (...listas: PantallaDTO[][]): PantallaDTO[] => {
  const resultado = new Map<number, PantallaDTO>();

  listas.flat().forEach((pantalla) => {
    const existente = resultado.get(pantalla.id);
    if (!existente) {
      resultado.set(pantalla.id, {
        ...pantalla,
        acciones: [...(pantalla.acciones ?? [])],
        modulos: [...(pantalla.modulos ?? [])],
        permisosEspeciales: [...(pantalla.permisosEspeciales ?? [])],
      });
      return;
    }

    const modulos = new Map(existente.modulos.map((modulo) => [modulo.id, modulo]));
    (pantalla.modulos ?? []).forEach((modulo) => modulos.set(modulo.id, modulo));

    resultado.set(pantalla.id, {
      ...existente,
      ...pantalla,
      acciones: [...new Set([...(existente.acciones ?? []), ...(pantalla.acciones ?? [])])],
      modulos: [...modulos.values()],
      permisosEspeciales: [
        ...new Set([
          ...(existente.permisosEspeciales ?? []),
          ...(pantalla.permisosEspeciales ?? []),
        ]),
      ],
    });
  });

  return [...resultado.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
};

const fusionarCatalogoPermisos = (
  catalogo: AuthPermisoEspecialDTO[],
  asignados: PermisoEspecialConRolDTO[],
) => {
  const resultado = new Map<number, AuthPermisoEspecialDTO>();
  catalogo.filter((permiso) => permiso.activo).forEach((permiso) => resultado.set(permiso.id, permiso));

  asignados.forEach((permiso) => {
    const existente = resultado.get(permiso.id);
    resultado.set(permiso.id, {
      ...existente,
      ...permiso,
      activo: existente?.activo ?? permiso.activo ?? true,
    });
  });

  return [...resultado.values()];
};

const RolFormulario = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const securitySucursal = useAuthStore((state) => state.securitySucursal);
  const [form] = Form.useForm<RolFormValues>();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoCancelacion, setConfirmandoCancelacion] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [pantallas, setPantallas] = useState<PantallaDTO[]>([]);
  const [catalogoPermisos, setCatalogoPermisos] = useState<AuthPermisoEspecialDTO[]>([]);
  const [pantallasSeleccionadas, setPantallasSeleccionadas] = useState<number[]>([]);
  const [accionesSeleccionadas, setAccionesSeleccionadas] = useState<Record<number, string[]>>({});
  const [permisosSeleccionados, setPermisosSeleccionados] = useState<PermisosPorPantalla>({});

  const bloqueoAccionRef = useRef(false);
  const navigationConfirmedRef = useFormularioNavigation(bloqueoAccionRef);
  const rolGuardadoRef = useRef<RolFullDTO | null>(null);
  const firmaRolGuardadoRef = useRef<string | null>(null);
  const pantallasPermisosInicialesRef = useRef<Set<number>>(new Set());
  const esEdicion = Boolean(id);
  const interfazBloqueada = guardando || confirmandoCancelacion;

  const cargarDatos = useCallback(async () => {
    if (!securitySucursal) {
      setLoading(false);
      setLoadingError('No hay una sucursal activa para consultar el rol.');
      return;
    }

    const rolId = id ? Number(id) : null;
    if (id && (!Number.isInteger(rolId) || (rolId ?? 0) <= 0)) {
      setLoading(false);
      setLoadingError('El identificador del rol no es válido.');
      return;
    }

      setLoading(true);
      setLoadingError(null);
      rolGuardadoRef.current = null;
      firmaRolGuardadoRef.current = null;

    try {
      const [disponibles, catalogo, rol, permisosAsignados] = await Promise.all([
        rolApi.obtenerPantallasDisponibles(securitySucursal),
        permisoEspecialApi.obtenerListado(securitySucursal),
        rolId ? rolApi.obtenerPorId(securitySucursal, rolId) : Promise.resolve(null),
        rolId ? permisoEspecialApi.obtenerPorRol(securitySucursal, rolId) : Promise.resolve([]),
      ]);

      const pantallasUnificadas = fusionarPantallas(disponibles, rol?.pantallas ?? []);
      const catalogoUnificado = fusionarCatalogoPermisos(catalogo, permisosAsignados);
      const seleccionadas = rol?.pantallas.map((pantalla) => pantalla.id) ?? [];
      const acciones = (rol?.pantallas ?? []).reduce<Record<number, string[]>>((acumulado, pantalla) => {
        acumulado[pantalla.id] = [...(pantalla.acciones ?? [])];
        return acumulado;
      }, {});
      const permisos = permisosAsignados.reduce<PermisosPorPantalla>((acumulado, permiso) => {
        if (permiso.pantallaId == null) return acumulado;
        acumulado[permiso.pantallaId] ??= {};
        acumulado[permiso.pantallaId][permiso.id] = {
          valor: permiso.valor,
          valorNumerico: permiso.valorNumerico,
        };
        return acumulado;
      }, {});

      setPantallas(pantallasUnificadas);
      setCatalogoPermisos(catalogoUnificado);
      setPantallasSeleccionadas(seleccionadas);
      setAccionesSeleccionadas(acciones);
      setPermisosSeleccionados(permisos);
      pantallasPermisosInicialesRef.current = new Set(
        permisosAsignados
          .map((permiso) => permiso.pantallaId)
          .filter((pantallaId): pantallaId is number => pantallaId != null),
      );

      form.setFieldsValue(
        rol
          ? { nombre: rol.nombre, descripcion: rol.descripcion, activo: rol.activo }
          : { nombre: '', descripcion: '', activo: true },
      );
    } catch (error) {
      const detalle = obtenerMensajeError(error, 'No fue posible cargar el formulario del rol.');
      setLoadingError(detalle);
      message.error(detalle);
    } finally {
      setLoading(false);
    }
  }, [form, id, securitySucursal]);

  useEffect(() => {
    const temporizadorCarga = window.setTimeout(() => {
      void cargarDatos();
    }, 0);

    return () => window.clearTimeout(temporizadorCarga);
  }, [cargarDatos]);

  const permisosPorPantalla = useMemo(() => {
    return catalogoPermisos.reduce<Record<number, AuthPermisoEspecialDTO[]>>((acumulado, permiso) => {
      if (permiso.pantallaId == null) return acumulado;
      acumulado[permiso.pantallaId] ??= [];
      acumulado[permiso.pantallaId].push(permiso);
      return acumulado;
    }, {});
  }, [catalogoPermisos]);

  const pantallasFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim());
    if (!termino) return pantallas;

    return pantallas.filter((pantalla) => {
      const permisos = permisosPorPantalla[pantalla.id] ?? [];
      return [
        pantalla.nombre,
        pantalla.codigo,
        ...pantalla.acciones,
        ...permisos.flatMap((permiso) => [permiso.nombre, permiso.codigo]),
      ].some((valor) => normalizarTexto(valor).includes(termino));
    });
  }, [busqueda, pantallas, permisosPorPantalla]);

  const gruposModulo = useMemo<GrupoModulo[]>(() => {
    const mapa = new Map<string, GrupoModulo>();
    const sinModulo: PantallaDTO[] = [];

    for (const pantalla of pantallasFiltradas) {
      const modulos = pantalla.modulos ?? [];
      if (modulos.length === 0) {
        sinModulo.push(pantalla);
        continue;
      }

      for (const modulo of modulos) {
        const key = `mod-${modulo.id}`;
        if (!mapa.has(key)) {
          mapa.set(key, {
            key,
            nombre: modulo.nombre || `Módulo ${modulo.id}`,
            orden: modulo.orden ?? 999,
            pantallas: [],
          });
        }
        const grupo = mapa.get(key)!;
        if (!grupo.pantallas.some((p) => p.id === pantalla.id)) {
          grupo.pantallas.push(pantalla);
        }
      }
    }

    const grupos = [...mapa.values()].sort(
      (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre),
    );

    if (sinModulo.length > 0) {
      grupos.push({ key: 'mod-0', nombre: 'Sin módulo', orden: 9999, pantallas: sinModulo });
    }

    return grupos;
  }, [pantallasFiltradas]);

  const cambiarPantalla = (pantalla: PantallaDTO, seleccionada: boolean) => {
    if (bloqueoAccionRef.current) return;

    setPantallasSeleccionadas((actuales) =>
      seleccionada
        ? [...new Set([...actuales, pantalla.id])]
        : actuales.filter((pantallaId) => pantallaId !== pantalla.id),
    );

    if (seleccionada) {
      setAccionesSeleccionadas((actuales) => ({
        ...actuales,
        [pantalla.id]: actuales[pantalla.id] ?? [],
      }));
    }
  };

  const cambiarAcciones = (pantallaId: number, acciones: string[]) => {
    if (bloqueoAccionRef.current) return;
    setAccionesSeleccionadas((actuales) => ({ ...actuales, [pantallaId]: acciones }));
  };

  const cambiarPermiso = (
    pantallaId: number,
    permisoId: number,
    valor: PermisoValor,
  ) => {
    if (bloqueoAccionRef.current) return;
    setPermisosSeleccionados((actuales) => ({
      ...actuales,
      [pantallaId]: {
        ...(actuales[pantallaId] ?? {}),
        [permisoId]: valor,
      },
    }));
  };

  const seleccionarModulo = (grupo: GrupoModulo, seleccionar: boolean) => {
    if (bloqueoAccionRef.current) return;

    const ids = grupo.pantallas.map((pantalla) => pantalla.id);

    setPantallasSeleccionadas((actuales) =>
      seleccionar
        ? [...new Set([...actuales, ...ids])]
        : actuales.filter((pantallaId) => !ids.includes(pantallaId)),
    );

    if (seleccionar) {
      setAccionesSeleccionadas((actuales) => {
        const siguientes = { ...actuales };
        for (const pantalla of grupo.pantallas) {
          siguientes[pantalla.id] = [...(pantalla.acciones ?? [])];
        }
        return siguientes;
      });
    }
  };

  const guardarPermisosEspeciales = async (rolId: number) => {
    if (!securitySucursal) return;

    const pantallasAProcesar = new Set([
      ...pantallasPermisosInicialesRef.current,
      ...Object.keys(permisosSeleccionados).map(Number),
    ]);

    await Promise.all(
      [...pantallasAProcesar].map((pantallaId) => {
        const permisos = permisosPorPantalla[pantallaId] ?? [];
        const valores = permisosSeleccionados[pantallaId] ?? {};
        const activos = permisos.flatMap((permiso) => {
          const valor = valores[permiso.id];
          const esNumerico = normalizarTexto(permiso.tipoValor) === 'numerico';
          const valorNumerico = valor?.valorNumerico ?? 0;

          if (esNumerico) {
            return valorNumerico > 0
              ? [{ permisoId: permiso.id, valor: true, valorNumerico }]
              : [];
          }

          return valor?.valor ? [{ permisoId: permiso.id, valor: true }] : [];
        });

        return permisoEspecialApi.asignarARol(
          securitySucursal,
          rolId,
          pantallaId,
          activos,
        );
      }),
    );

    pantallasPermisosInicialesRef.current = new Set(pantallasAProcesar);
  };

  const guardar = async () => {
    if (bloqueoAccionRef.current || !securitySucursal) return;

    bloqueoAccionRef.current = true;
    setGuardando(true);

    try {
      const valores = await form.validateFields();
      const pantallasRol = pantallas
        .filter((pantalla) => pantallasSeleccionadas.includes(pantalla.id))
        .map((pantalla) => ({
          ...pantalla,
          acciones: [...(accionesSeleccionadas[pantalla.id] ?? [])],
          modulos: [...pantalla.modulos],
          permisosEspeciales: [...(pantalla.permisosEspeciales ?? [])],
        }));

      const rolPersistido = rolGuardadoRef.current;
      const rol: RolFullDTO = {
        id: rolPersistido?.id ?? (id ? Number(id) : 0),
        nombre: valores.nombre.trim(),
        descripcion: valores.descripcion?.trim() ?? '',
        activo: valores.activo,
        pantallas: pantallasRol,
      };

      const firmaRol = obtenerFirmaRol(rol);
      let rolGuardado: RolFullDTO;

      if (rolPersistido && firmaRolGuardadoRef.current === firmaRol) {
        rolGuardado = rolPersistido;
      } else {
        rolGuardado = esEdicion || rolPersistido
          ? await rolApi.actualizar(securitySucursal, rol)
          : await rolApi.crear(securitySucursal, rol);
        rolGuardadoRef.current = rolGuardado;
        firmaRolGuardadoRef.current = firmaRol;
      }

      try {
        await guardarPermisosEspeciales(rolGuardado.id);
      } catch (error) {
        message.warning(
          `El rol fue guardado, pero no se pudieron completar sus permisos especiales: ${obtenerMensajeError(
            error,
            'error desconocido',
          )}`,
        );
        return;
      }

      message.success(esEdicion ? 'Rol actualizado correctamente.' : 'Rol creado correctamente.');
      navigationConfirmedRef.current = true;
      navigate('/MROL', { replace: true });
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(obtenerMensajeError(error, 'No fue posible guardar el rol.'));
    } finally {
      bloqueoAccionRef.current = false;
      setGuardando(false);
    }
  };

  const handleCancelar = () => {
    if (bloqueoAccionRef.current || guardando) return;

    bloqueoAccionRef.current = true;
    setConfirmandoCancelacion(true);
    let navegando = false;

    Modal.confirm({
      title: 'Cancelar',
      icon: <ExclamationCircleOutlined />,
      content: '¿Está seguro que desea cancelar los cambios realizados?',
      okText: 'Si, cancelar',
      cancelText: 'No, continuar editando',
      okButtonProps: { danger: true },
      onOk: () => {
        navegando = true;
        navigationConfirmedRef.current = true;
        navigate('/MROL', { replace: true });
      },
      afterClose: () => {
        if (!navegando) {
          bloqueoAccionRef.current = false;
          setConfirmandoCancelacion(false);
        }
      },
    });
  };

  const renderPantallaItem = (pantalla: PantallaDTO) => {
    const seleccionada = pantallasSeleccionadas.includes(pantalla.id);
    const acciones = pantalla.acciones ?? [];
    const accionesMarcadas = accionesSeleccionadas[pantalla.id] ?? [];
    const permisos = permisosPorPantalla[pantalla.id] ?? [];

    return {
      key: String(pantalla.id),
      label: (
        <Space onClick={(evento) => evento.stopPropagation()}>
          <Checkbox
            checked={seleccionada}
            disabled={interfazBloqueada}
            onChange={(evento) => cambiarPantalla(pantalla, evento.target.checked)}
          />
          <Text strong>{pantalla.nombre}</Text>
          <Text type="secondary">{pantalla.codigo}</Text>
        </Space>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {acciones.length > 0 && (
            <div>
              <Space style={{ marginBottom: 10 }}>
                <Text strong>Acciones permitidas</Text>
                <Button
                  type="link"
                  size="small"
                  disabled={!seleccionada || interfazBloqueada}
                  onClick={() =>
                    cambiarAcciones(
                      pantalla.id,
                      accionesMarcadas.length === acciones.length ? [] : [...acciones],
                    )
                  }
                >
                  {accionesMarcadas.length === acciones.length ? 'Desmarcar todas' : 'Marcar todas'}
                </Button>
              </Space>
              <Checkbox.Group
                value={accionesMarcadas}
                disabled={!seleccionada || interfazBloqueada}
                onChange={(valores) => cambiarAcciones(pantalla.id, valores as string[])}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}
              >
                {acciones.map((accion) => (
                  <Checkbox key={accion} value={accion}>{accion}</Checkbox>
                ))}
              </Checkbox.Group>
            </div>
          )}

          {permisos.length > 0 && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 10 }}>Permisos especiales</Text>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {permisos.map((permiso) => {
                  const valor = permisosSeleccionados[pantalla.id]?.[permiso.id];
                  const esNumerico = normalizarTexto(permiso.tipoValor) === 'numerico';

                  return (
                    <Card key={permiso.id} size="small">
                      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                        <div>
                          <Text>{permiso.nombre || permiso.codigo}</Text>
                          {permiso.nombre && <Text type="secondary"> · {permiso.codigo}</Text>}
                        </div>
                        {esNumerico ? (
                          <InputNumber
                            min={0}
                            value={valor?.valorNumerico ?? 0}
                            disabled={!seleccionada || interfazBloqueada}
                            onChange={(numero) =>
                              cambiarPermiso(pantalla.id, permiso.id, {
                                valor: (numero ?? 0) > 0,
                                valorNumerico: numero ?? 0,
                              })
                            }
                          />
                        ) : (
                          <Switch
                            checked={valor?.valor ?? false}
                            disabled={!seleccionada || interfazBloqueada}
                            onChange={(activo) =>
                              cambiarPermiso(pantalla.id, permiso.id, { valor: activo })
                            }
                          />
                        )}
                      </Space>
                    </Card>
                  );
                })}
              </Space>
            </div>
          )}

          {acciones.length === 0 && permisos.length === 0 && (
            <Text type="secondary">Esta pantalla no tiene acciones ni permisos especiales configurados.</Text>
          )}
        </Space>
      ),
    };
  };

  if (loading) {
    return (
      <div style={{ minHeight: 360, display: 'grid', placeItems: 'center' }}>
        <Spin size="large" tip="Cargando rol..." />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>{esEdicion ? 'Editar rol' : 'Nuevo rol'}</Title>
          <Text type="secondary">Define la información general y los accesos del rol.</Text>
        </div>
        <Space>
          <Button icon={<ArrowLeftOutlined />} disabled={interfazBloqueada} onClick={handleCancelar}>
            Volver
          </Button>
          <PermissionGate accion={esEdicion ? 'EDITAR' : 'CREAR'}>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={guardando}
              disabled={Boolean(loadingError) || confirmandoCancelacion}
              onClick={() => void guardar()}
            >
              Guardar
            </Button>
          </PermissionGate>
        </Space>
      </Space>

      {loadingError && (
        <Alert
          type="error"
          showIcon
          message="No se pudo cargar el formulario"
          description={loadingError}
          action={
            <Button icon={<ReloadOutlined />} disabled={interfazBloqueada} onClick={() => void cargarDatos()}>
              Reintentar
            </Button>
          }
        />
      )}

      <Card title="Información general">
        <Form<RolFormValues>
          form={form}
          layout="vertical"
          disabled={interfazBloqueada || Boolean(loadingError)}
          initialValues={{ activo: true }}
        >
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[
              { required: true, message: 'Ingresa el nombre del rol.' },
              { whitespace: true, message: 'El nombre no puede estar vacío.' },
            ]}
          >
            <Input maxLength={100} placeholder="Ej.: Supervisor de ventas" />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={3} maxLength={300} showCount placeholder="Describe el alcance del rol" />
          </Form.Item>
          <Form.Item label="Estado" name="activo" valuePropName="checked" style={{ marginBottom: 0 }}>
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Card>

      <Card
        title="Pantallas y permisos"
        extra={<Text type="secondary">{pantallasSeleccionadas.length} seleccionadas</Text>}
      >
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Buscar por pantalla, código, acción o permiso"
          value={busqueda}
          disabled={interfazBloqueada || Boolean(loadingError)}
          onChange={(evento) => setBusqueda(evento.target.value)}
          style={{ marginBottom: 16 }}
        />

        {gruposModulo.length > 0 ? (
          <Collapse
            items={gruposModulo.map((grupo) => {
              const seleccionadasGrupo = grupo.pantallas.filter((pantalla) =>
                pantallasSeleccionadas.includes(pantalla.id),
              ).length;

              return {
                key: grupo.key,
                label: (
                  <Space>
                    <Text strong>{grupo.nombre}</Text>
                    <Text type="secondary">
                      {seleccionadasGrupo}/{grupo.pantallas.length} seleccionadas
                    </Text>
                  </Space>
                ),
                children: (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space wrap>
                      <Button
                        size="small"
                        disabled={interfazBloqueada || seleccionadasGrupo === grupo.pantallas.length}
                        onClick={() => seleccionarModulo(grupo, true)}
                      >
                        Seleccionar todo
                      </Button>
                      <Button
                        size="small"
                        disabled={interfazBloqueada || seleccionadasGrupo === 0}
                        onClick={() => seleccionarModulo(grupo, false)}
                      >
                        Limpiar
                      </Button>
                    </Space>
                    <Collapse items={grupo.pantallas.map(renderPantallaItem)} />
                  </Space>
                ),
              };
            })}
          />
        ) : (
          <Empty description={busqueda ? 'No hay coincidencias para la búsqueda.' : 'No hay pantallas disponibles.'} />
        )}
      </Card>
    </Space>
  );
};

export default RolFormulario;
