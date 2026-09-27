import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  DatePicker,
  Input,
  Tag,
  Button,
  Typography,
  Alert,
  Empty,
  Tooltip,
  Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conteoApi } from '../../api/conteoApi';
import type { ConteoFisicoDTO, DetalleConteoFisicoDTO } from '../../types/conteo';
import { formatCurrency } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { message } from 'antd';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DIAS_POR_DEFECTO = 30;
const FILAS_POR_PAGINA = 25;

function parseDateRaw(val: string): Date | null {
  if (!val) return null;
  const num = val.replace(/\D/g, '');
  if (num.length === 8) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  if (num.length >= 14) {
    const y = parseInt(num.slice(0, 4), 10);
    const m = parseInt(num.slice(4, 6), 10) - 1;
    const d = parseInt(num.slice(6, 8), 10);
    return new Date(y, m, d);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(val: string): string {
  const d = parseDateRaw(val);
  if (!d) return val || '-';
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${day}${hh}${mm}${ss}`;
}

const ESTADO_TAG: Record<number, { color: string; label: string }> = {
  0: { color: 'default', label: 'Borrador' },
  1: { color: 'success', label: 'Cerrado' },
  2: { color: 'processing', label: 'Abierto' },
};

const Conteos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(FILAS_POR_PAGINA);

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });
  const [dateTrigger, setDateTrigger] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['conteos', sucursalActiva, page, pageSize, dateTrigger],
    queryFn: async () => {
      const { desde, hasta } = dateParamsRef.current;
      const resultados = await conteoApi.obtenerListado(sucursalActiva, {
        desde,
        hasta,
        cantidad: pageSize,
        salto: (page - 1) * pageSize,
      });
      const total = resultados.length < pageSize
        ? (page - 1) * pageSize + resultados.length
        : page * pageSize + 1;
      return { datos: resultados || [], total };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('FConteos');
    updateToolbar({});
    return () => {
      resetToolbar();
    };
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleRefresh = () => {
    setPage(1);
    setDateTrigger((n) => n + 1);
  };

  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      const d = dates[0].format('YYYYMMDD') + '000000';
      const h = dates[1].format('YYYYMMDD') + '000000';
      dateParamsRef.current = { desde: d, hasta: h };
    } else {
      dateParamsRef.current = {
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
      };
    }
    setPage(1);
    setDateTrigger((n) => n + 1);
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.datos || [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `Conteos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Conteos',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const abrirDetalle = (record: ConteoFisicoDTO) => {
    navigate(`/FConteos/${record.documento}`, { state: record });
  };

  const puedeEditar = (record: ConteoFisicoDTO) => {
    const periodoAbierto = record.periodo !== 1;
    const noBloqueado = !record.bloqueado;
    return periodoAbierto && noBloqueado;
  };

  const manejarEditar = (record: ConteoFisicoDTO) => {
    if (!puedeEditar(record)) {
      message.error('No se puede editar: el periodo está cerrado o el conteo está bloqueado');
      return;
    }
    navigate(`/FConteos/editar/${record.documento}`, { state: record });
  };

  const calcularAvance = (record: ConteoFisicoDTO) => {
    const detalles = record.detalles || [];
    if (detalles.length === 0) return 0;
    const itemsConCantidad = detalles.filter((d: DetalleConteoFisicoDTO) => d.cantidad > 0).length;
    return Math.round((itemsConCantidad / detalles.length) * 100);
  };

  const contarDiferencias = (record: ConteoFisicoDTO) => {
    const detalles = record.detalles || [];
    return detalles.filter((d: DetalleConteoFisicoDTO) => {
      const diff = Math.abs(d.cantidad - (d.cantidad || 0));
      return diff > 0.01;
    }).length;
  };

  const resumen = useMemo(() => {
    const datos = data?.datos || [];
    const abiertos = datos.filter((r: ConteoFisicoDTO) => r.periodo === 2).length;
    const cerrados = datos.filter((r: ConteoFisicoDTO) => r.periodo === 1).length;
    const borradores = datos.filter((r: ConteoFisicoDTO) => r.periodo === 0).length;
    const conDiferencias = datos.filter((r: ConteoFisicoDTO) => contarDiferencias(r) > 0).length;
    return { abiertos, cerrados, borradores, conDiferencias };
  }, [data?.datos]);

  const columns: ColumnsType<ConteoFisicoDTO> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 140,
      render: (doc: string, record: ConteoFisicoDTO) => (
        <Tooltip title={`Ver detalle ${doc}`}>
          <Text
            strong
            className="paces-doc-link"
            onClick={() => abrirDetalle(record)}
          >
            {doc}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 120,
      render: (f: string) => <FechaColumnCell fecha={f} />,
    },
    {
      title: 'Almacén',
      dataIndex: 'almacen',
      key: 'almacen',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val)}</Text>,
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 150,
      render: (val: string) => <Text>{toTitleCase(val) || '-'}</Text>,
    },
    {
      title: 'Suplidor',
      dataIndex: 'nombreSuplidor',
      key: 'nombreSuplidor',
      width: 200,
      render: (val: string, record: any) => <Text>{val ? toTitleCase(val) : record.codigoSuplidor || '-'}</Text>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right',
      render: (val: number) => <Text>{val.toLocaleString('es-DO')}</Text>,
    },
    {
      title: 'Costo',
      dataIndex: 'costo',
      key: 'costo',
      width: 130,
      align: 'right',
      render: (val: number) => <Text>{formatCurrency(val)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'periodo',
      key: 'periodo',
      width: 110,
      render: (val: number) => {
        const estado = ESTADO_TAG[val] || { color: 'default', label: 'Desconocido' };
        return <Tag color={estado.color}>{estado.label}</Tag>;
      },
    },
    {
      title: '% Avance',
      key: 'avance',
      width: 100,
      align: 'right',
      render: (_: any, record: ConteoFisicoDTO) => {
        const avance = calcularAvance(record);
        const color = avance === 100 ? '#52c41a' : avance >= 50 ? '#faad14' : '#ff4d4f';
        return <Text strong style={{ color, textAlign: 'right' }}>{avance}%</Text>;
      },
    },
    {
      title: 'Diferencias',
      key: 'diferencias',
      width: 100,
      align: 'right',
      render: (_: any, record: ConteoFisicoDTO) => {
        const diff = contarDiferencias(record);
        const color = diff > 0 ? '#f46a6a' : '#52c41a';
        return <Text strong style={{ color, textAlign: 'right' }}>{diff}</Text>;
      },
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 120,
      render: (doc: string, record: ConteoFisicoDTO) => {
        const puede = puedeEditar(record);
        const diff = contarDiferencias(record);
        return (
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title={puede ? 'Editar conteo' : 'Edición bloqueada'}>
              <a
                href="javascript:void(0)"
                onClick={() => puede && manejarEditar(record)}
                style={{ color: puede ? '#1890ff' : '#aaa', cursor: puede ? 'pointer' : 'not-allowed' }}
              >
                <EditOutlined />
              </a>
            </Tooltip>
            <Tooltip title="Ver detalle">
              <a
                href="javascript:void(0)"
                onClick={() => abrirDetalle(record)}
                style={{ color: '#1890ff', cursor: 'pointer' }}
              >
                <EyeOutlined />
              </a>
            </Tooltip>
            {diff > 0 && (
              <Tooltip title={`${diff} diferencia(s) detectada(s)`}>
                <Badge count={diff} size="small" style={{ backgroundColor: '#f46a6a' }} />
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar conteos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <CatalogoListadoToolbar
          onSearch={() => {}}
          pageSize={25}
          onPageSizeChange={(v) => {}}
          ocultarPageSize
          onReload={handleRefresh}
          onExportarExcel={handleExportarExcel}
          filtros={
            <RangePicker
              style={{ width: '100%', maxWidth: 200 }}
              format="YYYY-MM-DD"
              onChange={handleDateChange}
              placeholder={["Desde", "Hasta"]}
            />
          }
        />
        {/* Resumen */}
        <div style={{ display: 'flex', gap: 12, padding: '8px 24px', flexWrap: 'wrap' }}>
          <Tooltip title="Conteos abiertos">
            <Badge count={resumen.abiertos} style={{ backgroundColor: '#1890ff' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Abiertos</Text>
              </Card>
            </Badge>
          </Tooltip>
          <Tooltip title="Conteos cerrados">
            <Badge count={resumen.cerrados} style={{ backgroundColor: '#52c41a' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Cerrados</Text>
              </Card>
            </Badge>
          </Tooltip>
          <Tooltip title="Borradores">
            <Badge count={resumen.borradores} style={{ backgroundColor: '#8c8c8c' }}>
              <Card size="small" style={{ width: 100, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Borradores</Text>
              </Card>
            </Badge>
          </Tooltip>
          <Tooltip title="Con diferencias">
            <Badge count={resumen.conDiferencias} style={{ backgroundColor: resumen.conDiferencias > 0 ? '#f46a6a' : '#52c41a' }}>
              <Card size="small" style={{ width: 110, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Diferencias</Text>
              </Card>
            </Badge>
          </Tooltip>
        </div>

        <Table<ConteoFisicoDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="documento"
          loading={isLoading}
          scroll={{ x: 1300 }}
          size="middle"
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No hay conteos registrados" />
              </div>
            ),
          }}
          onRow={(record) => ({
            onClick: () => abrirDetalle(record),
            style: {
              cursor: 'pointer',
              backgroundColor: contarDiferencias(record) > 0 ? '#fff1f0' : '#ffffff',
            }
          })}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>
    </>
  );
};

export default Conteos;