import React from 'react';
import { Modal, Button, Space, Table, Alert, Typography, Tag, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ValidacionPagoDTO, ValidacionPagosDTO } from '../../types/transaccion';
import { formatCurrency } from '../../utils/formats';

const { Text } = Typography;

interface ModalValidarPagosProps {
  open: boolean;
  loading?: boolean;
  /** null mientras el modal esta cerrado o todavia no se consulto el historial. */
  validacion: ValidacionPagosDTO | null;
  documento: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLoading?: boolean;
}

const columnas: ColumnsType<ValidacionPagoDTO> = [
  {
    title: 'Documento',
    key: 'documento',
    width: 150,
    render: (_, r) => (
      <Text strong style={{ fontSize: 13 }}>
        {r.tipoDocumentoAsociado}-{r.noDocumentoAsociado}
      </Text>
    ),
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    width: 110,
    align: 'right',
    render: (v: number) => formatCurrency(v),
  },
  {
    title: 'Pagado (historial)',
    dataIndex: 'pagadoHistorico',
    key: 'pagadoHistorico',
    width: 140,
    align: 'right',
    render: (v: number, r) => (
      <div>
        <Text className="paces-text-secondary">{formatCurrency(v)}</Text>
        {r.pagadoMismoTipo > 0 && r.esSobrepago && (
          <div style={{ fontSize: 11, color: '#ff4d4f' }}>
            {formatCurrency(r.pagadoMismoTipo)} de documentos del mismo tipo
          </div>
        )}
      </div>
    ),
  },
  {
    title: 'Saldo',
    dataIndex: 'saldo',
    key: 'saldo',
    width: 110,
    align: 'right',
    render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
  },
  {
    title: 'A aplicar',
    dataIndex: 'montoAplicar',
    key: 'montoAplicar',
    width: 110,
    align: 'right',
    render: (v: number) => <Text strong>{formatCurrency(v)}</Text>,
  },
  {
    title: 'Saldo resultante',
    dataIndex: 'saldoResultante',
    key: 'saldoResultante',
    width: 130,
    align: 'right',
    render: (v: number, r) => (
      <Text strong style={{ color: r.esSobrepago ? '#ff4d4f' : '#34c38f' }}>
        {formatCurrency(v)}
      </Text>
    ),
  },
  {
    title: 'Estado',
    key: 'estado',
    width: 120,
    align: 'center',
    render: (_, r) =>
      r.esSobrepago ? (
        <Tag color="error">Pago duplicado</Tag>
      ) : r.saldoResultante < 0 ? (
        <Tag color="warning">Revisa</Tag>
      ) : (
        <Tag color="success">Correcto</Tag>
      ),
  },
];

const ModalValidarPagos: React.FC<ModalValidarPagosProps> = ({
  open,
  loading = false,
  validacion,
  documento,
  onClose,
  onConfirm,
  confirmLoading = false,
}) => {
  const hayHistorial = (validacion?.documentosAsociados?.length ?? 0) > 0;
  const duplicados = validacion?.pagosPendientesDuplicados ?? [];

  const sobrepagos = (validacion?.documentosAsociados ?? []).filter((d) => d.esSobrepago);

  return (
    <Modal
      title={
        <Space>
          <HistoryOutlined style={{ color: '#556ee6' }} />
          <span>Validar historial de pagos</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={880}
      destroyOnHidden
      closable={!confirmLoading}
      mask={{ closable: false }}
      footer={
        <Space>
          <Button disabled={confirmLoading} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="primary"
            danger={validacion?.tieneErrores}
            disabled={validacion?.tieneErrores}
            loading={confirmLoading}
            onClick={onConfirm}
          >
            Aplicar
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Text strong>{documento}</Text>
      </div>

      {loading && (
        <Skeleton active paragraph={{ rows: 4 }} />
      )}

      {!loading && validacion && validacion.tieneErrores && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 12 }}
          message="No se puede aplicar este documento"
          description={
            <div style={{ whiteSpace: 'pre-line', fontSize: 13 }}>
              {validacion.mensaje}
            </div>
          }
        />
      )}

      {!loading && validacion && !validacion.tieneErrores && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          style={{ marginBottom: 12 }}
          message="El historial de pagos no muestra conflictos"
          description="Los montos a aplicar estan cubiertos por el saldo pendiente de cada documento."
        />
      )}

      {!loading && hayHistorial && (
        <Table
          dataSource={validacion!.documentosAsociados}
          columns={columnas}
          rowKey={(r) => r.transaccionAsociada}
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
          rowClassName={(r) => (r.esSobrepago ? 'paces-row-selected' : '')}
        />
      )}

      {!loading && validacion && !hayHistorial && !validacion.tieneErrores && (
        <Text className="paces-text-secondary">
          Este documento no imputa montos a documentos relacionados.
        </Text>
      )}

      {!loading && duplicados.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
            Otros documentos de pago sin aplicar
          </Text>
          <div style={{ fontSize: 13 }}>
            {duplicados.map((d, i) => (
              <div key={`${d.transaccionPago}-${i}`} style={{ padding: '2px 0' }}>
                <Tag color="warning">{d.tipoDocumentoAsociado}-{d.noDocumentoAsociado}</Tag>
                <Text>
                  {d.tipoDocumentoPago}-{d.noDocumentoPago} por {formatCurrency(d.monto)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && validacion?.tieneErrores && sobrepagos.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <Text className="paces-text-secondary" style={{ fontSize: 12 }}>
            Sobrepago total detectado:{' '}
            <Text strong style={{ color: '#ff4d4f' }}>
              {formatCurrency(validacion.montoSobrepago)}
            </Text>
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default ModalValidarPagos;