import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PrinterOutlined } from '@ant-design/icons';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import type { FiltroImpresionLoteSolicitudPago } from '../../types/solicitudPago';
import { imprimirSolicitudPagoLote } from '../../utils/imprimirSolicitudPagoLote';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { useAuthStore } from '../../stores/authStore';
import type { ToolbarAccion } from '../../components/ToolbarAcciones';
import ImprimirLoteModal from './ImprimirLoteModal';
import EntidadColumnCell from '../../components/EntidadColumnCell';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import FechaColumnCell from '../../components/FechaColumnCell';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { ESTADO_OPCIONES_BORRADOR_APLICADO_ANULADO, toEstadoNum } from '../../utils/estadoDocumento';
import type { TransaccionBancariaVistaDTO } from '../../types/transaccion';
import { useScreenConfig } from '../../hooks/useScreenConfig';

const { Text } = Typography;

const SolicitudPago: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { screenCode, documentCode } = useScreenConfig();

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
        documento: params.documento,
        entidad: params.entidad,
        concepto: params.concepto,
      }),
    reporteUrl: (sucursal, id) => `/reportes/banco/solicitud-pago/${sucursal}/${id}`,
    tituloReporte: '',
    tituloError: 'Error al cargar solicitudes de pago',
  });

  const [imprimirLoteOpen, setImprimirLoteOpen] = useState(false);

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    try {
      const data = await solicitudPagoApi.obtenerPorId(sucursalActiva, state.selectedRow.id);
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
      navigate('/FSPA/nuevo', { state: { cloneData } });
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener datos para clonar');
    }
  };

  const handleImprimirLote = async (params: FiltroImpresionLoteSolicitudPago): Promise<boolean> => {
    try {
      await imprimirSolicitudPagoLote(sucursalActiva, params);
      return true;
    } catch (err: any) {
      message.error(err?.message || 'Error al generar la impresión en lote');
      return false;
    }
  };

  const accionesItems: ToolbarAccion[] = [
    {
      key: 'imprimir',
      label: 'Imprimir',
      icon: <PrinterOutlined />,
      soloIcono: true,
      tooltip: 'Imprimir',
      permiso: { accion: 'IMPRIMIR' },
      prioridad: 60,
      menu: {
        items: [
          {
            key: 'imprimir-seleccionado',
            label: 'Imprimir seleccionado',
            disabled: !state.selectedRow,
            onClick: actions.handleImprimir,
          },
          {
            key: 'imprimir-lote',
            label: 'Imprimir en lote...',
            onClick: () => setImprimirLoteOpen(true),
          },
        ],
      },
    },
  ];

  const columns: ColumnsType<TransaccionBancariaVistaDTO> = [
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
      render: (f: string) => <FechaColumnCell fecha={f} />,
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
        <EstadoColumnCell
          estado={estado}
          periodo={record.periodo}
          autorizado={Boolean(record.autorizado) && toEstadoNum(record.estado) !== 3}
        />
      ),
    },
  ];

  return (
    <>
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
        errorMessage="Error al cargar solicitudes de pago"
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
          showCrear: true,
          onCrear: () => navigate('/FSPA/nuevo'),
          showClonar: true,
          clonarDisabled: !state.selectedRow,
          onClonar: handleClonar,
          accionesItems,
          showEditar: true,
          editarDisabled: !puedeEditar,
          onEditar: () => navigate(`/FSPA/${state.selectedRow!.id}/editar`),
          onRefresh: actions.handleRefresh,
        }}
      />

      <ImprimirLoteModal
        open={imprimirLoteOpen}
        onClose={() => setImprimirLoteOpen(false)}
        sucursal={sucursalActiva}
        rangoDefault={rangoDefault}
        documento={documentCode}
        onImprimir={handleImprimirLote}
      />
    </>
  );
};

export default SolicitudPago;
