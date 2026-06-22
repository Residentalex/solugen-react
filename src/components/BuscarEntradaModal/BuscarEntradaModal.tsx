import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Modal, Table, Input, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, toTitleCase, formatDate, extraerMensajeError } from '../../utils/formats';

interface BuscarEntradaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (entrada: any) => void;
  entidad?: string;
  onBuscar: (sucursal: number, params?: Record<string, any>) => Promise<any[]>;
}

const BuscarEntradaModal: React.FC<BuscarEntradaModalProps> = ({ open, onClose, onSelect, entidad, onBuscar }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  function fmtFecha(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${day}${hh}${mm}${ss}`;
  }

  const buscar = useCallback(async (texto?: string) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { cantidad: 50 };
      if (texto) {
        params.texto = texto;
      } else {
        params.desde = fmtFecha(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
        params.hasta = fmtFecha(new Date());
      }
      if (entidad) params.entidad = entidad;
      const res = await onBuscar(sucursalActiva, params);
      setResultados(res || []);
    } catch (err: any) {
      const msg = extraerMensajeError(err, 'Error al buscar entradas de almacén');
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, entidad, onBuscar]);

  useEffect(() => {
    if (open) { setSearchText(''); buscar(); }
  }, [open, buscar]);

  const columnas = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      key: 'documento',
      width: 150,
      render: (v: string) => <span className="paces-text-primary">{v}</span>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Suplidor',
      dataIndex: 'entidad',
      key: 'entidad',
      ellipsis: true,
      render: (v: string) => toTitleCase(v || ''),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
  ];

  return (
    <Modal
      title="Buscar Entrada de Almacén"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar..."
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onSearch={(value) => buscar(value || undefined)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={resultados}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
        onRow={(record) => ({
          onClick: () => { onSelect(record); onClose(); },
          style: { cursor: 'pointer' },
        })}
      />
    </Modal>
  );
};

export default BuscarEntradaModal;
