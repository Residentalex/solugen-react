import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Segmented,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ExportOutlined,
  FileAddOutlined,
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import type { AuthSucursalPermitidaDTO } from '../../types/auth';
import type { Sucursal } from '../../types/auth';
import type { AjusteConteoGeneradoDTO } from '../../types/procesableConteo';
import { procesableConteoApi } from '../../api/procesableConteoApi';
import {
  extraerMensajeError,
  formatCurrency,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import EmptyState from '../../components/EmptyState';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
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

const CODIGO_PANTALLA = 'OPROCESARCONTEO';
const RUTA_ENTRADA_ALMACEN = 'FENP';
const RUTA_SALIDA_ALMACEN = 'FSAP';

/**
 * Iguala el Excel con lo que muestra la grilla. Las columnas de texto
 * capitalizado (Articulo, Familia) se exportan ya transformadas, porque
 * filasParaExcel lee el dataIndex crudo y no ejecuta el render.
 */
const formatearParaExcel = (clave: string, valor: unknown): unknown =>
  (clave === 'articulo' || clave === 'familia') && typeof valor === 'string'
    ? toTitleCase(valor)
    : valor;

/**
 * Indicador de una metrica del conteo.
 *
 * Reemplaza las tres Card armadas a mano: el color lo pone la variante de
 * `paces-stat-card`, que ya existe en index.css y respeta el tema en vez de
 * fijar un hex en un archivo de helpers.
 */
const StatCard: React.FC<{
  variante: 'success' | 'danger' | 'primary';
  etiqueta: string;
  valor: string;
  detalle: string;
}> = ({ variante, etiqueta, valor, detalle }) => (
  <div className={`paces-stat-card paces-stat-card--${variante}`}>
    <div className="paces-stat-card-content">
      <div className="paces-stat-value">{valor}</div>
      <div className="paces-stat-label">{etiqueta}</div>
      <div className="paces-stat-change paces-text-secondary">{detalle}</div>
    </div>
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
}> = ({ generado, onIrEntrada, onIrSalida }) => (
  <Descriptions bordered size="small" column={1} style={{ marginTop: 12 }}>
    <Descriptions.Item label="Procesable">N.º {generado.procesableNo}</Descriptions.Item>
    {generado.entradaDocumento && (
      <Descriptions.Item label="Entrada de ajuste">
        <Space direction="vertical" size={0}>
          <Text strong>{generado.entradaDocumento}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {generado.conceptoEntrada} · {generado.cantidadLineasEntrada} líneas ·{' '}
            {formatNumber(generado.cantidadEntrada)} unidades ·{' '}
            {formatCurrency(generado.totalEntrada)}
          </Text>
        </Space>
      </Descriptions.Item>
    )}
    {generado.salidaDocumento && (
      <Descriptions.Item label="Salida de ajuste">
        <Space direction="vertical" size={0}>
          <Text strong>{generado.salidaDocumento}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {generado.conceptoSalida} · {generado.cantidadLineasSalida} líneas ·{' '}
            {formatNumber(generado.cantidadSalida)} unidades ·{' '}
            {formatCurrency(generado.totalSalida)}
          </Text>
        </Space>
      </Descriptions.Item>
    )}
    <Descriptions.Item label="Almacén">
      {generado.almacen || generado.codigoAlmacen}
    </Descriptions.Item>
    <Descriptions.Item label="Siguiente paso">
      <Space direction="vertical" size={4}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Los documentos quedaron en borrador: el stock no cambia hasta que se aplican.
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
        </Space>
      </Space>
    </Descriptions.Item>
  </Descriptions>
);

/**
 * Vista del ajuste de conteo en pestana propia.
 *
 * Recibe la seleccion por query string porque el documento procesable todavia
 * no se persiste (fase 2 pendiente): evento, almacen, fecha de corte y los
 * INVENTID de los conteos marcados. Al recargar vuelve a consultar al backend.
 */
const ProcesableAjuste: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursalesPermitidas = useAuthStore((s) => s.sucursalesPermitidas);
  const setSucursalActiva = useAuthStore((s) => s.setSucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [filtroAjuste, setFiltroAjuste] = useState<FiltroAjuste>('conDiferencia');
  const [busqueda, setBusqueda] = useState('');
  /** Ultimo ajuste generado, para dejar el aviso visible aunque se cierre el modal. */
  const [generado, setGenerado] = useState<AjusteConteoGeneradoDTO | null>(null);

  const codEvento = searchParams.get('evento') || '';
  const codAlmacen = searchParams.get('almacen') || '';
  const fecha = searchParams.get('fecha') || '';

  const inventIds = useMemo(
    () =>
      (searchParams.get('inventIds') || '')
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isInteger(v) && v > 0),
    [searchParams]
  );

  /**
   * La sucursal viaja en la URL porque sessionStorage, donde la guarda
   * useAuthStore, es una COPIA en la pestana que abre window.open. Se aplica
   * antes de consultar para que el pedido salga contra la sucursal correcta.
   */
  const sucursalSolicitada = useMemo(() => {
    const valor = Number(searchParams.get('sucursal'));
    return Number.isInteger(valor) && valor >= 0 ? (valor as Sucursal) : undefined;
  }, [searchParams]);

  const sucursalSincronizada =
    sucursalSolicitada === undefined || sucursalSolicitada === sucursalActiva;

  useEffect(() => {
    if (sucursalSolicitada !== undefined && sucursalSolicitada !== sucursalActiva) {
      void setSucursalActiva(sucursalSolicitada);
    }
  }, [sucursalSolicitada, sucursalActiva, setSucursalActiva]);

  const parametrosValidos = !!codEvento && !!codAlmacen && inventIds.length > 0;

  const {
    data: ajustes,
    isLoading,
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
    ],
    queryFn: () =>
      procesableConteoApi.obtenerAjustes(sucursalActiva, {
        codEvento,
        almacen: codAlmacen,
        inventIds,
        fecha: fecha || undefined,
      }),
    enabled: parametrosValidos && sucursalSincronizada && sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule(CODIGO_PANTALLA);
    updateToolbar({});
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const cargando = isLoading || !sucursalSincronizada;

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
  const sinDiferencia = Math.max(0, resumen.total - resumen.conDiferencia.length);

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

  const handleExportar = useCallback(async () => {
    try {
      const companyName = await getCompanyName(sucursalActiva);
      exportToExcel({
        fileName: `Ajuste_Conteo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'Ajuste',
        companyName,
        columnHeaders: encabezadosParaExcel(columnasAjuste),
        dataRows: filasParaExcel(ajustesFiltrados, columnasAjuste, formatearParaExcel),
      });
    } catch {
      message.error('Error al exportar el ajuste a Excel.');
    }
  }, [ajustesFiltrados, sucursalActiva]);

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
   * Genera los documentos de ajuste (EPJ y/o SPJ). El backend decide cuales
   * crear segun el signo de cada linea y devuelve los numeros asignados.
   *
   * Sin PermissionGate por decision del usuario: la ruta ya esta protegida por
   * PantallaGuard (App.tsx), que solo deja entrar a quien tenga OProcesarConteo
   * en usuario.pantallas. Quien llega a esta pantalla puede generar y exportar.
   */
  const generarAjuste = useMutation({
    mutationFn: () =>
      procesableConteoApi.generarAjuste(sucursalActiva, {
        codEvento,
        almacen: codAlmacen,
        inventIds,
        fecha: fecha || undefined,
      }),
    onSuccess: (resultado) => {
      setGenerado(resultado);

      const irEntrada = resultado.entradaDocumento
        ? () => abrirPantana(RUTA_ENTRADA_ALMACEN)
        : undefined;
      const irSalida = resultado.salidaDocumento
        ? () => abrirPantana(RUTA_SALIDA_ALMACEN)
        : undefined;

      Modal.success({
        title: 'Documentos de ajuste generados',
        width: 560,
        okText: 'Entendido',
        content: (
          <DetalleGenerado
            generado={resultado}
            onIrEntrada={irEntrada}
            onIrSalida={irSalida}
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

  const confirmarGenerar = useCallback(() => {
    const conDiferencia = resumen.conDiferencia;

    if (conDiferencia.length === 0) return;

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
            Al generar, los {inventIds.length}{' '}
            {inventIds.length === 1 ? 'conteo queda' : 'conteos quedan'} bloqueados y no
            podrán procesarse de nuevo.
          </Text>
        </Space>
      ),
      onOk: () => generarAjuste.mutate(),
    });
  }, [generarAjuste, inventIds.length, resumen.conDiferencia, resumen.entradas.length, resumen.salidas.length]);

  const volver = useCallback(() => {
    if (window.opener) {
      window.close();
      return;
    }
    window.location.href = `/${CODIGO_PANTALLA}`;
  }, []);

  const mensajeError = !parametrosValidos
    ? 'La dirección no trae evento, almacén o conteos seleccionados. Volvé a la pantalla de conteos y marcá los conteos antes de generar el ajuste.'
    : isError
      ? extraerMensajeError(error, 'Error al calcular el ajuste')
      : null;

  const puedeGenerar = parametrosValidos && resumen.conDiferencia.length > 0;

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
    >
      {/* ── Encabezado + toolbar ── */}
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
          <Button icon={<ArrowLeftOutlined />} onClick={volver}>
            Volver
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            Revisión del ajuste
          </Title>
          <div style={{ flex: 1 }} />

          <Input.Search
            placeholder="Buscar artículo, código o familia..."
            allowClear
            onSearch={setBusqueda}
            defaultValue={busqueda}
            style={{ width: '100%', maxWidth: 280 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />

          <Segmented
            value={filtroAjuste}
            onChange={(valor) => setFiltroAjuste(valor as FiltroAjuste)}
            options={opcionesFiltro(resumen).map((opcion) => ({
              label: opcion.label,
              value: opcion.value,
            }))}
          />

          <Tooltip title="Exportar a Excel">
            <Button
              icon={<FileExcelOutlined />}
              aria-label="Exportar a Excel"
              onClick={handleExportar}
              disabled={ajustesFiltrados.length === 0}
            />
          </Tooltip>

          <Tooltip title="Genera la Entrada de Ajuste (EPJ) y la Salida de Ajuste (SPJ) en borrador">
            <Button
              type="primary"
              icon={<FileAddOutlined />}
              onClick={confirmarGenerar}
              loading={generarAjuste.isPending}
              disabled={!puedeGenerar}
            >
              Generar ajuste
            </Button>
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

        {/* ── Contexto del conteo ── */}
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, md: 3, lg: 5 }}
          style={{ marginBottom: 16 }}
          items={[
            { key: 'suc', label: 'Sucursal', children: nombreSucursal },
            { key: 'evento', label: 'Evento', children: codEvento || '-' },
            { key: 'almacen', label: 'Almacén', children: codAlmacen || '-' },
            { key: 'fecha', label: 'Fecha de corte', children: fecha || 'la del evento' },
            { key: 'conteos', label: 'Conteos', children: formatNumber(inventIds.length) },
          ]}
        />
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              padding: '0 24px 16px',
            }}
          >
            <StatCard
              variante="success"
              etiqueta="Aumentan stock"
              valor={formatNumber(resumen.entradas.length)}
              detalle={`${formatNumber(resumen.cantidadEntradas)} unidades · ${formatCurrency(
                resumen.totalEntradas
              )}`}
            />
            <StatCard
              variante="danger"
              etiqueta="Disminuyen stock"
              valor={formatNumber(resumen.salidas.length)}
              detalle={`${formatNumber(Math.abs(resumen.cantidadSalidas))} unidades · ${formatCurrency(
                Math.abs(resumen.totalSalidas)
              )}`}
            />
            <StatCard
              variante="primary"
              etiqueta="Sin diferencia"
              valor={formatNumber(sinDiferencia)}
              detalle="No generan movimientos de inventario"
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
              {formatNumber(ajustesFiltrados.length)} artículos visibles
            </Text>
          </div>

          <AjusteDetalleTabla ajustes={ajustesFiltrados} cargando={false} />
        </>
      )}
    </Card>
  );
};

export default ProcesableAjuste;