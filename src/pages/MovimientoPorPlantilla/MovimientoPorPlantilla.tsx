import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card, Table, Input, Button, DatePicker, Row, Col, Modal, Space,
  message, Alert, Empty, Tag,
} from 'antd';
import { ThunderboltOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { conteoApi } from '../../api/conteoApi';
import type { MovimientoArticuloAgrupadoDTO, MovimientoArticuloDTO } from '../../types/movimientoPorPlantilla';
import type { PlantillaConteoFisicoDTO } from '../../api/conteoApi';
import dayjs, { Dayjs } from 'dayjs';


// ---------------------------------------------------------------------------
// Helpers de formato
// ---------------------------------------------------------------------------
function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string | null): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function calcularTiempo(ultimaVenta: string | null, ultimaCompra: string | null): string {
  const fechas: Date[] = [];
  if (ultimaVenta) {
    const d = new Date(ultimaVenta);
    if (!isNaN(d.getTime())) fechas.push(d);
  }
  if (ultimaCompra) {
    const d = new Date(ultimaCompra);
    if (!isNaN(d.getTime())) fechas.push(d);
  }
  if (fechas.length === 0) return '-';

  const masReciente = new Date(Math.max(...fechas.map(f => f.getTime())));
  const ahora = new Date();
  const diffMs = ahora.getTime() - masReciente.getTime();
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias >= 1) return `${diffDias} día${diffDias !== 1 ? 's' : ''}`;
  if (diffHoras >= 1) return `${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
  return 'Hoy';
}

function extraerMensajeError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (data.errorMessage) return data.errorMessage;
  if (data.errors && typeof data.errors === 'object') {
    const mensajes: string[] = [];
    for (const key of Object.keys(data.errors)) {
      const val = data.errors[key];
      if (Array.isArray(val)) mensajes.push(...val);
      else if (typeof val === 'string') mensajes.push(val);
    }
    if (mensajes.length > 0) return mensajes.join('; ');
  }
  return fallback;
}



// ---------------------------------------------------------------------------
// Modal de búsqueda de plantillas
// ---------------------------------------------------------------------------
interface BuscarPlantillaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (plantilla: PlantillaConteoFisicoDTO) => void;
}

const BuscarPlantillaModal: React.FC<BuscarPlantillaModalProps> = ({
  open,
  onClose,
  onSelect,
}) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [resultados, setResultados] = useState<PlantillaConteoFisicoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conteoApi.obtenerPlantillas(sucursalActiva);
      setResultados(res || []);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al buscar plantillas');
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) {
      setSearchText('');
      buscar();
    }
  }, [open, buscar]);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return resultados;
    const term = searchText.trim().toLowerCase();
    return resultados.filter((r) => r.codigo?.toLowerCase().includes(term));
  }, [resultados, searchText]);

  const columnas = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 150,
    },
    {
      title: 'Suplidor',
      dataIndex: 'suplidor',
      key: 'suplidor',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
  ];

  return (
    <Modal
      title="Buscar Plantilla"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Input.Search
        placeholder="Buscar por código..."
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={(value) => setSearchText(value)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={filtered}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};


// ---------------------------------------------------------------------------
// Página principal: Movimiento por Plantilla
// ---------------------------------------------------------------------------
const MovimientoPorPlantilla: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  // Filtros
  const [plantillaCodigo, setPlantillaCodigo] = useState<string>('');
  const [suplidorNombre, setSuplidorNombre] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  // Datos
  const [data, setData] = useState<MovimientoArticuloAgrupadoDTO[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  // Fecha seleccionada
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Dayjs>(dayjs());

  // Búsqueda local en resultados
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setActiveModule('RMOVPLAN');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (plantillaCodigo) {
      setPageTitleOverride(`Movimiento por Plantilla #${plantillaCodigo}`);
    } else {
      setPageTitleOverride('');
    }
  }, [plantillaCodigo, setPageTitleOverride]);

  // Generar reporte
  const handleGenerar = useCallback(async () => {
    if (!plantillaCodigo) {
      message.warning('Debe seleccionar una plantilla primero');
      return;
    }
    setLoadingError(false);
    setLoading(true);
    try {
      const res = await movimientoApi.obtenerPorPlantilla(
        sucursalActiva, 
        plantillaCodigo, 
        fechaSeleccionada.format('YYYYMMDD') + '000000'
      );

      // Agrupar los movimientos individuales en el formato que espera la tabla
      const agrupadoMap = new Map<string, MovimientoArticuloAgrupadoDTO>();
      res.forEach((item: MovimientoArticuloDTO) => {
        const key = `${item.codigo}|${item.sucursal}`;
        if (!agrupadoMap.has(key)) {
          agrupadoMap.set(key, {
            codigo: item.codigo,
            articulo: item.articulo || '',
            sucursal: item.sucursal || '',
            prefijo: '',
            compras: 0,
            ventas: 0,
            transferencias: 0,
            ultimaCompra: null,
            ultimaVenta: null,
            existencia: 0,
            tiempo: '-',
          });
        }
        const entry = agrupadoMap.get(key)!;
        const tipoDoc = (item.tipoDocumento || '').toUpperCase();
        if (tipoDoc === 'ENP') {
          entry.compras += Math.abs(item.cantidad);
          if (!entry.ultimaCompra || item.fecha > entry.ultimaCompra) {
            entry.ultimaCompra = item.fecha;
          }
        } else if (tipoDoc === 'SAP' || tipoDoc === 'TRP') {
          entry.transferencias += Math.abs(item.cantidad);
        } else if (tipoDoc === 'PV' || tipoDoc === 'FAC') {
          entry.ventas += Math.abs(item.cantidad);
          if (!entry.ultimaVenta || item.fecha > entry.ultimaVenta) {
            entry.ultimaVenta = item.fecha;
          }
        }
        entry.existencia += item.cantidad;
      });

      // Calcular tiempo para cada grupo
      const dataAgrupada = Array.from(agrupadoMap.values());
      dataAgrupada.forEach((item) => {
        item.tiempo = calcularTiempo(item.ultimaVenta, item.ultimaCompra);
      });

      setData(dataAgrupada);
      if (!dataAgrupada || dataAgrupada.length === 0) {
        message.info('No se encontraron resultados para esta plantilla');
      }
    } catch (err: any) {
      setLoadingError(true);
      setData(null);
      const msg = extraerMensajeError(err, 'Error al cargar los datos');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [plantillaCodigo, sucursalActiva, fechaSeleccionada]);

  // Seleccionar plantilla desde el modal
  const handleSeleccionarPlantilla = useCallback(
    async (plantilla: PlantillaConteoFisicoDTO) => {
      setPlantillaCodigo(plantilla.codigo);
      try {
        const detalle = await conteoApi.obtenerPlantilla(sucursalActiva, plantilla.id);
        if (detalle?.suplidor) {
          setSuplidorNombre(detalle.suplidor);
        } else if (plantilla.suplidor) {
          setSuplidorNombre(plantilla.suplidor);
        }
      } catch {
        if (plantilla.suplidor) {
          setSuplidorNombre(plantilla.suplidor);
        }
      }
    },
    [sucursalActiva]
  );

  // Datos a mostrar (tal cual vienen del API, con sucursal)
  const displayData = useMemo(() => data ?? [], [data]);

  // Datos filtrados por búsqueda local
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchText.trim()) return data;
    const term = searchText.trim().toLowerCase();
    return data.filter(
      (item) =>
        (item.codigo || '').toLowerCase().includes(term) ||
        (item.articulo || '').toLowerCase().includes(term) ||
        (item.sucursal || '').toLowerCase().includes(term)
    );
  }, [data, searchText]);

  // Columnas de la tabla
  const columns = useMemo(() => {
    const cols: any[] = [
      {
        title: 'Sucursal',
        dataIndex: 'sucursal',
        key: 'sucursal',
        width: 140,
        render: (v: string) => toTitleCase(v || ''),
      },
      
      {
        title: 'Código',
        key: 'codigo',
        width: 130,
        render: (_: any, record: MovimientoArticuloAgrupadoDTO) => record.codigo,
      },
      {
        title: 'Artículo',
        dataIndex: 'articulo',
        key: 'articulo',
        ellipsis: true,
        render: (v: string) => toTitleCase(v || ''),
      },
      {
        title: 'Compras',
        dataIndex: 'compras',
        key: 'compras',
        width: 110,
        align: 'right' as const,
        render: (v: number) => formatNumber(v || 0),
      },
      {
        title: 'Ventas',
        dataIndex: 'ventas',
        key: 'ventas',
        width: 110,
        align: 'right' as const,
        render: (v: number) => formatNumber(v || 0),
      },
      {
        title: 'Transferencias',
        dataIndex: 'transferencias',
        key: 'transferencias',
        width: 120,
        align: 'right' as const,
        render: (v: number) => formatNumber(v || 0),
      },
      {
        title: 'Última Compra',
        dataIndex: 'ultimaCompra',
        key: 'ultimaCompra',
        width: 120,
        render: (v: string | null) => formatDate(v),
      },
      {
        title: 'Última Venta',
        dataIndex: 'ultimaVenta',
        key: 'ultimaVenta',
        width: 120,
        render: (v: string | null) => formatDate(v),
      },
      {
        title: 'Tiempo',
        dataIndex: 'tiempo',
        key: 'tiempo',
        width: 100,
      },
      {
        title: 'Existencia',
        dataIndex: 'existencia',
        key: 'existencia',
        width: 110,
        align: 'right' as const,
        render: (v: number) => formatNumber(v || 0),
      },
    ];

    return cols;
  }, []);

  return (
    <div>
      {/* Card 1 — Filtros de consulta */}
      <Card
        className="paces-card"
        style={{ borderRadius: 8, marginBottom: 16 }}
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>Filtros de consulta</span>}
      >
        <Row gutter={[16, 0]} align="middle">
          {/* Plantilla */}
          <Col span={7}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Plantilla</div>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                disabled
                value={plantillaCodigo}
                placeholder="Seleccione una plantilla"
              />
              <Button
                icon={<SearchOutlined />}
                onClick={() => setModalVisible(true)}
                title="Buscar plantilla"
              />
            </Space.Compact>
          </Col>

          {/* Suplidor */}
          <Col span={7}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Suplidor</div>
            <Input
              disabled
              value={suplidorNombre ? toTitleCase(suplidorNombre) : ''}
              placeholder="Se selecciona automáticamente"
            />
          </Col>

          {/* Fecha */}
          <Col span={5}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Fecha</div>
            <DatePicker
              format="DD/MM/YYYY"
              style={{ width: '100%' }}
              value={fechaSeleccionada}
              onChange={(date) => setFechaSeleccionada(date || dayjs())}
            />
          </Col>

          {/* Generar */}
          <Col span={5} style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={loading}
              disabled={!plantillaCodigo}
              onClick={handleGenerar}
              style={{
                background: '#389e0d',
                borderColor: '#389e0d',
                minWidth: 140,
              }}
            >
              Generar
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Alert de error entre los dos Cards */}
      {loadingError && (
        <Alert
          message="Error al cargar los datos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleGenerar}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Card 2 — Resultados */}
      <Card
        className="paces-card"
        style={{ borderRadius: 8 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Resultados</span>
            {filteredData.length > 0 && (
              <Tag color="blue">{filteredData.length} registros</Tag>
            )}
          </div>
        }
      >
        <div style={{ padding: '0 0 16px' }}>
          <Input.Search
            placeholder="Buscar por código, artículo o sucursal..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
                setSearchText('');
              }
            }}
            style={{ width: 400 }}
          />
        </div>
        {filteredData.length === 0 && !loading ? (
          <div style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span>
                  {!plantillaCodigo
                    ? 'Seleccione una plantilla usando el botón 🔍 y presione Generar'
                    : searchText.trim()
                      ? 'No hay resultados que coincidan con la búsqueda'
                      : 'No se encontraron movimientos para esta plantilla'}
                </span>
              }
            />
          </div>
        ) : (
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey={(record, idx) => `${record.codigo}-${record.sucursal}-${idx}`}
            loading={loading && !data}
            size="small"
            scroll={{ x: 900 }}
            style={{ minHeight: 420 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${total} registros`,
            }}
          />
        )}
      </Card>

      {/* Modal de búsqueda de plantillas */}
      <BuscarPlantillaModal
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSeleccionarPlantilla}
      />

    </div>
  );
};

export default MovimientoPorPlantilla;
