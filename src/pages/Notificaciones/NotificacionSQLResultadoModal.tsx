import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Tag, message, Spin, Empty, Typography } from 'antd';
import { notificacionesApi } from '../../api/notificacionesApi';

const { Text } = Typography;

interface NotificacionSQLResultadoModalProps {
  visible: boolean;
  configId: number;
  configNombre: string;
  onClose: () => void;
}

const NotificacionSQLResultadoModal: React.FC<NotificacionSQLResultadoModalProps> = ({
  visible, configId, configNombre, onClose,
}) => {
  const [filas, setFilas] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarResultado = useCallback(async () => {
    if (!visible || !configId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await notificacionesApi.probarSQLConfig(configId);
      setFilas(result?.filas || []);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al ejecutar la consulta SQL';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [visible, configId]);

  useEffect(() => {
    cargarResultado();
  }, [cargarResultado]);

  const columns = filas.length > 0
    ? Object.keys(filas[0]).map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        width: 160,
        render: (val: any) => {
          if (val === null || val === undefined) return <Text type="secondary">-</Text>;
          if (typeof val === 'boolean') return <Tag color={val ? 'green' : 'default'}>{val ? 'Sí' : 'No'}</Tag>;
          return String(val);
        },
      }))
    : [];

  return (
    <Modal
      title={`Resultado: ${configNombre}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }} className="paces-text-secondary">Ejecutando consulta...</div>
        </div>
      )}

      {!loading && error && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Empty description={error} />
        </div>
      )}

      {!loading && !error && filas.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Empty description="La consulta no devolvió resultados" />
        </div>
      )}

      {!loading && !error && filas.length > 0 && (
        <>
          <div style={{ marginBottom: 12 }}>
            <Text strong>{filas.length}</Text>
            <Text type="secondary"> fila(s) obtenida(s)</Text>
          </div>
          <Table
            columns={columns}
            dataSource={filas.map((_, i) => ({ ..._, _rowIndex: i }))}
            rowKey="_rowIndex"
            size="small"
            scroll={{ x: columns.length * 160 }}
            pagination={{
              showSizeChanger: true,
              showTotal: (t, range) => `${range[0]}-${range[1]} de ${t}`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
          />
        </>
      )}
    </Modal>
  );
};

export default NotificacionSQLResultadoModal;
