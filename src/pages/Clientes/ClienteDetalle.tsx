import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, message, Form, Input, Select, Switch, Row, Col, Typography,
  Tabs, Descriptions, InputNumber, Tag, Grid, Divider, DatePicker,
  Button, Modal, Table,
} from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { apiClient } from '../../api/client';
import { clienteApi } from '../../api/clienteApi';
import { proveedorApi } from '../../api/proveedorApi';
import { empleadoApi } from '../../api/empleadoApi';
import type { ClienteDTO, CategoriaEntidadDTO, TipoComprobanteNCFDTO } from '../../types/facturacion';
import type { CuentaContableDTO, MonedaDTO } from '../../types/contabilidad';
import ErrorBoundary from '../../components/ErrorBoundary';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { formatCurrency, toISOFormat } from '../../utils/formats';
import PersonasAutorizadasTab from './components/PersonasAutorizadasTab';
import GruposProductosTab from './components/GruposProductosTab';
import CuentasBancariasTab from './components/CuentasBancariasTab';
import LugaresTrabajoTab from './components/LugaresTrabajoTab';
import MovimientosTab from './components/MovimientosTab';
import FacturacionTab from './components/FacturacionTab';
import ContactosTab from './components/ContactosTab';

const { Text } = Typography;

// Helpers de enums
const SEXO_LABEL: Record<number, string> = {
  0: 'Masculino',
  1: 'Femenino',
};

const ESTADO_CIVIL_LABEL: Record<number, string> = {
  0: 'Casado(a)',
  1: 'Soltero(a)',
  2: 'Divorciado(a)',
  3: 'Viudo(a)',
};

const TIPO_IDENTIFICACION_LABEL: Record<number, string> = {
  0: 'RNC',
  1: 'Cédula',
  2: 'Pasaporte',
};

const ClienteDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);

  const esNuevo = !codigo || codigo === 'nuevo';

  const [data, setData] = useState<ClienteDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form] = Form.useForm();
  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  // Estados para catálogos
  const [tiposNCF, setTiposNCF] = useState<TipoComprobanteNCFDTO[]>([]);
  const [categorias, setCategorias] = useState<CategoriaEntidadDTO[]>([]);
  const [cuentasContables, setCuentasContables] = useState<CuentaContableDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);

  // Estados de "loaded" para catálogos bajo demanda
  const [categoriasLoaded, setCategoriasLoaded] = useState(false);
  const [tiposNCFLoaded, setTiposNCFLoaded] = useState(false);
  const [cuentasContablesLoaded, setCuentasContablesLoaded] = useState(false);
  const [monedasLoaded, setMonedasLoaded] = useState(false);

  // Estados para modal clonar
  const [modalVisible, setModalVisible] = useState(false);
  const [tiposEntidad, setTiposEntidad] = useState<any[]>([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);
  const [entidades, setEntidades] = useState<any[]>([]);
  const [cargandoEntidades, setCargandoEntidades] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [clonando, setClonando] = useState(false);
  const [searchTexto, setSearchTexto] = useState('');

  useEffect(() => {
    setActiveModule('MCliente');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (esNuevo) {
      setPageTitleOverride('Nuevo Cliente');
      setEditando(true);
      form.setFieldsValue({ activo: true, tipoIdentificacion: 0 });
      return;
    }
    if (!codigo) return;

    const abortController = new AbortController();
    setLoading(true);
    setLoadingError(false);

    clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
        form.setFieldsValue({
          codigo: res.codigo,
          nombre: res.nombre,
          tipoIdentificacion: res.tipoIdentificacion,
          identificacion: res.identificacion,
          telefono: res.telefono,
          telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico,
          direccion: res.direccion,
          sexo: res.sexo,
          estadoCivil: res.estadoCivil,
          fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null,
          nota: res.nota,
          activo: res.activo,
          limiteCredito: res.limiteCredito,
          diasCredito: res.diasCredito,
          creditoSuspendido: res.creditoSuspendido,
          exentoImpuesto: res.exentoImpuesto,
          margen: res.margen,
          porcientoDescuento: res.porcientoDescuento,
          // Nuevos campos
          sector: res.sector,
          ciudad: res.ciudad,
          zona: res.zona,
          nombreComercial: res.nombreComercial,
          contacto: res.contacto,
          telefonoContacto: res.telefonoContacto,
          fax: res.fax,
          fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
          codigoVendedor: res.codigoVendedor,
          vendedorNombre: res.vendedorNombre,
          codigoListaPrecio: res.codigoListaPrecio,
          listaPrecioNombre: res.listaPrecioNombre,
          perfil: res.perfil,
          comision: res.comision,
          facebook: res.facebook,
          twitter: res.twitter,
          codigoMoneda: res.codigoMoneda,
          balance: res.balance,
          fechaUltimoPago: res.fechaUltimoPago,
          montoUltimoPago: res.montoUltimoPago,
          documentoUltimoPago: res.documentoUltimoPago,
          categoria: res.categoria?.codigo,
          tipoNcf: res.tipoNcf?.codigo,
          cuentaContable: res.cuentaContable?.noCuenta,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al cargar cliente');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => abortController.abort();
  }, [codigo, sucursalActiva, setPageTitleOverride, esNuevo, form]);

  // Bloqueo de navegación con cambios sin guardar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (editando && form.isFieldsTouched()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [editando, form]);

  useEffect(() => {
    const handlePopState = () => {
      if (editando && form.isFieldsTouched()) {
        const leave = window.confirm('Los cambios no guardados se perderán. ¿Está seguro que desea salir?');
        if (!leave) {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [editando, form]);

  const handleVolver = useCallback(() => {
    if (editando && form.isFieldsTouched()) {
      Modal.confirm({
        title: '¿Salir sin guardar?',
        content: 'Los cambios no guardados se perderán.',
        okText: 'Salir',
        cancelText: 'Cancelar',
        onOk: () => navigate('/MCliente'),
      });
    } else {
      navigate('/MCliente');
    }
  }, [editando, form, navigate]);

  // Permisos
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MCliente');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;

  // Funciones de carga bajo demanda para catálogos
  const cargarCategorias = () => {
    if (categoriasLoaded) return;
    apiClient.get(`/categoriaentidad/${sucursalActiva}/tipo/CLI`)
      .then((res) => setCategorias(res.data?.data || []))
      .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías'))
      .finally(() => setCategoriasLoaded(true));
  };

  const cargarTiposNCF = () => {
    if (tiposNCFLoaded) return;
    apiClient.get(`/TipoNCF/${sucursalActiva}`)
      .then((res) => setTiposNCF(res.data?.data || []))
      .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos NCF'))
      .finally(() => setTiposNCFLoaded(true));
  };

  const cargarCuentasContables = () => {
    if (cuentasContablesLoaded) return;
    apiClient.get(`/CuentaContable/${sucursalActiva}/Auxiliares`)
      .then((res) => setCuentasContables(res.data?.data || []))
      .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables'))
      .finally(() => setCuentasContablesLoaded(true));
  };

  const cargarMonedas = () => {
    if (monedasLoaded) return;
    apiClient.get(`/Moneda/${sucursalActiva}`)
      .then((res) => setMonedas(res.data?.data || []))
      .catch((err) => message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas'))
      .finally(() => setMonedasLoaded(true));
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const payload = {
        codigo: values.codigo,
        nombre: values.nombre,
        tipoIdentificacion: values.tipoIdentificacion ?? 0,
        identificacion: (values.identificacion || '').replace(/-/g, ''),
        correoElectronico: values.correoElectronico || '',
        telefono: values.telefono || '',
        telefonoAdicional: values.telefonoAdicional || '',
        direccion: values.direccion || '',
        nota: values.nota || '',
        activo: values.activo ?? true,
        sexo: values.sexo,
        estadoCivil: values.estadoCivil,
        fechaNacimiento: values.fechaNacimiento ? toISOFormat(dayjs(values.fechaNacimiento).toDate()) : null,
        limiteCredito: values.limiteCredito ?? 0,
        diasCredito: values.diasCredito ?? 0,
        creditoSuspendido: values.creditoSuspendido ?? false,
        exentoImpuesto: values.exentoImpuesto ?? false,
        margen: values.margen ?? 0,
        porcientoDescuento: values.porcientoDescuento ?? 0,
        // Nuevos campos
        sector: values.sector || '',
        ciudad: values.ciudad || '',
        zona: values.zona || '',
        nombreComercial: values.nombreComercial || '',
        contacto: values.contacto || '',
        telefonoContacto: values.telefonoContacto || '',
        fax: values.fax || '',
        fechaIngreso: values.fechaIngreso ? toISOFormat(dayjs(values.fechaIngreso).toDate()) : null,
        codigoVendedor: values.codigoVendedor || '',
        vendedorNombre: values.vendedorNombre || '',
        codigoListaPrecio: values.codigoListaPrecio || '',
        listaPrecioNombre: values.listaPrecioNombre || '',
        perfil: values.perfil || '',
        comision: values.comision ?? 0,
        facebook: values.facebook || '',
        twitter: values.twitter || '',
        codigoMoneda: values.codigoMoneda || '',
      } as ClienteDTO;

      // Mapear selects de catálogo que el backend espera como objetos anidados
      if (values.categoria) (payload as any).categoria = { codigo: values.categoria, descripcion: '' };
      if (values.tipoNcf) (payload as any).tipoNcf = { codigo: values.tipoNcf, nombre: '' };
      if (values.cuentaContable) (payload as any).cuentaContable = { noCuenta: values.cuentaContable, nombre: '' };

      if (!esNuevo && data) {
        await clienteApi.actualizar(sucursalActiva, { ...data, ...payload });
        message.success('Cliente actualizado correctamente');
        navigate('/MCliente');
      } else {
        const creado = await clienteApi.crear(sucursalActiva, payload);
        message.success('Cliente creado correctamente');
        navigate(`/MCliente/${creado.codigo}`);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cliente');
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalClonar = useCallback(async () => {
    setModalVisible(true);
    setTipoSeleccionado(null);
    setEntidades([]);
    setSelectedEntity(null);
    setSearchTexto('');
    try {
      const { data } = await apiClient.get(`/TipoEntidad/${sucursalActiva}/exportables`);
      setTiposEntidad(data?.data || []);
    } catch {
      message.error('Error al cargar tipos de entidad');
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (!tipoSeleccionado) {
      setEntidades([]);
      setSelectedEntity(null);
      return;
    }
    setCargandoEntidades(true);
    setSelectedEntity(null);

    const carga = searchTexto.trim()
      ? apiClient.get(`/Entidades/${sucursalActiva}/filtrar`, {
          params: { tipo: tipoSeleccionado, entidad: searchTexto.trim() }
        })
      : apiClient.get(`/Entidades/${sucursalActiva}`, {
          params: { tipo: tipoSeleccionado, activo: true, cantidad: 100 }
        });

    carga
      .then((res) => setEntidades(res.data?.data || []))
      .catch(() => message.error('Error al cargar entidades'))
      .finally(() => setCargandoEntidades(false));
  }, [tipoSeleccionado, sucursalActiva, searchTexto]);

  const handleClonar = useCallback(async () => {
    if (!selectedEntity) return;
    setClonando(true);
    try {
      // 1. Obtener datos base de la entidad
      const { data: resp } = await apiClient.get(`/Entidades/${sucursalActiva}/${selectedEntity.codigo}`, {
        params: { tipo: tipoSeleccionado }
      });
      const entidad = resp?.data;
      if (!entidad) {
        message.error('No se pudo obtener los datos de la entidad');
        return;
      }

      // 2. Obtener datos específicos según tipo de entidad
      let datosEspecificos: Record<string, any> = {};
      try {
        if (tipoSeleccionado === 'CLI') {
          const cli = await clienteApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
          if (cli) datosEspecificos = cli as any;
        } else if (tipoSeleccionado === 'SUP') {
          const sup = await proveedorApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
          if (sup) datosEspecificos = sup as any;
        } else if (tipoSeleccionado === 'EMP') {
          const emp = await empleadoApi.obtenerPorCodigo(sucursalActiva, selectedEntity.codigo);
          if (emp) datosEspecificos = emp as any;
        }
      } catch {
        // Si falla la carga específica, solo usar datos base
      }

      // 3. Fusionar: datos específicos tienen prioridad
      const fusion = { ...entidad, ...datosEspecificos };

      form.setFieldsValue({
        nombre: fusion.nombre,
        tipoIdentificacion: fusion.tipoIdentificacion ?? 0,
        identificacion: fusion.identificacion || '',
        telefono: fusion.telefono || '',
        telefonoAdicional: fusion.telefonoAdicional || '',
        correoElectronico: fusion.correoElectronico || '',
        direccion: fusion.direccion || '',
        sexo: fusion.sexo,
        estadoCivil: fusion.estadoCivil,
        fechaNacimiento: fusion.fechaNacimiento ? dayjs(fusion.fechaNacimiento) : null,
        nota: fusion.nota || '',
        activo: fusion.activo ?? true,
        sector: fusion.sector || '',
        ciudad: fusion.ciudad || '',
        zona: fusion.zona || '',
        contacto: fusion.contacto || '',
        telefonoContacto: fusion.telefonoContacto || '',
        fax: fusion.fax || '',
        nombreComercial: fusion.nombreComercial || '',
        categoria: fusion.categoria?.codigo,
        cuentaContable: fusion.cuentaContable?.noCuenta,
      });
      message.success(`Datos clonados desde ${fusion.nombre}`);
      setModalVisible(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al clonar entidad');
    } finally {
      setClonando(false);
    }
  }, [selectedEntity, sucursalActiva, tipoSeleccionado, form]);

  // Nota: loading, loadingError, dataDisponible se manejan via DetalleCatalogoLayout

  const esSoloLectura = !esNuevo && !editando;

  const tabItems = [
    {
      key: 'contactos',
      label: 'Contactos',
      children: !esNuevo && codigo ? (
        <ContactosTab codigoCliente={codigo} />
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Guarde el cliente primero para gestionar contactos</Text>
        </div>
      ),
    },
    {
      key: 'personas',
      label: 'Personas Autorizadas',
      children: !esNuevo && codigo ? (
        <PersonasAutorizadasTab codigoCliente={codigo} sucursal={sucursalActiva} />
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Guarde el cliente primero para gestionar personas autorizadas</Text>
        </div>
      ),
    },
    {
      key: 'grupos',
      label: 'Grupos de Productos',
      children: !esNuevo && codigo ? (
        <GruposProductosTab codigoCliente={codigo} sucursal={sucursalActiva} />
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Guarde el cliente primero para gestionar grupos de productos</Text>
        </div>
      ),
    },
    {
      key: 'bancos',
      label: 'Cuentas Bancarias',
      children: !esNuevo && codigo ? (
        <CuentasBancariasTab codigoCliente={codigo} sucursal={sucursalActiva} />
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Guarde el cliente primero para gestionar cuentas bancarias</Text>
        </div>
      ),
    },
    {
      key: 'lugares',
      label: 'Lugares de Trabajo',
      children: !esNuevo && codigo ? (
        <LugaresTrabajoTab codigoCliente={codigo} sucursal={sucursalActiva} data={data} />
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }} className="paces-text-secondary">
          <Text type="secondary">Guarde el cliente primero para ver lugares de trabajo</Text>
        </div>
      ),
    },
    {
      key: 'movimientos',
      label: 'Movimientos',
      children: <MovimientosTab />,
    },
    {
      key: 'facturacion',
      label: 'Facturación',
      children: <FacturacionTab />,
    },
  ];

  const handleRefresh = () => {
    if (esNuevo || !codigo) return;
    setLoadingError(false);
    setLoading(true);
    const abortController = new AbortController();
    clienteApi.obtenerPorCodigo(sucursalActiva, codigo, abortController.signal)
      .then((res) => {
        if (abortController.signal.aborted) return;
        if (!res) {
          message.error('Documento no encontrado en la sucursal seleccionada.');
          setLoadingError(true);
          return;
        }
        setData(res);
        setPageTitleOverride(res.nombre || codigo);
        form.setFieldsValue({
          codigo: res.codigo, nombre: res.nombre, tipoIdentificacion: res.tipoIdentificacion,
          identificacion: res.identificacion, telefono: res.telefono, telefonoAdicional: res.telefonoAdicional,
          correoElectronico: res.correoElectronico, direccion: res.direccion, sexo: res.sexo,
          estadoCivil: res.estadoCivil, fechaNacimiento: res.fechaNacimiento ? dayjs(res.fechaNacimiento) : null, nota: res.nota,
          activo: res.activo, limiteCredito: res.limiteCredito, diasCredito: res.diasCredito,
          creditoSuspendido: res.creditoSuspendido, exentoImpuesto: res.exentoImpuesto,
          margen: res.margen, porcientoDescuento: res.porcientoDescuento,
          // Nuevos campos
          sector: res.sector, ciudad: res.ciudad, zona: res.zona,
          nombreComercial: res.nombreComercial, contacto: res.contacto,
          telefonoContacto: res.telefonoContacto,           fax: res.fax, fechaIngreso: res.fechaIngreso ? dayjs(res.fechaIngreso) : null,
          codigoVendedor: res.codigoVendedor, vendedorNombre: res.vendedorNombre,
          codigoListaPrecio: res.codigoListaPrecio, listaPrecioNombre: res.listaPrecioNombre,
          perfil: res.perfil, comision: res.comision,
          facebook: res.facebook, twitter: res.twitter, codigoMoneda: res.codigoMoneda,
          balance: res.balance, fechaUltimoPago: res.fechaUltimoPago,
          montoUltimoPago: res.montoUltimoPago, documentoUltimoPago: res.documentoUltimoPago,
          categoria: res.categoria?.codigo,
          tipoNcf: res.tipoNcf?.codigo, cuentaContable: res.cuentaContable?.noCuenta,
        });
      })
      .catch((err: any) => {
        if (err?.name === 'CanceledError' || abortController.signal.aborted) return;
        message.error(err?.response?.data?.errorMessage || 'Error al recargar');
        setLoadingError(true);
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });
  };

  // ===== Componentes auxiliares render =====

  const renderCampo = (nombre: string, children: React.ReactNode, span?: number) => (
    <Descriptions.Item label={nombre} {...(span ? { span } : {})}>
      {children}
    </Descriptions.Item>
  );

  const renderReadonlyText = (valor: string | number | null | undefined, formato?: (v: any) => string) => (
    <Text>{valor != null && valor !== '' ? (formato ? formato(valor) : String(valor)) : '-'}</Text>
  );

  const renderReadonlyMoneda = (valor: number | null | undefined) => (
    <Text style={{ fontFamily: 'monospace' }}>{valor != null ? formatCurrency(valor) : '-'}</Text>
  );

  const renderReadonlyTag = (activo: boolean | null | undefined) => (
    <Tag color={activo ? 'green' : 'default'}>{activo ? 'Sí' : 'No'}</Tag>
  );

  // ===== Card: Datos Generales =====
  const renderDatosGenerales = () => (
    <Card title="Datos Generales" className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Código',
          esSoloLectura ? (
            <Text style={{ fontFamily: 'monospace' }}>{data?.codigo}</Text>
          ) : esNuevo ? (
            <Form.Item name="codigo" noStyle>
              <Input disabled placeholder="Autogenerado" />
            </Form.Item>
          ) : (
            <Form.Item name="codigo" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
              <Input placeholder="Código" maxLength={20} />
            </Form.Item>
          )
        )}
        {renderCampo('Nombre / Razón Social',
          esSoloLectura ? (
            <Text>{data?.nombre}</Text>
          ) : (
            <Form.Item name="nombre" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
              <Input placeholder="Nombre del cliente" maxLength={100} />
            </Form.Item>
          )
        )}
        {renderCampo('Tipo Identificación',
          esSoloLectura ? (
            <Text>{TIPO_IDENTIFICACION_LABEL[data?.tipoIdentificacion ?? -1] || data?.tipoIdentificacion || '-'}</Text>
          ) : (
            <Form.Item name="tipoIdentificacion" noStyle initialValue={0}>
              <Select style={{ width: '100%' }}
                options={[
                  { value: 0, label: 'RNC' },
                  { value: 1, label: 'Cédula' },
                  { value: 2, label: 'Pasaporte' },
                ]}
              />
            </Form.Item>
          )
        )}
        {renderCampo('Identificación',
          esSoloLectura ? (
            <Text>{data?.identificacion}</Text>
          ) : (
            <Form.Item name="identificacion" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
              <Input placeholder="Número de ID" maxLength={20} />
            </Form.Item>
          )
        )}
        {renderCampo('Sexo',
          esSoloLectura ? (
            <Text>{SEXO_LABEL[data?.sexo ?? -1] || '-'}</Text>
          ) : (
            <Form.Item name="sexo" noStyle>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione sexo"
                options={[
                  { value: 0, label: 'Masculino' },
                  { value: 1, label: 'Femenino' },
                ]}
              />
            </Form.Item>
          )
        )}
        {renderCampo('Estado Civil',
          esSoloLectura ? (
            <Text>{ESTADO_CIVIL_LABEL[data?.estadoCivil ?? -1] || '-'}</Text>
          ) : (
            <Form.Item name="estadoCivil" noStyle>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione estado civil"
                options={[
                  { value: 0, label: 'Casado(a)' },
                  { value: 1, label: 'Soltero(a)' },
                  { value: 2, label: 'Divorciado(a)' },
                  { value: 3, label: 'Viudo(a)' },
                ]}
              />
            </Form.Item>
          )
        )}
        {renderCampo('Fecha Nacimiento',
          esSoloLectura ? (
            <Text>{data?.fechaNacimiento || '-'}</Text>
          ) : (
            <Form.Item name="fechaNacimiento" noStyle>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          )
        )}
        {renderCampo('Fecha Ingreso',
          esSoloLectura ? (
            <Text>{data?.fechaIngreso || '-'}</Text>
          ) : (
            <Form.Item name="fechaIngreso" noStyle>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>
          )
        )}
        {renderCampo('Nombre Comercial',
          esSoloLectura ? (
            <Text>{data?.nombreComercial || '-'}</Text>
          ) : (
            <Form.Item name="nombreComercial" noStyle>
              <Input placeholder="Nombre comercial" maxLength={100} />
            </Form.Item>
          )
        )}
        {renderCampo('Activo',
          esSoloLectura ? (
            <Tag color={data?.activo ? 'green' : 'default'}>{data?.activo ? 'Activo' : 'Inactivo'}</Tag>
          ) : (
            <Form.Item name="activo" noStyle valuePropName="checked" initialValue={true}>
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          )
        )}
        {renderCampo('Categoría',
          esSoloLectura ? (
            <Text>{data?.categoria?.nombre || '-'}</Text>
          ) : (
            <Form.Item name="categoria" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione categoría"
                onDropdownVisibleChange={(open) => open && cargarCategorias()}
                onChange={(val) => {
                  // Auto-poblar cuenta contable desde la categoría seleccionada
                  if (val) {
                    const cat = categorias.find((c) => c.codigo === val);
                    if (cat?.numeroCuenta) {
                      form.setFieldsValue({ cuentaContable: cat.numeroCuenta });
                    }
                  } else {
                    form.setFieldsValue({ cuentaContable: undefined });
                  }
                }}
                options={categorias.map(c => ({ value: c.codigo, label: `${c.codigo} - ${c.nombre}` }))} />
            </Form.Item>
          )
        )}
        {renderCampo('Tipo NCF',
          esSoloLectura ? (
            <Text>{data?.tipoNcf?.nombre || '-'}</Text>
          ) : (
            <Form.Item name="tipoNcf" noStyle rules={[{ required: true, message: 'Obligatorio' }]}>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione tipo NCF"
                onDropdownVisibleChange={(open) => open && cargarTiposNCF()}
                options={tiposNCF.map(t => ({ value: t.codigo, label: `${t.codigo} - ${t.nombre}` }))} />
            </Form.Item>
          )
        )}
        {renderCampo('Cuenta Contable',
          esSoloLectura ? (
            <Text>{data?.cuentaContable?.noCuenta ? `${data.cuentaContable.noCuenta} - ${data.cuentaContable.nombre}` : '-'}</Text>
          ) : (
            <Form.Item name="cuentaContable" noStyle>
              <Select style={{ width: '100%' }} allowClear showSearch disabled placeholder="Seleccione cuenta contable"
                optionFilterProp="label"
                onDropdownVisibleChange={(open) => open && cargarCuentasContables()}
                options={cuentasContables.map(c => ({ value: c.noCuenta, label: `${c.noCuenta} - ${c.nombre}` }))} />
            </Form.Item>
          )
        )}
        {renderCampo('Nota',
          esSoloLectura ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{data?.nota || '-'}</div>
          ) : (
            <Form.Item name="nota" noStyle>
              <Input.TextArea placeholder="Notas del cliente" rows={2} maxLength={500} />
            </Form.Item>
          ),
          2 // span 2 columnas
        )}
      </Descriptions>
    </Card>
  );

  // ===== Card: Comercial / Financiero =====
  const renderComercialFinanciero = () => (
    <Card title="Comercial / Financiero" className="paces-card" style={{ marginBottom: 16 }}>
      <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
        {renderCampo('Vendedor',
          esSoloLectura ? (
            <Text>{data?.vendedorNombre || '-'}</Text>
          ) : (
            <Form.Item name="vendedorNombre" noStyle>
              <Select style={{ width: '100%' }} allowClear showSearch placeholder="Busque vendedor"
                optionFilterProp="children" options={[]} />
            </Form.Item>
          )
        )}
        {renderCampo('Lista de Precios',
          esSoloLectura ? (
            <Text>{data?.listaPrecioNombre || '-'}</Text>
          ) : (
            <Form.Item name="listaPrecioNombre" noStyle>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione lista" options={[]} />
            </Form.Item>
          )
        )}
        {renderCampo('Perfil',
          esSoloLectura ? (
            <Text>{data?.perfil || '-'}</Text>
          ) : (
            <Form.Item name="perfil" noStyle>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione perfil" options={[]} />
            </Form.Item>
          )
        )}
        {renderCampo('Comisión %',
          esSoloLectura ? (
            <Text>{data?.comision != null ? `${data.comision.toFixed(2)}%` : '-'}</Text>
          ) : (
            <Form.Item name="comision" noStyle initialValue={0}>
              <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          )
        )}
        {renderCampo('Moneda',
          esSoloLectura ? (
            <Text>{data?.codigoMoneda || '-'}</Text>
          ) : (
            <Form.Item name="codigoMoneda" noStyle>
              <Select style={{ width: '100%' }} allowClear placeholder="Seleccione moneda"
                onDropdownVisibleChange={(open) => open && cargarMonedas()}
                options={monedas.map(m => ({ value: m.codigo, label: `${m.codigo} - ${m.nombre}` }))} />
            </Form.Item>
          )
        )}
        {renderCampo('Límite Crédito',
          esSoloLectura ? (
            renderReadonlyMoneda(data?.limiteCredito)
          ) : (
            <Form.Item name="limiteCredito" noStyle initialValue={0}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          )
        )}
        {renderCampo('Días Crédito',
          esSoloLectura ? (
            renderReadonlyText(data?.diasCredito)
          ) : (
            <Form.Item name="diasCredito" noStyle initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )
        )}
        {renderCampo('% Descuento',
          esSoloLectura ? (
            renderReadonlyText(data?.porcientoDescuento, (v: number) => `${v.toFixed(2)}%`)
          ) : (
            <Form.Item name="porcientoDescuento" noStyle initialValue={0}>
              <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          )
        )}
        {renderCampo('Margen',
          esSoloLectura ? (
            renderReadonlyText(data?.margen)
          ) : (
            <Form.Item name="margen" noStyle initialValue={0}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          )
        )}
        {renderCampo('Crédito Suspendido',
          esSoloLectura ? (
            renderReadonlyTag(data?.creditoSuspendido)
          ) : (
            <Form.Item name="creditoSuspendido" noStyle valuePropName="checked">
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          )
        )}
        {renderCampo('Exento Impuesto',
          esSoloLectura ? (
            renderReadonlyTag(data?.exentoImpuesto)
          ) : (
            <Form.Item name="exentoImpuesto" noStyle valuePropName="checked">
              <Switch checkedChildren="Sí" unCheckedChildren="No" />
            </Form.Item>
          )
        )}
      </Descriptions>
    </Card>
  );

  // ===== Sidebar (solo desktop) =====
  const renderSidebar = () => (
    <Card title="Resumen Financiero" className="paces-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Balance Actual</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--paces-primary)' }}>
            {formatCurrency(data?.balance ?? 0)}
          </div>
        </div>
        <Divider style={{ margin: '4px 0' }} />
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Fecha Último Pago</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.fechaUltimoPago || '-'}</div>
        </div>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Monto Último Pago</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.montoUltimoPago != null ? formatCurrency(data.montoUltimoPago) : '-'}</div>
        </div>
        <div>
          <div className="paces-text-secondary" style={{ fontSize: 12, marginBottom: 2 }}>Documento Último Pago</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{data?.documentoUltimoPago || '-'}</div>
        </div>
      </div>
    </Card>
  );

  // ===== Render Principal =====
  const renderFormulario = () => (
    <Form form={form} layout="vertical" size="small">
      {isLarge ? (
        <Row gutter={16}>
          <Col xxl={18}>
            {renderDatosGenerales()}
            {renderComercialFinanciero()}
            <Card className="paces-card" styles={{ body: { padding: 0 } }}>
              <Tabs defaultActiveKey="personas" type="card" style={{ borderRadius: 8, padding: '0 16px' }} items={tabItems} />
            </Card>
          </Col>
          <Col xxl={6}>
            {renderSidebar()}
          </Col>
        </Row>
      ) : (
        <div>
          {renderDatosGenerales()}
          {renderComercialFinanciero()}
          <Card className="paces-card" styles={{ body: { padding: 0 } }}>
            <Tabs defaultActiveKey="personas" type="card" style={{ borderRadius: 8, padding: '0 16px' }} items={tabItems} />
          </Card>
        </div>
      )}
    </Form>
  );

  return (
    <>
      <DetalleCatalogoLayout
        rutaVolver="/MCliente"
        onVolver={handleVolver}
        loading={loading}
        mensajeLoading="Cargando cliente..."
        loadingError={loadingError}
        mensajeError="Error al cargar detalle de cliente"
        onRecargar={handleRefresh}
        dataDisponible={esNuevo || !!data}
        modo={esNuevo ? 'crear' : 'editar'}
        onEditar={(!esNuevo && !editando && puedeEditar) ? () => { setEditando(true); cargarCategorias(); cargarTiposNCF(); cargarCuentasContables(); cargarMonedas(); } : undefined}
        onGuardar={(esNuevo || editando) ? handleGuardar : undefined}
        guardando={guardando}
        extraActions={esNuevo ? (
          <Button icon={<CopyOutlined />} onClick={abrirModalClonar}>
            Clonar desde otra entidad
          </Button>
        ) : undefined}
      >
        {renderFormulario()}
      </DetalleCatalogoLayout>

      <Modal
        title="Clonar desde otra entidad"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Cancelar</Button>,
          <Button key="clone" type="primary" icon={<CopyOutlined />}
            disabled={!selectedEntity}
            loading={clonando}
            onClick={handleClonar}>Clonar</Button>,
        ]}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Typography.Text strong>Tipo de Entidad</Typography.Text>
            <Table
              dataSource={tiposEntidad}
              columns={[{ title: 'Código', dataIndex: 'codigo', width: 80 }, { title: 'Descripción', dataIndex: 'descripcion' }]}
              rowKey="codigo"
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
              onRow={(record) => ({
                onClick: () => setTipoSeleccionado(record.codigo),
                style: { cursor: 'pointer', background: tipoSeleccionado === record.codigo ? '#e6f7ff' : undefined }
              })}
            />
          </Col>
          <Col span={16}>
            <Typography.Text strong>Entidades</Typography.Text>
            <Input.Search
              placeholder="Buscar entidad..."
              allowClear
              onSearch={(value) => setSearchTexto(value)}
              onClear={() => setSearchTexto('')}
              style={{ marginBottom: 8 }}
            />
            <Table
              dataSource={entidades}
              loading={cargandoEntidades}
              columns={[
                { title: 'Código', dataIndex: 'codigo', width: 80 },
                { title: 'Nombre', dataIndex: 'nombre' },
                { title: 'Identificación', dataIndex: 'identificacion', width: 130 },
              ]}
              rowKey="codigo"
              size="small"
              pagination={false}
              scroll={{ y: 400 }}
              onRow={(record) => ({
                onClick: () => setSelectedEntity(record),
                style: { cursor: 'pointer', background: selectedEntity?.codigo === record.codigo ? '#e6f7ff' : undefined }
              })}
            />
          </Col>
        </Row>
      </Modal>
    </>
  );
};

const ClienteDetalleWithBoundary: React.FC = () => (
  <ErrorBoundary>
    <ClienteDetalle />
  </ErrorBoundary>
);

export default ClienteDetalleWithBoundary;
