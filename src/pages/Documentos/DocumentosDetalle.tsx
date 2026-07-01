import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Row, Col, Grid, Typography, Descriptions } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { documentosApi } from '../../api/documentosApi';
import { toTitleCase } from '../../utils/formats';
import type { DocumentoDTO } from '../../types/documento';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';

const { Text } = Typography;

const METODO_POSTEO_LABEL: Record<number, string> = {
  0: 'Manual',
  1: 'Al Grabar',
  2: 'Al Imprimir',
  3: 'Al Aplicar',
};

const METODO_APLICAR_LABEL: Record<number, string> = {
  0: 'Manual',
  1: 'Al Grabar',
  2: 'Al Imprimir',
};

const FECHA_PERMITIDA_LABEL: Record<number, string> = {
  0: 'Fecha Actual',
  1: 'Cualquier Fecha',
  2: 'Período Abierto',
};

const TIPO_NUMERACION_LABEL: Record<number, string> = {
  0: 'Manual',
  1: 'Automática',
};

const TIPO_IMPUESTO_LABEL: Record<number, string> = {
  0: 'Ninguno',
  1: 'ITBIS',
  2: 'ISC',
};

const DocumentosDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<DocumentoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const cargarDocumento = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    documentosApi.obtenerPorId(sucursalActiva, parseInt(id))
      .then((doc) => {
        setData(doc);
        if (doc) setPageTitleOverride(doc.codigo);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.errorMessage || 'Error al cargar el documento';
        setLoadingError(true);
      })
      .finally(() => setLoading(false));
  }, [id, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule('MDocumento');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  useEffect(() => {
    if (!id) return;
    cargarDocumento();
  }, [id, cargarDocumento]);

  const renderConfigSidebar = () => (
    <Card
      className="paces-card"
      size="small"
      title={<span style={{ fontSize: 16, fontWeight: 600 }}>Configuración</span>}
      style={{ marginBottom: 16 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Método Aplicar</Text>
          <br />
          <Tag color="blue">{METODO_APLICAR_LABEL[data.metodoAplicar ?? 0] || '-'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Recibe Pagos</Text>
          <br />
          <Tag color={data.recibePagos ? 'green' : 'default'}>{data.recibePagos ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Puede Reimprimir</Text>
          <br />
          <Tag color={data.puedeReimprimir ? 'blue' : 'default'}>{data.puedeReimprimir ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Documento Contable</Text>
          <br />
          <Tag color={data.documentoContable ? 'geekblue' : 'default'}>{data.documentoContable ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Incluir Estados Cuenta</Text>
          <br />
          <Tag color={data.incluirEstadoCuenta ? 'green' : 'default'}>{data.incluirEstadoCuenta ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Precios Incluyen Impuestos</Text>
          <br />
          <Tag color={data.preciosIncluyenImpuestos ? 'green' : 'default'}>{data.preciosIncluyenImpuestos ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Afecta Inventario</Text>
          <br />
          <Tag color={data.afectaInventario ? 'green' : 'default'}>{data.afectaInventario ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Requiere Asiento</Text>
          <br />
          <Tag color={data.requiereAsiento ? 'green' : 'default'}>{data.requiereAsiento ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Modifica Precio</Text>
          <br />
          <Tag color={data.modificaPrecio ? 'blue' : 'default'}>{data.modificaPrecio ? 'Sí' : 'No'}</Tag>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>Modifica Descripción</Text>
          <br />
          <Tag color={data.modificaDescripcion ? 'blue' : 'default'}>{data.modificaDescripcion ? 'Sí' : 'No'}</Tag>
        </div>
      </div>
    </Card>
  );

  const renderDatosGenerales = (columnCount: number) => (
    <Card
      className="paces-card"
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
          {data.tipo && <Tag color="geekblue">{data.tipo}</Tag>}
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

      <Descriptions bordered size="small" column={columnCount}
        styles={{ content: { background: 'transparent' } }}
      >
        <Descriptions.Item label="Tipo">
          {data.tipo || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Longitud Código">
          {data.longitudCodigo ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Documento Reverso">
          {data.documentoReverso || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Método Posteo">
          {METODO_POSTEO_LABEL[data.metodoPosteo ?? 0] || data.metodoPosteo?.toString() || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Fecha Permitida">
          {FECHA_PERMITIDA_LABEL[data.fechaPermitida ?? 0] || data.fechaPermitida?.toString() || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Tipo Impuesto">
          {TIPO_IMPUESTO_LABEL[data.tipoImpuesto ?? 0] || data.tipoImpuesto?.toString() || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Origen Cuenta">
          {data.origenCuenta ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="ID Externo">
          {data.idExterno || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Tipo Numeración">
          {TIPO_NUMERACION_LABEL[data.tipoNumeracion ?? 0] || '-'}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  return (
    <DetalleCatalogoLayout
      rutaVolver="/MDocumento"
      loading={loading}
      mensajeLoading="Cargando documento..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle del documento"
      onRecargar={cargarDocumento}
      dataDisponible={!!data}
      onEditar={() => navigate(`/MDocumento/${id}/editar`)}
    >
      {data && (
        isLarge ? (
          <Row gutter={16}>
            <Col xxl={18}>
              {renderDatosGenerales(2)}
            </Col>
            <Col xxl={6}>
              {renderConfigSidebar()}
            </Col>
          </Row>
        ) : (
          <div>
            {renderDatosGenerales(1)}
            <div style={{ marginTop: 24 }}>
              {renderConfigSidebar()}
            </div>
          </div>
        )
      )}
    </DetalleCatalogoLayout>
  );
};

export default DocumentosDetalle;
