import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Table, Input, Tag, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { ordenCompraApi } from '../../api/ordenCompraApi';
import type { OrdenCompraVistaDTO } from '../../types/entradaAlmacen';

const ESTADO_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  2: { label: 'Autorizado', color: 'processing' },
  3: { label: 'Anulado', color: 'error' },
  4: { label: 'Pagado', color: 'cyan' },
  5: { label: 'Abierto', color: 'warning' },
  6: { label: 'Cerrado', color: 'default' },
};

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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

interface BuscarOrdenCompraModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (orden: OrdenCompraVistaDTO) => void;
}

const BuscarOrdenCompraModal: React.FC<BuscarOrdenCompraModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [resultados, setResultados] = useState<OrdenCompraVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const buscar = useCallback(async (documento?: string) => {
    setLoading(true);
    try {
      const params: { documento?: string; cantidad?: number } = { cantidad: 50 };
      if (documento?.trim()) params.documento = documento.trim();

      const res = await ordenCompraApi.filtrar(sucursalActiva, sucursalActiva, params);
      setResultados(res || []);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al buscar órdenes de compra';
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    if (open) buscar();
  }, [open, buscar]);

  const columnas = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 150,
      render: (v: string) => <span style={{ color: '#556ee6', fontWeight: 500 }}>{v}</span>,
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
      title: 'Concepto',
      key: 'concepto',
      width: 150,
      ellipsis: true,
      render: (_: any, record: OrdenCompraVistaDTO) => record.concepto?.nombre ? toTitleCase(record.concepto.nombre) : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right' as const,
      render: (v: number) => formatCurrency(v || 0),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 110,
      render: (v: number) => {
        const info = ESTADO_MAP[v] || { label: 'Desconocido', color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
  ];

  return (
    <Modal
      title="Buscar Orden de Compra"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Input.Search
        placeholder="Buscar por documento..."
        allowClear
        onSearch={(val) => buscar(val)}
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

export default BuscarOrdenCompraModal;
