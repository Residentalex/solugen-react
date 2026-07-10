import React, { useMemo } from 'react';
import { Card, Table, Typography, Empty, Space, Skeleton } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formats';

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
}

export interface TransaccionesAsociadasCardProps {
  documentos: DocumentoAsociadoItem[];
  readOnly?: boolean;
  loading?: boolean;
  scrollX?: number;
  emptyText?: string;
  onDocumentoClick?: (doc: DocumentoAsociadoItem) => void;
  rutas?: Record<string, string>;
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
}) => {
  const navigate = useNavigate();

  const docsNormalizados = useMemo(() =>
    documentos.map((d: any) => ({ ...d, nCF: d.nCF || d.ncf || '', perdida: d.perdida || 0 })),
    [documentos]
  );

  const columns = [
    {
      title: 'Documento',
      key: 'documento',
      width: 140,
      render: (_: any, record: DocumentoAsociadoItem) => {
        const label = record.documento || `${record.tipoDocumento || '?'}-${record.noDocumento || '?'}`;
        const tieneNavegacion = !readOnly || onDocumentoClick || rutas;
        if (tieneNavegacion) return <a className="paces-doc-link" style={{ cursor: 'pointer' }}>{label}</a>;
        return <Text>{label}</Text>;
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
      render: (v: number) => formatCurrency(v ?? 0),
    },
    {
      title: 'Pagado',
      dataIndex: 'pagado',
      key: 'pagado',
      width: 120,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v ?? 0),
    },
    {
      title: 'Saldo',
      dataIndex: 'saldoPendiente',
      key: 'saldoPendiente',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatCurrency(v ?? 0)}</Text>,
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text strong>{formatCurrency(v ?? 0)}</Text>,
    },
    {
      title: 'Pérdida',
      dataIndex: 'perdida',
      key: 'perdida',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text>{formatCurrency(v ?? 0)}</Text>,
    },
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
        scroll={{ x: scrollX || 780 }}
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
