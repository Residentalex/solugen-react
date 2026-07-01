import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { notaDebitoApi } from '../../api/notaDebitoApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { TransaccionVistaDTO } from '../../types/transaccion';

const { Text } = Typography;

interface NotaDebitoProps {
  tipoEntidad: 'SUP' | 'CLI';
}

const NotaDebito: React.FC<NotaDebitoProps> = ({ tipoEntidad }) => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const codigoPantalla = tipoEntidad === 'SUP' ? 'FNDSUP' : 'FNDCLI';
  const entidadLabel = tipoEntidad === 'SUP' ? 'Suplidor' : 'Cliente';

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<TransaccionVistaDTO>({
    modulo: codigoPantalla,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      notaDebitoApi.obtenerVista(sucursal, tipoEntidad, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      notaDebitoApi.filtrar(sucursal, tipoEntidad, {
        cantidad: params.cantidad,
        salto: params.salto,
        desde: params.desde,
        hasta: params.hasta,
        tipoEntidad,
        documento: params.documento,
        nCF: params.nCF,
        concepto: params.concepto,
        entidad: params.entidad,
      }),
    reporteUrl: (sucursal, id) => `/reportes/contabilidad/nota-debito/${sucursal}/${id}`,
    tituloReporte: 'ND',
    tituloError: 'Error al cargar notas débito',
  });

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: TransaccionVistaDTO) => (
        <Link to={`/${codigoPantalla}/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      title: entidadLabel,
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
      width: 220,
      ellipsis: true,
      render: (concepto: string) => <Text>{toTitleCase(concepto) || ''}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (total: number) => (
        <Text strong className="paces-text-total">{formatCurrency(total)}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (estado: number, record: TransaccionVistaDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
      ),
    },
  ];

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await notaDebitoApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
      const cloneData = {
        ...data,
        id: 0,
        noDocumento: '',
        ncf: '',
        ncfModificado: '',
        estado: 0,
        asientos: [],
        logs: [],
      };
      navigate(`/${codigoPantalla}/nuevo`, { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  return (
    <DocumentListadoLayout<TransaccionVistaDTO>
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
      errorMessage="Error al cargar notas débito"
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
        searchPlaceholder: 'Buscar documento, NCF, concepto...',
        onSearch: actions.handleSearch,
        searchDefaultValue: state.searchText,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate(`/${codigoPantalla}/nuevo`),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/${codigoPantalla}/${state.selectedRow!.id}/editar`),
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

export default NotaDebito;
