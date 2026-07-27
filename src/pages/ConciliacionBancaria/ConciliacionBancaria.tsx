import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { conciliacionBancariaApi } from '../../api/conciliacionBancariaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { formatCurrency, formatDate } from '../../utils/formats';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

interface ConciliacionRow {
  id: number;
  concilID: number;
  documento?: string;
  numeroCta: string;
  fecha: string;
  balBancos: number;
  balLibros: number;
  diferencia: number;
  aplicada: boolean;
}

const ConciliacionBancaria: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const { screenCode } = useScreenConfig('FConcil');
  const { state, rangoDefault, puedeEditar, actions } = useDocumentoListado<ConciliacionRow>({
    modulo: screenCode,
    fetchVista: async (sucursal, desde, hasta, filas, salto, estado) => {
      const res = await conciliacionBancariaApi.obtenerVistaDocumento(sucursal, desde, hasta, filas, salto, estado);
      return {
        data: res.data.map((item) => ({ ...item, id: item.concilID })),
        total: res.total,
      };
    },
    fetchFiltrar: async (sucursal, params) => {
      const res = await conciliacionBancariaApi.filtrarDocumento(sucursal, params);
      return {
        data: res.data.map((item) => ({ ...item, id: item.concilID })),
        total: res.total,
      };
    },
    reporteUrl: () => '',
    tituloReporte: 'ConciliacionBancaria',
    tituloError: 'Error al cargar conciliaciones bancarias',
  });

  const columns: ColumnsType<ConciliacionRow> = [
    {
      title: 'N° Conciliación',
      dataIndex: 'concilID',
      key: 'concilID',
      width: 140,
      fixed: 'left',
      render: (val: number, record: ConciliacionRow) => (
        <Link to={`/FConcil/${val}`} className="paces-doc-link">
          <Text strong>{val}</Text>
        </Link>
      ),
    },
    {
      title: 'Cuenta',
      dataIndex: 'numeroCta',
      key: 'numeroCta',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Balance Bancos',
      dataIndex: 'balBancos',
      key: 'balBancos',
      width: 150,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Balance Libros',
      dataIndex: 'balLibros',
      key: 'balLibros',
      width: 150,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      key: 'diferencia',
      width: 150,
      align: 'right',
      render: (val: number) => (
        <Text strong className={val !== 0 ? 'paces-text-error' : ''}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'aplicada',
      key: 'aplicada',
      width: 110,
      render: (val: boolean) => (
        <EstadoColumnCell estado={val ? 2 : 0} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<ConciliacionRow>
      columns={columns}
      data={state.data}
      rowKey="concilID"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1200}
      selectedRowId={state.selectedRow?.concilID}
      loadingError={state.loadingError}
      errorMessage="Error al cargar conciliaciones bancarias"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={(p) => actions.setPage(p)}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: [
          { value: 0, label: 'No aplicadas' },
          { value: 1, label: 'Aplicadas' },
        ],
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar por cuenta bancaria...',
        onSearch: actions.handleSearch,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        showCrear: true,
        onCrear: () => navigate('/FConcil/nuevo'),
        onRefresh: actions.handleRefresh,
      }}
    />
  );
};

export default ConciliacionBancaria;
