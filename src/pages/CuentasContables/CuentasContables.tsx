import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tree, Input, Button, message, Card, Modal, Form, Switch, Select, Alert, Row, Col, Empty, Spin, Pagination, Tooltip } from 'antd';
import { FolderOpenOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { monedaApi } from '../../api/monedaApi';
import type { TipoCuentaDTO, GrupoCuentaContableDTO, MonedaDTO, CuentaContableDTO, CuentaContableResumenDTO } from '../../types/contabilidad';
import type { DataNode } from 'antd/es/tree';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import './CuentasContables.css';

const ORIGEN_OPTIONS = [
  { label: 'Débito', value: 0 },
  { label: 'Crédito', value: 1 },
  { label: 'Desconocido', value: 2 },
];

/** Lote usado para traer todos los registros al exportar. */
const TAMANO_LOTE_EXPORT = 1000;

interface TreeNodeData extends DataNode {
  title: React.ReactNode;
  key: string;
  children?: TreeNodeData[];
  isLeaf?: boolean;
  /** true cuando los hijos ya fueron consultados (solo modo arbol). */
  cargado?: boolean;
  // La raíz y los resultados de búsqueda vienen como resumen plano; los hijos como DTO completo.
  cuentaData: CuentaContableResumenDTO | CuentaContableDTO;
}

/** Construye el título de un nodo: columna fija para el código y flexible para el nombre. */
const buildTitle = (cuenta: { noCuenta: string; nombre?: string }, icono: React.ReactNode): React.ReactNode => (
  <div className="cuenta-tree-row">
    <span className="cuenta-tree-codigo">
      {icono}
      {cuenta.noCuenta}
    </span>
    <Tooltip title={cuenta.nombre ?? ''} placement="topLeft">
      <span className="cuenta-tree-nombre">{cuenta.nombre ?? ''}</span>
    </Tooltip>
  </div>
);

/** Icono según el estado del nodo: pendiente de cargar, carpeta abierta u hoja. */
const buildIcon = (node: Pick<TreeNodeData, 'isLeaf' | 'cargado' | 'children'>): React.ReactNode => {
  if (node.isLeaf === true) return <FileTextOutlined />;
  if (node.cargado === true) {
    return node.children && node.children.length > 0 ? <FolderOpenOutlined /> : <FileTextOutlined />;
  }
  return <FolderOutlined />;
};

const buildNodeTitle = (node: TreeNodeData): React.ReactNode => buildTitle(node.cuentaData, buildIcon(node));

const buildNode = (
  cuenta: CuentaContableResumenDTO | CuentaContableDTO,
  isLeaf: boolean
): TreeNodeData => {
  const node: TreeNodeData = {
    key: cuenta.noCuenta,
    title: undefined,
    isLeaf,
    cargado: false,
    cuentaData: cuenta,
  };
  node.title = buildNodeTitle(node);
  return node;
};

const updateTreeData = (nodes: TreeNodeData[], key: string, children: TreeNodeData[]): TreeNodeData[] => {
  return nodes.map(node => {
    if (node.key === key) {
      const updated: TreeNodeData = { ...node, children, isLeaf: children.length === 0, cargado: true };
      updated.title = buildNodeTitle(updated);
      return updated;
    }
    if (node.children) {
      return { ...node, children: updateTreeData(node.children, key, children) };
    }
    return node;
  });
};

const CuentasContables: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refreshKey, setRefreshKey] = useState(0);

  // States for create/edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<CuentaContableResumenDTO | CuentaContableDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [form] = Form.useForm();

  // Options for selects in modal
  const [tipos, setTipos] = useState<TipoCuentaDTO[]>([]);
  const [grupos, setGrupos] = useState<GrupoCuentaContableDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);

  // Tree data and loading states
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loadedKeys, setLoadedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);

  // Ignora respuestas de consultas anteriores que llegan tarde.
  const requestIdRef = useRef(0);
  const cargandoKeysRef = useRef<Set<string>>(new Set());

  // Carga la página actual: con búsqueda consulta todas las cuentas, sin búsqueda solo las raíces.
  const loadRootNodes = useCallback(async () => {
    if (sucursalActiva === undefined) return;

    const termino = filtro.trim();
    const salto = (page - 1) * pageSize;
    const requestId = ++requestIdRef.current;
    setLoadingError(null);

    try {
      const response = termino
        ? await cuentaContableApi.obtenerListadoPaginado(sucursalActiva, pageSize, salto, termino)
        : await cuentaContableApi.obtenerPadresPaginado(sucursalActiva, pageSize, salto, '');

      if (requestId !== requestIdRef.current) return;

      // En modo búsqueda los resultados son planos: no dependen de cargar el padre.
      const buscando = termino.length > 0;
      const nodes = response.data.map((cuenta) => buildNode(cuenta, buscando));

      setTreeData(nodes);
      setTotalItems(response.total);
      setInitialLoadDone(true);
    } catch (error: any) {
      if (requestId !== requestIdRef.current) return;
      setInitialLoadDone(false);
      setTreeData([]);
      const texto = error?.response?.data?.errorMessage || 'Error al cargar cuentas contables';
      setLoadingError(texto);
      message.error(texto);
      console.error(error);
    }
  }, [sucursalActiva, page, pageSize, filtro]);

  // Carga los hijos de un nodo. Sin filtrado local: el árbol siempre muestra la rama completa.
  const loadChildren = useCallback(async (node: TreeNodeData) => {
    const cuentaNo = String(node.key);
    if (sucursalActiva === undefined) return;

    // Evita llamadas duplicadas mientras la misma rama está en vuelo.
    if (cargandoKeysRef.current.has(cuentaNo)) return;
    cargandoKeysRef.current.add(cuentaNo);

    try {
      const hijos = await cuentaContableApi.obtenerHijos(sucursalActiva, cuentaNo);
      const childNodes = hijos.map((hijo) => buildNode(hijo, false));
      setTreeData((prev) => updateTreeData(prev, cuentaNo, childNodes));
      setLoadedKeys((prev) => (prev.includes(cuentaNo) ? prev : [...prev, cuentaNo]));
    } catch (error: any) {
      message.error(error?.response?.data?.errorMessage || 'Error al cargar cuentas hijas');
      console.error(error);
    } finally {
      cargandoKeysRef.current.delete(cuentaNo);
    }
  }, [sucursalActiva]);

  // Registro del módulo y limpieza del toolbar global.
  useEffect(() => {
    setActiveModule('MCuentaContable');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  // Carga de datos: única fuente de disparo de consultas.
  useEffect(() => {
    if (sucursalActiva === undefined) return;
    loadRootNodes();
  }, [sucursalActiva, loadRootNodes, refreshKey]);

  // Load catalog options when modal opens
  useEffect(() => {
    if (!modalVisible || sucursalActiva === undefined) return;

    cuentaContableApi.obtenerTipos(sucursalActiva)
      .then(setTipos)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar tipos de cuenta'));

    cuentaContableApi.obtenerGrupos(sucursalActiva)
      .then(setGrupos)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar grupos'));

    monedaApi.obtenerListado(sucursalActiva)
      .then(setMonedas)
      .catch(err => message.error(err?.response?.data?.errorMessage || 'Error al cargar monedas'));
  }, [modalVisible, sucursalActiva]);

  // Handle navigation from detail (Editar)
  useEffect(() => {
    const noCuentaEditar = (location.state as any)?.editarNoCuenta;
    if (noCuentaEditar && sucursalActiva !== undefined) {
      cuentaContableApi.obtenerPorId(sucursalActiva, noCuentaEditar)
        .then(cta => abrirEdicion(cta))
        .catch((error: any) => message.error(error?.response?.data?.errorMessage || 'Error al cargar cuenta para editar'));

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEdicion = (cuenta: CuentaContableResumenDTO | CuentaContableDTO) => {
    setEditando(cuenta);
    const r = cuenta as CuentaContableResumenDTO;
    const d = cuenta as CuentaContableDTO;
    const activo = typeof r.activo === 'string' ? r.activo === 'Sí' : !!d.activo;
    const centroCosto = typeof r.utilizaCentroCosto === 'string' ? r.utilizaCentroCosto === 'Sí' : !!d.utilizaCentroCosto;
    const origenDto = typeof r.origen === 'string'
      ? (r.origen === 'Débito' ? 0 : 1)
      : (typeof d.origen === 'number' ? d.origen : 0);
    form.setFieldsValue({
      noCuenta: cuenta.noCuenta,
      nombre: cuenta.nombre,
      nota: cuenta.nota || '',
      activo,
      origen: origenDto,
      utilizaCentroCosto: centroCosto,
      tipoCuentaCodigo: r.tipoCuentaId || d.tipoCuenta?.idExterno || undefined,
      grupoCodigo: r.grupoCodigo || d.grupo?.codigo || undefined,
      monedaCodigo: r.monedaCodigo || d.moneda?.codigo || undefined,
      cuentaControlNo: r.cuentaControlNo || d.cuentaControl?.noCuenta || undefined,
      cuentaPrimaNo: r.cuentaPrimaNo || d.cuentaPrima?.noCuenta || undefined,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;

      if (editando) {
        await cuentaContableApi.actualizar(sucursalActiva, editando.noCuenta, values);
        message.success('Cuenta contable actualizada correctamente');
      } else {
        await cuentaContableApi.crear(sucursalActiva, values);
        message.success('Cuenta contable creada correctamente');
      }

      setModalVisible(false);

      // Refresh completo del árbol
      setTreeData([]);
      setLoadedKeys([]);
      setExpandedKeys([]);
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  /** Trae todas las cuentas (o todas las coincidencias del filtro) en lotes. */
  const obtenerTodasParaExportar = async (termino: string): Promise<CuentaContableResumenDTO[]> => {
    if (sucursalActiva === undefined) return [];
    const todas: CuentaContableResumenDTO[] = [];
    let salto = 0;

    for (;;) {
      const response = await cuentaContableApi.obtenerListadoPaginado(
        sucursalActiva,
        TAMANO_LOTE_EXPORT,
        salto,
        termino
      );
      todas.push(...response.data);
      salto += response.data.length;
      if (response.data.length === 0 || salto >= response.total) break;
    }

    return todas;
  };

  const handleExportarExcel = async () => {
    if (exportando) return;
    setExportando(true);
    try {
      const termino = filtro.trim();
      const [companyName, cuentas] = await Promise.all([
        getCompanyName(sucursalActiva),
        obtenerTodasParaExportar(termino),
      ]);

      if (cuentas.length === 0) {
        message.warning(termino ? `No hay cuentas que coincidan con “${termino}”` : 'No hay cuentas contables para exportar');
        return;
      }

      const exportCols: { title: string; dataIndex: keyof CuentaContableResumenDTO }[] = [
        { title: 'No. Cuenta', dataIndex: 'noCuenta' },
        { title: 'Nombre', dataIndex: 'nombre' },
        { title: 'Tipo Cuenta', dataIndex: 'tipoCuenta' },
        { title: 'Grupo', dataIndex: 'grupoNombre' },
        { title: 'Moneda', dataIndex: 'monedaCodigo' },
        { title: 'Origen', dataIndex: 'origen' },
        { title: 'Activo', dataIndex: 'activo' },
        { title: 'Centro Costo', dataIndex: 'utilizaCentroCosto' },
      ];

      exportToExcel({
        fileName: `CuentasContables_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        sheetName: 'CuentasContables',
        companyName,
        columnHeaders: exportCols.map(col => col.title),
        dataRows: cuentas.map(cuenta => exportCols.map(col => {
          const valor = cuenta[col.dataIndex];
          return valor != null ? String(valor) : '';
        })),
      });

      message.success(`${cuentas.length} cuenta(s) exportada(s)`);
    } catch (error: any) {
      message.error(error?.response?.data?.errorMessage || 'Error al exportar cuentas contables');
    } finally {
      setExportando(false);
    }
  };

  const handleSearch = (value: string) => {
    const termino = value.trim();
    // Invalida cualquier consulta en vuelo antes de que arranque la nueva.
    requestIdRef.current += 1;
    setFiltro(termino);
    setPage(1);
    setTreeData([]);
    setLoadedKeys([]);
    setExpandedKeys([]);
    cargandoKeysRef.current.clear();
    setInitialLoadDone(false);
  };

  const handleReload = () => {
    requestIdRef.current += 1;
    setSelectedKeys([]);
    setTreeData([]);
    setLoadedKeys([]);
    setExpandedKeys([]);
    cargandoKeysRef.current.clear();
    setInitialLoadDone(false);
    setRefreshKey((k) => k + 1);
  };

  const hayFiltro = filtro.trim().length > 0;

  return (
    <>
      {/* Error alert */}
      {loadingError && (
        <Alert
          title={loadingError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleReload}>
              Reintentar
            </Button>
          }
        />
      )}

      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          placeholder="Buscar cuenta por número o nombre..."
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          ocultarPageSize
          onNuevo={abrirNuevo}
          onReload={handleReload}
          onExportarExcel={handleExportarExcel}
          exportando={exportando}
        />

        {hayFiltro && (
          <div className="cuentas-resultado-header">
            Resultados para <strong>“{filtro.trim()}”</strong> · {totalItems} coincidencia{totalItems === 1 ? '' : 's'}
          </div>
        )}

        <div className="cuentas-contables-contenido">
          {!initialLoadDone && !loadingError && sucursalActiva !== undefined ? (
            <div className="cuentas-contables-estado">
              <Spin size="large" tip="Cargando cuentas contables..." />
            </div>
          ) : loadingError ? (
            <div className="cuentas-contables-estado">
              <Empty description="No se pudieron cargar las cuentas contables." />
            </div>
          ) : initialLoadDone && treeData.length === 0 ? (
            <div className="cuentas-contables-estado">
              <Empty
                description={
                  hayFiltro
                    ? `No se encontraron cuentas para “${filtro.trim()}”`
                    : 'No hay cuentas contables registradas'
                }
              />
            </div>
          ) : (
            <Tree
              showLine
              loadData={loadChildren as (node: DataNode) => Promise<void>}
              loadedKeys={loadedKeys}
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              treeData={treeData}
              selectedKeys={selectedKeys}
              onSelect={(keys) => {
                setSelectedKeys(keys as string[]);
                if (keys.length > 0) {
                  navigate(`/MCuentaContable/${keys[0]}`);
                }
              }}
              blockNode
            />
          )}
        </div>

        {initialLoadDone && !loadingError && (
          <div className="cuentas-pagination">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={totalItems}
              pageSizeOptions={['25', '50', '100']}
              showSizeChanger
              showTotal={(t) => (hayFiltro ? `${t} coincidencias` : `${t} cuentas raíz`)}
              onChange={(currentPage, size) => {
                setPage(currentPage);
                if (size) setPageSize(size);
                setExpandedKeys([]);
              }}
            />
          </div>
        )}
      </Card>

      {/* Modal for create/edit */}
      <Modal
        title={editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
        open={modalVisible}
        onCancel={() => { if (!guardando) setModalVisible(false); }}
        onOk={guardar}
        confirmLoading={guardando}
        cancelButtonProps={{ disabled: guardando }}
        width={640}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} disabled={guardando}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="noCuenta"
                label="No. Cuenta"
                rules={[{ required: true, message: 'El número de cuenta es obligatorio' }]}
              >
                <Input placeholder="Ej. 1.01.01" maxLength={20} disabled={!!editando} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej. Caja General" maxLength={150} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tipoCuentaCodigo"
                label="Tipo Cuenta"
                rules={[{ required: true, message: 'Seleccione un tipo de cuenta' }]}
              >
                <Select
                  placeholder="Seleccionar tipo"
                  showSearch
                  optionFilterProp="label"
                  options={tipos.map(t => ({ label: t.nombre, value: t.idExterno }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="grupoCodigo"
                label="Grupo"
                rules={[{ required: true, message: 'Seleccione un grupo' }]}
              >
                <Select
                  placeholder="Seleccionar grupo"
                  showSearch
                  optionFilterProp="label"
                  options={grupos.map(g => ({ label: g.nombre, value: g.codigo }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="monedaCodigo"
                label="Moneda"
                rules={[{ required: true, message: 'Seleccione una moneda' }]}
              >
                <Select
                  placeholder="Seleccionar moneda"
                  showSearch
                  optionFilterProp="label"
                  options={monedas.map(m => ({ label: `${m.nombre} (${m.codigo})`, value: m.codigo }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="origen"
                label="Origen"
                rules={[{ required: true, message: 'Seleccione el origen' }]}
              >
                <Select placeholder="Seleccionar origen" options={ORIGEN_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cuentaControlNo"
                label="Cuenta Control"
              >
                <Input placeholder="No. cuenta control" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="cuentaPrimaNo"
                label="Cuenta Prima"
              >
                <Input placeholder="No. cuenta prima" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="utilizaCentroCosto" label="Centro Costo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="activo" label="Activo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="nota"
            label="Nota"
          >
            <Input.TextArea rows={3} placeholder="Nota opcional" maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default CuentasContables;
