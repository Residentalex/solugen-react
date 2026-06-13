import React, { useEffect, useState, useMemo } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import { conceptosApi } from '../../api/conceptosApi';
import { toTitleCase } from '../../utils/formats';

interface BuscarConceptoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (concepto: ConceptoDTO) => void;
  fetchConceptos: () => Promise<ConceptoDTO[]>;
  title?: string;
  /** Si se proveen, se usa el endpoint con filtro por tipo en lugar de fetchConceptos */
  sucursal?: number;
  documento?: string;
  tipo?: string;
  tipoEntidad?: string;
}

const BuscarConceptoModal: React.FC<BuscarConceptoModalProps> = ({
  open,
  onClose,
  onSelect,
  fetchConceptos,
  title = 'Buscar Concepto',
  sucursal,
  documento,
  tipo,
  tipoEntidad,
}) => {
  const [conceptos, setConceptos] = useState<ConceptoDTO[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearchText('');

    if (sucursal != null && documento && tipo) {
      conceptosApi.obtenerConceptosPorDocumentoTipo(sucursal, documento, tipo, tipoEntidad)
        .then((res) => setConceptos(res || []))
        .catch(() => message.error('Error al cargar conceptos'));
    } else {
      fetchConceptos()
        .then((res) => setConceptos(res || []))
        .catch(() => message.error('Error al cargar conceptos'));
    }
  }, [open, fetchConceptos, sucursal, documento, tipo, tipoEntidad]);

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
    {
      title: 'Concepto',
      key: 'concepto',
      render: (_: any, record: any) => (
        <span>
          <strong>{record.codigo}</strong> - {toTitleCase(record.nombre || '')}
        </span>
      ),
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
        locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay conceptos" /></div> }}
      />
    </Modal>
  );
};

export default BuscarConceptoModal;
