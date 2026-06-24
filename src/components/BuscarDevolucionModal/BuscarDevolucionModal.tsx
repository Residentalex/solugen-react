import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Button, Space, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { formatDate, formatNumber } from '../../utils/formats';

interface BuscarDevolucionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (docs: any[]) => void;
  codEntidad: string;
}

const BuscarDevolucionModal: React.FC<BuscarDevolucionModalProps> = ({ open, onClose, onSelect, codEntidad }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [devoluciones, setDevoluciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const cargar = useCallback(async () => {
    if (!codEntidad) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<any>(`/Transaccion/${sucursalActiva}/pendienteInv/${codEntidad}`);
      const items = (data?.data || []).map((d: any) => ({
        id: d.id,
        documento: d.documento?.codigo ? `${d.documento.codigo}-${d.noDocumento}` : d.noDocumento,
        fecha: d.fechaDocumento,
        total: d.total,
      }));
      setDevoluciones(items);
    } catch {
      message.error('Error al cargar devoluciones');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, codEntidad]);

  useEffect(() => {
    if (open) { cargar(); setSelectedRowKeys([]); }
  }, [open, cargar]);

  const columnas = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    {
      title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
  ];

  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const dev = devoluciones.find((d) => d.id === key);
      return {
        transaccionAsociadaID: dev?.id,
        documento: dev?.documento,
        fecha: dev?.fecha,
        montoOriginal: dev?.total || 0,
        monto: 0,
        esDocumentoInventario: true,
      };
    });
    onSelect(selected);
    onClose();
  };

  return (
    <Modal
      title="Buscar Devoluciones"
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
            Agregar ({selectedRowKeys.length})
          </Button>
        </Space>
      }
      width={700}
      destroyOnHidden
    >
      <Table
        dataSource={devoluciones}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />
    </Modal>
  );
};

export default BuscarDevolucionModal;
