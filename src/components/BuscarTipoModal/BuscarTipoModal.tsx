import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { toTitleCase } from '../../utils/formats';

interface BuscarTipoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tipo: { codigo: string; nombre: string }) => void;
  tipoDocumento: string;
  /** Filtro opcional por tipo de entidad (SUP/CLI) - disponible cuando el endpoint lo soporte */
  tipoEntidad?: string;
}

const BuscarTipoModal: React.FC<BuscarTipoModalProps> = ({ open, onClose, onSelect, tipoDocumento, tipoEntidad: _tipoEntidad }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<any>(`/Tipo/${sucursalActiva}/documento/${tipoDocumento}`);
      setTipos(data?.data || []);
    } catch {
      message.error('Error al cargar tipos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tipoDocumento]);

  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    {
      title: 'Nombre', dataIndex: 'nombre', key: 'nombre', ellipsis: true,
      render: (v: string) => toTitleCase(v),
    },
  ];

  return (
    <Modal title="Buscar Tipo" open={open} onCancel={onClose} footer={null} width={600} destroyOnClose>
      <Table
        dataSource={tipos}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

export default BuscarTipoModal;
