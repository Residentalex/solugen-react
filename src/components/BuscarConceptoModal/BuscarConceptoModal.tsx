import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import { toTitleCase } from '../../utils/formats';

interface BuscarConceptoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (concepto: ConceptoDTO) => void;
  fetchConceptos: () => Promise<ConceptoDTO[]>;
  title?: string;
}

const BuscarConceptoModal: React.FC<BuscarConceptoModalProps> = ({
  open,
  onClose,
  onSelect,
  fetchConceptos,
  title = 'Buscar Concepto',
}) => {
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (open) {
      setSearchText('');
      fetchConceptos()
        .then((res) => setConceptos(res || []))
        .catch(() => message.error('Error al cargar conceptos'));
    }
  }, [open, fetchConceptos]);

  const conceptosFiltrados = useMemo(() => {
    if (!searchText) return conceptos;
    const q = searchText.toLowerCase();
    return conceptos.filter(
      (c) =>
        (c.codigo || '').toLowerCase().includes(q) ||
        (c.nombre || '').toLowerCase().includes(q)
    );
  }, [conceptos, searchText]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 120 },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (v: string) => toTitleCase(v),
    },
  ];

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input.Search
        placeholder="Buscar por código o nombre..."
        allowClear
        onSearch={(val) => setSearchText(val || '')}
        onChange={(e) => {
          if (!e.target.value) setSearchText('');
        }}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={conceptosFiltrados}
        columns={columnas}
        rowKey="codigo"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
        locale={{ emptyText: <Empty description="No hay conceptos" /> }}
      />
    </Modal>
  );
};

export default BuscarConceptoModal;
