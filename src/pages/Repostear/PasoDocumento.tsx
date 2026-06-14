import React, { useState } from 'react';
import { Input, Button, Card, Descriptions, Typography, Space, message, Spin, Tag } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { transaccionApi } from '../../api/transaccionApi';
import { useUIStore } from '../../stores/uiStore';
import type { TransaccionDTO } from '../../types/transaccion';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import type { Sucursal } from '../../types/auth';

const { Text } = Typography;

interface Props {
  sucursal: Sucursal;
  documento: string;
  transaccion: TransaccionDTO | null;
  onDocumentoChange: (doc: string) => void;
  onTransaccionEncontrada: (t: TransaccionDTO | null) => void;
}

const ESTADO_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

const PasoDocumento: React.FC<Props> = ({
  sucursal,
  documento,
  transaccion,
  onDocumentoChange,
  onTransaccionEncontrada,
}) => {
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState(documento);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const primaryColor = useUIStore((s) => s.primaryColor);

  const handleBuscar = async () => {
    if (!busqueda.trim()) {
      message.warning('Ingrese un número de documento');
      return;
    }

    setLoading(true);
    onTransaccionEncontrada(null);

    try {
      const partes = busqueda.trim().split('-');
      if (partes.length < 2) {
        message.error('Formato inválido. Use TIPO-00000001 (ej: ENP-00000001)');
        return;
      }

      const tipoDoc = partes[0];
      const noDocumento = partes.slice(1).join('-');

      const transacciones = await transaccionApi.filtrar(sucursal, {
        documento: noDocumento,
        tipoEntidad: tipoDoc,
      });

      if (transacciones && transacciones.length > 0) {
        const t = await transaccionApi.obtenerPorId(sucursal, transacciones[0].id);
        onTransaccionEncontrada(t);
        onDocumentoChange(busqueda.trim());
        message.success('Documento encontrado');
      } else {
        message.error('No se encontró el documento especificado');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al buscar el documento');
    } finally {
      setLoading(false);
    }
  };

  const estadoInfo = transaccion
    ? ESTADO_LABELS[transaccion.estado] || { label: 'Desconocido', color: 'default' }
    : null;

  return (
    <div>
      <Text
        style={{
          display: 'block',
          marginBottom: 24,
          fontSize: 16,
          color: primaryColor,
          fontWeight: 500,
        }}
      >
        Busque el documento que desea repostear
      </Text>

      <Space.Compact style={{ width: '100%', maxWidth: 560, marginBottom: 24 }}>
        <Input.Search
          placeholder="Ejemplo: ENP-00000001"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onSearch={handleBuscar}
          size="large"
          enterButton={
            <Button type="primary" icon={<SearchOutlined />} size="large" loading={loading}>
              Buscar
            </Button>
          }
          style={{
            boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: 8,
          }}
        />
      </Space.Compact>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      )}

      {transaccion && !loading && (
        <Card
          className="repostear-doc-result"
          style={{ marginTop: 16 }}
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              <Text strong style={{ fontSize: 16 }}>
                Documento Encontrado
              </Text>
              <Tag
                color={estadoInfo!.color}
                style={{ fontSize: 13, padding: '2px 10px', marginLeft: 4 }}
              >
                {estadoInfo!.label}
              </Tag>
            </Space>
          }
        >
          <Descriptions
            column={2}
            size="small"
            bordered
            className="repostear-descriptions"
          >
            <Descriptions.Item label="Documento">
              {transaccion.documento?.codigo || transaccion.noDocumento}
            </Descriptions.Item>
            <Descriptions.Item label="No. Documento">
              {transaccion.noDocumento}
            </Descriptions.Item>
            <Descriptions.Item label="Entidad">
              {transaccion.nombreEntidad || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Concepto">
              {transaccion.concepto?.nombre || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Total">
              {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
              }).format(transaccion.total)}
            </Descriptions.Item>
            <Descriptions.Item label="Débitos">
              {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
              }).format(transaccion.debitos)}
            </Descriptions.Item>
            <Descriptions.Item label="Créditos">
              {new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
              }).format(transaccion.creditos)}
            </Descriptions.Item>
            <Descriptions.Item label="Referencia">
              {transaccion.referencia || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
};

export default PasoDocumento;