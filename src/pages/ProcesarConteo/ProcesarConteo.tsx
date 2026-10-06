import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { Select } from '../../components/Select';
import type { ColumnsType } from 'antd/es/table';
import { CalculatorOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { eventoApi } from '../../api/eventoApi';
import { almacenApi } from '../../api/almacenApi';
import { procesableConteoApi } from '../../api/procesableConteoApi';
import type { AlmacenDTO } from '../../types/entradaAlmacen';
import type { EventoInventarioDTO } from '../../types/evento';
import type { ConteoProcesableDTO } from '../../types/procesableConteo';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import PermissionGate from '../../components/PermissionGate';
import FechaColumnCell from '../../components/FechaColumnCell';

const { Text } = Typography;

const CODIGO_PANTALLA = 'OPROCESARCONTEO';
const FILAS_POR_PAGINA = 25;

const ProcesarConteo: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [codEvento, setCodEvento] = useState<string | undefined>(undefined);
  const [codAlmacen, setCodAlmacen] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [consultado, setConsultado] = useState(false);

  const { data: eventos } = useQuery({
    queryKey: ['eventosInventario', sucursalActiva],
    queryFn: () => eventoApi.obtenerListado(sucursalActiva),
    enabled: sucursalActiva !== undefined,
  });

  const { data: almacenes } = useQuery({
    queryKey: ['almacenesProcesarConteo', sucursalActiva],
    queryFn: () => almacenApi.obtenerListado(sucursalActiva),
    enabled: sucursalActiva !== undefined,
  });

  const { data: conteos, isLoading, isError, refetch } = useQuery({
    queryKey: ['procesableConteos', sucursalActiva, codEvento, codAlmacen],
    queryFn: () =>
      procesableConteoApi.obtenerConteosPorEvento(sucursalActiva, codEvento!, {
        almacen: codAlmacen || undefined,
      }),
    enabled: consultado && !!codEvento && sucursalActiva !== undefined,
  });

  useEffect(() => {
    setActiveModule(CODIGO_PANTALLA);
    updateToolbar({});
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  // Cambiar el evento o el almacen invalida la seleccion.
  const limpiarSeleccion = useCallback(() => {
    setSelectedRowKeys([]);
    setConsultado(false);
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (!eventos) return [] as EventoInventarioDTO[];
    const texto = searchText.trim().toLowerCase();
    if (!texto) return eventos;
    return eventos.filter(
      (e) =>
        e.nombre?.toLowerCase().includes(texto) ||
        e.codigo?.toLowerCase().includes(texto)
    );
  }, [eventos, searchText]);

  const datosFiltrados = useMemo(() => {
    const lista = conteos || [];
    const texto = searchText.trim().toLowerCase();
    if (!texto) return lista;
    return lista.filter(
      (c) =>
        c.documento?.toLowerCase().includes(texto) ||
        c.nombreSuplidor?.toLowerCase().includes(texto) ||
        c.codigoAlmacen?.toLowerCase().includes(texto)
    );
  }, [conteos, searchText]);

  const columnasConteos: ColumnsType<ConteoProcesableDTO> = useMemo(
    () => [
      {
        title: 'Documento',
        dataIndex: 'documento',
        key: 'documento',
        width: 150,
        fixed: 'left',
        render: (valor: string) => <Text strong>{valor}</Text>,
      },
      {
        title: 'Fecha',
        dataIndex: 'fecha',
        key: 'fecha',
        width: 120,
        render: (valor: string) => <FechaColumnCell fecha={valor} />,
      },
      {
        title: 'Almacén',
        dataIndex: 'almacen',
        key: 'almacen',
        width: 150,
        render: (valor: string, registro) => (
          <Text>
            {toTitleCase(valor || '') || registro.codigoAlmacen || '-'}
          </Text>
        ),
      },
      {
        title: 'Suplidor',
        dataIndex: 'nombreSuplidor',
        key: 'nombreSuplidor',
        width: 200,
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Usuario',
        dataIndex: 'usuario',
        key: 'usuario',
        width: 150,
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Artículos',
        dataIndex: 'cantidadDetalles',
        key: 'cantidadDetalles',
        width: 100,
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 120,
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        width: 130,
        align: 'right',
        render: (valor: number) => <Text>{formatCurrency(valor ?? 0)}</Text>,
      },
      {
        title: 'Estado',
        dataIndex: 'bloqueado',
        key: 'bloqueado',
        width: 120,
        render: (valor: boolean) =>
          valor ? <Tag color="red">Bloqueado</Tag> : <Tag>Editable</Tag>,
      },
      {
        title: 'Procesado',
        dataIndex: 'procesado',
        key: 'procesado',
        width: 170,
        render: (valor: boolean, registro) =>
          valor ? (
            <Tooltip title={`Ya unificado en el procesable N.º ${registro.procesableNo ?? '-'}`}>
              <Tag color="processing">Procesable {registro.procesableNo ?? '-'}</Tag>
            </Tooltip>
          ) : (
            <Tag color="default">No unificado</Tag>
          ),
      },
    ],
    []
  );

  const handleSearch = useCallback((valor: string) => {
    setSearchText(valor);
  }, []);

  const handleConsultar = useCallback(() => {
    if (!codEvento) {
      message.warning('Seleccione un evento de inventario.');
      return;
    }
    setSelectedRowKeys([]);
    if (consultado) {
      void refetch();
      return;
    }
    setConsultado(true);
  }, [codEvento, consultado, refetch]);

  const handleRefresh = useCallback(() => {
    setSelectedRowKeys([]);
    if (consultado && codEvento) {
      void refetch();
    }
  }, [codEvento, consultado, refetch]);

  /**
   * Abre el ajuste en una pestana nueva. El calculo ocurre del lado del
   * backend, asi que la pestana recibe la seleccion por query string y
   * vuelve a consultar al montar.
   */
  const handleAbrirAjuste = useCallback(() => {
    if (!codEvento) {
      message.warning('Seleccione un evento de inventario.');
      return;
    }
    if (!codAlmacen) {
      message.warning(
        'Seleccione el almacén del ajuste. La cantidad del sistema se calcula por almacén porque la entrada o salida de almacén resultante es de un solo almacén.'
      );
      return;
    }
    if (selectedRowKeys.length === 0) {
      message.warning('Seleccione al menos un conteo.');
      return;
    }

    const ids = selectedRowKeys.map((k) => Number(k)).join(',');
    const documentos = (conteos || [])
      .filter((c) => selectedRowKeys.includes(c.inventId))
      .map((c) => c.documento)
      .join(', ');

    const parametros = new URLSearchParams({
      evento: codEvento,
      almacen: codAlmacen,
      inventIds: ids,
      sucursal: String(sucursalActiva),
    });
    if (documentos) parametros.set('documentos', documentos);

    // Se arma sobre la ruta actual para respetar el prefijo de la rama
    // principal (/OPROCESARCONTEO) o de la rama SaaS (/saas/OPROCESARCONTEO).
    const base = window.location.pathname.replace(/\/+$/, '');
    const url = `${base}/ajuste?${parametros.toString()}`;

    window.open(url, '_blank', 'noopener');
  }, [codEvento, codAlmacen, selectedRowKeys, conteos, sucursalActiva]);

  const handleExportarConteos = useCallback(async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columnasConteos.filter((col) => col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col) => String(col.title));
    const dataRows = datosFiltrados.map((item) =>
      exportCols.map((col) => {
        const clave = (col as { dataIndex?: string }).dataIndex;
        if (!clave) return '';
        const valor = (item as unknown as Record<string, unknown>)[clave];
        return valor != null ? String(valor) : '';
      })
    );
    exportToExcel({
      fileName: `Conteos_ProcesarConteo_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Conteos',
      companyName,
      columnHeaders,
      dataRows,
    });
  }, [columnasConteos, datosFiltrados, sucursalActiva]);

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar los conteos del evento"
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

      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
              placeholder="Buscar en los conteos listados..."
          pageSize={FILAS_POR_PAGINA}
          onPageSizeChange={() => {}}
          ocultarPageSize
          onReload={handleRefresh}
          onExportarExcel={handleExportarConteos}
          filtros={
            <Space size={8} wrap>
              <Select
                style={{ minWidth: 260 }}
                placeholder="Evento de inventario"
                value={codEvento}
                onChange={(valor) => {
                  setCodEvento(valor);
                  limpiarSeleccion();
                }}
                options={eventosFiltrados.map((e) => ({
                  value: e.codigo,
                  label: `${e.nombre} — ${formatDate(e.fecha)}`,
                }))}
                showSearch
                optionFilterProp="label"
                notFoundContent={<Empty description="Sin eventos" />}
              />
              <Select
                style={{ minWidth: 200 }}
                placeholder="Almacén del ajuste"
                value={codAlmacen || undefined}
                onChange={(valor) => {
                  setCodAlmacen(valor ?? '');
                  limpiarSeleccion();
                }}
                options={(almacenes || []).map((a: AlmacenDTO) => ({
                  value: a.codigo,
                  label: toTitleCase(a.nombre || a.codigo),
                }))}
                allowClear
              />
              <Button type="primary" onClick={handleConsultar}>
                Consultar
              </Button>
            </Space>
          }
          acciones={
            // La pantalla OProcesarConteo solo declara la accion PROCESAR en
            // AUTH_PANTALLA_ACCION (consultar en la base de seguridad), por eso
            // no se usa CREAR: el PermissionGate devuelve null y oculta el boton.
            <PermissionGate accion="PROCESAR">
              <Tooltip title="Revisar el impacto estimado de los conteos seleccionados">
                <Button
                  icon={<CalculatorOutlined />}
                  onClick={handleAbrirAjuste}
                  disabled={!codEvento || !codAlmacen || selectedRowKeys.length === 0}
                >
                  Revisar ajuste ({selectedRowKeys.length})
                </Button>
              </Tooltip>
            </PermissionGate>
          }
        />

        {!codEvento && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ margin: '16px 24px 0' }}
            message="Seleccione un evento de inventario para listar sus conteos."
          />
        )}

        {codEvento && !codAlmacen && (
          <Alert
            type="warning"
            showIcon
            style={{ margin: '16px 24px 0' }}
            message="Seleccione el almacén para poder calcular el ajuste. La cantidad del sistema se calcula por almacén porque la entrada o salida de almacén resultante es de un solo almacén."
          />
        )}

      {selectedRowKeys.length > 0 && (
        <Alert
          type="success"
          showIcon
          style={{ margin: '16px 24px 0' }}
          message={`${selectedRowKeys.length} conteo${selectedRowKeys.length === 1 ? '' : 's'} seleccionado${selectedRowKeys.length === 1 ? '' : 's'}. La siguiente pantalla permite revisar el impacto estimado; todavía no modifica las existencias.`}
        />
      )}

      <Table<ConteoProcesableDTO>
          columns={columnasConteos}
          dataSource={datosFiltrados}
          rowKey="inventId"
          loading={isLoading}
        scroll={{ x: 1350 }}
        sticky
          size="middle"
          rowClassName={(registro) =>
            registro.procesado ? 'paces-row-selected' : 'paces-row-hover'
          }
          rowSelection={{
            selectedRowKeys,
            preserveSelectedRowKeys: true,
            columnWidth: 50,
            getCheckboxProps: (registro) => ({
              name: registro.documento,
              disabled: registro.procesado,
            }),
            onChange: (claves) => setSelectedRowKeys(claves),
          }}
          locale={{
            emptyText: (
              <div
                style={{
                  minHeight: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Empty description="No hay conteos para el evento seleccionado" />
              </div>
            ),
          }}
          pagination={{
            pageSize: FILAS_POR_PAGINA,
            showSizeChanger: false,
            showTotal: (total) => `${total} registros`,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default ProcesarConteo;
