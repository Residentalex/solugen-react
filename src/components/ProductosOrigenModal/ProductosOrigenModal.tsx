import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Input, Table, Button, Space } from 'antd';

interface ProductosOrigenModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  sourceLabel?: string;
  sourceProducts: any[];
  comodines: any[];
  addedCodes: string[];
  sourceColumns: any[];
  comodinColumns: any[];
  onAddSourceProduct: (producto: any) => void;
  onAddComodin: (producto: any) => void;
}

const ProductosOrigenModal: React.FC<ProductosOrigenModalProps> = ({
  open,
  onClose,
  title = 'Agregar producto',
  sourceLabel = 'Origen',
  sourceProducts,
  comodines,
  addedCodes,
  sourceColumns,
  comodinColumns,
  onAddSourceProduct,
  onAddComodin,
}) => {
  const [sourceSearch, setSourceSearch] = useState('');
  const [comodinSearch, setComodinSearch] = useState('');
  const [selectedSource, setSelectedSource] = useState<any[]>([]);
  const [selectedComodin, setSelectedComodin] = useState<any[]>([]);
  const sourceSearchRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        sourceSearchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSourceSearch('');
      setComodinSearch('');
      setSelectedSource([]);
      setSelectedComodin([]);
    }
  }, [open]);

  const filteredSource = sourceProducts
    .filter((p: any) => !addedCodes.includes(p.codigo))
    .filter((p: any) => {
      if (!sourceSearch) return true;
      const q = sourceSearch.toLowerCase();
      return (p.codigo || '').toLowerCase().includes(q) || (p.articulo || p.nombre || '').toLowerCase().includes(q);
    });

  const filteredComodines = comodines
    .filter((p: any) => !addedCodes.includes(p.codigo || p.idExterno))
    .filter((p: any) => {
      if (!comodinSearch) return true;
      const q = comodinSearch.toLowerCase();
      return (p.codigo || p.idExterno || '').toString().toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q);
    });

  return (
    <Modal title={title} open={open} onCancel={onClose} footer={null} width={700} destroyOnHidden>
      <Tabs
        type="card"
        items={[
          {
            key: 'source',
            label: `${sourceLabel} (${filteredSource.length})`,
            children: (
              <>
                <Input.Search
                  ref={sourceSearchRef}
                  placeholder="Buscar producto..."
                  allowClear
                  style={{ marginBottom: 16 }}
                  onSearch={setSourceSearch}
                  onChange={(e) => { if (!e.target.value) setSourceSearch(''); }}
                />
                <Table
                  dataSource={filteredSource}
                  columns={sourceColumns}
                  rowKey={(r: any) => r.id || r.codigo}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: selectedSource.map((r: any) => r.id || r.codigo),
                    onChange: (_: any, rows: any[]) => setSelectedSource(rows),
                  }}
                  onRow={(record: any) => ({
                    onDoubleClick: () => { onAddSourceProduct(record); },
                    style: { cursor: 'pointer' },
                  })}
                />
                {selectedSource.length > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button type="primary" size="small" onClick={() => {
                      selectedSource.forEach(onAddSourceProduct);
                      setSelectedSource([]);
                      onClose();
                    }}>
                      Agregar seleccionados ({selectedSource.length})
                    </Button>
                  </div>
                )}
              </>
            ),
          },
          {
            key: 'comodines',
            label: `Comodines (${filteredComodines.length})`,
            children: (
              <>
                <Input.Search
                  placeholder="Buscar comodÃ­n..."
                  allowClear
                  style={{ marginBottom: 16 }}
                  onSearch={setComodinSearch}
                  onChange={(e) => { if (!e.target.value) setComodinSearch(''); }}
                />
                <Table
                  dataSource={filteredComodines}
                  columns={comodinColumns}
                  rowKey={(r: any) => r.codigo || r.idExterno}
                  size="small"
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: selectedComodin.map((r: any) => r.codigo || r.idExterno),
                    onChange: (_: any, rows: any[]) => setSelectedComodin(rows),
                  }}
                  onRow={(record: any) => ({
                    onDoubleClick: () => { onAddComodin(record); },
                    style: { cursor: 'pointer' },
                  })}
                />
                {selectedComodin.length > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button type="primary" size="small" onClick={() => {
                      selectedComodin.forEach(onAddComodin);
                      setSelectedComodin([]);
                      onClose();
                    }}>
                      Agregar seleccionados ({selectedComodin.length})
                    </Button>
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default ProductosOrigenModal;
