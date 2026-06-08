import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Typography, Input, Space, Row, Col, Empty, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { formatDate, formatNumber, formatCurrency } from '../../utils/formats';

const { Text } = Typography;

interface DocumentosBalanceCardProps {
  debitos: any[];
  creditos: any[];
  loading?: boolean;
}

const DocumentosBalanceCard: React.FC<DocumentosBalanceCardProps> = ({ debitos, creditos }) => {
  const [search, setSearch] = useState<string>('');
  const { useToken } = theme;
  const { token } = useToken();

  const totalDebitos = useMemo(
    () => debitos.reduce((s: number, t: any) => s + (t.monto || 0), 0),
    [debitos]
  );
  const totalCreditos = useMemo(
    () => creditos.reduce((s: number, t: any) => s + (t.monto || 0), 0),
    [creditos]
  );
  const pendiente = totalDebitos - totalCreditos;

  const asociadasUnificadas = useMemo(() => {
    const todos = [
      ...debitos.map((d: any) => ({ ...d, _tipo: 'debito' })),
      ...creditos.map((c: any) => ({ ...c, _tipo: 'credito' })),
    ];

    if (search) {
      const q = search.toLowerCase();
      return todos.filter(
        (t: any) =>
          (t.documento || '').toLowerCase().includes(q) ||
          (t.nCF || '').toLowerCase().includes(q)
      );
    }

    return todos;
  }, [debitos, creditos, search]);

  const columns = [
    {
      title: 'Tipo',
      key: 'tipo',
      width: 80,
      fixed: 'left' as const,
      render: (_: any, record: any) =>
        record._tipo === 'debito' ? (
          <Tag color="blue" icon={<ArrowUpOutlined />}>
            DÉB
          </Tag>
        ) : (
          <Tag color="green" icon={<ArrowDownOutlined />}>
            CRÉ
          </Tag>
        ),
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 100,
      render: (v: string) => formatDate(v),
    },
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    {
      title: 'NCF',
      dataIndex: 'nCF',
      key: 'nCF',
      width: 140,
      render: (v: string) => v || '—',
    },
    {
      title: 'Monto Original',
      dataIndex: 'montoOriginal',
      key: 'montoOriginal',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Pagado',
      dataIndex: 'pagado',
      key: 'pagado',
      width: 110,
      align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Saldo Pendiente',
      dataIndex: 'saldoPendiente',
      key: 'saldoPendiente',
      width: 120,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? token.colorWarning : undefined }}>
          {formatNumber(v)}
        </Text>
      ),
    },
    {
      title: 'Retención',
      dataIndex: 'retencion',
      key: 'retencion',
      width: 110,
      align: 'right' as const,
      responsive: ['md' as const],
      render: (v: number) => formatNumber(v || 0),
    },
    {
      title: 'Monto',
      dataIndex: 'monto',
      key: 'monto',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Text
          strong
          style={{ color: record._tipo === 'debito' ? token.colorPrimary : token.colorSuccess }}
        >
          {formatNumber(_)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      {/* Banner de balance */}
      <Card
        size="small"
        style={{
          marginBottom: 12,
          background: token.colorBgLayout,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Débitos
            </Text>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                {formatCurrency(totalDebitos)}
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Créditos
            </Text>
            <div>
              <Text strong style={{ fontSize: 16, color: token.colorSuccess }}>
                {formatCurrency(totalCreditos)}
              </Text>
            </div>
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Pendiente
            </Text>
            <div>
              <Text
                strong
                style={{
                  fontSize: 16,
                  color:
                    pendiente === 0
                      ? token.colorSuccess
                      : pendiente > 0
                      ? token.colorWarning
                      : token.colorError,
                }}
              >
                {formatCurrency(Math.abs(pendiente))}
              </Text>
            </div>
          </Col>
        </Row>
        {pendiente === 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Tag color="success" icon={<CheckCircleOutlined />}>Cuadrado</Tag>
          </div>
        )}
      </Card>

      {/* Búsqueda por documento/NCF */}
      <div style={{ marginBottom: 8 }}>
        <Input.Search
          placeholder="Buscar documento..."
          allowClear
          style={{ maxWidth: 250 }}
          onSearch={(value) => setSearch(value)}
          onChange={(e) => {
            if (!e.target.value) setSearch('');
          }}
        />
      </div>

      {/* Tabla unificada */}
      <Table
        dataSource={asociadasUnificadas}
        columns={columns}
        rowKey={(r: any) => r.transaccionAsociadaID || r.id}
        size="small"
        pagination={false}
        scroll={{ x: 1000 }}
        onRow={(record: any) => ({
          style: record._tipo === 'credito' ? { background: token.colorSuccessBg } : undefined,
        })}
        locale={{
          emptyText: (
            <div
              style={{
                minHeight: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Empty description="No hay documentos de distribución" />
            </div>
          ),
        }}
      />
    </div>
  );
};

export default DocumentosBalanceCard;
