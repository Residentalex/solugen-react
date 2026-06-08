import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { transferenciaAlmacenApi } from '../../api/transferenciaAlmacenApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { MovimientoVistaDTO } from '../../types/transferenciaAlmacen';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const TransferenciaAlmacen: React.FC = () => {
  const navigate = useNavigate();

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<MovimientoVistaDTO>({
    modulo: 'FTRP',
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      transferenciaAlmacenApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      transferenciaAlmacenApi.filtrar(sucursal, params),
    reporteUrl: (sucursal, id) => `/reportes/inventario/transferencia/${sucursal}/${id}`,
    tituloReporte: 'TRP',
    tituloError: 'Error al cargar transferencias de almacén',
  });

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await transferenciaAlmacenApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate('/FTRP/nuevo', { state: { cloneData } });
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
        <Link to={`/FTRP/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      render: (name: string) => <EntidadColumnCell name={name} />,
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
      title: 'Almacén Origen',
      dataIndex: 'almacenOrigen',
      key: 'almacenOrigen',
      width: 180,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
    },
    {
      title: 'Almacén Destino',
      dataIndex: 'almacenDestino',
      key: 'almacenDestino',
      width: 180,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
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
      scrollX={1200}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar transferencias de almacén"
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
        onCrear: () => navigate('/FTRP/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FTRP/${state.selectedRow!.id}/editar`),
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

export default TransferenciaAlmacen;
