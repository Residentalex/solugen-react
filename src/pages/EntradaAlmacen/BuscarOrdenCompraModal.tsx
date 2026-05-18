import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Table, Input, message } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { Sucursal } from '../../types/auth';
import { ordenCompraApi } from '../../api/ordenCompraApi';
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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(n);
}

interface BuscarOrdenCompraModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (orden: OrdenCompraVistaDTO) => void;
  suplidorCodigo?: string;
}

const BuscarOrdenCompraModal: React.FC<BuscarOrdenCompraModalProps> = ({ open, onClose, onSelect, suplidorCodigo }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const [resultados, setResultados] = useState<OrdenCompraVistaDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const formatDateParam = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}${m}${dd}${hh}${mm}${ss}`;
  };

  const buscar = useCallback(async () => {
    setLoading(true);
    try {
      const hoy = new Date();
      const hace60 = new Date();
      hace60.setDate(hace60.getDate() - 60);

      const params: { suplidor?: string; cantidad?: number; desde?: string; hasta?: string } = {
        cantidad: 50,
        desde: formatDateParam(hace60),
        hasta: formatDateParam(hoy),
      };
      if (suplidorCodigo?.trim()) params.suplidor = suplidorCodigo.trim();

      const res = await ordenCompraApi.obtenerResumido(Sucursal.Compra, sucursalActiva, params);
      setResultados(res || []);
    } catch (err: any) {
      const msg = err?.response?.data?.errorMessage || 'Error al buscar órdenes de compra';
      message.error(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, suplidorCodigo]);

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
      title="Buscar Orden de Compra"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Input.Search
        placeholder="Buscar..."
        allowClear
        onSearch={() => buscar()}
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
