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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import PermissionGate from '../../components/PermissionGate';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conceptosApi } from '../../api/conceptosApi';
import type { ConceptoDTO } from '../../types/entradaAlmacen';

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
        onCancel={() => setDetalleVisible(false)}
        footer={<Button onClick={() => setDetalleVisible(false)}>Cerrar</Button>}
        width={650}
      >
        {detalleItem && (
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
                <Text>{detalleItem.docAGenerar || '-'}</Text>
              </div>
            </Card>

            <Tabs items={[
              {
                key: 'inventario',
                label: 'Inventario',
                children: (
                  <Descriptions bordered column={1} size="small" style={{ marginTop: 8 }}>
                    <Descriptions.Item label="Doc. a Generar">
                      <Text>{detalleItem.docAGenerar || '-'}</Text>
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
      </Modal>
    </>
  );
};

export default Conceptos;
