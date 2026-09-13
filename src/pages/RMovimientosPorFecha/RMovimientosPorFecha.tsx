import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Card, Table, Input, Button, DatePicker, Row, Col, Space,
  message, Alert, Empty, Tag, Typography, Select, Modal, Drawer,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, ShopOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { movimientoApi } from '../../api/movimientoApi';
import { familiaArticuloApi } from '../../api/familiaArticuloApi';
import { proveedorApi } from '../../api/proveedorApi';
import { categoriaArticuloApi } from '../../api/categoriaArticuloApi';
import { entradaAlmacenApi } from '../../api/entradaAlmacenApi';
import ModalMovimientosPosteriores from '../../components/ModalMovimientosPosteriores/ModalMovimientosPosteriores';
import type { MovimientoArticuloDTO } from '../../types/movimientoPorPlantilla';
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

  // Datos
  const [movimientos, setMovimientos] = useState<MovimientoArticuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  // Búsqueda local
  const [searchText, setSearchText] = useState('');

  // Producto seleccionado para drawer
  type ProductoConMovimientos = {
    codigo: string;
    articulo: string;
    familia: string;
    categoria: string;
    movimientos: MovimientoArticuloDTO[];
  };
  const [selectedItem, setSelectedItem] = useState<ProductoConMovimientos | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal movimientos posteriores
  const [movimientosModalOpen, setMovimientosModalOpen] = useState(false);
  const [movimientosSucursal, setMovimientosSucursal] = useState('');
  const [movimientosData, setMovimientosData] = useState<any[]>([]);
  const [movimientosLoading, setMovimientosLoading] = useState(false);

  useEffect(() => {
    setActiveModule('RMOVFECHA');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  // Cargar movimientos
  const handleBuscar = useCallback(async () => {
    setLoadingError(false);
    setLoading(true);
    setSelectedItem(null);
    try {
      const res = await Promise.race([
        movimientoApi.obtenerMovimientosPorFecha(sucursalActiva, {
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
      setMovimientos(res || []);
      if (!res || res.length === 0) {
        message.info('No se encontraron movimientos para los filtros seleccionados');
      }
    } catch (err: any) {
      setLoadingError(true);
      setMovimientos([]);
      const msg = extraerMensajeError(err, 'Error al cargar los movimientos');
      message.error(msg);
    } finally {
      setLoading(false);
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
    setMovimientos([]);
    setSelectedItem(null);
    setDrawerOpen(false);
    setSearchText('');
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

  // Seleccionar producto y abrir drawer
  const handleSeleccionarProducto = (producto: ProductoConMovimientos) => {
    setSelectedItem(producto);
    setDrawerOpen(true);
  };

  // Ver movimientos posteriores
  const handleVerMovimientos = useCallback(async (item: any) => {
    if (!selectedItem) return;
    setMovimientosSucursal(item.sucursalNombre);
    setMovimientosModalOpen(true);
    setMovimientosLoading(true);
    setMovimientosData([]);
    try {
      const data = await entradaAlmacenApi.obtenerDetalleMovimientosPosteriores(
        item.sucursal,
        selectedItem.codigo,
        dayjs(item.fecha).format('YYYYMMDDHHmmss'),
        item.sucursal
      );
      setMovimientosData(data ?? []);
    } catch {
      message.error('Error al cargar movimientos');
      setMovimientosData([]);
    } finally {
      setMovimientosLoading(false);
    }
  }, [selectedItem]);

  // Datos únicos por código (productos distintos)
  const productosUnicos = useMemo(() => {
    if (!movimientos.length) return [];
    const agrupado: Record<string, {
      codigo: string;
      articulo: string;
      familia: string;
      categoria: string;
      movimientos: typeof movimientos;
    }> = {};

    movimientos.forEach(item => {
      const key = item.codigo;
      if (!agrupado[key]) {
        agrupado[key] = {
          codigo: item.codigo,
          articulo: item.articulo,
          familia: item.familia,
          categoria: item.categoria || '',
          movimientos: [],
        };
      }
      agrupado[key].movimientos.push(item);
    });

    return Object.values(agrupado);
  }, [movimientos]);

  // Datos filtrados por búsqueda local (sobre productos únicos)
  const filteredData = useMemo(() => {
    if (!productosUnicos.length) return [];
    if (!searchText.trim()) return productosUnicos;
    const term = searchText.trim().toLowerCase();
    return productosUnicos.filter(
      (item) =>
        (item.codigo || '').toLowerCase().includes(term) ||
        (item.articulo || '').toLowerCase().includes(term) ||
        (item.familia || '').toLowerCase().includes(term) ||
        (item.categoria || '').toLowerCase().includes(term)
    );
  }, [productosUnicos, searchText]);

  // Columnas de la tabla
  const columns = useMemo(() => [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
    },
    {
      title: 'Artículo',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Familia',
      dataIndex: 'familia',
      key: 'familia',
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: 'Categoría',
      dataIndex: 'categoria',
      key: 'categoria',
      width: 140,
      render: (v: string) => v || '-',
    },
  ], []);

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
              <Button type="primary" icon={<SearchOutlined />} onClick={handleBuscar} loading={loading}>
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

      {/* Card 2 — Resultados con sidebar */}
      <Row gutter={16}>
        <Col xxl={18}>
          <Card
            className="paces-card"
            style={{ borderRadius: 8 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Movimientos ({filteredData.length})</span>
                {filteredData.length > 0 && (
                  <Tag color="blue">{filteredData.length} registros</Tag>
                )}
              </div>
            }
          >
            <div style={{ padding: '0 0 16px' }}>
              <Input.Search
                placeholder="Buscar por código, artículo, tipo o documento..."
                allowClear
                onSearch={(value) => setSearchText(value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    (e.target as HTMLInputElement).blur();
                    setSearchText('');
                  }
                }}
                style={{ width: 400 }}
                prefix={<SearchOutlined className="paces-text-icon" />}
              />
            </div>
            {filteredData.length === 0 && !loading ? (
              <div style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      {!movimientos.length
                        ? 'Ingrese los filtros y presione Buscar'
                        : searchText.trim()
                          ? 'No hay resultados que coincidan con la búsqueda'
                          : 'No se encontraron movimientos para los filtros seleccionados'}
                    </span>
                  }
                />
              </div>
            ) : (
              <Table
                dataSource={filteredData}
                columns={columns}
                rowKey={(record) => `${record.codigo}-${record.tipoDocumento}`}
                loading={loading}
                size="small"
                scroll={{ x: 900 }}
                style={{ minHeight: 420 }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} registros`,
                }}
                rowClassName={(record, index) =>
                  selectedItem && selectedItem.codigo === record.codigo
                    ? 'paces-row-selected'
                    : ''
                }
                onRow={(record) => ({
                  onClick: () => handleSeleccionarProducto(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Drawer de movimientos del producto */}
      <Drawer
        title={
          <Space>
            <ShopOutlined />
            <span>Movimientos de: {selectedItem?.articulo}</span>
          </Space>
        }
        placement="right"
        width={700}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedItem(null);
        }}
        destroyOnClose
      >
        {selectedItem && (
          <div>
            <Card className="paces-card" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Typography.Text type="secondary">Código</Typography.Text>
                  <Typography.Paragraph strong style={{ margin: 0 }}>{selectedItem.codigo}</Typography.Paragraph>
                </Col>
                <Col span={8}>
                  <Typography.Text type="secondary">Artículo</Typography.Text>
                  <Typography.Paragraph strong style={{ margin: 0 }}>{selectedItem.articulo}</Typography.Paragraph>
                </Col>
                <Col span={8}>
                  <Typography.Text type="secondary">Familia</Typography.Text>
                  <Typography.Paragraph strong style={{ margin: 0 }}>{selectedItem.familia || '-'}</Typography.Paragraph>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Typography.Text type="secondary">Categoría</Typography.Text>
                  <Typography.Paragraph strong style={{ margin: 0 }}>{selectedItem.categoria || '-'}</Typography.Paragraph>
                </Col>
                <Col span={8}>
                  <Typography.Text type="secondary">Total Movimientos</Typography.Text>
                  <Typography.Paragraph strong style={{ margin: 0 }}>{selectedItem.movimientos.length}</Typography.Paragraph>
                </Col>
              </Row>
            </Card>

            <Typography.Title level={5}>Detalle de Movimientos</Typography.Title>
            <Table
              dataSource={selectedItem.movimientos}
              rowKey={(r, i) => `${r.documento}-${r.tipoDocumento}-${i}`}
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} movimientos` }}
              columns={[
                {
                  title: 'Fecha',
                  dataIndex: 'fecha',
                  key: 'fecha',
                  width: 100,
                  render: (v: string) => formatDate(v),
                },
                {
                  title: 'Tipo',
                  dataIndex: 'tipoDocumento',
                  key: 'tipoDocumento',
                  width: 80,
                  render: (v: string) => <Tag color={v === 'ENP' ? 'green' : v === 'SAP' ? 'blue' : v === 'PV' ? 'orange' : v === 'FAC' ? 'purple' : v === 'DVC' ? 'red' : v === 'DEV' ? 'magenta' : 'default'}>{v}</Tag>,
                },
                {
                  title: 'Documento',
                  dataIndex: 'documento',
                  key: 'documento',
                  width: 130,
                },
                {
                  title: 'Cantidad',
                  dataIndex: 'cantidad',
                  key: 'cantidad',
                  width: 100,
                  align: 'right' as const,
                  render: (v: number) => formatNumber(v || 0),
                },
                {
                  title: 'Costo',
                  dataIndex: 'costo',
                  key: 'costo',
                  width: 110,
                  align: 'right' as const,
                  render: (v: number) => formatNumber(v || 0),
                },
                {
                  title: 'Sucursal',
                  dataIndex: 'sucursal',
                  key: 'sucursal',
                  width: 100,
                  render: (v: string) => v || '-',
                },
              ]}
            />
          </div>
        )}
      </Drawer>

      {/* Modal de movimientos posteriores */}
      <ModalMovimientosPosteriores
        open={movimientosModalOpen}
        sucursal={movimientosSucursal}
        codigo={selectedItem?.codigo || ''}
        dataSource={movimientosData}
        loading={movimientosLoading}
        onClose={() => setMovimientosModalOpen(false)}
      />

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
    </div>
  );
};

export default RMovimientosPorFecha;
