import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message, Button, Space, Tag, DatePicker, Select, Checkbox, Input, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { solicitudPagoApi } from '../../../api/solicitudPagoApi';
import DocumentListadoLayout from '../../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../../hooks/useDocumentoListado';
import { useAuthStore } from '../../../stores/authStore';
import EntidadColumnCell from '../../../components/EntidadColumnCell';
import EstadoColumnCell from '../../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../../utils/estadoDocumento';
import type { TransaccionBancariaVistaDTO } from '../../../types/transaccion';
import { useScreenConfig } from '../../../hooks/useScreenConfig';
import { CheckCircleOutlined, CloseCircleOutlined, SyncOutlined, FileAddOutlined } from '@ant-design/icons';

const { Text } = Typography;

const RDocAutorizado: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);
  const { screenCode, documentCode } = useScreenConfig();

  // Estado para filtros de fecha
  const [fechaDesde, setFechaDesde] = React.useState<string>('');
  const [fechaHasta, setFechaHasta] = React.useState<string>('');

  // Estado para selección de filas para generación en lote
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<number>>(new Set());
  const [generandoLote, setGenerandoLote] = React.useState(false);

  // Verificar permiso para generar documentos
  const puedeGenerar = usuario?.permisosEspeciales?.some(p => p.codigo === 'pe_generar_spa' && p.valor) || false;

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<TransaccionBancariaVistaDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      solicitudPagoApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      solicitudPagoApi.filtrar(sucursal, {
        cantidad: params.cantidad,
        salto: params.salto,
        desde: params.desde,
        hasta: params.hasta,
        documento: params.documente,
        entidad: params.entidad,
        concepto: params.concepto,
      }),
    reporteUrl: (sucursal, id) => `/reportes/banco/solicitud-pago/${sucursal}/${id}`,
    tituloReporte: '',
    tituloError: 'Error al cargar solicitudes de pago',
  });

  // Función para verificar si una fila está seleccionada
  const isRowSelected = (rowId: number) => selectedRowIds.has(rowId);

  // Función para alternar selección de una fila
  const toggleRowSelection = (rowId: number, checked: boolean) => {
    const newSelected = new Set(selectedRowIds);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRowIds(newSelected);
  };

  // Función para seleccionar todas las filas
  const selectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = state.data.map(row => row.id);
      setSelectedRowIds(new Set(allIds));
    } else {
      setSelectedRowIds(new Set());
    }
  };

  // Función para generar documentos individuales
  const handleGenerarIndividual = async (rowId: number) => {
    if (!puedeGenerar) {
      message.error('No tiene permiso para generar documentos');
      return;
    }

    try {
      setGenerandoLote(true);
      await solicitudPagoApi.generarPago(sucursalActiva, rowId, true);
      message.success('Documento generado correctamente');
      actions.handleRefresh();
      // Remover de selección si estaba seleccionada
      setSelectedRowIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowId);
        return newSet;
      });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar documento');
    } finally {
      setGenerandoLote(false);
    }
  };

  // Función para generar documentos en lote
  const handleGenerarLote = async () => {
    if (!puedeGenerar) {
      message.error('No tiene permiso para generar documentos');
      return;
    }

    if (selectedRowIds.size === 0) {
      message.warning('Seleccione al menos un documento para generar');
      return;
    }

    try {
      setGenerandoLote(true);
      // Generar cada documento individualmente
      for (const rowId of selectedRowIds) {
        await solicitudPagoApi.generarPago(sucursalActiva, rowId, true);
      }
      message.success(`Documentos generados correctamente (${selectedRowIds.size})`);
      actions.handleRefresh();
      setSelectedRowIds(new Set());
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al generar documentos en lote');
    } finally {
      setGenerandoLote(false);
    }
  };

  // Función para aplicar filtros de fecha
  const handleFiltrosFecha = () => {
    actions.handleFiltrosAplicar({
      ...state.filtros,
      desde: fechaDesde ? fechaDesde.CadenaAFecha() : null,
      hasta: fechaHasta ? fechaHasta.CadenaAFecha() : null,
    });
  };

  const columns: ColumnsType<TransaccionBancariaVistaDTO> = [
    {
      title: '',
      dataIndex: 'id',
      key: 'seleccion',
      width: 50,
      fixed: 'left',
      render: (_, record) => (
        <Checkbox
          checked={isRowSelected(record.id)}
          onChange={(e) => toggleRowSelection(record.id, e.target.checked)}
          disabled={!puedeGenerar || generandoLote}
        />
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: any, record: TransaccionBancariaVistaDTO) => (
        <Link to={`/FSPA/${record.id}`} className="paces-doc-link">
          <Text strong>{typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc)}</Text>
        </Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (f: string) => <Text>{formatDateRaw(f)}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (name: string, record: any) => (
        <EntidadColumnCell name={name} identificacion={record.identificacion} />
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 250,
      ellipsis: true,
      render: (concepto: string) => <Text>{toTitleCase(concepto) || ''}</Text>,
    },
    {
      title: 'Cuenta Bancaria',
      dataIndex: 'ctaBancaria',
      key: 'ctaBancaria',
      width: 260,
      ellipsis: true,
      render: (val: string) => <Text>{val ? toTitleCase(val) : '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">{formatCurrency(total)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado: number, record: TransaccionBancariaVistaDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title={puedeGenerar ? 'Generar documento' : 'Sin permiso'}>
            <Button
              type="primary"
              size="small"
              icon={<FileAddOutlined />}
              onClick={() => handleGenerarIndividual(record.id)}
              disabled={!puedeGenerar || generandoLote}
              loading={generandoLote}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <DocumentListadoLayout<TransaccionBancariaVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1220}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar solicitudes de pago no autorizadas"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, entidad, concepto...',
        onSearch: actions.handleSearch,
        searchDefaultValue: state.searchText,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: false,
        showClonar: false,
        showImprimir: false,
        showEditar: false,
        // Componente adicional para filtros de fecha y generación en lote
        extraToolbar: (
          <Space direction="vertical" size="middle">
            {/* Filtros de fecha */}
            <Space wrap size="small">
              <DatePicker
                placeholder="Desde"
                value={fechaDesde ? new Date(fechaDesde) : null}
                onChange={(date) => setFechaDesde(date ? date.format('YYYYMMDD') : '')}
                format="YYYYMMDD"
                disabled={generandoLote}
              />
              <DatePicker
                placeholder="Hasta"
                value={fechaHasta ? new Date(fechaHasta) : null}
                onChange={(date) => setFechaHasta(date ? date.format('YYYYMMDD') : '')}
                format="YYYYMMDD"
                disabled={generandoLote}
              />
              <Button
                type="primary"
                size="small"
                onClick={handleFiltrosFecha}
                disabled={generandoLote}
              >
                Aplicar Filtros
              </Button>
            </Space>

            {/* Contador de selección */}
            {selectedRowIds.size > 0 && (
              <Tag color="blue" icon={<CheckCircleOutlined />}>
                {selectedRowIds.size} documento(s) seleccionado(s)
              </Tag>
            )}

            {/* Botones de acción */}
            <Space wrap size="small">
              <Tooltip title={puedeGenerar ? 'Generar documentos seleccionados' : 'Sin permiso'}>
                <Button
                  type="primary"
                  icon={<FileAddOutlined />}
                  onClick={handleGenerarLote}
                  disabled={!puedeGenerar || generandoLote || selectedRowIds.size === 0}
                  loading={generandoLote}
                >
                  Generar Seleccionados
                </Button>
              </Tooltip>
              {selectedRowIds.size > 0 && (
                <Button
                  size="small"
                  onClick={() => setSelectedRowIds(new Set())}
                  disabled={generandoLote}
                >
                  Limpiar Selección
                </Button>
              )}
            </Space>

            {/* Indicador de permiso */}
            {!puedeGenerar && (
              <Tag color="red" icon={<CloseCircleOutlined />}>
                Sin permiso para generar documentos
              </Tag>
            )}
          </Space>
        ),
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default RDocAutorizado;