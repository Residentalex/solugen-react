import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  FileAddOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import type { AuthSucursalPermitidaDTO } from '../../types/auth';
import type { AjusteConteoDTO, AjusteConteoGeneradoDTO, ProcesarConteoCierreResultDTO } from '../../types/procesableConteo';
import type { ImportarConteoLineaDTO } from '../../types/conteo';
import { procesableConteoApi } from '../../api/procesableConteoApi';
import { conteoApi } from '../../api/conteoApi';
import {
  extraerMensajeError,
  formatCurrency,
  formatDateRaw,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import EmptyState from '../../components/EmptyState';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import PermissionGate from '../../components/PermissionGate';
import AjusteDetalleTabla from './AjusteDetalleTabla';
import { columnasAjuste } from './ajusteColumnas';
import {
  calcularResumen,
  encabezadosParaExcel,
  filasParaExcel,
  filtrarAjustes,
  opcionesFiltro,
} from './ajusteResumen';
import type { FiltroAjuste } from './ajusteResumen';

const { Text, Title } = Typography;

const RUTA_ENTRADA_ALMACEN = 'FENP';
const RUTA_SALIDA_ALMACEN = 'FSAP';
const RUTA_CIERRE_INVENTARIO = 'OCierreINV';

/**
 * Iguala el Excel con lo que muestra la grilla. Las columnas de texto
 * capitalizado (Articulo, Familia) se exportan ya transformadas, porque
 * filasParaExcel lee el dataIndex crudo y no ejecuta el render.
 */
const formatearParaExcel = (clave: string, valor: unknown): unknown =>
  (clave === 'articulo' || clave === 'familia') && typeof valor === 'string'
    ? toTitleCase(valor)
    : valor;

/** Conteos enteros con separador de miles (sin decimales). */
const formatCount = (valor: number): string =>
  (valor ?? 0).toLocaleString('es-DO', { maximumFractionDigits: 0 });

const STAT_COLOR: Record<
  'success' | 'danger' | 'primary' | 'warning',
  { color: string; bg: string; border: string }
> = {
  success: {
    color: '#34c38f',
    bg: 'linear-gradient(135deg, #eefaf4 0%, #ffffff 72%)',
    border: '#c8ebd9',
  },
  danger: {
    color: '#f46a6a',
    bg: 'linear-gradient(135deg, #fff2f1 0%, #ffffff 72%)',
    border: '#f8d2cf',
  },
  primary: {
    color: '#556ee6',
    bg: 'linear-gradient(135deg, #eef1ff 0%, #ffffff 72%)',
    border: '#d8ddff',
  },
  warning: {
    color: '#d4922a',
    bg: 'linear-gradient(135deg, #fff8ec 0%, #ffffff 72%)',
    border: '#f3dfb6',
  },
};

/**
 * Indicador de una metrica del conteo.
 *
 * Mantiene la clase `paces-stat-card` (respeta el tema) y agrega un icono con
 * fondo tenue por variante para llenar la tarjeta.
 */
const StatCard: React.FC<{
  variante: 'success' | 'danger' | 'primary' | 'warning';
  etiqueta: string;
  valor: string;
  detalle: string;
  detalleTitulo?: string;
  icono: React.ReactNode;
  valorGrande?: boolean;
}> = ({ variante, etiqueta, valor, detalle, detalleTitulo, icono, valorGrande }) => {
  const estilo = STAT_COLOR[variante];

  return (
    <div
      className={`paces-stat-card paces-stat-card--${variante}`}
      style={{ background: estilo.bg, borderColor: estilo.border }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${estilo.color}1f`,
          color: estilo.color,
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icono}
      </div>
      <div className="paces-stat-card-content" style={{ minWidth: 0 }}>
        <div
          className="paces-stat-value"
          style={
            valorGrande
              ? { fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
              : undefined
          }
          title={valor}
        >
          {valor}
        </div>
        <div className="paces-stat-label">{etiqueta}</div>
        <div
          className="paces-stat-change paces-text-secondary"
          title={detalleTitulo ?? detalle}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {detalle}
        </div>
      </div>
    </div>
  );
};

/** Par etiqueta/valor compacto para la franja de contexto. */
const InfoConteo: React.FC<{ etiqueta: string; valor: string | number }> = ({
  etiqueta,
  valor,
}) => (
  <span style={{ fontSize: 12 }}>
    <Text type="secondary">{etiqueta}: </Text>
    <Text strong>{valor}</Text>
  </span>
);

/**
 * Lista compacta y con scroll de los documentos generados. Se usa cuando el
 * backend dividió el ajuste en varios documentos (por el límite de productos
 * por documento) para no ensanchar el modal con una columna larga.
 */
const ListaDocumentos: React.FC<{ documentos: string[] }> = ({ documentos }) => (
  <div style={{ maxHeight: 128, overflowY: 'auto', paddingRight: 4 }}>
    <Space direction="vertical" size={2}>
      {documentos.map((doc, index) => (
        <Text key={`${doc}-${index}`} style={{ fontSize: 12 }}>
          {index + 1}. {doc}
        </Text>
      ))}
    </Space>
  </div>
);

/**
 * Resumen de los documentos generados. Se muestra en el Modal de exito para que
 * el usuario salga con los numeros con los que debe buscarlos en las pantallas
 * de entradas y salidas de almacen.
 */
const DetalleGenerado: React.FC<{
  generado: AjusteConteoGeneradoDTO;
  onIrEntrada?: () => void;
  onIrSalida?: () => void;
  onIrCierre?: () => void;
}> = ({ generado, onIrEntrada, onIrSalida, onIrCierre }) => {
  const entradas = generado.entradaDocumentos?.length
    ? generado.entradaDocumentos
    : generado.entradaDocumento
      ? [generado.entradaDocumento]
      : [];
  const salidas = generado.salidaDocumentos?.length
    ? generado.salidaDocumentos
    : generado.salidaDocumento
      ? [generado.salidaDocumento]
      : [];

  return (
    <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
      <Descriptions.Item label="Procesable">N.º {generado.procesableNo}</Descriptions.Item>
      {entradas.length > 1 ? (
        <Descriptions.Item label={`Entradas de ajuste (${entradas.length})`}>
          <ListaDocumentos documentos={entradas} />
        </Descriptions.Item>
      ) : entradas.length === 1 ? (
        <Descriptions.Item label="Entrada de ajuste">
          <Space direction="vertical" size={0}>
            <Text strong>{entradas[0]}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {generado.conceptoEntrada} · {generado.cantidadLineasEntrada} líneas ·{' '}
              {formatNumber(generado.cantidadEntrada)} unidades ·{' '}
              {formatCurrency(generado.totalEntrada)}
            </Text>
          </Space>
        </Descriptions.Item>
      ) : null}
      {salidas.length > 1 ? (
        <Descriptions.Item label={`Salidas de ajuste (${salidas.length})`}>
          <ListaDocumentos documentos={salidas} />
        </Descriptions.Item>
      ) : salidas.length === 1 ? (
        <Descriptions.Item label="Salida de ajuste">
          <Space direction="vertical" size={0}>
            <Text strong>{salidas[0]}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {generado.conceptoSalida} · {generado.cantidadLineasSalida} líneas ·{' '}
              {formatNumber(generado.cantidadSalida)} unidades ·{' '}
              {formatCurrency(generado.totalSalida)}
            </Text>
          </Space>
        </Descriptions.Item>
      ) : null}
      <Descriptions.Item label="Almacén">
        {generado.almacen || generado.codigoAlmacen}
      </Descriptions.Item>
      <Descriptions.Item label="Siguiente paso">
        <Space direction="vertical" size={4}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Los documentos quedaron en borrador: el stock no cambia hasta que se aplican.
            Aplique la EPJ y la SPJ antes de generar el cierre de inventario para que refleje el ajuste.
          </Text>
          <Space size={8} wrap>
            {onIrEntrada && (
              <Button size="small" icon={<ExportOutlined />} onClick={onIrEntrada}>
                Ir a Entrada de Almacén
              </Button>
            )}
            {onIrSalida && (
              <Button size="small" icon={<ExportOutlined />} onClick={onIrSalida}>
                Ir a Salida de Almacén
              </Button>
            )}
            {onIrCierre && (
              <Button size="small" icon={<ExportOutlined />} onClick={onIrCierre}>
                Ir a Cierre de Inventario
              </Button>
            )}
          </Space>
        </Space>
      </Descriptions.Item>
    </Descriptions>
  );
};

/**
 * Resumen del flujo completo (procesar y cerrar). Se muestra en el Modal de
 * exito e indica hasta donde llego el flujo: documentos generados/aplicados y
 * si el cierre de inventario de la sucursal se ejecuto.
 */
const DetalleCierre: React.FC<{ resultado: ProcesarConteoCierreResultDTO }> = ({
  resultado,
}) => {
  const entradas = resultado.entradaDocumentos?.length
    ? resultado.entradaDocumentos
    : resultado.entradaDocumento
      ? [resultado.entradaDocumento]
      : [];
  const salidas = resultado.salidaDocumentos?.length
    ? resultado.salidaDocumentos
    : resultado.salidaDocumento
      ? [resultado.salidaDocumento]
      : [];

  return (
    <>
      {resultado.cierreGenerado === false && resultado.mensajeCierre && (
        <Alert type="warning" showIcon message={resultado.mensajeCierre} />
      )}
      <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
        <Descriptions.Item label="Procesable">N.º {resultado.procesableNo}</Descriptions.Item>
        {entradas.length > 1 ? (
          <Descriptions.Item label={`Entradas de ajuste (${entradas.length})`}>
            <Space direction="vertical" size={4}>
              <ListaDocumentos documentos={entradas} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {resultado.entradaAplicada ? 'Aplicadas: el stock se actualizó' : 'No aplicadas'}
              </Text>
            </Space>
          </Descriptions.Item>
        ) : entradas.length === 1 ? (
          <Descriptions.Item label="Entrada de ajuste">
            <Space direction="vertical" size={0}>
              <Text strong>{entradas[0]}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {resultado.entradaAplicada ? 'Aplicada: el stock se actualizó' : 'No aplicada'}
              </Text>
            </Space>
          </Descriptions.Item>
        ) : null}
        {salidas.length > 1 ? (
          <Descriptions.Item label={`Salidas de ajuste (${salidas.length})`}>
            <Space direction="vertical" size={4}>
              <ListaDocumentos documentos={salidas} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {resultado.salidaAplicada ? 'Aplicadas: el stock se actualizó' : 'No aplicadas'}
              </Text>
            </Space>
          </Descriptions.Item>
        ) : salidas.length === 1 ? (
          <Descriptions.Item label="Salida de ajuste">
            <Space direction="vertical" size={0}>
              <Text strong>{salidas[0]}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {resultado.salidaAplicada ? 'Aplicada: el stock se actualizó' : 'No aplicada'}
              </Text>
            </Space>
          </Descriptions.Item>
        ) : null}
        <Descriptions.Item label="Cierre de inventario">
          {resultado.cierreGenerado ? (
            <Tag color="success">Ejecutado</Tag>
          ) : (
            <Tag color="warning">No ejecutado</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </>
  );
};

/**
 * Vista del ajuste de conteo en pestana propia.
 *
 * Recibe la seleccion por query string porque el documento procesable todavia
 * no se persiste (fase 2 pendiente): evento, almacen, fecha de corte y los
 * INVENTID de los conteos marcados. Al recargar vuelve a consultar al backend.
 */
export interface ProcesableAjusteProps {
  codEvento?: string;
  codAlmacen: string;
  fecha?: string;
  inventIds: number[];
  lineas?: ImportarConteoLineaDTO[];
  nota?: string;
  onVolver: () => void;
}

const ProcesableAjuste: React.FC<ProcesableAjusteProps> = ({
  codEvento = '',
  codAlmacen,
  fecha = '',
  inventIds,
  lineas,
  nota,
  onVolver,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);

  const [filtroAjuste, setFiltroAjuste] = useState<FiltroAjuste>('conDiferencia');
  const [busqueda, setBusqueda] = useState('');
  /** Ultimo ajuste generado, para dejar el aviso visible aunque se cierre el modal. */
  const [generado, setGenerado] = useState<AjusteConteoGeneradoDTO | null>(null);
  /**
   * Llevar a 0 los productos del almacén con existencia distinta de cero que no
   * fueron contados. Por defecto false.
   */
  const [incluirNoContados, setIncluirNoContados] = useState(false);
  /**
   * Máximo de productos por documento al materializar el ajuste. El backend
   * divide la EPJ/SPJ en varios documentos si hay más líneas que este límite.
   * Por defecto 200.
   */
  const [maximoProductosPorDocumento, setMaximoProductosPorDocumento] = useState<
    number | null
  >(200);

  /**
   * Lineas del Excel de la importacion. Se usan en memoria para la revision y
   * el conteo (INVENT/DINVENT) se persiste solo al confirmar.
   */
  const lineasImportadas = lineas ?? [];
  const usandoLineas = lineasImportadas.length > 0;
  const inventIdPersistido = useRef<number | null>(null);

  const parametrosValidos =
    !!codAlmacen && (!!codEvento || !!fecha) && (inventIds.length > 0 || usandoLineas);

  const {
    data: ajustes,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'procesableAjuste',
      sucursalActiva,
      codEvento,
      codAlmacen,
      fecha,
      inventIds.join(','),
      incluirNoContados,
      usandoLineas ? lineasImportadas.length : 0,
    ],
    queryFn: () =>
      procesableConteoApi.obtenerAjustes(sucursalActiva, {
        codEvento: codEvento || undefined,
        almacen: codAlmacen,
        inventIds: usandoLineas ? [] : inventIds,
        lineas: usandoLineas ? lineasImportadas : undefined,
        fecha: fecha || undefined,
        incluirNoContados,
      }),
    enabled: parametrosValidos && sucursalActiva !== undefined,
  });

  const cargando = isLoading || isFetching;

  // Mismo origen que el selector de sucursal de MainLayout.
  const nombreSucursal = useMemo(
    () =>
      (sucursalesPermitidas || []).find(
        (s: AuthSucursalPermitidaDTO) => s.sucursal === sucursalActiva
      )?.nombre || 'Consolidado',
    [sucursalesPermitidas, sucursalActiva]
  );

  const lista = useMemo(() => ajustes || [], [ajustes]);
  const hayResultados = lista.length > 0;
  const resumen = useMemo(() => calcularResumen(lista), [lista]);
  const sinDiferencia = resumen.sinDiferencia.length;

  // Límite efectivo: mínimo 1 para que la estimación nunca divida por 0.
  const maximo =
    maximoProductosPorDocumento != null && maximoProductosPorDocumento >= 1
      ? maximoProductosPorDocumento
      : 1;
  const estimacionEntradas = Math.ceil(resumen.entradas.length / maximo);
  const estimacionSalidas = Math.ceil(resumen.salidas.length / maximo);

  const conBusqueda = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return lista;
    return lista.filter(
      (a) =>
        a.codigo?.toLowerCase().includes(texto) ||
        a.articulo?.toLowerCase().includes(texto) ||
        a.familia?.toLowerCase().includes(texto)
    );
  }, [lista, busqueda]);

  const ajustesFiltrados = useMemo(
    () => filtrarAjustes(conBusqueda, filtroAjuste),
    [conBusqueda, filtroAjuste]
  );

  // Columnas del Excel: la grilla + "Costo actual" (sistema x costo unitario),
  // que no se muestra en pantalla pero sirve para validar el monto.
  const columnasExport = useMemo<ColumnsType<AjusteConteoDTO>>(
    () => [
      ...columnasAjuste,
      {
        title: 'Costo actual',
        dataIndex: 'costoActual',
        key: 'costoActual',
        align: 'right',
      },
    ],
    []
  );

  // Columnas numericas de la grilla (para aplicarles formato en el Excel).
  const columnasNumericas = useMemo(() => {
    const claves = new Set([
      'cantidadContada',
      'cantidadSistema',
      'cantidadAjuste',
      'cantidadFinal',
      'costoUnitario',
      'totalAjuste',
      'costoFinal',
      'costoActual',
    ]);
    return columnasExport
      .map((col, index) => (claves.has(String(col.key)) ? index : -1))
      .filter((index) => index >= 0);
  }, [columnasExport]);

  const handleExportar = useCallback(async () => {
    try {
      const companyName = await getCompanyName(sucursalActiva);
      exportToExcel({
        fileName: `Ajuste_Conteo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'Ajuste',
        companyName,
        columnHeaders: encabezadosParaExcel(columnasExport),
        dataRows: filasParaExcel(ajustesFiltrados, columnasExport, formatearParaExcel),
        numericColumns: columnasNumericas,
        numericFormat: '#,##0.0000',
      });
    } catch {
      message.error('Error al exportar el ajuste a Excel.');
    }
  }, [ajustesFiltrados, sucursalActiva, columnasExport, columnasNumericas]);

  /**
   * Abre una pantalla del modulo en pestana nueva, igual que hace
   * ProcesarConteo con window.open. Se reconstruye sobre la ruta actual para
   * respetar el prefijo de la rama principal (/OPROCESARCONTEO) o de la rama
   * SaaS (/saas/OPROCESARCONTEO).
   */
  const abrirPantana = useCallback((codigoRuta: string) => {
    const actual = window.location.pathname.replace(/\/+$/, '');
    const raiz = actual.replace(/\/(?:OPROCESARCONTEO)(?:\/ajuste)?.*$/i, '');
    window.open(`${raiz}/${codigoRuta}`, '_blank', 'noopener');
  }, []);

  /**
   * Persiste el conteo (INVENT/DINVENT) a partir de las lineas del Excel antes
   * de generar/aplicar los documentos. Se ejecuta una sola vez por sesion; en
   * modo evento no hace nada y se usan los inventIds de la URL.
   */
  const persistirConteo = useCallback(async (): Promise<number[]> => {
    if (!usandoLineas) return inventIds;
    if (inventIdPersistido.current != null) return [inventIdPersistido.current];

    const resultado = await conteoApi.importarConteo(sucursalActiva, {
      almacen: codAlmacen,
      fecha,
      nota,
      usuario: usuario?.nombreUsuario,
      lineas: lineasImportadas,
    });

    inventIdPersistido.current = resultado.inventId;
    return [resultado.inventId];
  }, [
    usandoLineas,
    inventIds,
    sucursalActiva,
    codAlmacen,
    fecha,
    nota,
    usuario,
    lineasImportadas,
  ]);

  /**
   * Genera los documentos de ajuste (EPJ y/o SPJ). El backend decide cuales
   * crear segun el signo de cada linea y devuelve los numeros asignados.
   *
   * Sin PermissionGate por decision del usuario: la ruta ya esta protegida por
   * PantallaGuard (App.tsx), que solo deja entrar a quien tenga OProcesarConteo
   * en usuario.pantallas. Quien llega a esta pantalla puede generar y exportar.
   */
  const generarAjuste = useMutation({
    mutationFn: async () => {
      const ids = await persistirConteo();
      return procesableConteoApi.generarAjuste(sucursalActiva, {
        codEvento: codEvento || undefined,
        almacen: codAlmacen,
        inventIds: ids,
        fecha: fecha || undefined,
        incluirNoContados,
        maximoProductosPorDocumento: maximo,
        usuario: usuario?.nombreUsuario,
      });
    },
    onSuccess: (resultado) => {
      setGenerado(resultado);

      const hayEntradas =
        (resultado.entradaDocumentos?.length ?? 0) > 0 || !!resultado.entradaDocumento;
      const haySalidas =
        (resultado.salidaDocumentos?.length ?? 0) > 0 || !!resultado.salidaDocumento;
      const irEntrada = hayEntradas ? () => abrirPantana(RUTA_ENTRADA_ALMACEN) : undefined;
      const irSalida = haySalidas ? () => abrirPantana(RUTA_SALIDA_ALMACEN) : undefined;
      const irCierre = () => abrirPantana(RUTA_CIERRE_INVENTARIO);

      Modal.success({
        title: 'Documentos de ajuste generados',
        width: 560,
        okText: 'Entendido',
        content: (
          <DetalleGenerado
            generado={resultado}
            onIrEntrada={irEntrada}
            onIrSalida={irSalida}
            onIrCierre={irCierre}
          />
        ),
      });
    },
    onError: (errorGenerar) => {
      message.error(
        extraerMensajeError(errorGenerar, 'Error al generar los documentos de ajuste.')
      );
    },
  });

  /**
   * Flujo completo "Procesar y cerrar": calcula el ajuste, genera la EPJ y la
   * SPJ, las APLICA (mueve stock) y ejecuta el cierre de inventario de la
   * sucursal. Es la accion principal de esta pantalla.
   */
  const procesarCierre = useMutation({
    mutationFn: async () => {
      const ids = await persistirConteo();
      return procesableConteoApi.procesarCierre(sucursalActiva, {
        codEvento: codEvento || undefined,
        almacen: codAlmacen,
        inventIds: ids,
        fecha: fecha || undefined,
        usuario: usuario?.nombreUsuario,
        incluirNoContados,
        maximoProductosPorDocumento: maximo,
      });
    },
    onSuccess: (resultado) => {
      Modal.success({
        title: 'Inventario procesado y cerrado',
        width: 560,
        okText: 'Entendido',
        content: <DetalleCierre resultado={resultado} />,
      });
    },
    onError: (errorCierre) => {
      message.error(
        extraerMensajeError(errorCierre, 'Error al procesar y cerrar el inventario.')
      );
    },
  });

  const confirmarGenerar = useCallback(() => {
    // No confirmar con un resumen desactualizado: si el checkbox de no contados
    // disparó un refetch, se espera a que termine para no generar documentos
    // con las cantidades viejas.
    if (isFetching) return;

    const conDiferencia = resumen.conDiferencia;

    if (conDiferencia.length === 0) return;

    const cantidadConteos = usandoLineas ? 1 : inventIds.length;

    const Linea = ({ etiqueta, items }: { etiqueta: string; items: number }) => (
      <Text>
        <Text strong>{etiqueta}</Text> con <Text strong>{items}</Text>{' '}
        {items === 1 ? 'línea' : 'líneas'}
      </Text>
    );

    Modal.confirm({
      title: 'Generar documentos de ajuste',
      icon: <FileAddOutlined />,
      width: 560,
      okText: 'Generar',
      cancelText: 'Cancelar',
      content: (
        <Space direction="vertical" size={8} style={{ marginTop: 12, width: '100%' }}>
          <Linea etiqueta="Entrada de Ajuste (EPJ)" items={resumen.entradas.length} />
          <Linea etiqueta="Salida de Ajuste (SPJ)" items={resumen.salidas.length} />
          <Text type="secondary">
            Los documentos nacen en borrador: el stock no cambia hasta que se aplican desde
            la pantalla de entradas o salidas de almacén.
          </Text>
          <Text type="secondary">
            Al generar, {cantidadConteos === 1 ? 'el conteo queda' : `los ${cantidadConteos} conteos quedan`}{' '}
            bloqueado{cantidadConteos === 1 ? '' : 's'} y no podrá
            {cantidadConteos === 1 ? '' : 'n'} procesarse de nuevo.
          </Text>
        </Space>
      ),
      onOk: () => generarAjuste.mutate(),
    });
  }, [generarAjuste, inventIds.length, isFetching, resumen.conDiferencia, resumen.entradas.length, resumen.salidas.length, usandoLineas]);

  const volver = useCallback(() => {
    onVolver();
  }, [onVolver]);

  const origenTexto = codEvento
    ? `Evento ${codEvento}`
    : fecha
      ? `Importación · ${formatDateRaw(fecha)}`
      : '-';

  const mensajeError = !parametrosValidos
    ? 'La dirección no trae origen (evento o fecha), almacén ni conteos/líneas. Volvé a la pantalla de conteos e importá el archivo (o marcá los conteos) antes de revisar el ajuste.'
    : isError
      ? extraerMensajeError(error, 'Error al calcular el ajuste')
      : null;

  const puedeGenerar = parametrosValidos && resumen.conDiferencia.length > 0;

  const confirmarProcesarCierre = useCallback(() => {
    if (!puedeGenerar) return;

    Modal.confirm({
      title: 'Procesar y cerrar inventario',
      icon: <ExclamationCircleOutlined />,
      width: 560,
      okText: 'Procesar y cerrar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      content: (
        <Space direction="vertical" size={8} style={{ marginTop: 12, width: '100%' }}>
          <Text type="secondary">
            Se generarán y <Text strong>aplicarán</Text> la Entrada de Ajuste (EPJ) y la Salida de
            Ajuste (SPJ): el stock <Text strong>sí cambia</Text>.
          </Text>
          <Text type="secondary">
            También se ejecutará el <Text strong>Cierre de Inventario</Text> de toda la sucursal, que
            afecta todos los almacenes, avanza la fecha de cierre y recalcula los costos de entrada.
          </Text>
          {incluirNoContados && (
            <Text type="warning">
              Todo producto del almacén con existencia que no esté en los conteos seleccionados se
              llevará a 0.
            </Text>
          )}
        </Space>
      ),
      onOk: () => procesarCierre.mutate(),
    });
  }, [puedeGenerar, procesarCierre, incluirNoContados]);

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
    >
      {/* ── Encabezado + toolbar ── */}
      <div style={{ padding: '16px 24px 0' }}>
        {/* Fila 1: título y utilidades */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <Button icon={<ArrowLeftOutlined />} onClick={volver}>
            Volver
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            Revisión del ajuste
          </Title>
          <div style={{ flex: 1 }} />

          <Tooltip title="Exportar a Excel">
            <Button
              icon={<FileExcelOutlined />}
              aria-label="Exportar a Excel"
              onClick={handleExportar}
              disabled={ajustesFiltrados.length === 0}
            />
          </Tooltip>

          <Tooltip title="Recalcular">
            <Button
              icon={<ReloadOutlined />}
              aria-label="Recalcular"
              onClick={() => void refetch()}
              loading={cargando}
              disabled={!parametrosValidos}
            />
          </Tooltip>
        </div>

        {/* Panel de opciones y acciones */}
        <div
          style={{
            background: 'var(--paces-bg-layout)',
            border: '1px solid var(--paces-card-border)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <Space size={6}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Máx. por documento
              </Text>
              <InputNumber
                min={1}
                step={50}
                value={maximoProductosPorDocumento}
                onChange={setMaximoProductosPorDocumento}
                style={{ width: 90 }}
              />
              <Tooltip title="Estimación de documentos a generar según el máximo por documento">
                <Tag color="processing" style={{ margin: 0 }}>
                  ~{formatCount(estimacionEntradas)} entrada
                  {estimacionEntradas === 1 ? '' : 's'} · ~{formatCount(estimacionSalidas)} salida
                  {estimacionSalidas === 1 ? '' : 's'}
                </Tag>
              </Tooltip>
            </Space>

            <Checkbox
              checked={incluirNoContados}
              onChange={(e) => setIncluirNoContados(e.target.checked)}
            >
              Llevar productos no contados a 0
            </Checkbox>

            <div style={{ flex: 1 }} />

            <Tooltip title="Genera la Entrada de Ajuste (EPJ) y la Salida de Ajuste (SPJ) en borrador">
              <Button
                icon={<FileAddOutlined />}
                onClick={confirmarGenerar}
                loading={generarAjuste.isPending}
                disabled={!puedeGenerar || isFetching}
              >
                Generar ajuste
              </Button>
            </Tooltip>

            <PermissionGate accion="PROCESAR">
              <Tooltip title="Genera y aplica las Entrada/Salida de ajuste y ejecuta el cierre de inventario de la sucursal">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={confirmarProcesarCierre}
                  loading={procesarCierre.isPending}
                  disabled={!puedeGenerar || isFetching}
                >
                  Procesar y cerrar
                </Button>
              </Tooltip>
            </PermissionGate>
          </div>
        </div>

        {/* Contexto compacto del conteo */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 24px',
            padding: '8px 12px',
            marginBottom: 16,
            borderRadius: 8,
            border: '1px solid var(--paces-card-border)',
            background: 'var(--paces-bg-layout)',
          }}
        >
          <InfoConteo etiqueta="Sucursal" valor={nombreSucursal} />
          <InfoConteo etiqueta="Origen" valor={origenTexto} />
          <InfoConteo etiqueta="Almacén" valor={codAlmacen || '-'} />
          <InfoConteo
            etiqueta="Fecha de corte"
            valor={fecha ? formatDateRaw(fecha) : 'la del evento'}
          />
          <InfoConteo
            etiqueta="Conteos"
            valor={usandoLineas ? 'Importación' : formatCount(inventIds.length)}
          />
        </div>
      </div>

      {/* ── Aviso posterior a la generación ── */}
      {generado && (
        <Alert
          type="success"
          showIcon
          style={{ margin: '0 24px 16px' }}
          message={`Ajuste generado en el procesable N.º ${generado.procesableNo}.`}
          description={
            <Space direction="vertical" size={4}>
              <Text>
                {[generado.entradaDocumento, generado.salidaDocumento]
                  .filter(Boolean)
                  .join(' y ')}{' '}
                quedaron en borrador. El stock no cambia hasta que se aplican.
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Aplique la EPJ y la SPJ antes de generar el cierre de inventario para que refleje el ajuste.
              </Text>
              <Space size={8} wrap>
                {generado.entradaDocumento && (
                  <Button
                    size="small"
                    icon={<ExportOutlined />}
                    onClick={() => abrirPantana(RUTA_ENTRADA_ALMACEN)}
                  >
                    Ir a Entrada de Almacén
                  </Button>
                )}
                {generado.salidaDocumento && (
                  <Button
                    size="small"
                    icon={<ExportOutlined />}
                    onClick={() => abrirPantana(RUTA_SALIDA_ALMACEN)}
                  >
                    Ir a Salida de Almacén
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<ExportOutlined />}
                  onClick={() => abrirPantana(RUTA_CIERRE_INVENTARIO)}
                >
                  Ir a Cierre de Inventario
                </Button>
              </Space>
            </Space>
          }
          closable
          onClose={() => setGenerado(null)}
        />
      )}

      {mensajeError ? (
        <div style={{ padding: '0 24px 16px' }}>
          {parametrosValidos ? (
            <ListadoErrorAlert
              message={mensajeError}
              onRetry={() => void refetch()}
            />
          ) : (
            <Alert type="warning" showIcon message={mensajeError} />
          )}
        </div>
      ) : cargando ? (
        <LoadingSpinner mensaje="Calculando diferencias del conteo…" />
      ) : !hayResultados ? (
        <EmptyState
          title="No se encontraron artículos"
          description="Ningún conteo de los seleccionados tiene líneas para ajustar."
          action={
            <Button icon={<ReloadOutlined />} onClick={() => void refetch()}>
              Recalcular
            </Button>
          }
        />
      ) : (
        <>
          {/* ── Métricas ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 12,
              padding: '0 24px 16px',
            }}
          >
            <StatCard
              variante="success"
              icono={<ArrowUpOutlined />}
              etiqueta="Aumentan stock"
              valor={formatCount(resumen.entradas.length)}
              detalle={`${formatNumber(resumen.cantidadEntradas)} unidades · Costo final ${formatCurrency(
                resumen.valorFinalEntradas
              )}`}
              detalleTitulo={`Variación por entradas: ${formatCurrency(resumen.totalEntradas)}`}
            />
            <StatCard
              variante="danger"
              icono={<ArrowDownOutlined />}
              etiqueta="Disminuyen stock"
              valor={formatCount(resumen.salidas.length)}
              detalle={`${formatNumber(Math.abs(resumen.cantidadSalidas))} unidades · Costo final ${formatCurrency(
                resumen.valorFinalSalidas
              )}`}
              detalleTitulo={`Variación por salidas: ${formatCurrency(Math.abs(resumen.totalSalidas))}`}
            />
            <StatCard
              variante="primary"
              icono={<CheckCircleOutlined />}
              etiqueta="Sin diferencia"
              valor={formatCount(sinDiferencia)}
              detalle={`Sin movimientos · Costo ${formatCurrency(resumen.valorFinalSinDiferencia)}`}
            />
            <StatCard
              variante="warning"
              icono={<DollarOutlined />}
              etiqueta="Costo final del almacén"
              valor={formatCurrency(resumen.valorFinal)}
              valorGrande
              detalle={`Actual ${formatCurrency(resumen.valorActual)} · Variación ${formatCurrency(
                resumen.valorFinal - resumen.valorActual
              )}`}
            />
          </div>

          <div
            style={{
              padding: '0 24px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Text type="secondary">
              Revisar y recalcular no modifica el stock. Para corregirlo hay que generar los
              documentos de ajuste y aplicarlos.
            </Text>
            <Text type="secondary">
              {formatCount(ajustesFiltrados.length)} artículos visibles
            </Text>
          </div>

          <div
            style={{
              padding: '0 24px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Segmented
              value={filtroAjuste}
              onChange={(valor) => setFiltroAjuste(valor as FiltroAjuste)}
              options={opcionesFiltro(resumen).map((opcion) => ({
                label: opcion.label,
                value: opcion.value,
              }))}
            />
            <Input.Search
              placeholder="Buscar artículo, código o familia..."
              allowClear
              onSearch={setBusqueda}
              defaultValue={busqueda}
              style={{ width: '100%', maxWidth: 280 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
          </div>

          <AjusteDetalleTabla ajustes={ajustesFiltrados} cargando={false} />
        </>
      )}
    </Card>
  );
};

export default ProcesableAjuste;