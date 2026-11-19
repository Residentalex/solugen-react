import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Typography, message, Alert } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Select } from '../../components/Select';
import { useAuthStore } from '../../stores/authStore';
import { verificarPermiso } from '../../components/PermissionGate';
import FechaColumnCell from '../../components/FechaColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import { ajusteAlmacenApi, type TipoAjuste } from '../../api/ajusteAlmacenApi';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import {
  extraerMensajeError,
  formatCurrency,
  formatDateRaw,
  toTitleCase,
} from '../../utils/formats';

const { Text } = Typography;

const FILAS_POR_PAGINA = 25;

/** Estados reales del ajuste (0 borrador, 1 aplicado, 3 anulado). */
const ESTADO_AJUSTE_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  3: { label: 'Anulado', color: 'error' },
};

const estadoAjuste = (estado: number): { label: string; color: string } =>
  ESTADO_AJUSTE_MAP[estado] ?? { label: String(estado), color: 'default' };

export interface AjustesInventarioTabProps {
  /**
   * Selector de modo (Ajustes / Evento / Importación) que la pantalla muestra
   * junto al botón de actualizar. Lo renderiza el contenedor para que el grupo
   * esté siempre en el mismo sitio.
   */
  selector?: React.ReactNode;
}

/**
 * Consulta de los documentos de ajuste de conteo (EPJ y SPJ).
 *
 * Es la vista por defecto de OPROCESARCONTEO y sigue el patrón de los listados
 * de documentos (FENP/FSPA): sin filtro de fecha por defecto, con el botón
 * "Filtros" para acotar período/estado, búsqueda y paginación.
 *
 * Al abrir un documento se navega al detalle de documentos
 * (/FENP/{id}?tipoDoc=EPJ|SPJ), donde se aplica o se edita.
 */
