import React, { useEffect, useState, useCallback } from 'react';
import { Typography, message, Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { horarioEmpleadoApi } from '../../api/horarioEmpleadoApi';
import type { HorarioEmpleadoDTO } from '../../types/horarioEmpleado';
import { Sucursal } from '../../types/auth';
import DocumentListadoLayout from '../../layouts/DocumentListadoLayout';
import { formatDate, extraerMensajeError } from '../../utils/formats';

const { Text } = Typography;

const FILAS_POR_PAGINA = 25;

const HorarioEmpleado: React.FC = () => {
  const sucursal = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [data, setData] = useState<HorarioEmpleadoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [selectedRow, setSelectedRow] = useState<HorarioEmpleadoDTO | null>(null);
  const [page, setPage] = useState(1);
  const [sucursalFiltro, setSucursalFiltro] = useState<Sucursal>(sucursal);
  const [fechaInicio, setFechaInicio] = useState(dayjs());
  const [fechaFin, setFechaFin] = useState(dayjs());

  useEffect(() => {
    setActiveModule('HEMPLEADO');
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, resetToolbar]);

  const fetchData = useCallback(async () => {
    if (!sucursal) return [];
    return await horarioEmpleadoApi.obtenerTodos(
      sucursal,
      sucursalFiltro,
      fechaInicio.format('YYYY-MM-DD'),
      fechaFin.format('YYYY-MM-DD')
    );
  }, [sucursal, sucursalFiltro, fechaInicio, fechaFin]);

  useEffect(() => {
    if (!sucursal) return;
    let cancelled = false;

    fetchData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadingError(true);
          setData([]);
          message.error(extraerMensajeError(err, 'Error al cargar horarios de empleados'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sucursal, fetchData]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setLoadingError(false);
    fetchData()
      .then((result) => setData(result))
      .catch((err: unknown) => {
        setLoadingError(true);
        setData([]);
        message.error(extraerMensajeError(err, 'Error al cargar horarios de empleados'));
      })
      .finally(() => setLoading(false));
  }, [fetchData]);

  const handleRowClick = useCallback((record: HorarioEmpleadoDTO) => {
    setSelectedRow(record);
  }, []);

  const handlePageChange = useCallback((pagina: number) => {
    setPage(pagina);
  }, []);

  const total = data.length;

  const columns: ColumnsType<HorarioEmpleadoDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 130,
      render: (fecha: string) => (
        <Text>{formatDate(fecha)}</Text>
      ),
    },
    {
      title: 'Hora',
      dataIndex: 'hora',
      key: 'hora',
      width: 100,
      render: (hora: string) => (
        <Text>{hora}</Text>
      ),
    },
    {
      title: 'Código',
      dataIndex: 'codigoEmpleado',
      key: 'codigoEmpleado',
      width: 100,
    },
    {
      title: 'Nombre Empleado',
      dataIndex: 'empleado',
      key: 'empleado',
      width: 280,
      render: (nombre: string) => (
        <Text strong>{nombre}</Text>
      ),
    },
    {
      title: 'Sucursal',
      dataIndex: 'sucursal',
      key: 'sucursal',
      width: 200,
      render: (sucursal: string) => (
        <Text>{sucursal || '-'}</Text>
      ),
    },
  ];

  return (
    <DocumentListadoLayout<HorarioEmpleadoDTO>
      columns={columns}
      data={data}
      rowKey="id"
      loading={loading}
      total={total}
      page={page}
      pageSize={FILAS_POR_PAGINA}
      scrollX={800}
      selectedRowId={selectedRow?.id}
      loadingError={loadingError}
      errorMessage="Error al cargar horarios de empleados"
      onRefresh={handleRefresh}
      onRowClick={handleRowClick}
      onPageChange={handlePageChange}
      pdfPreview={null}
      onPdfClose={() => {}}
      toolbarProps={{
        searchPlaceholder: 'Buscar empleado...',
        onSearch: () => {},
        pageSize: FILAS_POR_PAGINA,
        onPageSizeChange: () => {},
        onRefresh: handleRefresh,
        extraLeft: (
          <>
            <Select
              value={sucursalFiltro}
              onChange={(value) => setSucursalFiltro(value)}
              style={{ width: 200 }}
              options={[
                { value: Sucursal.OrensePlaza, label: 'Orense Plaza' },
                { value: Sucursal.HiperRomana, label: 'Hiper Romana' },
                { value: Sucursal.OrenseVillaHermosa, label: 'Orense Villa Hermosa' },
                { value: Sucursal.ElOfertazo, label: 'El Ofertazo' },
                { value: Sucursal.Consolidado, label: 'Consolidado' },
                { value: Sucursal.Compra, label: 'Compra' },
              ]}
            />
            <DatePicker.RangePicker
              value={[fechaInicio, fechaFin]}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setFechaInicio(dates[0]);
                  setFechaFin(dates[1]);
                }
              }}
              style={{ marginLeft: 8 }}
              allowClear={false}
            />
          </>
        ),
      }}
    />
  );
};

export default HorarioEmpleado;
