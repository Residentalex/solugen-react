import React from 'react';
import { Card, Table, Tag, Typography, Empty, Divider, Space, Skeleton } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils/formats';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import { ESTADO_DOCUMENTO_MAP } from '../../utils/estadoDocumento';

const { Text } = Typography;

export interface DocumentoPago {
  id: number;
  tipoDocumento?: string;
  noDocumento?: string;
  documento?: string;
  fechaDocumento?: string;
  monto?: number;
  montoTotal?: number;
  estado?: number;
  [key: string]: any;
}

export interface DistribucionPagosCardProps {
  documentos: DocumentoPago[];
  documentosRelacionados?: DocumentoPago[];
  totalDocumento: number;
  monedaSimbolo?: string;
  loading?: boolean;
  onDocumentoClick?: (documento: DocumentoPago) => void;
  title?: string;
}

const DistribucionPagosCard: React.FC<DistribucionPagosCardProps> = ({
  documentos = [],
  documentosRelacionados = [],
  totalDocumento,
  monedaSimbolo,
  loading = false,
  onDocumentoClick,
  title = 'Distribuci\u00f3n de Pagos',
}) => {
  // Transformar los datos del backend a la interfaz DocumentoPago esperada por el componente.
  // Soporta tanto el DTO serializado (camelCase) como columnas SQL crudas.
  const toDocumentoPago = (doc: any): DocumentoPago => ({
    id: doc.id ?? doc.ID ?? doc.TRANSACID,
    tipoDocumento: doc.tipoDocumento ?? doc.tipo_doc,
    noDocumento: doc.noDocumento ?? doc.DOCUMENTO,
    documento: doc.documento ?? doc.DOCUMENTO,
    fechaDocumento: doc.fechaDocumento ?? doc.fecha,
    monto: doc.monto ?? doc.MONTO,
    montoTotal: doc.montoTotal ?? doc.monto ?? doc.MONTO,
    estado: doc.estado,
  });

  const documentosTransformados = documentos.map(toDocumentoPago);
  const relacionadosTransformados = documentosRelacionados.map(toDocumentoPago);

  const monedaSimboloFinal = monedaSimbolo || getMonedaSucursalActiva().simbolo;
  const distribuido = [...documentosTransformados, ...relacionadosTransformados].reduce((acc, doc) => {
    const monto = doc.monto ?? doc.montoTotal ?? 0;
    return acc + monto;
  }, 0);
  const pendiente = totalDocumento - distribuido;
  const estaPagado = pendiente <= 0;
  const hayExceso = pendiente < 0;

  const columns = [
    {
      title: 'Documento',
      key: 'documento',
      width: 130,
      render: (_: any, record: DocumentoPago) => {
        const label = record.documento || `${record.tipoDocumento || '?'}-${record.noDocumento || '?'}`;
        return <span className="paces-doc-link">{label}</span>;
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fecha',
      width: 100,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Monto',
      key: 'monto',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: DocumentoPago) => {
        const monto = record.monto ?? record.montoTotal ?? 0;
        return <Text strong>{formatCurrency(monto)}</Text>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 100,
      align: 'center' as const,
      render: (v: number) => {
        const info = ESTADO_DOCUMENTO_MAP[v] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <Skeleton active paragraph={{ rows: 3 }} />
          <Divider style={{ margin: '12px 0' }} />
          <Skeleton.Input active style={{ width: '100%' }} />
          <div style={{ marginTop: 4 }}>
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <Skeleton.Input active style={{ width: '100%' }} />
        </>
      );
    }

    if (!documentosTransformados.length && !relacionadosTransformados.length) {
      return (
        <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty
            image={<DollarOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
            imageStyle={{ height: 40 }}
            description={
              <span>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>Sin pagos asociados</div>
                <div className="paces-text-secondary" style={{ fontSize: 12 }}>No hay pagos registrados</div>
              </span>
            }
          />
        </div>
      );
    }

    // Sin pagos pero con documentos relacionados: la lista se muestra debajo
    if (!documentosTransformados.length) {
      return null;
    }

    return (
      <Table
        dataSource={documentosTransformados}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ x: 480 }}
        onRow={(record) => ({
          onClick: () => onDocumentoClick?.(record),
          style: { cursor: onDocumentoClick ? 'pointer' : 'default' },
          className: 'paces-row-hover',
        })}
        columns={columns}
      />
    );
  };

  return (
    <Card className="paces-card" size="small" style={{ marginTop: 16 }}
      title={
        <Space>
          <DollarOutlined style={{ color: '#556ee6' }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        </Space>
      }
    >
      {renderContent()}

      {/* Documentos relacionados (DOCASOCB): lista simple, documento + monto */}
      {relacionadosTransformados.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Text className="paces-text-secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            Documentos relacionados
          </Text>
          {relacionadosTransformados.map((doc) => (
            <div
              key={doc.id}
              onClick={() => onDocumentoClick?.(doc)}
              className="paces-row-hover"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 0',
                cursor: onDocumentoClick ? 'pointer' : 'default',
              }}
            >
              <span className="paces-doc-link" style={{ fontSize: 13 }}>
                {doc.documento || `${doc.tipoDocumento || '?'}-${doc.noDocumento || '?'}`}
              </span>
              <Text strong style={{ fontSize: 13 }}>{formatCurrency(doc.monto ?? doc.montoTotal ?? 0)}</Text>
            </div>
          ))}
        </>
      )}

      {/* Footer de totales - se muestra siempre */}
      <Divider style={{ margin: '12px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text className="paces-text-secondary" style={{ fontSize: 13 }}>Total documento:</Text>
        <Text style={{ fontSize: 13 }}>{formatCurrency(totalDocumento)}</Text>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text className="paces-text-secondary" style={{ fontSize: 13 }}>Distribuido:</Text>
        <Text style={{ fontSize: 13, color: '#34c38f' }}>{formatCurrency(distribuido)}</Text>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text className="paces-text-secondary" style={{ fontSize: 13 }}>Pendiente:</Text>
        <Space>
          <Tag color={hayExceso ? 'error' : (estaPagado ? 'success' : 'warning')}>
            {hayExceso ? 'Exceso' : (estaPagado ? 'Pagado' : 'Pendiente')}
          </Tag>
          <Text strong style={{ fontSize: 14, color: hayExceso ? '#ff4d4f' : (estaPagado ? '#34c38f' : '#faad14') }}>
            {formatCurrency(Math.max(pendiente, 0))}
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default DistribucionPagosCard;