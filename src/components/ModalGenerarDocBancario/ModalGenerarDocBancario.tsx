import React, { useState, useCallback, useEffect } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { Modal, Table, Progress, Button, Tag, Space, Typography, Checkbox } from 'antd';
import { FileAddOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import { solicitudPagoApi } from '../../api/solicitudPagoApi';
import type { TransaccionBancariaVistaDTO } from '../../types/transaccion';

const { Text } = Typography;

export interface ProgresoItem {
  id: number;
  documentoOriginal: string;
  entidad: string;
  total: number;
  status: 'pending' | 'creating' | 'done' | 'error';
  documentoGenerado?: string;
  idDocumentoGenerado?: number;
  seleccionado: boolean;
}

interface Props {
  visible: boolean;
  onCancel: () => void;
  items: TransaccionBancariaVistaDTO[];
  sucursalActiva: number;
  onRefresh: () => void;
  fechas: [any, any];
}

export const ModalGenerarDocBancario: React.FC<Props> = ({ visible, onCancel, items, sucursalActiva, onRefresh }) => {
  const [progresos, setProgresos] = useState<ProgresoItem[]>(() =>
    items.map((i) => ({
      id: i.id,
      documentoOriginal: i.documento || '',
      entidad: i.entidad || '',
      total: i.total || 0,
      status: 'pending',
      documentoGenerado: undefined,
      idDocumentoGenerado: undefined,
      seleccionado: false,
    }))
  );
  const [generando, setGenerando] = useState(false);

  // Sincronizar progresos cada vez que se abre el modal con nuevos items
  useEffect(() => {
    if (visible) {
      setProgresos(
        items.map((i) => ({
          id: i.id,
          documentoOriginal: i.documento || '',
          entidad: i.entidad || '',
          total: i.total || 0,
          status: 'pending',
          documentoGenerado: undefined,
          idDocumentoGenerado: undefined,
          seleccionado: false,
        }))
      );
    }
  }, [visible, items]);

  const handleGenerar = useCallback(async () => {
    setGenerando(true);
    for (let idx = 0; idx < progresos.length; idx++) {
      const item = progresos[idx];
      if (item.status === 'pending') {
        setProgresos((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], status: 'creating' };
          return next;
        });
        try {
          const resultado = await solicitudPagoApi.generarPago(sucursalActiva, item.id, false);
          setProgresos((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              status: 'done',
              documentoGenerado: resultado.documento,
              idDocumentoGenerado: resultado.id,
              seleccionado: true,
            };
            return next;
          });
        } catch (e: any) {
          setProgresos((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], status: 'error', documentoGenerado: `Error: ${e?.message || 'desconocido'}` };
            return next;
          });
        }
      }
    }
    setGenerando(false);
    onRefresh();
  }, [progresos, sucursalActiva, onRefresh]);

  const handleToggleSeleccionado = (id: number) => {
    setProgresos((prev) => prev.map((p) => (p.id === id ? { ...p, seleccionado: !p.seleccionado } : p)));
  };

  const seleccionados = progresos.filter((p) => p.seleccionado && p.status === 'done');

const columns: ColumnsType<ProgresoItem> = [
     { title: 'Doc. Original', dataIndex: 'documentoOriginal', width: 140, render: (t: string) => <Text strong ellipsis={{ tooltip: t }}>{t}</Text> },
     { title: 'Entidad', dataIndex: 'entidad', width: 200, render: (t: string) => t || '-' },
     { title: 'Total', dataIndex: 'total', width: 100, align: 'right', render: (t: number) => <Text strong>{t ? t.toFixed(2) : '-'}</Text> },
     {
       title: 'Estado',
       width: 220,
       render: (_: any, record: ProgresoItem) => {
         if (record.status === 'pending') return <Tag>Pendiente</Tag>;
         if (record.status === 'creating') return <Progress percent={50} size="small" status="active" format={() => 'Creando...'} />;
         if (record.status === 'done') return <Tag color="green">Generado: {record.documentoGenerado}</Tag>;
         return <Tag color="red">Error</Tag>;
       },
     },
     {
       title: 'Acción',
       width: 200,
       render: (_: any, record: ProgresoItem) => (
         <Space>
           {record.status === 'done' && (
             <Button icon={<EyeOutlined />} size="small" onClick={() => window.open(`/FTransBanco/${record.idDocumentoGenerado ?? record.id}`, '_blank')}>
               Ver
             </Button>
           )}
           <Checkbox checked={record.seleccionado} onChange={() => handleToggleSeleccionado(record.id)} disabled={record.status !== 'done'}>
             Imprimir
           </Checkbox>
         </Space>
       ),
     },
   ];

  return (
    <Modal
      open={visible}
      title="Generación de Documentos Bancarios"
      width={1200}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={generando}>Cerrar</Button>,
        <Button key="generate" type="primary" icon={<FileAddOutlined />} loading={generando} onClick={handleGenerar} disabled={progresos.every((p) => p.status !== 'pending')}>
          Generar seleccionados
        </Button>,
        <Button key="print" icon={<PrinterOutlined />} disabled={seleccionados.length === 0} onClick={() => console.log('Imprimir:', seleccionados.map((s) => s.id))}>
          Imprimir seleccionados ({seleccionados.length})
        </Button>,
      ]}
    >
      <Table rowKey="id" dataSource={progresos} columns={columns} pagination={false} size="small" scroll={{ y: 300 }} />
    </Modal>
  );
};
