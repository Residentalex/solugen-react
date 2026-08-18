import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Empty, Input, Modal, Table, message } from 'antd';

// ===== Tipos =====
export interface ModalBuscarSuplidorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (record: any) => void;
  buscar: (filtro?: string) => Promise<any[]>;
  mostrarRnc?: boolean;      // default true
  autoFocus?: boolean;       // default false
  placeholder?: string;      // default 'Buscar por nombre o código...'
  destroyOnClose?: boolean;  // default false -> usa destroyOnHidden
}

/**
 * Modal compartido de búsqueda de suplidor.
 *
 * La función de búsqueda la inyecta cada padre (`buscar`), por lo que este
 * componente NO conoce APIs ni endpoints. Al abrir siempre ejecuta `buscar()`
 * y al seleccionar una fila devuelve el registro crudo vía `onSelect` (el
 * padre hace el mapeo a su DTO).
 */
const ModalBuscarSuplidor: React.FC<ModalBuscarSuplidorProps> = ({
  open,
  onClose,
  onSelect,
  buscar,
  mostrarRnc = true,
  autoFocus = false,
  placeholder = 'Buscar por nombre o código...',
  destroyOnClose = false,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<any>(null);

  // Ref para estabilizar la función inyectada por el padre: evita que `cargar`
  // cambie de identidad cuando el padre se re-renderiza con el modal abierto
  // (no memoiza sus funciones de búsqueda), lo que provocaría recargas espurias.
  const buscarRef = useRef(buscar);
  useEffect(() => {
    buscarRef.current = buscar;
  }, [buscar]);

  // Focus del Input.Search al abrir (mismo delay 100ms de las copias originales).
  useEffect(() => {
    if (open && autoFocus) {
      const timer = setTimeout(() => {
        searchRef.current?.focus?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, autoFocus]);

  const cargar = useCallback(async (filtro?: string) => {
    setLoading(true);
    try {
      const res = await buscarRef.current(filtro);
      setData(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setData([]);
      message.error(err?.response?.data?.errorMessage || 'Error al cargar suplidores');
    } finally {
      setLoading(false);
    }
  }, []);

  // Siempre cargar al abrir.
  useEffect(() => {
    if (open) cargar();
  }, [open, cargar]);

  const columnas = [
    { title: 'Código', dataIndex: 'codigo', key: 'codigo', width: 100 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    ...(mostrarRnc
      ? [{ title: 'RNC', dataIndex: 'identificacion', key: 'identificacion', width: 140 }]
      : []),
  ];

  return (
    <Modal
      title="Buscar Suplidor"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      {...(destroyOnClose ? { destroyOnClose: true } : { destroyOnHidden: true })}
    >
      <Input.Search
        ref={searchRef}
        placeholder={placeholder}
        allowClear
        onSearch={(val) => { cargar(val); }}
        style={{ marginBottom: 12 }}
      />
      <Table
        dataSource={data}
        columns={columnas}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        onRow={(record: any) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="Sin resultados" />
            </div>
          ),
        }}
      />
    </Modal>
  );
};

export default ModalBuscarSuplidor;
