import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, message } from 'antd';
import { formatCurrency } from '../../utils/formats';
import type { OrdenCompraVistaDTO } from '../../types/entradaAlmacen';

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(val: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface BuscarOrdenCompraModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (orden: OrdenCompraVistaDTO) => void;
  fetchOrdenes: () => Promise<OrdenCompraVistaDTO[]>;
  title?: string;
}

const BuscarOrdenCompraModal: React.FC<BuscarOrdenCompraModalProps> = ({
  open,
  onClose,
  onSelect,
  fetchOrdenes,
  title = 'Buscar Orden de Compra',
}) => {
  const [ordenes, setOrdenes] = useState<OrdenCompraVistaDTO[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearchText('');
      setLoading(true);
      fetchOrdenes()
        .then((res) => setOrdenes(res || []))
        .catch((err: any) => {
          const msg = err?.response?.data?.errorMessage || 'Error al buscar Ã³rdenes de compra';
          message.error(msg);
          setOrdenes([]);
        })
        .finally(() => setLoading(false));
    }
  }, [open, fetchOrdenes]);

  const ordenesFiltradas = useMemo(() => {
    if (!searchText) return ordenes;
    const q = searchText.toLowerCase();
    return ordenes.filter(
      (o) =>
        (o.noDocumento || '').toLowerCase().includes(q) ||
        (o.suplidor?.nombre || '').toLowerCase().includes(q) ||
        String(o.total || '').includes(q)
    );
  }, [ordenes, searchText]);

  const columnas = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 150,
      render: (v: string) => <span className="paces-text-primary">{v}</span>,
    },
    {
      title: 'Fecha',
      dataIndex: 'fechaDocumento',
      key: 'fechaDocumento',
      width: 110,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Suplidor',
      key: 'suplidor',
      ellipsis: true,
      render: (_: any, record: OrdenCompraVistaDTO) => toTitleCase(record.suplidor?.nombre || ''),
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
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar por documento, suplidor o total..."
        allowClear
        onSearch={(val) => setSearchText(val || '')}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={ordenesFiltradas}
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

export default BuscarOrdenCompraModal;