const AjustesInventarioTab: React.FC<AjustesInventarioTabProps> = ({ selector }) => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);

  const [tipo, setTipo] = useState<TipoAjuste>('EPJ');
  const [filtros, setFiltros] = useState<{
    desde?: string;
    hasta?: string;
    estado?: number;
  }>({});
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(FILAS_POR_PAGINA);

  const busqueda = searchText.trim();
  const buscando = busqueda.length > 2;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: [
      'ajustesInventario',
      sucursalActiva,
      tipo,
      filtros.desde,
      filtros.hasta,
      filtros.estado,
      busqueda,
      page,
      pageSize,
    ],
    queryFn: () =>
      ajusteAlmacenApi.obtenerVista(sucursalActiva, {
        tipo,
        // Sin fechas viaja sin rango: el backend devuelve todos los documentos
        // del tipo, ordenados por fecha descendente como /FENP.
        desde: filtros.desde,
        hasta: filtros.hasta,
        cantidad: pageSize,
        salto: (page - 1) * pageSize,
        // El SQL de filtro por texto no aplica estado; se envía solo en la
        // vista sin búsqueda.
        estado: buscando ? undefined : filtros.estado,
        // El filtro del backend combina los campos con OR: el mismo texto se
        // envía a documento, concepto y almacen para buscar en todos.
        documento: buscando ? busqueda : undefined,
        concepto: buscando ? busqueda : undefined,
        almacen: buscando ? busqueda : undefined,
      }),
    enabled: sucursalActiva !== undefined,
  });

  const registros = data?.data ?? [];
  const total = data?.total ?? 0;
  const cargando = isLoading || isFetching;

  // EPJ guarda el almacen en ALM_DESTINO y SPJ en ALM_ORIGEN. Se tolera el
  // contrario para los documentos historicos, que se grabaron en ALM_DESTINO.
  const almacenDe = useCallback(
    (registro: MovimientoVistaDTO) =>
      tipo === 'SPJ'
        ? registro.almacenOrigen || registro.almacenDestino || ''
        : registro.almacenDestino || registro.almacenOrigen || '',
    [tipo]
  );

  const abrirDocumento = useCallback(
    (registro: MovimientoVistaDTO) => {
      // EPJ se consulta en Entrada de Almacén; SPJ en Salida de Almacén.
      const ruta = tipo === 'SPJ' ? '/FSAP' : '/FENP';
      navigate(`${ruta}/${registro.id}?tipoDoc=${tipo}`);
    },
    [navigate, tipo]
  );

  const handleSearch = useCallback((valor: string) => {
    setSearchText(valor);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleTipoChange = useCallback((valor: TipoAjuste) => {
    setTipo(valor);
    setPage(1);
  }, []);

  const handleFiltrosAplicar = useCallback(
    (nuevos: { desde?: string; hasta?: string; estado?: string | number }) => {
      setFiltros({
        desde: nuevos.desde,
        hasta: nuevos.hasta,
        estado:
          nuevos.estado !== undefined && nuevos.estado !== null
            ? Number(nuevos.estado)
            : undefined,
      });
      setPage(1);
    },
    []
  );

  const handleExportarExcel = useCallback(async () => {
    try {
      const companyName = await getCompanyName(sucursalActiva);
      const columnHeaders = ['Documento', 'Fecha', 'Almacén', 'Concepto', 'Estado', 'Total'];
      const dataRows = registros.map((r) => [
        r.documento ?? '',
        formatDateRaw(r.fecha),
        almacenDe(r),
        r.concepto || '',
        estadoAjuste(r.estado).label,
        r.total ?? 0,
      ]);
      exportToExcel({
        fileName: `Ajustes_Inventario_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'Ajustes',
        companyName,
        columnHeaders,
        dataRows,
        numericColumns: [5],
        numericFormat: '#,##0.00',
      });
    } catch {
      message.error('Error al exportar a Excel.');
    }
  }, [registros, sucursalActiva, almacenDe]);

  const columnas: ColumnsType<MovimientoVistaDTO> = useMemo(
    () => [
      {
        title: 'Documento',
        dataIndex: 'documento',
        key: 'documento',
        width: 180,
        fixed: 'left',
        render: (doc: string, registro) => (
          <Text
            strong
            className="paces-doc-link"
            style={{ cursor: 'pointer' }}
            onClick={() => abrirDocumento(registro)}
          >
            {doc || '-'}
          </Text>
        ),
      },
      {
        title: 'Fecha',
        dataIndex: 'fecha',
        key: 'fecha',
        width: 130,
        render: (fecha: string) => <FechaColumnCell fecha={fecha} />,
      },
      {
        title: 'Almacén',
        dataIndex: 'almacenDestino',
        key: 'almacenDestino',
        ellipsis: true,
        render: (_: unknown, registro) => (
          <Text>{toTitleCase(almacenDe(registro)) || '-'}</Text>
        ),
      },
      {
        title: 'Concepto',
        dataIndex: 'concepto',
        key: 'concepto',
        width: 280,
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 160,
        align: 'right',
        render: (valor: number) => (
          <Text strong className="paces-text-total">{formatCurrency(valor ?? 0)}</Text>
        ),
      },
      {
        title: 'Estado',
        dataIndex: 'estado',
        key: 'estado',
        width: 130,
        render: (valor: number, registro) => (
          <EstadoColumnCell estado={valor} periodo={registro.periodo} />
        ),
      },
    ],
    [abrirDocumento, almacenDe]
  );

  const puedeVisualizar = verificarPermiso({
    usuario,
    activeModule: '',
    codigoPantalla: 'OPROCESARCONTEO',
    accion: 'VISUALIZAR',
  });

  if (!puedeVisualizar) {
    return (
      <Alert
        type="warning"
        showIcon
        message="No tiene permiso para visualizar los ajustes de inventario."
      />
    );
  }

  return (
    <DocumentListadoLayout<MovimientoVistaDTO>
      columns={columnas}
      data={registros}
      rowKey="id"
      loading={cargando}
      total={total}
      page={page}
      pageSize={pageSize}
      scrollX={1200}
      loadingError={isError}
      errorMessage={extraerMensajeError(error, 'Error al cargar los ajustes de inventario')}
      onRefresh={handleRefresh}
      onRowClick={abrirDocumento}
      onPageChange={setPage}
      toolbarProps={{
        showFiltros: true,
        filtros,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, concepto...',
        onSearch: handleSearch,
        searchDefaultValue: searchText,
        pageSize,
        onPageSizeChange: (valor) => {
          setPageSize(valor);
          setPage(1);
        },
        extraToolbar: (
          <Select
            style={{ minWidth: 110 }}
            value={tipo}
            onChange={(valor) => handleTipoChange(valor as TipoAjuste)}
            options={[
              { value: 'EPJ', label: 'EPJ' },
              { value: 'SPJ', label: 'SPJ' },
            ]}
          />
        ),
        showExportarExcel: true,
        exportarExcelDisabled: registros.length === 0,
        onExportarExcel: handleExportarExcel,
        extraAcciones: selector,
        onRefresh: handleRefresh,
      }}
      extraFooter={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>{total}</strong> registros
          </Text>
        </div>
      }
      emptyText="No hay documentos de ajuste"
    />
  );
};

export default AjustesInventarioTab;
