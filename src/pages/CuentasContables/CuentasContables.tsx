import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tree, Input, Tag, Button, message, Card, Modal, Form, Switch, Typography, Select, Alert, Row, Col, Empty, Spin, Pagination } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import { monedaApi } from '../../api/monedaApi';
import PermissionGate from '../../components/PermissionGate';
import type { TipoCuentaDTO, GrupoCuentaContableDTO, MonedaDTO } from '../../types/contabilidad';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const ORIGEN_OPTIONS = [
  { label: 'Débito', value: 0 },
  { label: 'Crédito', value: 1 },
  { label: 'Desconocido', value: 2 },
];

const { Text } = Typography;

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

interface TreeNodeData {
  title: React.ReactNode;
  key: string;
  children?: TreeNodeData[];
  isLeaf?: boolean;
  // Additional data for the account
  cuentaData: {
    noCuenta: string;
    nombre: string;
    tipoCuenta?: string;
    tipoCuentaId?: string;
    origen?: string;
    grupoNombre?: string;
    grupoCodigo?: string;
    monedaCodigo?: string;
    cuentaControlNo?: string;
    cuentaPrimaNo?: string;
    nota?: string;
    activo?: string;
    utilizaCentroCosto?: string;
    idExterno?: string;
  };
}

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
  
  // States for create/edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<any>(null); // Changed to any for flexibility
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

  // Options for selects in modal
  const [tipos, setTipos] = useState<TipoCuentaDTO[]>([]);
  const [grupos, setGrupos] = useState<GrupoCuentaContableDTO[]>([]);
  const [monedas, setMonedas] = useState<MonedaDTO[]>([]);

  // Tree data and loading states
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

const updateTreeData = (nodes: TreeNodeData[], key: string, children: TreeNodeData[]): TreeNodeData[] => {
  return nodes.map(node => {
    if (node.key === key) {
      return { ...node, children, isLeaf: children.length === 0 };
    }
    if (node.children) {
      return { ...node, children: updateTreeData(node.children, key, children) };
    }
    return node;
  });
};

