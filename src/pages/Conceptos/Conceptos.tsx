import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Tag,
  Button,
  Typography,
  message,
  Space,
  Modal,
  Descriptions,
  Empty,
  Tabs,
  Alert,
  Form,
  Switch,
  InputNumber,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conceptosApi } from '../../api/conceptosApi';
import { documentosApi } from '../../api/documentosApi';
import type { ConceptoDTO, AlmacenDTO, CompaniaDTO } from '../../types/entradaAlmacen';
import type { DocumentoDTO } from '../../types/documento';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';

const { Text } = Typography;

const TIPO_INGRESO_LABEL: Record<number, string> = {
  0: 'Ninguno',
  1: 'Operaciones',
  2: 'Financieros',
  3: 'Extraordinarios',
  4: 'Arrendamientos',
  5: 'Venta Activo',
  6: 'Otros Ingresos',
};

const toTitleCase = (str: string): string =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Conceptos: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [data, setData] = useState<ConceptoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleItem, setDetalleItem] = useState<ConceptoDTO | null>(null);
  const [pageSize, setPageSize] = useState(25);
  const [loadingError, setLoadingError] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);
  const [almacenes, setAlmacenes] = useState<AlmacenDTO[]>([]);
  const [sucursales, setSucursales] = useState<CompaniaDTO[]>([]);
  const [conceptoDestinoModal, setConceptoDestinoModal] = useState(false);
  const [conceptoDestinoText, setConceptoDestinoText] = useState('');
  const [sucDestValue, setSucDestValue] = useState<string | undefined>(undefined);
  const [documentos, setDocumentos] = useState<DocumentoDTO[]>([]);
  const [docAGenerarText, setDocAGenerarText] = useState('');
  const [docAGenerarModal, setDocAGenerarModal] = useState(false);

  const cargarDatos = useCallback(async (filtro?: string) => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await conceptosApi.obtenerConceptos(sucursalActiva, filtro);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar conceptos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MConcepto');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  useEffect(() => {
    if (sucursalActiva !== undefined) {
      conceptosApi.obtenerAlmacenes(sucursalActiva).then(setAlmacenes).catch((err: any) => message.error(err?.response?.data?.errorMessage || 'Error al cargar almacenes'));
      conceptosApi.obtenerSucursales(sucursalActiva).then(setSucursales).catch((err: any) => message.error(err?.response?.data?.errorMessage || 'Error al cargar sucursales'));
      documentosApi.obtenerDocumentos(sucursalActiva).then(setDocumentos).catch((err: any) => message.error(err?.response?.data?.errorMessage || 'Error al cargar documentos'));
    }
  }, [sucursalActiva]);

  const handleSearch = (value: string) => {
    cargarDatos(value || undefined);
  };

  const handleRecargar = () => {
    setLoadingError(false);
    cargarDatos();
  };

  const abrirDetalle = async (item: ConceptoDTO) => {
    try {
      const detalle = await conceptosApi.obtenerConcepto(sucursalActiva, item.codigo);
      setDetalleItem(detalle);
      setDetalleVisible(true);
    } catch (err: any) {
      message.error(err?.response?.data || 'Error al cargar detalle del concepto');
    }
  };

  const columns: ColumnsType<ConceptoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
      render: (val: string, record: ConceptoDTO) => (
        <Text
          style={{ fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }}
          onClick={() => abrirDetalle(record)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (val: string) => <Text strong ellipsis>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      width: 90,
      align: 'center',
      render: (val: boolean | undefined) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Activo' : 'Inactivo'}</Tag>
      ),
    },

  ];

  const handleEditar = () => {
    form.setFieldsValue({
      nombre: detalleItem?.nombre,
      activo: detalleItem?.activo,
      docAGenerar: detalleItem?.docAGenerar,
      noImpuesto: detalleItem?.noImpuesto,
      noAsientos: detalleItem?.noAsientos,
      noActualizaCostos: detalleItem?.noActualizaCostos,
      tipoIngreso: detalleItem?.tipoIngreso,
      codAlm: detalleItem?.almacen?.codigo,
      sucDest: detalleItem?.sucursalDestino?.codigo,
      conceptoDestino: detalleItem?.conceptoDestino,
    });
    setEditando(true);
    const codSucDest = detalleItem?.sucursalDestino?.codigo;
    setSucDestValue(codSucDest);
    const docGenEncontrado = documentos.find(d => d.codigo === detalleItem?.docAGenerar);
    setDocAGenerarText(docGenEncontrado ? `${docGenEncontrado.codigo} - ${toTitleCase(docGenEncontrado.nombre || '')}` : (detalleItem?.docAGenerar || ''));
    if (codSucDest) {
      setConceptoDestinoText(`${detalleItem.conceptoDestino || ''}`);
    } else {
      setConceptoDestinoText('');
    }
  };

  const handleDocumentoSelect = (doc: DocumentoDTO) => {
    setDocAGenerarText(`${doc.codigo} - ${toTitleCase(doc.nombre || '')}`);
    form.setFieldsValue({ docAGenerar: doc.codigo });
  };

  const handleGuardar = async () => {
    try {
      const values = await form.validateFields();
      setGuardando(true);
      const monedaActual = detalleItem!.moneda || { nombre: '', simbolo: '', codigo: '' };
      const almacenActual = detalleItem!.almacen || { nombre: '', codigo: '' };
      const dtoActualizado: ConceptoDTO = {
        ...detalleItem!,
        nombre: values.nombre,
        activo: values.activo,
        docAGenerar: values.docAGenerar,
        noImpuesto: values.noImpuesto,
        noAsientos: values.noAsientos,
        noActualizaCostos: values.noActualizaCostos,
        tipoIngreso: values.tipoIngreso,
        moneda: values.codMon ? { ...monedaActual, codigo: values.codMon } : detalleItem?.moneda,
        almacen: values.codAlm ? { ...almacenActual, codigo: values.codAlm } : detalleItem?.almacen,
        sucursalDestino: values.sucDest ? { ...detalleItem!.sucursalDestino, codigo: values.sucDest } as any : detalleItem?.sucursalDestino,
        conceptoDestino: values.conceptoDestino,
      };
      await conceptosApi.actualizarConcepto(sucursalActiva, detalleItem!.codigo, dtoActualizado);
      message.success('Concepto actualizado correctamente');
      setEditando(false);
      setDetalleVisible(false);
      cargarDatos();
    } catch (err: any) {
      if (err?.errorFields) return; // error de validación form
      message.error(err?.response?.data?.errorMessage || 'Error al actualizar concepto');
    } finally {
      setGuardando(false);
    }
  };

  const handleBuscarConceptoDestino = () => {
    if (!sucDestValue) {
      message.warning('Primero seleccione una Sucursal Destino');
      return;
    }
    const docAGenerar = form.getFieldValue('docAGenerar');
    if (!docAGenerar) {
      message.warning('Primero seleccione un Documento a Generar');
      return;
    }
    setConceptoDestinoModal(true);
  };

  const handleConceptoDestinoSelect = (concepto: ConceptoDTO) => {
    setConceptoDestinoText(`${concepto.codigo} - ${toTitleCase(concepto.nombre)}`);
    form.setFieldsValue({ conceptoDestino: concepto.codigo });
  };

  return (
    <>
      {loadingError && (
        <Alert
          title="Error al cargar conceptos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => { setLoadingError(false); cargarDatos(); }}>
              Reintentar
            </Button>
          }
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Conceptos</h4>
      </div>

      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar por código o nombre..."
              allowClear
              onSearch={handleSearch}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  (e.target as HTMLInputElement).blur();
                  handleSearch('');
                }
              }}
              style={{ width: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <Select
              style={{ width: 65 }}
              value={pageSize}
              onChange={(v) => { setPageSize(v); }}
              options={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 100, label: '100' },
              ]}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />}>Nuevo</Button>
            </PermissionGate>
            <Button icon={<ReloadOutlined />} onClick={handleRecargar} />
          </div>
        </div>

        <Table<ConceptoDTO>
          columns={columns}
          dataSource={data}
          rowKey="codigo"
          loading={loading}
          scroll={{ x: 700 }}
          size="middle"
          pagination={{
            showSizeChanger: false,
            pageSize,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} conceptos`,
          }}
          locale={{
            emptyText: <Empty description="No hay conceptos registrados" />,
          }}
          className="paces-border-top paces-list-table"
        />
      </Card>

      <Modal
        title="Detalle del Concepto"
        open={detalleVisible}
        footer={editando ? (
          <>
            <Button onClick={() => { setEditando(false); form.resetFields(); }}>Cancelar</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={guardando} onClick={handleGuardar}>Guardar</Button>
          </>
        ) : (
          <>
            <PermissionGate accion="EDITAR">
              <Button icon={<EditOutlined />} onClick={handleEditar}>Editar</Button>
            </PermissionGate>
            <Button onClick={() => setDetalleVisible(false)}>Cerrar</Button>
          </>
        )}
        onCancel={() => { setDetalleVisible(false); setEditando(false); form.resetFields(); }}
        width={650}
      >
        {detalleItem && (
          <>
            {editando ? (
              <>
              <Form form={form} layout="vertical">
                <Card
                  size="small"
                  style={{ marginBottom: 16, borderRadius: 8 }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  {/* Fila 1: Código a la izquierda, Activo Switch a la derecha */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>Código</Text>
                      <br />
                      <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }}>
                        {detalleItem.codigo}
                      </Text>
                    </div>
                    <Form.Item name="activo" valuePropName="checked" style={{ marginBottom: 0 }}>
                      <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                    </Form.Item>
                  </div>

                  {/* Fila 2: Nombre */}
                  <div style={{ marginBottom: 8 }}>
                    <Form.Item
                      name="nombre"
                      label={<Text type="secondary" style={{ fontSize: 11 }}>Nombre</Text>}
                      rules={[{ required: true, message: 'El nombre es requerido' }]}
                    >
                      <Input />
                    </Form.Item>
                  </div>

                  {/* Fila 3: Doc. a Generar */}
                  <div>
                    <Form.Item name="docAGenerar" hidden>
                      <Input />
                    </Form.Item>
                    <div style={{ marginBottom: 8 }}>
                      <Input.Search
                        placeholder="Buscar documento a generar..."
                        value={docAGenerarText}
                        readOnly
                        enterButton={<SearchOutlined />}
                        onSearch={() => setDocAGenerarModal(true)}
                      />
                    </div>
                  </div>
                </Card>

                <Tabs items={[
                  {
                    key: 'inventario',
                    label: 'Inventario',
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                        <Form.Item name="noImpuesto" valuePropName="checked" label="Sin Impuesto">
                          <Switch />
                        </Form.Item>
                        <Form.Item name="noActualizaCostos" valuePropName="checked" label="No Actualiza Costos">
                          <Switch />
                        </Form.Item>
                        <Form.Item name="codAlm" label="Almacén">
                          <Select
                            allowClear
                            placeholder="Seleccionar almacén..."
                            showSearch
                            optionFilterProp="label"
                            options={almacenes.map(a => ({ value: a.codigo, label: a.nombre }))}
                          />
                        </Form.Item>
                        <Form.Item name="sucDest" label="Sucursal Destino">
                          <Select
                            allowClear
                            placeholder="Seleccionar sucursal..."
                            showSearch
                            optionFilterProp="label"
                            options={sucursales.map(s => ({ value: s.codigo, label: toTitleCase(s.nombre) }))}
                            onChange={(value: string) => {
                              setSucDestValue(value);
                              if (!value) {
                                setConceptoDestinoText('');
                                form.setFieldValue('conceptoDestino', undefined);
                              }
                            }}
                          />
                        </Form.Item>
                        <Form.Item name="conceptoDestino" label="Concepto Destino" hidden>
                          <Input />
                        </Form.Item>
                        <div style={{ marginBottom: 16 }}>
                          <Input.Search
                            placeholder="Buscar concepto destino..."
                            value={conceptoDestinoText}
                            readOnly
                            enterButton={<SearchOutlined />}
                            onSearch={handleBuscarConceptoDestino}
                            disabled={!sucDestValue}
                          />
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'contabilidad',
                    label: 'Contabilidad',
                    children: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                        <Form.Item name="noAsientos" valuePropName="checked" label="No genera asientos">
                          <Switch />
                        </Form.Item>
                        <Form.Item name="tipoIngreso" label="Tipo Ingreso">
                          <Select
                            allowClear
                            placeholder="Seleccionar tipo..."
                            options={Object.entries(TIPO_INGRESO_LABEL).map(([value, label]) => ({ value: Number(value), label }))}
                          />
                        </Form.Item>
                      </div>
                    ),
                  },
                  {
                    key: 'entidad',
                    label: 'Entidad',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Entidades">
                          {detalleItem.entidades && detalleItem.entidades.length > 0 ? (
                            <Space wrap size={4}>
                              {detalleItem.entidades.map((e: any) => (
                                <Tag key={e.codigo} color="blue" style={{ fontSize: 12 }}>
                                  {e.nombre || e.codigo}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text type="secondary">Ninguna</Text>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'documentos',
                    label: 'Documentos',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Documentos">
                          {detalleItem.documentos && detalleItem.documentos.length > 0 ? (
                            <Space wrap size={4}>
                              {detalleItem.documentos.map((d: any) => (
                                <Tag key={d.codigo} color="geekblue" style={{ fontSize: 12 }}>
                                  {d.nombre || d.codigo}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text type="secondary">Ninguno</Text>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                ]} />
              </Form>
                      <BuscarDocumentoModal
                        open={docAGenerarModal}
                        onClose={() => setDocAGenerarModal(false)}
                        onSelect={handleDocumentoSelect}
                        documentos={documentos}
                      />
                      <BuscarConceptoModal
                        open={conceptoDestinoModal}
                        onClose={() => setConceptoDestinoModal(false)}
                        onSelect={handleConceptoDestinoSelect}
                        title="Buscar Concepto Destino"
                        fetchConceptos={() => {
                          const sucDestSucursal = sucDestValue ? sucursales.find(s => s.codigo === sucDestValue)?.sucursal : undefined;
                          const doc = form.getFieldValue('docAGenerar');
                          if (!sucDestSucursal || !doc) return Promise.resolve([]);
                          return conceptosApi.obtenerConceptosPorDocumento(sucDestSucursal, doc);
                        }}
                      />
            </>
            ) : (
              <>
                <Card
                  size="small"
                  style={{ marginBottom: 16, borderRadius: 8 }}
                  styles={{ body: { padding: '12px 16px' } }}
                >
                  {/* Fila 1: Código a la izquierda, Estado a la derecha */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>Código</Text>
                      <br />
                      <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }}>
                        {detalleItem.codigo}
                      </Text>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Estado</Text>
                      <br />
                      <Tag color={detalleItem.activo ? 'green' : 'default'} style={{ fontSize: 13, padding: '2px 10px' }}>
                        {detalleItem.activo ? 'Activo' : 'Inactivo'}
                      </Tag>
                    </div>
                  </div>

                  {/* Fila 2: Nombre ocupa toda la fila */}
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Nombre</Text>
                    <br />
                    <Text style={{ fontSize: 15, fontWeight: 600 }}>
                      {toTitleCase(detalleItem.nombre ?? '')}
                    </Text>
                  </div>

                  {/* Fila 3: Doc. a Generar */}
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Doc. a Generar</Text>
                    <br />
                    <Text>{(() => {
                      const dg = documentos.find(d => d.codigo === detalleItem.docAGenerar);
                      return dg ? `${dg.codigo} - ${toTitleCase(dg.nombre || '')}` : (detalleItem.docAGenerar || '-');
                    })()}</Text>
                  </div>
                </Card>

                <Tabs items={[
                  {
                    key: 'inventario',
                    label: 'Inventario',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Doc. a Generar">
                          <Text>{(() => {
                            const dg = documentos.find(d => d.codigo === detalleItem.docAGenerar);
return dg ? `${dg.codigo} - ${toTitleCase(dg.nombre || '')}` : (detalleItem.docAGenerar || '-');
                          })()}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sin Impuesto">
                          <Tag color={detalleItem.noImpuesto ? 'orange' : 'default'}>
                            {detalleItem.noImpuesto ? 'Sí' : 'No'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="No Actualiza Costos">
                          <Tag color={detalleItem.noActualizaCostos ? 'orange' : 'default'}>
                            {detalleItem.noActualizaCostos ? 'Sí' : 'No'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Almacén">
                          <Text>{detalleItem.almacen?.codigo || '-'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Sucursal Destino">
                          <Text>{toTitleCase(detalleItem.sucursalDestino?.nombre || '') || detalleItem.sucursalDestino?.codigo || '-'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Concepto Destino">
                          <Text>{detalleItem.conceptoDestino || '-'}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'contabilidad',
                    label: 'Contabilidad',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="No genera asientos">
                          <Tag color={detalleItem.noAsientos ? 'orange' : 'default'}>
                            {detalleItem.noAsientos ? 'Sí' : 'No'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Cuenta Contable">
                          {detalleItem.cuentaContable ? (
                            <Text style={{ fontFamily: 'monospace' }}>
                              {detalleItem.cuentaContable.noCuenta} - {detalleItem.cuentaContable.nombre}
                            </Text>
                          ) : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Tipo Ingreso">
                          <Text>{TIPO_INGRESO_LABEL[detalleItem.tipoIngreso ?? 0] || 'Ninguno'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Moneda">
                          <Text>{detalleItem.moneda?.codigo || '-'}</Text>
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'entidad',
                    label: 'Entidad',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Entidades">
                          {detalleItem.entidades && detalleItem.entidades.length > 0 ? (
                            <Space wrap size={4}>
                              {detalleItem.entidades.map((e: any) => (
                                <Tag key={e.codigo} color="blue" style={{ fontSize: 12 }}>
                                  {e.nombre || e.codigo}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text type="secondary">Ninguna</Text>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                  {
                    key: 'documentos',
                    label: 'Documentos',
                    children: (
                      <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                        <Descriptions.Item label="Documentos">
                          {detalleItem.documentos && detalleItem.documentos.length > 0 ? (
                            <Space wrap size={4}>
                              {detalleItem.documentos.map((d: any) => (
                                <Tag key={d.codigo} color="geekblue" style={{ fontSize: 12 }}>
                                  {d.nombre || d.codigo}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text type="secondary">Ninguno</Text>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    ),
                  },
                ]} />
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

// ===== Modal Buscar Documento a Generar =====
interface BuscarDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentoDTO) => void;
  documentos: DocumentoDTO[];
}

const BuscarDocumentoModal: React.FC<BuscarDocumentoModalProps> = ({ open, onClose, onSelect, documentos }) => {
  const [filtered, setFiltered] = useState<DocumentoDTO[]>(documentos);

  useEffect(() => { setFiltered(documentos); }, [documentos, open]);

  const handleSearch = (val: string) => {
    if (!val) { setFiltered(documentos); return; }
    const f = val.toLowerCase();
    setFiltered(documentos.filter(d => d.codigo.toLowerCase().includes(f) || (d.nombre || '').toLowerCase().includes(f)));
  };

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v) },
  ];

  return (
    <Modal title="Buscar Documento" open={open} onCancel={onClose} footer={null} width={600} destroyOnClose>
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={filtered}
        columns={columnas}
        rowKey="codigo"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No hay documentos" /> }}
      />
    </Modal>
  );
};

export default Conceptos;
