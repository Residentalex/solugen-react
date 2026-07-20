import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, message, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { asientoContableApi } from '../../api/asientoContableApi';
import { documentosApi } from '../../api/documentosApi';
import { pantallaApi } from '../../api/pantallaApi';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { useDocumentoListado } from '../../hooks/useDocumentoListado';
import { formatCurrency, formatDateRaw, toTitleCase } from '../../utils/formats';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { useAuthStore } from '../../stores/authStore';
import EstadoColumnCell from '../../components/EstadoColumnCell';
import type { TransaccionVistaDTO } from '../../types/transaccion';
import type { DocumentoDTO } from '../../types/documento';

const { Text } = Typography;

const OPCIONES_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 0, label: 'Borrador' },
  { value: 1, label: 'Terminado' },
  { value: 3, label: 'Anulado' },
];

const AsientosContables: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode } = useScreenConfig();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);

  /* Cargar todos los tipos de documento disponibles (para el Select) */
  useEffect(() => {
    if (sucursalActiva === undefined) return;
    documentosApi.obtenerListado(sucursalActiva)
      .then(setDocumentos)
      .catch((err) => console.warn('Error al cargar documentos para filtro', err));
  }, [sucursalActiva]);

  /* Contador para evitar condiciones de carrera entre fetches */
  const fetchIdRef = useRef(0);
  const tipoDocRef = useRef<string>();

  const { state, rangoDefault, puedeEditar, tipoDoc, actions } = useDocumentoListado<TransaccionVistaDTO>({
    modulo: screenCode,
    fetchVista: async (sucursal, desde, hasta, filas, salto, estado) => {
      const id = ++fetchIdRef.current;
      const result = await asientoContableApi.obtenerVista(sucursal, desde, hasta, filas, salto, estado, tipoDocRef.current);
      if (id !== fetchIdRef.current) return { data: [], total: 0 };
      return result;
    },
    fetchFiltrar: async (sucursal, params) => {
      const id = ++fetchIdRef.current;
      const result = await asientoContableApi.filtrarConAsientos(sucursal, {
        cantidad: params.cantidad,
        salto: params.salto,
        desde: params.desde,
        hasta: params.hasta,
        documento: params.documento,
        tipoDoc: tipoDocRef.current,
      });
      if (id !== fetchIdRef.current) return { data: [], total: 0 };
      return result;
    },
    reporteUrl: () => '',
    tituloReporte: 'AsientoContable',
    tituloError: 'Error al cargar asientos contables',
  });

  /* Sincronizar ref con el valor actual del hook */
  tipoDocRef.current = tipoDoc;

  /* Cargar el codigo de documento por defecto desde entidades si no viene ya en la URL */
  const defaultLoadedRef = useRef(false);
  useEffect(() => {
    if (sucursalActiva === undefined) return;
    pantallaApi.obtenerPantallasConEntidades(sucursalActiva).then((pantallas) => {
      const pantalla = pantallas.find(
        (p) => p.codigo?.toUpperCase() === screenCode.toUpperCase()
      );
      const codDoc = pantalla?.entidades?.[0]?.entidadCodigo;
      if (codDoc && !defaultLoadedRef.current) {
        defaultLoadedRef.current = true;
        if (!tipoDoc) {
          actions.handleSetTipoDoc(codDoc);
        }
      }
    }).catch(() => {
      defaultLoadedRef.current = true; /* marcar cargado aunque falle */
    });
  }, [sucursalActiva, screenCode, tipoDoc, actions]);

  const handleClonar = async () => {
    if (!state.selectedRow) return;
    message.info('Función de clonar no disponible para asientos contables');
  };

  const columns: ColumnsType<TransaccionVistaDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 180,
      fixed: 'left',
      render: (doc: any, record: TransaccionVistaDTO) => (
        <Link to={`/FAsientoContable/${record.id}`} className="paces-doc-link">
          <Text strong>{typeof doc === 'string' ? doc : doc?.codigo || doc?.nombre || JSON.stringify(doc)}</Text>
        </Link>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => <Text>{formatDateRaw(v)}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 320,
      ellipsis: true,
      render: (v: string) => <Text>{toTitleCase(v || '')}</Text>,
    },
    {
      title: 'NCF',
      dataIndex: 'ncf',
      key: 'ncf',
      width: 140,
      render: (v: string) => <Text>{v || ''}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (est: string) => (
        <EstadoColumnCell estado={est} />
      ),
    },
  ];

  return (
    <DocumentListadoLayout<TransaccionVistaDTO>
      columns={columns}
      data={state.data}
      rowKey="id"
      loading={state.loading}
      total={state.total}
      page={state.page}
      pageSize={state.pageSize}
      scrollX={1080}
      selectedRowId={state.selectedRow?.id}
      loadingError={state.loadingError}
      errorMessage="Error al cargar asientos contables"
      onRefresh={actions.handleRefresh}
      onRowClick={actions.handleRowClick}
      onPageChange={actions.goToPage}
      pdfPreview={state.pdfPreview}
      onPdfClose={actions.handlePdfClose}
      toolbarProps={{
        extraLeft: (
          <Select
            placeholder="Tipo Documento"
            allowClear
            showSearch
            style={{ minWidth: 250 }}
            value={tipoDoc}
            onChange={(val) => { actions.handleSetTipoDoc(val); }}
            options={documentos.map((d) => ({ value: d.codigo, label: `${d.codigo} - ${toTitleCase(d.nombre || '')}` }))}
            size="small"
            filterOption={(input, option) =>
              (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        ),
        showFiltros: true,
        filtros: state.filtros,
        rangoDefault,
        opcionesEstado: OPCIONES_ESTADO,
        onFiltrosAplicar: actions.handleFiltrosAplicar,
        searchPlaceholder: 'Buscar por número de documento...',
        onSearch: actions.handleSearch,
        searchDefaultValue: state.searchText,
        pageSize: state.pageSize,
        onPageSizeChange: actions.handlePageSizeChange,
        onRefresh: actions.handleRefresh,
        showCrear: true,
        onCrear: () => navigate('/FAsientoContable/nuevo'),
        showEditar: true,
        editarDisabled: !state.selectedRow,
        onEditar: () => navigate(`/FAsientoContable/${state.selectedRow!.id}/editar`),
        showClonar: true,
        clonarDisabled: !state.selectedRow,
        onClonar: handleClonar,
      }}
    />
  );
};

export default AsientosContables;