// Load root nodes (cuentas sin cuentaControl) - paginated 25
const loadRootNodes = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    
    const salto = (page - 1) * pageSize;
    try {
      const result = await cuentaContableApi.obtenerPadresPaginado(
        sucursalActiva, 
        pageSize, 
        salto, 
        filtro
      );
      
      // Convert flat list to tree nodes for root accounts
      const rootNodes: TreeNodeData[] = result.data.map(cuenta => ({
        title: (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <FolderOpenOutlined />
            <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>
              <strong>{cuenta.noCuenta}</strong>
            </span>
            <span style={{ marginLeft: 8 }}>{toTitleCase(cuenta.nombre ?? '')}</span>
          </span>
        ),
        key: cuenta.noCuenta,
        isLeaf: false, // Will be determined when loading children
        cuentaData: cuenta
      }));
      
      setTreeData(rootNodes);
      setTotalItems(result.total);
      setInitialLoadDone(true);
    } catch (error) {
      message.error('Error al cargar cuentas raíz');
      console.error(error);
    }
  }, [sucursalActiva, page, pageSize, filtro]);

  // Load children for a specific node
  const loadChildren = useCallback(async (node: TreeNodeData) => {
    const cuentaNo = node.key;
    
    // Skip if already loaded to prevent infinite loop
    if (loadingKeys.includes(cuentaNo)) {
      return;
    }
    
    setLoadingKeys(prev => [...new Set([...prev, cuentaNo])]);
    
    try {
      const hijos = await cuentaContableApi.obtenerHijos(sucursalActiva, cuentaNo);
      
      // Filter by search term if exists
      const filteredHijos = filtro 
        ? hijos.filter(h => 
            h.noCuenta.toLowerCase().includes(filtro.toLowerCase()) || 
            (h.nombre?.toLowerCase().includes(filtro.toLowerCase()))
          )
        : hijos;
      
      const childNodes: TreeNodeData[] = filteredHijos.map(hijo => ({
        title: (
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <FolderOpenOutlined />
            <span style={{ marginLeft: 8, fontFamily: 'monospace' }}>
              <strong>{hijo.noCuenta}</strong>
            </span>
            <span style={{ marginLeft: 8 }}>{toTitleCase(hijo.nombre ?? '')}</span>
          </span>
        ),
        key: hijo.noCuenta,
        isLeaf: filteredHijos.length === 0, // Leaf if no children after filtering
        cuentaData: hijo
      }));
      
      // Update tree data by replacing the node with its children (recursive search)
      setTreeData(prev => updateTreeData(prev, cuentaNo, childNodes));
    } catch (error) {
      message.error('Error al cargar cuentas hijas');
      console.error(error);
    } finally {
      setLoadingKeys(prev => prev.filter(k => k !== cuentaNo));
    }
  }, [sucursalActiva, filtro, loadingKeys]);

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
      // Find account in tree (simplified - could be enhanced)
      cuentaContableApi.obtenerPorId(sucursalActiva, noCuentaEditar)
        .then(cta => abrirEdicion(cta))
        .catch(() => message.error('Error al cargar cuenta para editar'));
      
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const abrirNuevo = () => {
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEdicion = (cuenta: any) => {
    setEditando(cuenta);
    form.setFieldsValue({
      noCuenta: cuenta.noCuenta,
      nombre: cuenta.nombre,
      nota: cuenta.nota || '',
      activo: cuenta.activo === 'Sí',
      origen: cuenta.origen === 'Débito' ? 0 : 1,
      utilizaCentroCosto: cuenta.utilizaCentroCosto === 'Sí',
      tipoCuentaCodigo: cuenta.tipoCuentaId || undefined,
      grupoCodigo: cuenta.grupoCodigo || undefined,
      monedaCodigo: cuenta.monedaCodigo || undefined,
      cuentaControlNo: cuenta.cuentaControlNo || undefined,
      cuentaPrimaNo: cuenta.cuentaPrimaNo || undefined,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      
      setGuardando(true);
      if (editando) {
        await cuentaContableApi.actualizar(sucursalActiva, editando.noCuenta, values);
        message.success('Cuenta contable actualizada correctamente');
      } else {
        await cuentaContableApi.crear(sucursalActiva, values);
        message.success('Cuenta contable creada correctamente');
      }
      
      setModalVisible(false);
      
      // Refresh: if we were viewing a specific node, reload its parent
      // For simplicity, refresh the entire tree
      if (editando?.cuentaControlNo) {
        // Would need to find parent and reload - simplified to full refresh for now
        loadRootNodes();
      } else {
        loadRootNodes();
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar cuenta contable');
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    
    // Flatten tree data for export
    const flattenTree = (nodes: TreeNodeData[]): any[] => {
      let result: any[] = [];
      nodes.forEach(node => {
        result.push(node.cuentaData);
        if (node.children) {
          result = result.concat(flattenTree(node.children));
        }
      });
      return result;
    };
    
    const flatData = flattenTree(treeData);
    const exportCols = [
      { title: 'No. Cuenta', dataIndex: 'noCuenta' },
      { title: 'Nombre', dataIndex: 'nombre' },
      { title: 'Tipo Cuenta', dataIndex: 'tipoCuenta' },
      { title: 'Grupo', dataIndex: 'grupoNombre' },
      { title: 'Moneda', dataIndex: 'monedaCodigo' },
      { title: 'Origen', dataIndex: 'origen' },
      { title: 'Activo', dataIndex: 'activo' },
      { title: 'Centro Costo', dataIndex: 'utilizaCentroCosto' },
    ];
    
    const columnHeaders = exportCols.map(col => col.title);
    const dataRows = flatData.map((item: any) =>
      exportCols.map(col => {
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    
    exportToExcel({
      fileName: `CuentasContables_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'CuentasContables',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setFiltro(value);
    setPage(1);
    // Reset tree when search changes
    setTreeData([]);
    setInitialLoadDone(false);
  };

  // Initial load
  useEffect(() => {
    setActiveModule('MCuentaContable');
    updateToolbar({});
    
    if (sucursalActiva !== undefined) {
      loadRootNodes();
    }
    
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, sucursalActiva, loadRootNodes]);

  return (
    <>
      {/* Error alert */}
      {false && ( // Temporarily disabled until we implement proper error state
        <Alert
          title="Error al cargar cuentas contables"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={loadRootNodes}>
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
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={() => {
            setPage(1);
            setTreeData([]);
            setInitialLoadDone(false);
            loadRootNodes();
          }}
          onExportarExcel={handleExportarExcel}
        />
        
        <Card
          style={{ margin: '16px 24px', minHeight: 400 }}
          style={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #f0f0f0' }}
        >
          {!initialLoadDone && sucursalActiva !== undefined ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="Cargando cuentas contables..." />
            </div>
          ) : (
            <Tree
              showLine
              defaultExpandAll={false} // Start collapsed
              loadData={loadChildren}
              loadedKeys={loadingKeys}
              treeData={treeData}
              selectedKeys={selectedKeys}
              onSelect={(keys) => {
                setSelectedKeys(keys as string[]);
                if (keys.length > 0) {
                  navigate(`/MCuentaContable/${keys[0]}`);
                }
              }}
              blockNode={true}
            />
          )}
        </Card>

        {/* Paginación para cuentas padres */}
        {initialLoadDone && (
          <Pagination
            current={page}
            pageSize={pageSize}
            total={totalItems}
            pageSizeOptions={['25', '50', '100']}
            showSizeChanger
            showTotal={(t) => `${t} cuentas raíces`}
            onChange={(currentPage, size) => {
              setPage(currentPage);
              if (size) setPageSize(size);
              setTreeData([]);
              setInitialLoadDone(false);
              loadRootNodes();
            }}
          />
        )}
      </Card>

      {/* Modal for create/edit */}
      <Modal
        title={editando ? 'Editar Cuenta Contable' : 'Nueva Cuenta Contable'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={640}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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