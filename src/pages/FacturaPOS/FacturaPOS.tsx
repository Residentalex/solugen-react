import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Alert, Select, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import type { FacturaPOSResumenDTO } from '../../types/facturaPOS';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';

const { Text } = Typography;

const ESTADO_OPCIONES = [
  { value: '', label: 'Todos' },
  { value: 'Borrador', label: 'Borrador' },
  { value: 'Terminado', label: 'Terminado' },
  { value: 'Anulado', label: 'Anulado' },
];

const CAMPOS_BUSQUEDA = [
  { value: 'documento', label: 'Documento' },
  { value: 'ncf', label: 'NCF' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'turno', label: 'Turno' },
];

const FacturaPOS: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode } = useScreenConfig();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const [campoBusqueda, setCampoBusqueda] = useState('documento');

  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<FacturaPOSResumenDTO>({
    modulo: screenCode,
    fetchVista: (sucursal, desde, hasta, filas, salto, estado) =>
      facturaPOSApi.obtenerResumen(sucursal, desde, hasta, filas, salto, estado),
    fetchFiltrar: (sucursal, params) => {
      const valor = params.documento || '';
      const base = { cantidad: params.cantidad, salto: params.salto, desde: params.desde, hasta: params.hasta };
      switch (campoBusqueda) {
        case 'documento': return facturaPOSApi.buscarPorDocumento(sucursal, { ...base, documento: valor });
        case 'ncf': return facturaPOSApi.buscarPorNCF(sucursal, { ...base, nCF: valor });
        case 'turno': return facturaPOSApi.buscarPorTurno(sucursal, { ...base, turno: valor });
        case 'cliente': return facturaPOSApi.buscarPorCliente(sucursal, { ...base, cliente: valor });
        default: return facturaPOSApi.buscarPorDocumento(sucursal, { ...base, documento: valor });
      }
    },
    reporteUrl: (sucursal, id) => `/reportes/facturacion/pos/${sucursal}/${id}`,
    tituloReporte: 'POS',
    tituloError: 'Error al cargar facturas POS',
  });

  const columns: ColumnsType<FacturaPOSResumenDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: string, record: FacturaPOSResumenDTO) => (
        <Link to={`/FPV/${record.id}`} className="paces-doc-link"><Text strong>{doc}</Text></Link>
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
      render: (name: string, record: FacturaPOSResumenDTO) => (
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
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 200,
      render: (alm: string) => <Text>{toTitleCase(alm) || ''}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 150,
      render: (ncf: string) => <Text>{ncf || ''}</Text>,
    },
    {
      title: 'Turno',
      dataIndex: 'turno',
      key: 'turno',
      width: 100,
      render: (turno: string) => <Text>{turno || ''}</Text>,
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
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      render: (estado: string, record: FacturaPOSResumenDTO) => (
        <EstadoColumnCell estado={estado} periodo={record.periodo} />
      ),
    },
  ];

  const customEmptyText = undefined;

  return (
    <DocumentListadoLayout<FacturaPOSResumenDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1520}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar facturas POS"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      emptyText={customEmptyText}
      toolbarProps={{
        opcionesEstado: ESTADO_OPCIONES,
        ocultarSearch: true,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        extraLeft: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Select
              value={campoBusqueda}
              onChange={setCampoBusqueda}
              style={{ width: 120 }}
              size="middle"
              options={CAMPOS_BUSQUEDA}
            />
            <Input.Search
              placeholder="Buscar..."
              allowClear
              onSearch={(val) => actions.handleSearch(val)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  actions.handleSearch('');
                }
              }}
              style={{ width: 260 }}
            />
          </div>
        ),
        showCrear: true,
        onCrear: () => navigate('/FPV/nuevo'),
        showEditar: true,
        editarDisabled: !puedeEditar,
        onEditar: () => navigate(`/FPV/${state.selectedRow!.id}/editar`),
        showImprimir: true,
        imprimirDisabled: !state.selectedRow,
        onImprimir: actions.handleImprimir,
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default FacturaPOS;
