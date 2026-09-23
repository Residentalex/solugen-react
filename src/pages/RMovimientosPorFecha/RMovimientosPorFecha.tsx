import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Input, Button, DatePicker, Row, Col, Space,
  message, Alert, Empty, Tag, Typography, Select, Modal,
  Drawer, Avatar, Skeleton, Divider, Descriptions, Tooltip, Spin,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, CloseOutlined,
  BarChartOutlined, ShopOutlined, ClockCircleOutlined, EyeOutlined, ArrowLeftOutlined, DownOutlined, FilePdfOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { proveedorApi } from '../../api/proveedorApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import type { MovimientoPorFechaDTO } from '../../types/movimientoPorPlantilla';
import type { FamiliaArticuloDTO } from '../../types/productos';
import type { SuplidorDTO } from '../../types/entidad';
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
// Página principal: Movimientos por Fecha
// ---------------------------------------------------------------------------
const RMovimientosPorFecha: React.FC = () => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const { data: { fechasCierre, fechasCierreInv } } = useCompanyStore();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState<Dayjs>(dayjs().subtract(30, 'day'));
  const [fechaHasta, setFechaHasta] = useState<Dayjs>(dayjs());
  const [codigo, setCodigo] = useState<string>('');
  const [familia, setFamilia] = useState<string>('');
  const [familias, setFamilias] = useState<FamiliaArticuloDTO[]>([]);
  const [nomFamilia, setNomFamilia] = useState<string>('');
  const [suplidor, setSuplidor] = useState<string>('');
  const [nomSuplidor, setNomSuplidor] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('');
  const [nomCategoria, setNomCategoria] = useState<string>('');

  // Modal suplidor
  const [modalSuplidorAbierto, setModalSuplidorAbierto] = useState(false);
  const [suplidores, setSuplidores] = useState<SuplidorDTO[]>([]);
  const [suplidoresOrig, setSuplidoresOrig] = useState<SuplidorDTO[]>([]);
  const [searchSuplidor, setSearchSuplidor] = useState('');
  const [loadingSuplidor, setLoadingSuplidor] = useState(false);
  const suplidorSearchRef = useRef<any>(null);

  // Modal categoria
  const [modalCategoriaAbierto, setModalCategoriaAbierto] = useState(false);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriasOrig, setCategoriasOrig] = useState<any[]>([]);
  const [searchCategoria, setSearchCategoria] = useState('');
  const [loadingCategoria, setLoadingCategoria] = useState(false);
  const categoriaSearchRef = useRef<any>(null);

  // Datos agrupados por sucursal (para acordeón)
  const [movimientosAgrupados, setMovimientosAgrupados] = useState<MovimientoPorFechaDTO[]>([]);
  const [loadingAgrupado, setLoadingAgrupado] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Drawer de análisis (igual a /FGORC)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<MovimientoPorFechaDTO | null>(null);

  // Pre-computar los paneles del acordeón para evitar problemas de JSX
  const panelesAgrupados = useMemo(() => {
    if (!movimientosAgrupados || movimientosAgrupados.length === 0) return [];
    const unicos = new Map<string, MovimientoPorFechaDTO[]>();
    for (const m of movimientosAgrupados) {
      const key = m.sucursal || 'SIN_SUC';
      if (!unicos.has(key)) unicos.set(key, []);
      unicos.get(key)!.push(m);
    }
    const result: { sucursal: string; items: MovimientoPorFechaDTO[] }[] = [];
    unicos.forEach((items, sucursal) => {
      result.push({ sucursal, items });
    });
    return result.sort((a, b) => a.sucursal.localeCompare(b.sucursal));
  }, [movimientosAgrupados]);

  const panelesFiltrados = useMemo(() => {
    if (!searchText.trim()) return panelesAgrupados;
    const term = searchText.trim().toLowerCase();
    return panelesAgrupados
      .map((grupo) => ({
        ...grupo,
        items: grupo.items.filter(
          (item: any) =>
            (item.codPro || '').toLowerCase().includes(term) ||
            (item.descripcion || '').toLowerCase().includes(term) ||
            (item.familiaNombre || '').toLowerCase().includes(term) ||
            (item.suplidorNombre || '').toLowerCase().includes(term) ||
            (item.grupoDescripcion || '').toLowerCase().includes(term)
        ),
      }))
      .filter((grupo) => grupo.items.length > 0);
  }, [panelesAgrupados, searchText]);

  // Datos agrupados por sucursal (para acordeón)
  const [loadingError, setLoadingError] = useState(false);

  useEffect(() => {
    setActiveModule('RMOVFECHA');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // Buscar movimientos agrupados por sucursal (para acordeón)
  const handleBuscar = useCallback(async () => {
    if (!sucursalActiva) return;
    setLoadingAgrupado(true);
    setMovimientosAgrupados([]);
    setLoadingError(false);
    try {
      const res = await Promise.race([
        movimientoApi.obtenerMovimientosPorFechaAgrupados(sucursalActiva, {
          desde: fechaDesde.format('YYYYMMDD') + '000000',
          hasta: fechaHasta.format('YYYYMMDD') + '235959',
          codigo: codigo || undefined,
          familia: familia || undefined,
          suplidor: suplidor || undefined,
          categoria: categoria || undefined,
        }),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: el servidor no responde. Verifica que el backend esté corriendo.')), 15000)
        ),
      ]);
      setMovimientosAgrupados(res || []);
      if (!res || res.length === 0) {
        message.info('No se encontraron movimientos para los filtros seleccionados');
      }
    } catch (err: any) {
      setLoadingError(true);
      setMovimientosAgrupados([]);
      const msg = extraerMensajeError(err, 'Error al cargar los movimientos agrupados');
      message.error(msg);
    } finally {
      setLoadingAgrupado(false);
    }
  }, [sucursalActiva, fechaDesde, fechaHasta, codigo, familia, suplidor, categoria]);

  // Limpiar filtros
  const handleLimpiar = useCallback(() => {
    setFechaDesde(dayjs().subtract(30, 'day'));
    setFechaHasta(dayjs());
    setCodigo('');
    setFamilia('');
    setNomFamilia('');
    setSuplidor('');
    setNomSuplidor('');
    setCategoria('');
    setNomCategoria('');
    setMovimientosAgrupados([]);
  }, []);

  // ───── Handlers de búsqueda de familia ─────
  const cargarFamilias = async () => {
    if (familias.length > 0) return; // ya cargadas
    try {
      const lista = await familiaArticuloApi.obtenerTodo(sucursalActiva);
      setFamilias(lista || []);
    } catch (err) {
      console.warn('Error al cargar familias', err);
    }
  };

  const seleccionarFamilia = (codigo: string) => {
    const fam = familias.find(f => f.idExterno === codigo);
    setFamilia(codigo);
    setNomFamilia(fam?.nombre || codigo);
  };

  const limpiarFamilia = () => {
    setFamilia('');
    setNomFamilia('');
  };

  // ───── Handlers de búsqueda de suplidor (modal) ─────
  const abrirModalSuplidor = async () => {
    setModalSuplidorAbierto(true);
    setSearchSuplidor('');
    setLoadingSuplidor(true);
    try {
      const lista = await proveedorApi.obtenerListado(sucursalActiva);
      setSuplidores(lista || []);
      setSuplidoresOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar suplidores');
    } finally {
      setLoadingSuplidor(false);
    }
  };

  const buscarSuplidor = (valor: string) => {
    setSearchSuplidor(valor);
    if (!valor) {
      setSuplidores([...suplidoresOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = suplidoresOrig.filter(
      (s) =>
        s.codigo?.toLowerCase().includes(term) ||
        s.nombre?.toLowerCase().includes(term)
    );
    setSuplidores(filtradas);
  };

  const seleccionarSuplidor = (item: SuplidorDTO) => {
    setSuplidor(item.codigo);
    setNomSuplidor(item.nombre);
    setModalSuplidorAbierto(false);
  };

  const limpiarSuplidor = () => {
    setSuplidor('');
    setNomSuplidor('');
  };

  // ───── Handlers de búsqueda de categoría (modal) ─────
  const abrirModalCategoria = async () => {
    setModalCategoriaAbierto(true);
    setSearchCategoria('');
    setLoadingCategoria(true);
    try {
      const lista = await categoriaArticuloApi.obtenerListado(sucursalActiva);
      setCategorias(lista || []);
      setCategoriasOrig(lista || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar categorías');
    } finally {
      setLoadingCategoria(false);
    }
  };

  const buscarCategoria = (valor: string) => {
    setSearchCategoria(valor);
    if (!valor) {
      setCategorias([...categoriasOrig]);
      return;
    }
    const term = valor.toLowerCase();
    const filtradas = categoriasOrig.filter(
      (c) =>
        c.codigo?.toLowerCase().includes(term) ||
        c.nombre?.toLowerCase().includes(term)
    );
    setCategorias(filtradas);
  };

  const seleccionarCategoria = (item: any) => {
    setCategoria(item.codigo);
    setNomCategoria(item.nombre);
    setModalCategoriaAbierto(false);
  };

  const limpiarCategoria = () => {
    setCategoria('');
    setNomCategoria('');
  };

  return (
    <div>
      {/* Filtros de consulta */}
      <Card
        className="paces-card"
        style={{ borderRadius: 8, marginBottom: 16, padding: '12px 24px' }}
        styles={{ body: { padding: 0 } }}
      >
        <Row gutter={[12, 8]} align="middle" wrap>
          {/* Fecha Desde */}
          <Col>
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Desde"
              style={{ width: 130 }}
              value={fechaDesde}
              onChange={(date) => setFechaDesde(date || dayjs())}
              disabledDate={(current) => {
                if (!current) return false;
                const cierre = fechasCierre?.[sucursalActiva];
                if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                const cierreInv = fechasCierreInv?.[sucursalActiva];
                if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                return false;
              }}
            />
          </Col>

          {/* Fecha Hasta */}
          <Col>
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Hasta"
              style={{ width: 130 }}
              value={fechaHasta}
              onChange={(date) => setFechaHasta(date || dayjs())}
              disabledDate={(current) => {
                if (!current) return false;
                const cierre = fechasCierre?.[sucursalActiva];
                if (cierre && !current.isAfter(dayjs(cierre).startOf('day'), 'day')) return true;
                const cierreInv = fechasCierreInv?.[sucursalActiva];
                if (cierreInv && !current.isAfter(dayjs(cierreInv).startOf('day'), 'day')) return true;
                return false;
              }}
            />
          </Col>

          <Col>
            <Input
              placeholder="Código"
              style={{ width: 120 }}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              allowClear
            />
          </Col>

          {/* Familia */}
          <Col>
            <Select
              showSearch
              allowClear
              placeholder="Familia"
              style={{ width: 150 }}
              value={familia || undefined}
              onChange={seleccionarFamilia}
              onDropdownVisibleChange={(open) => { if (open) cargarFamilias(); }}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={familias.map(f => ({ value: f.idExterno || '', label: f.nombre || f.idExterno || '' }))}
            />
          </Col>

          {/* Suplidor */}
          <Col>
            <Space.Compact>
              <Input
                placeholder="Suplidor"
                style={{ width: 150 }}
                value={nomSuplidor}
                readOnly
              />
              <Button icon={<SearchOutlined />} onClick={abrirModalSuplidor} />
              {nomSuplidor ? (
                <Button icon={<CloseOutlined />} onClick={limpiarSuplidor} />
              ) : null}
            </Space.Compact>
          </Col>

          {/* Categoría */}
          <Col>
            <Space.Compact>
              <Input
                placeholder="Categoría"
                style={{ width: 150 }}
                value={nomCategoria}
                readOnly
              />
              <Button icon={<SearchOutlined />} onClick={abrirModalCategoria} />
              {nomCategoria ? (
                <Button icon={<CloseOutlined />} onClick={limpiarCategoria} />
              ) : null}
            </Space.Compact>
          </Col>

          <Col style={{ marginLeft: 'auto' }}>
            <Space>
              <Button onClick={handleLimpiar}>
                Limpiar
              </Button>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleBuscar} loading={loadingAgrupado}>
                Buscar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Alert de error */}
      {loadingError && (
        <Alert
          message="Error al cargar los datos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleBuscar}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Card único — Resultados agrupados por sucursal (sin acordeón) */}
      <Card className="paces-card" style={{ borderRadius: 8, marginTop: 16, marginBottom: 16 }}
        title={<span style={{ fontWeight: 600 }}>Movimientos por Sucursal</span>}>
        <div style={{ padding: '0 0 16px' }}>
          <Input.Search
            placeholder="Buscar por código, descripción, familia, suplidor o grupo..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 500 }}
            prefix={<SearchOutlined className="paces-text-icon" />}
          />
        </div>
        {loadingAgrupado ? (<Typography.Text>Cargando...</Typography.Text>)
          : panelesFiltrados.length === 0 ? (<Empty description="No se encontraron resultados..." />)
          : (
            <Table
              dataSource={panelesFiltrados.flatMap((g) => g.items.map((item) => ({ ...item, sucursalKey: g.sucursal })))}
              columns={[
                { title: 'Sucursal', dataIndex: 'sucursalKey', key: 'sucursalKey', width: 160,
                  render: (v: string, r: any) => toTitleCase(r.sucursal || '-') },
                { title: 'Código', dataIndex: 'codPro', key: 'codPro', width: 120,
                  render: (v: string) => <Tag color="geekblue">{toTitleCase(v || '-')}</Tag> },
                { title: 'Descripción', dataIndex: 'descripcion', key: 'descripcion', ellipsis: true,
                  render: (v: string) => toTitleCase(v || '-') },
                { title: 'Familia', dataIndex: 'familiaNombre', key: 'familiaNombre', width: 140,
                  render: (v: string) => toTitleCase(v || '-') },
                { title: 'Suplidor', dataIndex: 'suplidorNombre', key: 'suplidorNombre', width: 220,
                  render: (v: string) => toTitleCase(v || '-') },
              ]}
              rowKey={(r: any, i: number) => `${r.sucursalKey}-${r.codPro}-${i}`}
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t: number) => `${t} registros` }}
              scroll={{ x: 1100 }}
              style={{ minHeight: 200 }}
              onRow={(record: any) => ({
                onClick: () => {
                  setDrawerData(record);
                  setDrawerOpen(true);
                },
                style: { cursor: 'pointer' },
              })}
            />
          )
        }
      </Card>

      {/* Modal búsqueda suplidor */}
      <Modal
        title="Buscar Suplidor"
        open={modalSuplidorAbierto}
        onCancel={() => setModalSuplidorAbierto(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Input.Search
          ref={suplidorSearchRef}
          placeholder="Buscar por código o nombre..."
          allowClear
          onSearch={buscarSuplidor}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={suplidores}
          rowKey={(r) => r.id || r.codigo}
          loading={loadingSuplidor}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: any) => ({
            onClick: () => seleccionarSuplidor(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>

      {/* Modal búsqueda categoría */}
      <Modal
        title="Buscar Categoría"
        open={modalCategoriaAbierto}
        onCancel={() => setModalCategoriaAbierto(false)}
        footer={null}
        width={500}
        destroyOnHidden
      >
        <Input.Search
          ref={categoriaSearchRef}
          placeholder="Buscar por código o nombre..."
          allowClear
          onSearch={buscarCategoria}
          style={{ marginBottom: 12 }}
        />
        <Table
          columns={[
            { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
            { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
          ]}
          dataSource={categorias}
          rowKey={(r) => r.id || r.codigo}
          loading={loadingCategoria}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: any) => ({
            onClick: () => seleccionarCategoria(record),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="Sin resultados" /></div> }}
        />
      </Modal>

      {/* ===== Drawer de Análisis (IGUAL a /FGORC) ===== */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined style={{ color: 'var(--paces-primary)' }} />
            <span style={{ fontWeight: 600 }}>Análisis de Movimiento</span>
          </Space>
        }
        placement="right"
        size={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* SECCIÓN A — Identidad del movimiento */}
            <Space align="start" size={12} style={{ marginBottom: 16, width: '100%' }}>
              <Avatar size={40} style={{ backgroundColor: 'rgba(85,110,230,0.12)', color: 'var(--paces-primary)', fontWeight: 600, flexShrink: 0 }}>
                {(drawerData.descripcion || '?')[0].toUpperCase()}
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>{toTitleCase(drawerData.descripcion || '')}</Typography.Title>
                <Typography.Text className="paces-text-secondary" style={{ fontSize: 12 }}>
                  Código: {drawerData.codPro || '-'}
                  {drawerData.sucursal ? <span> · Sucursal: {drawerData.sucursal}</span> : ''}
                  {drawerData.familiaNombre ? <span> · Familia: {drawerData.familiaNombre}</span> : ''}
                </Typography.Text>
              </div>
            </Space>
            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* SECCIÓN B — Datos del documento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Card
                className="paces-card"
                size="small"
                style={{ borderRadius: 6, border: '1px solid #d9d9d9', borderTop: '3px solid #556ee6', background: 'rgba(85,110,230,0.04)', marginBottom: 12 }}
              >
                <Typography.Text strong style={{ fontSize: 12, color: '#556ee6', display: 'block', marginBottom: 6 }}>
                  📊 Datos del movimiento
                </Typography.Text>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                  {[
                    { label: 'Código', value: drawerData.codPro || '-' },
                    { label: 'Descripción', value: drawerData.descripcion || '-' },
                    { label: 'Familia', value: drawerData.familiaNombre || '-' },
                    { label: 'Suplidor', value: drawerData.suplidorNombre || '-' },
                    { label: 'Grupo', value: drawerData.grupoDescripcion || '-' },
                    { label: 'Sucursal', value: drawerData.sucursal || '-' },
                  ].map((kpi) => (
                    <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography.Text style={{ fontSize: 12, color: '#8c8c8c' }}>{kpi.label}</Typography.Text>
                      <Typography.Text strong style={{ fontSize: 13, color: '#262626' }}>
                        {toTitleCase(String(kpi.value))}
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* SECCIÓN C — Resumen */}
            <Divider orientation="left" style={{ fontSize: 12, color: '#8c8c8c' }}>Resumen</Divider>
            <div style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', padding: '12px 0', marginBottom: 16 }}>
              <Row gutter={0}>
                <Col span={12} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Código</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 14, color: 'var(--paces-primary)' }}>
                    {drawerData.codPro || '-'}
                  </Typography.Text>
                </Col>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Sucursal</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {drawerData.sucursal || '-'}
                  </Typography.Text>
                </Col>
              </Row>
              <Row gutter={0} style={{ marginTop: 8 }}>
                <Col span={12} style={{ borderRight: '1px solid #f0f0f0', textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Familia</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {drawerData.familiaNombre || '-'}
                  </Typography.Text>
                </Col>
                <Col span={12} style={{ textAlign: 'center' }}>
                  <Typography.Text className="paces-text-secondary" style={{ fontSize: 11, display: 'block' }}>Suplidor</Typography.Text>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {drawerData.suplidorNombre || '-'}
                  </Typography.Text>
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default RMovimientosPorFecha;
