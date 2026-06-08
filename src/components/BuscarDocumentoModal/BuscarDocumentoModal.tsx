import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Button, Space, message, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { formatDate, formatNumber, toTitleCase } from '../../utils/formats';

interface BuscarDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (docs: any[]) => void;
  tipoEntidad: 'SUP' | 'CLI';
  tipoDocumento?: string; // 'FRDE' | 'FFAC'
  montoTotal?: number;
}

const BuscarDocumentoModal: React.FC<BuscarDocumentoModalProps> = ({ open, onClose, onSelect, tipoEntidad, tipoDocumento, montoTotal }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [montosPorFila, setMontosPorFila] = useState<Record<string, number>>({});
  const [montoADistribuir, setMontoADistribuir] = useState(0);
  const [distribuido, setDistribuido] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const tipoDoc = tipoDocumento || (tipoEntidad === 'SUP' ? 'FRDE' : 'FFAC');
      const desde = dayjs().subtract(1, 'year').format('YYYYMMDD') + '000000';
      const hasta = dayjs().format('YYYYMMDD') + '235959';
      const { data } = await apiClient.get<any>(`/Transaccion/${sucursalActiva}/tipo/${tipoDoc}`, {
        params: { desde, hasta, TipoEntidad: tipoEntidad }
      });
      // Filtrar solo facturas con estado >= 1 (aplicadas)
      const facturas = (data?.data || []).filter((f: any) => (f.estado || 0) >= 1);
      setDocumentos(facturas);
    } catch {
      message.error('Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tipoEntidad, tipoDocumento]);

  useEffect(() => {
    if (open) { cargar(); setSelectedRowKeys([]); setMontoADistribuir(montoTotal || 0); setDistribuido(0); setMontosPorFila({}); }
  }, [open, cargar, montoTotal]);

  const handleAsignar = () => {
    if (montoADistribuir <= 0) return;
    let restante = montoADistribuir;
    const nuevosMontos: Record<string, number> = {};

    // Primero asignar a las filas seleccionadas
    const filas = selectedRowKeys.length > 0 ? selectedRowKeys : documentos.map(d => d.id);

    for (const id of filas) {
      const key = String(id);
      if (restante <= 0) { nuevosMontos[key] = 0; continue; }
      const doc = documentos.find(d => d.id === id);
      const pendiente = (doc?.total || 0) - (doc?.pagado || 0);
      if (pendiente <= 0) { nuevosMontos[key] = 0; continue; }
      const asignar = Math.min(restante, pendiente);
      nuevosMontos[key] = asignar;
      restante -= asignar;
    }

    setMontosPorFila(nuevosMontos);
  };

  const columnas = [
    { title: 'Documento', dataIndex: 'documento', key: 'documento', width: 140 },
    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 140, render: (v: string) => v || '-' },
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v: string) => formatDate(v) },
    {
      title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v),
    },
    {
      title: 'Saldo', key: 'saldo', width: 120, align: 'right' as const,
      render: (_: any, r: any) => formatNumber((r.total || 0) - (r.pagado || 0)),
    },
    {
      title: 'Monto a Asignar',
      key: 'montoAsignar',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: any) => {
        const pendiente = (record.total || 0) - (record.pagado || 0);
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={pendiente}
            step={0.01}
            precision={2}
            controls={false}
            value={montosPorFila[String(record.id)] ?? pendiente}
            onChange={(val) => {
              const nuevoValor = val || 0;
              setMontosPorFila(prev => ({ ...prev, [String(record.id)]: nuevoValor }));
            }}
          />
        );
      },
    },
  ];

  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const doc = documentos.find((d) => d.id === key);
      // Calcular pendiente segun tipoEntidad
      let pendiente = 0;
      if (tipoEntidad === 'SUP') {
        pendiente = (doc?.total || 0) - (doc?.pagado || 0);
      } else {
        pendiente = (doc?.total || 0) - (doc?.pagado || 0);
      }
      // Asignar el monto que se ingreso en la fila (o el pendiente si no se modifico)
      const montoFila = montosPorFila[String(key)] ?? pendiente;
      return {
        transaccionAsociadaID: doc?.id,
        documento: doc?.documento,
        nCF: doc?.ncf,
        montoOriginal: doc?.total || 0,
        pagado: doc?.pagado || 0,
        saldoPendiente: pendiente,
        monto: Math.min(montoFila, pendiente),
      };
    });
    onSelect(selected);
    onClose();
  };

  // Calcular total distribuido de filas seleccionadas
  const totalDistribuido = selectedRowKeys.reduce<number>((s, k) => s + (montosPorFila[String(k)] || 0), 0);

  return (
    <Modal
      title="Buscar Documentos Relacionados"
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <span>Monto a distribuir:</span>
            <InputNumber
              size="small"
              style={{ width: 120 }}
              min={0}
              step={0.01}
              precision={2}
              value={montoADistribuir}
              onChange={(val) => setMontoADistribuir(val || 0)}
            />
            <span style={{ marginLeft: 16, color: '#888' }}>
              Distribuido: {formatNumber(totalDistribuido)}
            </span>
          </Space>
          <Space>
            <Button onClick={handleAsignar}>Asignar</Button>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
              Agregar ({selectedRowKeys.length})
            </Button>
          </Space>
        </div>
      }
      width={800}
      destroyOnClose
    >
      <Table
        dataSource={documentos}
        columns={columnas}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        scroll={{ x: 750 }}
      />
    </Modal>
  );
};

export default BuscarDocumentoModal;
