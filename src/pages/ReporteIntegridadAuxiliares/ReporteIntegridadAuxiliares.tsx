import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Table, Input, Select, Button, Typography, message, Spin,
  DatePicker, Space, Row, Col, Empty, Modal,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, ReloadOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { integridadApi } from '../../api/integridadApi';
import { companiaApi } from '../../api/companiaApi';
import { formatCurrency, formatDateRaw } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import type { AuxiliarIntegridadDTO } from '../../types/integridad';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const TIPOS_DOCUMENTO = [
  { value: '', label: 'Todos' },
  { value: 'ENP', label: 'ENP - Entrada Almacén' },
  { value: 'SAP', label: 'SAP - Salida Almacén' },
  { value: 'PV', label: 'PV - Punto de Venta' },
  { value: 'FAC', label: 'FAC - Factura Cliente' },
  { value: 'DEV', label: 'DEV - Devolución' },
  { value: 'DVC', label: 'DVC - Devolución Compra' },
];

function esFilaResaltada(record: AuxiliarIntegridadDTO): boolean {
  if (record.diferencia > 1) return true;
  const obs = (record.observaciones || '').toLowerCase();
  if (obs.includes('sin entidad') || obs.includes('sin concepto')) return true;
  return false;
}

const ReporteIntegridadAuxiliares: React.FC = () => {
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);

  /* ───── Estados ───── */

  const [data, setData] = useState<AuxiliarIntegridadDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [fechas, setFechas] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<any>(undefined);
  const [tipoDoc, setTipoDoc] = useState<string>('');
  const [sucursalesCompania, setSucursalesCompania] = useState<any[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  /* ───── Selección y corrección ───── */

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalCorregirVisible, setModalCorregirVisible] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);
  const [corrigiendo, setCorrigiendo] = useState(false);

  /* ───── UI setup ───── */

  useEffect(() => {
    setActiveModule('RIntegridadAux');
    setPageTitleOverride('Integridad Auxiliares');
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, setPageTitleOverride, resetToolbar]);

  /* ───── Carga de sucursales ───── */

  useEffect(() => {
    let cancelled = false;
    setLoadingSucursales(true);
    companiaApi.obtenerTodas(4)
      .then((lista) => {
        if (!cancelled) setSucursalesCompania(lista || []);
      })
      .catch(() => {
        if (!cancelled) message.error('Error al cargar sucursales');
      })
      .finally(() => {
        if (!cancelled) setLoadingSucursales(false);
      });
    return () => { cancelled = true; };
  }, []);

  /* ───── Carga de datos ───── */

  const cargarDatos = useCallback(async () => {
    if (!fechas || fechas.length < 2) return;
    setLoading(true);
    setLoadingError(false);
    setSearchText('');
    try {
      const desde = fechas[0].format('YYYYMMDDHHmmss');
      const hasta = fechas[1].format('YYYYMMDDHHmmss');

      const suc = sucursalSeleccionada?.sucursal ?? sucursalActiva;
      const sucId = sucursalSeleccionada?.idExterno;
      const result = await integridadApi.obtenerAuxiliares(
        suc, desde, hasta, tipoDoc || undefined, sucId
      );
      setData(result || []);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al cargar el reporte';
      message.error(msg);
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, sucursalSeleccionada, fechas, tipoDoc]);

  /* ───── Handlers ───── */

  const handleRefresh = () => {
    cargarDatos();
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  /* ───── Filtrado local ───── */

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const t = searchText.toLowerCase();
    return data.filter(
      (r) =>
        (r.tipoDocumento || '').toLowerCase().includes(t) ||
        (r.noDocumento || '').toLowerCase().includes(t) ||
        (r.entidad || '').toLowerCase().includes(t) ||
        (r.concepto || '').toLowerCase().includes(t) ||
        (r.sucursalDocumento || '').toLowerCase().includes(t) ||
        (r.observaciones || '').toLowerCase().includes(t)
    );
  }, [data, searchText]);

  /* ───── Row selection ───── */

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  /* ───── Handlers de corrección ───── */

  const handleAbrirModalCorregir = useCallback(() => {
    setSucursalDestino(sucursalActiva);
    setModalCorregirVisible(true);
  }, [sucursalActiva]);

  const handleConfirmarCorregir = useCallback(async () => {
    if (sucursalDestino === undefined) {
      message.warning('Seleccione una sucursal destino');
      return;
    }

    const selectedItems = filteredData
      .filter((r) => selectedRowKeys.includes(r.id))
      .map((r) => ({
        tipoDocumento: r.tipoDocumento,
        id: r.id,
        sucursalCorrecta: sucursalDestino,
      }));

    if (selectedItems.length === 0) return;

    setCorrigiendo(true);
    try {
      const result = await integridadApi.corregirSucursal(selectedItems);
      const msg = `Corrección completada: ${result.exitos} éxito(s), ${result.errores} error(es)`;
      if (result.errores > 0) {
        message.warning(msg);
      } else {
        message.success(msg);
      }
      setModalCorregirVisible(false);
      setSelectedRowKeys([]);
      setSucursalDestino(undefined);
      cargarDatos();
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al corregir sucursal';
      message.error(msg);
    } finally {
      setCorrigiendo(false);
    }
  }, [filteredData, selectedRowKeys, sucursalDestino, cargarDatos]);

  /* ───── Columnas ───── */

  const columns: ColumnsType<AuxiliarIntegridadDTO> = [
    {
      title: 'Tipo Doc',
      dataIndex: 'tipoDocumento',
      key: 'tipoDocumento',
      width: 90,
      fixed: 'left',
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: 'No. Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 130,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => <Text>{v ? dayjs(v).format('DD/MM/YYYY') : '-'}</Text>,
    },
    {
      title: 'Entidad',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Concepto',
      dataIndex: 'concepto',
      key: 'concepto',
      width: 200,
      ellipsis: true,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Sucursal',
      dataIndex: 'sucursalDocumento',
      key: 'sucursalDocumento',
      width: 120,
      render: (v: string) => <Text>{v || '-'}</Text>,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <Text>{formatCurrency(v || 0)}</Text>,
    },
    {
      title: 'Total Detalle',
      dataIndex: 'totalDetalle',
      key: 'totalDetalle',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <Text>{formatCurrency(v || 0)}</Text>,
    },
    {
      title: 'Diferencia',
      dataIndex: 'diferencia',
      key: 'diferencia',
      width: 130,
      align: 'right' as const,
      render: (v: number, record: AuxiliarIntegridadDTO) => (
        <Text
          strong
          style={{ color: esFilaResaltada(record) ? '#f5222d' : undefined }}
        >
          {formatCurrency(v || 0)}
        </Text>
      ),
    },
    {
      title: 'Observaciones',
      dataIndex: 'observaciones',
      key: 'observaciones',
      width: 220,
      ellipsis: true,
      render: (v: string, record: AuxiliarIntegridadDTO) => (
        <Text
          style={{ color: esFilaResaltada(record) ? '#f5222d' : undefined }}
        >
          {v || '-'}
        </Text>
      ),
    },
  ];

  /* ───── Exportar Excel ───── */

  const handleExportExcel = useCallback(async () => {
    if (data.length === 0) {
      message.warning('No hay datos para exportar');
      return;
    }

    const companyName = await getCompanyName(sucursalActiva);
    const desdeStr = fechas[0].format('DD/MM/YYYY');
    const hastaStr = fechas[1].format('DD/MM/YYYY');
    const filtroDoc = tipoDoc ? TIPOS_DOCUMENTO.find((d) => d.value === tipoDoc)?.label || tipoDoc : 'Todos';

    const columnHeaders = ['Tipo Doc', 'No. Documento', 'Fecha', 'Entidad', 'Concepto', 'Sucursal', 'Total', 'Total Detalle', 'Diferencia', 'Observaciones'];
    const dataRows = filteredData.map((r) => [
      r.tipoDocumento || '',
      r.noDocumento || '',
      dayjs(r.fecha).format('DD/MM/YYYY'),
      r.entidad || '',
      r.concepto || '',
      r.sucursalDocumento || '',
      r.total || 0,
      r.totalDetalle || 0,
      r.diferencia || 0,
      r.observaciones || '',
    ]);
    exportToExcel({
      companyName,
      extraHeaderRows: [
        [`REPORTE INTEGRIDAD AUXILIARES`],
        [`Periodo: ${desdeStr} - ${hastaStr}  |  Tipo Doc: ${filtroDoc}`],
        [],
      ],
      columnHeaders,
      dataRows,
      sheetName: 'IntegridadAuxiliares',
      columnWidths: [
        { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 24 },
        { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 30 },
      ],
    });
  }, [sucursalActiva, data, filteredData, fechas, tipoDoc]);

  /* ───── Opciones de sucursal ───── */

  const sucursalFilterOptions = useMemo(() => {
    return (sucursalesCompania || [])
      .filter((s: any) => s.idExterno !== undefined && s.idExterno !== null)
      .map((s: any) => ({
        value: s.idExterno as string,
        label: s.nombre || `Sucursal ${s.idExterno}`,
      }));
  }, [sucursalesCompania]);

  const sucursalOptions = useMemo(() => {
    return (sucursalesCompania || [])
      .filter((s: any) => s.sucursal !== undefined && s.sucursal !== null)
      .map((s: any) => ({
        value: s.sucursal as number,
        label: s.nombre || `Sucursal ${s.sucursal}`,
      }));
  }, [sucursalesCompania]);

  /* ───── Render ───── */

  return (
    <div>
      {/* ── Filtros ── */}
      <Card className="paces-card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Row gutter={[16, 12]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Sucursal</Text>
              </div>
              <Select
                value={sucursalSeleccionada?.idExterno}
                onChange={(val) => {
                  const item = (sucursalesCompania || []).find((s: any) => s.idExterno === val);
                  setSucursalSeleccionada(item || undefined);
                }}
                style={{ width: '100%' }}
                options={sucursalFilterOptions}
                placeholder="Todas las sucursales"
                size="small"
                allowClear
                loading={loadingSucursales}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Rango de Fechas</Text>
              </div>
              <RangePicker
                value={fechas}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setFechas([dates[0], dates[1]]);
                  }
                }}
                format="DD/MM/YYYY"
                allowClear={false}
                style={{ width: '100%' }}
                size="small"
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Tipo Documento</Text>
              </div>
              <Select
                value={tipoDoc}
                onChange={(val) => setTipoDoc(val)}
                style={{ width: '100%' }}
                options={TIPOS_DOCUMENTO}
                placeholder="Seleccionar tipo"
                size="small"
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={cargarDatos}
                  loading={loading}
                >
                  Generar
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                />
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* ── Error ── */}
      {loadingError && (
        <div style={{ marginBottom: 16 }}>
          <Button type="link" onClick={cargarDatos}>Reintentar</Button>
        </div>
      )}

      {/* ── Tabla de resultados ── */}
      <Spin spinning={loading}>
        <Card
          className="paces-card-erp"
          style={{ borderRadius: 8, overflow: 'hidden' }}
          styles={{ body: { padding: 0 } }}
        >
          {data.length > 0 && (
            <div style={{ padding: '16px 24px 0' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                }}
              >
                <Input.Search
                  placeholder="Buscar en resultados..."
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: 400 }}
                  prefix={<SearchOutlined className="paces-text-icon" />}
                />
                <div style={{ flex: 1 }} />
                {selectedRowKeys.length > 0 && (
                  <Button type="primary" danger onClick={handleAbrirModalCorregir}>
                    Corregir Sucursal ({selectedRowKeys.length})
                  </Button>
                )}
                <Button icon={<FileExcelOutlined />} onClick={handleExportExcel}>
                  Exportar Excel
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
              </div>
            </div>
          )}

          <Table<AuxiliarIntegridadDTO>
            className="paces-border-top paces-list-table"
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            rowSelection={rowSelection}
            size="middle"
            pagination={{
              pageSize: 25,
              showTotal: (t) => `${t} registros`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '25', '50', '100'],
            }}
            scroll={{ x: 1500 }}
            locale={{
              emptyText: (
                <Empty
                  description={data.length === 0 && !loading ? 'Presione "Generar" para cargar el reporte' : 'Sin resultados'}
                />
              ),
            }}
            rowClassName={(record) =>
              esFilaResaltada(record) ? 'paces-row-hover' : ''
            }
            onRow={(record) => ({
              style: {
                backgroundColor: esFilaResaltada(record) ? '#fff1f0' : undefined,
              },
            })}
          />

          {data.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 16,
                padding: '8px 24px 12px',
                flexWrap: 'wrap',
              }}
            >
              <Space size={4}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#f5222d',
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Diferencia &gt; 1 o contiene "sin entidad"/"sin concepto"
                </Text>
              </Space>
            </div>
          )}
        </Card>
      </Spin>

      {/* ── Modal Corregir Sucursal ── */}
      <Modal
        title="Corregir Sucursal"
        open={modalCorregirVisible}
        onCancel={() => {
          if (!corrigiendo) {
            setModalCorregirVisible(false);
          }
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => setModalCorregirVisible(false)}
            disabled={corrigiendo}
          >
            Cancelar
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={corrigiendo}
            onClick={handleConfirmarCorregir}
          >
            Confirmar
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>
            Se corregirán <Text strong>{selectedRowKeys.length}</Text> documento(s) a la sucursal
            seleccionada.
          </Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary">Sucursal destino</Text>
        </div>
        <Select
          value={sucursalDestino}
          onChange={setSucursalDestino}
          style={{ width: '100%' }}
          options={sucursalOptions}
          placeholder="Seleccionar sucursal"
        />
      </Modal>
    </div>
  );
};

export default ReporteIntegridadAuxiliares;
