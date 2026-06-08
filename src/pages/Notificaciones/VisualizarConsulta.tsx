import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Alert, Typography, message, Tag, Select, Empty } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { notificacionesApi } from '../../api/notificacionesApi';

const VisualizarConsulta: React.FC = () => {
  const { configID } = useParams<{ configID: string }>();
  const navigate = useNavigate();
  const [filas, setFilas] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const cargarDatos = async () => {
    if (!configID) return;
    setLoading(true);
    setError('');
    try {
      const result = await notificacionesApi.ejecutarSQLConfig(parseInt(configID));
      setFilas(result.filas);
      setTotal(result.total);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al ejecutar consulta';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [configID]);

  const columnas: ColumnsType<Record<string, any>> = filas.length > 0
    ? Object.keys(filas[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (val: any) => val !== null && val !== undefined ? String(val) : '-',
      }))
    : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Volver</Button>
        <Typography.Title level={4} style={{ margin: 0, flex: 1 }}>
          Resultado de consulta SQL
        </Typography.Title>
        <Tag>{total} filas</Tag>
        <Select
          style={{ width: 65 }}
          value={pageSize}
          onChange={(v) => setPageSize(v)}
          options={[
            { value: 25, label: '25' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={cargarDatos} loading={loading}>Recargar</Button>
      </div>

      {error && (
        <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} closable />
      )}

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<Record<string, any>>
          columns={columnas}
          dataSource={filas}
          rowKey={(_, i) => String(i)}
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="middle"
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay datos" /></div> }}
          pagination={{
            pageSize,
            showSizeChanger: false,
            showTotal: (t, range) => `${range[0]}-${range[1]} de ${t}`,
          }}
        />
      </Card>
    </div>
  );
};

export default VisualizarConsulta;
