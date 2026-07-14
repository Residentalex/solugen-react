import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Tag, Row, Col, Grid, Typography, Descriptions, Table
} from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { conceptosApi } from '../../api/conceptosApi';
import { tipoApi } from '../../api/tipoApi';
import { toTitleCase } from '../../utils/formats';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import type { TipoDocumentoDTO } from '../../types/transaccion';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

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

const ConceptoDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ConceptoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [tiposMap, setTiposMap] = useState<Record<string, string>>({});
  const [tiposDocMap, setTiposDocMap] = useState<Record<string, string>>({});

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const cargarConcepto = useCallback(() => {
    if (!codigo) return;
    setLoading(true);
    setLoadingError(false);
    conceptosApi.obtenerConcepto(sucursalActiva, codigo)
      .then((res) => {
        setData(res);
        setPageTitleOverride(res.codigo);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el concepto';
        //message.error(msg); // commented to match pattern - using Alert instead
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [codigo, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule('MConcepto');
    tipoApi.obtenerTodo(sucursalActiva).then((tipos) => {
      const map: Record<string, string> = {};
      const docMap: Record<string, string> = {};
      tipos.forEach((t: TipoDocumentoDTO) => {
        map[t.codigo] = t.nombre;
        if (t.documento) docMap[`${t.documento}-${t.codigo}`] = t.nombre;
      });
      setTiposMap(map);
      setTiposDocMap(docMap);
    }).catch((err) => console.warn('Error al cargar tipos en detalle', err));
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, sucursalActiva]);

  useEffect(() => {
    if (!codigo) return;
    cargarConcepto();
  }, [codigo, cargarConcepto]);

  if (!data) return null;

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MConcepto"
      loading={loading}
      mensajeLoading="Cargando concepto..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle del concepto"
      onRecargar={cargarConcepto}
      dataDisponible={!!data}
      errorSinDatos={false}
      onEditar={() => navigate(`/MConcepto/${codigo}/editar`)}
    >
      {isLarge ? (
        /* === DESKTOP LAYOUT (≥ xxl) === */
        <Row gutter={16}>
          <Col xxl={18}>
            {/* Datos Generales */}
            <Card
              className="paces-card"
              size="small"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                  <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
                </div>
              }
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Código</Text>
                  <br />
                  <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }}>
                    {data.codigo}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Nombre</Text>
                  <br />
                  <Text style={{ fontSize: 15, fontWeight: 600 }}>
                    {toTitleCase(data.nombre ?? '')}
                  </Text>
                </div>
              </div>

              <Descriptions bordered size="small" column={isLarge ? 2 : 1}
                styles={{ content: { background: 'transparent' } }}
              >
                <Descriptions.Item label="Doc. a Generar">
                  {data.docAGenerar || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Almacén">
                  {data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sucursal Destino">
                  {data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Concepto Destino">
                  {data.conceptoDestino && data.conceptoDestinoNombre
                    ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                    : data.conceptoDestino || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Tabs */}
            <Tabs
              type="card"
              items={[
                {
                  key: 'inventario',
                  label: 'Inventario',
                  children: (
                    <Descriptions bordered size="small" column={isLarge ? 2 : 1}
                      styles={{ content: { background: 'transparent' } }}
                    >
                      <Descriptions.Item label="Sin Impuesto">
                        <Tag color={data.noImpuesto ? 'orange' : 'default'}>
                          {data.noImpuesto ? 'Sí' : 'No'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="No Actualiza Costos">
                        <Tag color={data.noActualizaCostos ? 'orange' : 'default'}>
                          {data.noActualizaCostos ? 'Sí' : 'No'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Almacén">
                        {data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Sucursal Destino">
                        {data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Concepto Destino">
                        {data.conceptoDestino && data.conceptoDestinoNombre
                          ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                          : data.conceptoDestino || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Replicar">
                        <Tag color={data.replicar ? 'blue' : 'default'}>
                          {data.replicar ? 'Sí' : 'No'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Sucursal Réplica">
                        {data.sucursalReplica?.codigo ? toTitleCase(data.sucursalReplica.nombre || '') || data.sucursalReplica.codigo : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Concepto Réplica">
                        {data.conceptoReplica && data.conceptoReplicaNombre
                          ? `${data.conceptoReplica}-${toTitleCase(data.conceptoReplicaNombre)}`
                          : data.conceptoReplica || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'contabilidad',
                  label: 'Contabilidad',
                  children: (
                    <Descriptions bordered size="small" column={isLarge ? 2 : 1}
                      styles={{ content: { background: 'transparent' } }}
                    >
                      <Descriptions.Item label="No genera asientos">
                        <Tag color={data.noAsientos ? 'orange' : 'default'}>
                          {data.noAsientos ? 'Sí' : 'No'}
                        </Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tipo Ingreso">
                        {TIPO_INGRESO_LABEL[data.tipoIngreso ?? 0] || 'Ninguno'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Cuenta Contable">
                        {data.cuentaContable ? (
                          <Text style={{ fontFamily: 'monospace' }}>
                            {data.cuentaContable.noCuenta} - {data.cuentaContable.nombre}
                          </Text>
                        ) : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Moneda">
                        {data.moneda?.codigo || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'entidad',
                  label: 'Entidad',
                  children: (
                    data.entidades && data.entidades.length > 0 ? (
                      <Table
                        dataSource={data.entidades}
                        rowKey="codigo"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: 'Código', dataIndex: 'codigo', width: 120 },
                          { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                          { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v: string) => v ? <Tag>{v}{tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''}</Tag> : '-' },
                        ]}
                      />
                    ) : (
                      <Text type="secondary">Ninguna</Text>
                    )
                  ),
                },
                {
                  key: 'documentos',
                  label: 'Documentos',
                  children: (
                    data.documentos && data.documentos.length > 0 ? (
                      <Table
                        dataSource={data.documentos}
                        rowKey="codigo"
                        size="small"
                        pagination={false}
                        columns={[
                          { title: 'Código', dataIndex: 'codigo', width: 120 },
                          { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                          { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v: string, record: any) => {
                            const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                            return v ? <Tag color="geekblue">{v}{tiposDocMap[docKey] ? ` - ${toTitleCase(tiposDocMap[docKey])}` : tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''}</Tag> : '-';
                          }},
                        ]}
                      />
                    ) : (
                      <Text type="secondary">Ninguno</Text>
                    )
                  ),
                },
              ]}
            />
          </Col>

          <Col xxl={6}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Configuración</span>}
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Sin Impuesto</Text>
                  <br />
                  <Tag color={data.noImpuesto ? 'orange' : 'default'}>{data.noImpuesto ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No Actualiza Costos</Text>
                  <br />
                  <Tag color={data.noActualizaCostos ? 'orange' : 'default'}>{data.noActualizaCostos ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No genera asientos</Text>
                  <br />
                  <Tag color={data.noAsientos ? 'orange' : 'default'}>{data.noAsientos ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Replicar</Text>
                  <br />
                  <Tag color={data.replicar ? 'blue' : 'default'}>{data.replicar ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Activo</Text>
                  <br />
                  <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        /* === COMPACT/MOBILE LAYOUT (< xxl) === */
        <div>
          <Card
            className="paces-card"
            size="small"
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
              </div>
            }
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Código</Text>
                <br />
                <Text style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700 }}>
                  {data.codigo}
                </Text>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Nombre</Text>
                <br />
                <Text style={{ fontSize: 15, fontWeight: 600 }}>
                  {toTitleCase(data.nombre ?? '')}
                </Text>
              </div>
            </div>

            <Descriptions bordered size="small" column={1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Doc. a Generar">
                {data.docAGenerar || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Almacén">
                {data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Sucursal Destino">
                {data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Concepto Destino">
                {data.conceptoDestino && data.conceptoDestinoNombre
                  ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                  : data.conceptoDestino || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Tabs
            type="card"
            items={[
              {
                key: 'inventario',
                label: 'Inventario',
                children: (
                  <Descriptions bordered size="small" column={1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="Sin Impuesto">
                      <Tag color={data.noImpuesto ? 'orange' : 'default'}>{data.noImpuesto ? 'Sí' : 'No'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="No Actualiza Costos">
                      <Tag color={data.noActualizaCostos ? 'orange' : 'default'}>{data.noActualizaCostos ? 'Sí' : 'No'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Almacén">
                      {data.almacen?.codigo ? `${data.almacen.codigo} - ${toTitleCase(data.almacen.nombre || '')}` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Sucursal Destino">
                      {data.sucursalDestino?.codigo ? toTitleCase(data.sucursalDestino.nombre || '') || data.sucursalDestino.codigo : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Concepto Destino">
                      {data.conceptoDestino && data.conceptoDestinoNombre
                        ? `${data.conceptoDestino}-${toTitleCase(data.conceptoDestinoNombre)}`
                        : data.conceptoDestino || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Replicar">
                      <Tag color={data.replicar ? 'blue' : 'default'}>{data.replicar ? 'Sí' : 'No'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Sucursal Réplica">
                      {data.sucursalReplica?.codigo ? toTitleCase(data.sucursalReplica.nombre || '') || data.sucursalReplica.codigo : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Concepto Réplica">
                      {data.conceptoReplica && data.conceptoReplicaNombre
                        ? `${data.conceptoReplica}-${toTitleCase(data.conceptoReplicaNombre)}`
                        : data.conceptoReplica || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'contabilidad',
                label: 'Contabilidad',
                children: (
                  <Descriptions bordered size="small" column={1}
                    styles={{ content: { background: 'transparent' } }}
                  >
                    <Descriptions.Item label="No genera asientos">
                      <Tag color={data.noAsientos ? 'orange' : 'default'}>{data.noAsientos ? 'Sí' : 'No'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tipo Ingreso">
                      {TIPO_INGRESO_LABEL[data.tipoIngreso ?? 0] || 'Ninguno'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Cuenta Contable">
                      {data.cuentaContable ? (
                        <Text style={{ fontFamily: 'monospace' }}>
                          {data.cuentaContable.noCuenta} - {data.cuentaContable.nombre}
                        </Text>
                      ) : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Moneda">
                      {data.moneda?.codigo || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'entidad',
                label: 'Entidad',
                children: (
                  data.entidades && data.entidades.length > 0 ? (
                    <Table
                      dataSource={data.entidades}
                      rowKey="codigo"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Código', dataIndex: 'codigo', width: 120 },
                        { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                        { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v: string) => v ? <Tag>{v}{tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''}</Tag> : '-' },
                      ]}
                    />
                  ) : (
                    <Text type="secondary">Ninguna</Text>
                  )
                ),
              },
              {
                key: 'documentos',
                label: 'Documentos',
                children: (
                  data.documentos && data.documentos.length > 0 ? (
                    <Table
                      dataSource={data.documentos}
                      rowKey="codigo"
                      size="small"
                      pagination={false}
                      columns={[
                        { title: 'Código', dataIndex: 'codigo', width: 120 },
                        { title: 'Nombre', dataIndex: 'nombre', render: (v: string) => toTitleCase(v) },
                        { title: 'Tipo', dataIndex: 'tipo', width: 160, render: (v: string, record: any) => {
                          const docKey = record?.codigo ? `${record.codigo}-${v}` : v;
                          return v ? <Tag color="geekblue">{v}{tiposDocMap[docKey] ? ` - ${toTitleCase(tiposDocMap[docKey])}` : tiposMap[v] ? ` - ${toTitleCase(tiposMap[v])}` : ''}</Tag> : '-';
                        }},
                      ]}
                    />
                  ) : (
                    <Text type="secondary">Ninguno</Text>
                  )
                ),
              },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            <Card
              className="paces-card"
              size="small"
              title={<span style={{ fontSize: 16, fontWeight: 600 }}>Configuración</span>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Sin Impuesto</Text>
                  <br />
                  <Tag color={data.noImpuesto ? 'orange' : 'default'}>{data.noImpuesto ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No Actualiza Costos</Text>
                  <br />
                  <Tag color={data.noActualizaCostos ? 'orange' : 'default'}>{data.noActualizaCostos ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>No genera asientos</Text>
                  <br />
                  <Tag color={data.noAsientos ? 'orange' : 'default'}>{data.noAsientos ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Replicar</Text>
                  <br />
                  <Tag color={data.replicar ? 'blue' : 'default'}>{data.replicar ? 'Sí' : 'No'}</Tag>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Activo</Text>
                  <br />
                  <Tag color={data.activo ? 'green' : 'default'}>{data.activo ? 'Activo' : 'Inactivo'}</Tag>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </DetalleCatalogoLayout>
  );
};

export default ConceptoDetalle;
