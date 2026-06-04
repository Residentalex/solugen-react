import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Table, Select, Button, message, Card, Typography, DatePicker, InputNumber, Empty, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SaveOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { actualizacionCostoApi } from '../../api/actualizacionCostoApi';
import { parametrosApi } from '../../api/parametrosApi';
import type { DetalleActualizacionCostoDTO } from '../../types/actualizacionCosto';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DIAS_POR_DEFECTO = 30;

const OPCIONES_DOCUMENTO = [
  { value: 'SAP', label: 'SAP' },
  { value: 'TRP', label: 'TRP' },
  { value: 'PV', label: 'PV' },
];

// ===== Helpers =====
function toTitleCase(str?: string | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}${m}${dy}${hh}${mm}${ss}`;
}

const ActualizacionCostos: React.FC = () => {
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  // ===== Estados =====
  const [tiposDocumento, setTiposDocumento] = useState<string[]>([]);
  const [data, setData] = useState<DetalleActualizacionCostoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [fechaCierre, setFechaCierre] = useState<dayjs.Dayjs | null>(null);
  const [pageSize, setPageSize] = useState(50);
  const [searchText, setSearchText] = useState('');

  const dateParamsRef = useRef({
    desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
    hasta: formatDateParam(new Date()),
  });

  // ===== Lifecycle =====
  useEffect(() => {
    setActiveModule('OActualizacionCostos');
    setPageTitleOverride('Actualización de Costos');

    parametrosApi.obtenerFechaCierreInventario(sucursalActiva)
      .then((fecha) => {
        const d = dayjs(fecha);
        if (d.isValid()) setFechaCierre(d);
      })
      .catch(() => {});

    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActiveModule, resetToolbar, setPageTitleOverride]);

  // ===== Handlers =====
  const handleDateChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      dateParamsRef.current = {
        desde: dates[0].format('YYYYMMDD') + '000000',
        hasta: dates[1].format('YYYYMMDD') + '000000',
      };
    } else {
      dateParamsRef.current = {
        desde: formatDateParam(new Date(Date.now() - DIAS_POR_DEFECTO * 86400000)),
        hasta: formatDateParam(new Date()),
      };
    }
  };

  const datosFiltrados = useMemo(() => {
    if (!searchText) return data;
    const f = searchText.toLowerCase();
    return data.filter(
      (d) =>
        d.documento?.toLowerCase().includes(f) ||
        d.documentoReferencia?.toLowerCase().includes(f) ||
        d.codigo?.toLowerCase().includes(f) ||
        d.producto?.toLowerCase().includes(f)
    );
  }, [data, searchText]);
  const handleSearch = (value: string) => setSearchText(value);

  const handleGenerar = useCallback(async () => {
    if (tiposDocumento.length === 0) {
      message.warning('Selecciona al menos un tipo de documento');
      return;
    }

    const { desde, hasta } = dateParamsRef.current;
    const docs = tiposDocumento.map((t) => `'${t}'`).join(',');

    setLoading(true);
    setHasGenerated(true);
    try {
      const resultados = await actualizacionCostoApi.obtenerPendientes(
        sucursalActiva,
        desde,
        hasta,
        docs
      );
      setData([...resultados].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')));
      if (resultados.length === 0) {
        message.info('Todos los costos están actualizados');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al obtener pendientes');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tiposDocumento]);

  const handleActualizar = async () => {
    if (data.length === 0) {
      message.warning('No hay datos para actualizar');
      return;
    }

    setSaving(true);
    try {
      const { desde, hasta } = dateParamsRef.current;
      const toISO = (s: string) =>
        `${s.substring(0,4)}-${s.substring(4,6)}-${s.substring(6,8)}T${s.substring(8,10)}:${s.substring(10,12)}:${s.substring(12,14)}`;
      await actualizacionCostoApi.aplicar(sucursalActiva, {
        fechaDesde: toISO(desde),
        fechaHasta: toISO(hasta),
        nota: '',
        usuario: { id: usuario?.id },
        detalles: data,
      });
      message.success('Actualización de costos aplicada exitosamente');
      setData([]);
      setHasGenerated(false);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al aplicar actualización de costos');
    } finally {
      setSaving(false);
    }
  };

  const handleCostoNuevoChange = (id: number, value: number | null) => {
    setData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, costoNuevo: value ?? 0 } : item
      )
    );
  };

  // ===== Columnas =====
  const columns: ColumnsType<DetalleActualizacionCostoDTO> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 85,
      render: (val: string) => <Text>{formatDate(val)}</Text>,
    },
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 95,
      render: (val: string) => <Text strong>{val}</Text>,
    },
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 75,
      render: (val: string) => <Text>{val}</Text>,
    },
    {
      title: 'Producto',
      dataIndex: 'producto',
      key: 'producto',
      width: 250,
      ellipsis: true,
      render: (val: string) => <Text>{toTitleCase(val)}</Text>,
    },
    {
      title: 'Costo Anterior',
      dataIndex: 'costoAntiguo',
      key: 'costoAntiguo',
      width: 130,
      align: 'right',
      render: (val: number) => (
        <Text type="secondary" style={{ fontFamily: 'monospace' }}>
          {formatCurrency(val)}
        </Text>
      ),
    },
    {
      title: '% Dif.',
      key: 'diferencia',
      width: 80,
      align: 'right',
      render: (_: any, record: DetalleActualizacionCostoDTO) => {
        const pct = record.costoAntiguo
          ? ((record.costoNuevo - record.costoAntiguo) / record.costoAntiguo) * 100
          : 0;
        const color = pct > 0 ? '#34c38f' : pct < 0 ? '#f46a6a' : undefined;
        return <Text style={{ color, fontFamily: 'monospace' }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</Text>;
      },
    },
    {
      title: 'Costo Nuevo',
      dataIndex: 'costoNuevo',
      key: 'costoNuevo',
      width: 130,
      align: 'right',
      render: (_: number, record: DetalleActualizacionCostoDTO) => (
        <InputNumber
          size="small"
          style={{ width: '100%', fontFamily: 'monospace' }}
          min={0}
          step={0.01}
          precision={2}
          defaultValue={record.costoNuevo}
          onBlur={(e) => handleCostoNuevoChange(record.id, parseFloat(e.target.value) || 0)}
          onPressEnter={(e: any) => handleCostoNuevoChange(record.id, parseFloat(e.target.value) || 0)}
          disabled={saving}
        />
      ),
    },
    {
      title: 'Doc. Origen',
      dataIndex: 'documentoReferencia',
      key: 'documentoReferencia',
      width: 140,
      render: (val: string) => <Text strong>{val || '-'}</Text>,
    },
    {
      title: 'Fec. Origen',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 85,
      render: (val: string) => <Text>{val ? formatDate(val) : '-'}</Text>,
    },
  ];

  // ===== Empty description según estado =====
  const emptyDescription = !hasGenerated
    ? 'Selecciona filtros y presiona Generar'
    : loading
      ? ' '
      : 'Todos los costos están actualizados';

  return (
    <div>
      {/* El título lo maneja setPageTitleOverride */}

      {/* Filtros */}
      <Card className="paces-card" size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Select
            mode="multiple"
            style={{ minWidth: 260 }}
            placeholder="Tipos de documento"
            value={tiposDocumento}
            onChange={setTiposDocumento}
            options={OPCIONES_DOCUMENTO}
            allowClear
          />
          <RangePicker
            style={{ width: 240 }}
            format="YYYY-MM-DD"
            onChange={handleDateChange}
            placeholder={['Desde', 'Hasta']}
            disabledDate={(current) => !!fechaCierre && current <= fechaCierre.endOf('day')}
          />
          <Button type="primary" onClick={handleGenerar}>
            Generar
          </Button>
          {data.length > 0 && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleActualizar}
            >
              Actualizar
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Select
            style={{ width: 65 }}
            value={pageSize}
            onChange={(v) => setPageSize(v)}
            options={[
              { value: 25, label: '25' },
              { value: 50, label: '50' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      </Card>

      {/* Barra de búsqueda */}
      {hasGenerated && (
        <div style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="Buscar por doc. origen, código, documento o producto..."
            allowClear
            onSearch={handleSearch}
            onChange={(e) => { if (!e.target.value) setSearchText(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                handleSearch('');
              }
            }}
            style={{ width: 450 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
        </div>
      )}

      {/* Tabla de resultados */}
      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<DetalleActualizacionCostoDTO>
          columns={columns}
          dataSource={datosFiltrados}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1050 }}
          size="middle"
          locale={{
            emptyText: <Empty description={emptyDescription} />,
          }}
          pagination={{
            pageSize,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
        />
      </Card>
    </div>
  );
};

export default ActualizacionCostos;
