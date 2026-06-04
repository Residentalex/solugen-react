import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO } from '../../utils/estadoDocumento';
import type { MovimientoVistaDTO } from '../../types/entradaAlmacen';

const { Text } = Typography;

const EntradaAlmacen: React.FC = () => {
  const navigate = useNavigate();

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<MovimientoVistaDTO>({
    modulo: 'FENP',
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      entradaAlmacenApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) =>
      entradaAlmacenApi.filtrar(sucursal, params),
    reporteUrl: (sucursal, id) => `/reportes/inventario/entrada/${sucursal}/${id}`,
    tituloReporte: 'ENP',
    tituloError: 'Error al cargar entradas de almacén',
  });

  const columns: ColumnsType<MovimientoVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 160,
      fixed: 'left',
      render: (doc: string, record: MovimientoVistaDTO) => (
        <Link to={`/FENP/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
          <div style={{ fontSize: 10, color: '#888' }}>Recibo: {record.fechaEntrega ? formatDateRaw(record.fechaEntrega) : '-'}</div>
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
      title: 'Orden Compra',
      dataIndex: 'ordenCompra',
      key: 'ordenCompra',
      width: 140,
      render: (oc: string) => <Text>{oc || ''}</Text>,
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
      errorMessage="Error al cargar entradas de almacén"
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
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FENP/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FENP/${state.selectedRow!.id}/editar`),
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
      extraFooter={
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Space size={4}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E05252' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>0-14 días</Text>
          </Space>
          <Space size={4}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4A8FD4' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>15-29 días</Text>
          </Space>
          <Space size={4}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2BA88C' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>30+ días</Text>
          </Space>
        </div>
      }
    />
  );
};

export default EntradaAlmacen;
