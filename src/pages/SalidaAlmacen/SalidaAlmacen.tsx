import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { salidaAlmacenApi } from '../../api/salidaAlmacenApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const SalidaAlmacen: React.FC = () => {
  const navigate = useNavigate();

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<MovimientoVistaDTO>({
    modulo: 'FSAP',
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      salidaAlmacenApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      salidaAlmacenApi.filtrar(sucursal, params),
    reporteUrl: (sucursal, id) => `/reportes/inventario/salida/${sucursal}/${id}`,
    tituloReporte: 'SAP',
    tituloError: 'Error al cargar salidas de almacén',
  });

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await salidaAlmacenApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate('/FSAP/nuevo', { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  const columns: ColumnsType<MovimientoVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: MovimientoVistaDTO) => (
        <Link to={`/FSAP/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: (f: string, record: MovimientoVistaDTO) => (
        <div style={{ lineHeight: 1.4 }}>
          <div style={{ fontSize: 12 }}>{formatDateRaw(f)}</div>
          <div style={{ fontSize: 10, color: '#888' }}>Entregado: {record.fechaEntrega ? formatDateRaw(record.fechaEntrega) : '-'}</div>
        </div>
      ),
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      render: (name: string, record: MovimientoVistaDTO) => (
        <EntidadColumnCell name={name} diasCredito={record.diasCredito} />
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 280,
      ellipsis: true,
      render: (concepto: string) => <Text>{toTitleCase(concepto) || ''}</Text>,
    },
    {
      title: 'Almacén',
      dataIndex: 'almacenOrigen',
      key: 'almacenOrigen',
      width: 200,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
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
      width: 130,
      render: (estado: number, record: MovimientoVistaDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<MovimientoVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1350}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar salidas de almacén"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FSAP/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FSAP/${state.selectedRow!.id}/editar`),
        showClonar: true,
        clonarDisabled: !state.selectedRow,
        onClonar: handleClonar,
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default SalidaAlmacen;
