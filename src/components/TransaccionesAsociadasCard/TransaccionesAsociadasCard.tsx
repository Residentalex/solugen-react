import React, { useMemo } from 'react';
import { Card, Table, Typography, Empty, Space, Skeleton } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatDate } from '../../utils/formats';

const { Text } = Typography;

export interface DocumentoAsociadoItem {
  id: number;
  transaccionAsociadaID?: number;
  documento?: string;
  tipoDocumento?: string;
  noDocumento?: string;
  nCF?: string;
  montoOriginal?: number;
  pagado?: number;
  saldoPendiente?: number;
  monto?: number;
  fecha?: string;
  estado?: number;
  perdida?: number;
  descuento?: number;
  esDocumentoInventario?: boolean;
}

export interface TransaccionesAsociadasCardProps {
  documentos: DocumentoAsociadoItem[];
  readOnly?: boolean;
  loading?: boolean;
  scrollX?: number;
  emptyText?: string;
  onDocumentoClick?: (doc: DocumentoAsociadoItem) => void;
  rutas?: Record<string, string>;
  ocultarPerdida?: boolean;
}

const RUTAS_DEFAULT: Record<string, string> = {
  ND:   '/FNDSUP',
  NC:   '/FNCSUP',
  TRN:  '/FTRN',
  RDE:  '/FRDE',
  ENP:  '/FENP',
  DVC:  '/FDVC',
  SAP:  '/FSAP',
  DEV:  '/FDEV',
  PV:   '/FPV',
};

const TransaccionesAsociadasCard: React.FC<TransaccionesAsociadasCardProps> = ({
  documentos = [],
  readOnly = false,
  loading = false,
  scrollX,
  emptyText,
  onDocumentoClick,
  rutas,
  ocultarPerdida = false,
}) => {
  const navigate = useNavigate();

  const docsNormalizados = useMemo(() =>
    documentos.map((d: any) => ({ ...d, nCF: d.nCF || d.ncf || '', perdida: d.perdida || 0, descuento: d.descuento || 0, esDocumentoInventario: d.esDocumentoInventario ?? false })),
    [documentos]
  );

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => v ? formatDate(v) : '-' },
    {
      title: 'Documento',
      key: 'documento',
      width: 140,
      render: (_: any, record: DocumentoAsociadoItem) => {
        const label = record.documento || `${record.tipoDocumento || '?'}-${record.noDocumento || '?'}`;
        const tieneNavegacion = !readOnly || onDocumentoClick || rutas;
        const content = tieneNavegacion
          ? <a className="paces-doc-link" style={{ cursor: 'pointer' }}>{label}</a>
          : <Text>{label}</Text>;

        if (record.esDocumentoInventario) {
          return (
            <div style={{ borderLeft: '3px solid #fa8c16', paddingLeft: 8 }}>
              {content}
            </div>
          );
        }
        return content;
      },
    },
    {
      title: 'NCF',
      dataIndex: 'nCF',
      key: 'nCF',
      width: 130,
      render: (v: string) => v || '-',
    },
    {
      title: 'Monto Original',
      dataIndex: 'montoOriginal',
      key: 'montoOriginal',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatNumber(v ?? 0),
    },
    {
      title: 'Pagado',
      dataIndex: 'pagado',
      key: 'pagado',
      width: 120,
      align: 'right' as const,
      render: (v: number) => formatNumber(v ?? 0),
    },
    {
      title: 'Descuento',
      dataIndex: 'descuento',
      key: 'descuento',
      width: 120,
      align: 'right' as const,
      render: (v: number) => formatNumber(v ?? 0),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatNumber(v ?? 0)}</Text>,
    },
    ...(!ocultarPerdida ? [{
      title: 'Pérdida',
      dataIndex: 'perdida',
      key: 'perdida',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text>{formatNumber(v ?? 0)}</Text>,
    }] : []),
  ];

  const renderContent = () => {
    if (loading) {
      return <Skeleton active paragraph={{ rows: 3 }} />;
    }

    if (documentos.length === 0) {
      return (
        <Empty
          image={<FileTextOutlined style={{ fontSize: 32, color: '#bfbfbf' }} />}
          imageStyle={{ height: 40 }}
          description={
            <span className="paces-text-secondary" style={{ fontSize: 13 }}>
              {emptyText || 'Sin documentos asociados'}
            </span>
          }
        />
      );
    }

    return (
      <Table
        dataSource={docsNormalizados}
        rowKey={(r: DocumentoAsociadoItem) => r.transaccionAsociadaID ?? r.id}
        size="small"
        pagination={false}
        scroll={{ x: scrollX || 900 }}
        summary={() => {
          const totales = docsNormalizados.reduce(
            (acc, d) => {
              acc.montoOriginal += d.montoOriginal || 0;
              acc.pagado += d.pagado || 0;
              acc.descuento += d.descuento || 0;
              acc.monto += d.monto || 0;
              acc.perdida += d.perdida || 0;
              return acc;
            },
            { montoOriginal: 0, pagado: 0, descuento: 0, monto: 0, perdida: 0 }
          );

          return (
            <Table.Summary.Row>
              <Table.Summary.Cell align="left">
                <Text strong>Totales</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell />
              <Table.Summary.Cell />
              <Table.Summary.Cell align="right">
                <Text strong>{formatNumber(totales.montoOriginal)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right">
                <Text strong>{formatNumber(totales.pagado)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right">
                <Text strong>{formatNumber(totales.descuento)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right">
                <Text strong>{formatNumber(totales.monto)}</Text>
              </Table.Summary.Cell>
              {!ocultarPerdida && (
                <Table.Summary.Cell align="right">
                  <Text strong>{formatNumber(totales.perdida)}</Text>
                </Table.Summary.Cell>
              )}
            </Table.Summary.Row>
          );
        }}
        onRow={(!readOnly || onDocumentoClick || rutas) ? (record: DocumentoAsociadoItem) => ({
          onClick: () => {
            if (onDocumentoClick) {
              onDocumentoClick(record);
            } else {
              const rutasFinal = { ...RUTAS_DEFAULT, ...rutas };
              const ruta = rutasFinal[record.tipoDocumento || ''] || '/FTRN';
              navigate(`${ruta}/${record.transaccionAsociadaID ?? record.id}`);
            }
          },
          style: { cursor: 'pointer' },
          className: 'paces-row-hover',
        }) : undefined}
        columns={columns}
      />
    );
  };

  return (
    <Card
      className="paces-card"
      size="small"
      title={
        <Space size={8}>
          <FileTextOutlined style={{ color: '#556ee6' }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Documentos Asociados</span>
        </Space>
      }
    >
      {renderContent()}
    </Card>
  );
};

export default TransaccionesAsociadasCard;
