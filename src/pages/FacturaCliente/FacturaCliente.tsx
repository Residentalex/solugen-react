import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { facturaClienteApi } from '../../api/facturaClienteApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import type { FacturaClienteResumenDTO } from '../../types/facturaCliente';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAuthStore } from '../../stores/authStore';

const ESTADO_OPCIONES = [
  { value: '', label: 'Todos' },
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Terminado' },
  { value: 3, label: 'Anulado' },
];

const { Text } = Typography;

const FacturaCliente: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode, documentCode } = useScreenConfig('FFAC');

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<FacturaClienteResumenDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      facturaClienteApi.obtenerResumen(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: async (sucursal, params) => {
      const result = await facturaClienteApi.filtrar(sucursal, params as any);
      return {
        data: result.data.map((item): FacturaClienteResumenDTO => ({
          id: item.id,
          fecha: item.fecha,
          documento: item.documento,
          cliente: item.entidad,
          clienteIdentificacion: item.identificacion ?? '',
          concepto: item.concepto,
          ncf: item.ncf,
          ncfModificado: item.ncfModificado ?? '',
          turno: item.turno ?? '',
          total: item.total.toString(),
          estado: item.estado,
          periodo: item.periodo ?? '',
          referencia: item.referencia,
        })),
        total: result.total,
      };
    },
    reporteUrl: (sucursal, id) => `/reportes/contabilidad/factura-cliente/${sucursal}/${id}`,
    tituloReporte: 'FC',
    tituloError: 'Error al cargar facturas de cliente',
  });

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const { obtenerPorId } = await import('../../api/facturaClienteApi');
      const data = await obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate('/FFAC/nuevo', { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  const columns: ColumnsType<FacturaClienteResumenDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: FacturaClienteResumenDTO) => (
        <Link to={`/FFAC/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      title: 'Cliente',
      dataIndex: 'cliente',
      key: 'cliente',
      render: (name: string, record: FacturaClienteResumenDTO) => (
        <EntidadColumnCell name={name} identificacion={record.clienteIdentificacion} />
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
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      align: 'right',
      render: (total: string) => (
        <Text strong className="paces-text-total">{formatCurrency(Number(total))}</Text>
      ),
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 150,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado: string, record: FacturaClienteResumenDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<FacturaClienteResumenDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1370}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar facturas de cliente"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: ESTADO_OPCIONES,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar documento, NCF, concepto...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FFAC/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FFAC/${state.selectedRow!.id}/editar`),
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

export default FacturaCliente;
