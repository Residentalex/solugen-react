import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, message, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { CuentaContableResumenDTO } from '../../types/contabilidad';

interface BuscarCuentaContableModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cuenta: CuentaContableResumenDTO) => void;
  sucursal: number;
  /** Modo servidor: si se pasa, no carga auxiliares al abrir y la busqueda se delega en esta funcion. */
  buscar?: (filtro: string) => Promise<CuentaContableResumenDTO[]>;
  /** Modo seleccion multiple: habilita checkboxes y el boton Aceptar; el clic en fila alterna la seleccion sin cerrar. */
  multiple?: boolean;
  /** Se invoca en modo multiple al presionar Aceptar con la lista de cuentas seleccionadas. */
  onSeleccionarMultiples?: (cuentas: CuentaContableResumenDTO[]) => void;
}

const BuscarCuentaContableModal: React.FC<BuscarCuentaContableModalProps> = ({
  open,
  onClose,
  onSelect,
  sucursal,
  buscar,
  multiple = false,
  onSeleccionarMultiples,
}) => {
  const [cuentas, setCuentas] = useState<CuentaContableResumenDTO[]>([]);
  const [searchText, setSearchText] = useState('');
  const [seleccionadas, setSeleccionadas] = useState<CuentaContableResumenDTO[]>([]);
  const searchRef = useRef<any>(null);

  // Ref para estabilizar `buscar` en el useEffect de limpieza: evita que
  // el efecto se re-ejecute en cada render del padre cuando `buscar` es inline.
  const buscarRef = useRef(buscar);
  useEffect(() => {
    buscarRef.current = buscar;
  }, [buscar]);

  useEffect(() => {
    if (!open) return;
    setSearchText('');
    setSeleccionadas([]);
    if (buscarRef.current) {
      setCuentas([]);
      return;
    }
    cuentaContableApi
      .obtenerAuxiliares(sucursal)
      .then((res) => setCuentas(res || []))
      .catch((err) =>
        message.error(err?.response?.data?.errorMessage || 'Error al cargar cuentas contables')
      );
  }, [open, sucursal]);

  const cuentasFiltradas = useMemo(() => {
    if (!searchText) return cuentas;
    const q = searchText.toLowerCase();
    return cuentas.filter(
      (c) =>
        (c.noCuenta || '').toLowerCase().includes(q) ||
        (c.nombre || '').toLowerCase().includes(q)
    );
  }, [cuentas, searchText]);

  const handleBuscarServidor = async (val: string) => {
    const trimmed = (val || '').trim();
    setSearchText(trimmed);
    if (!trimmed) {
      setCuentas([]);
      return;
    }
    try {
      if (!buscar) return;
      const result = await buscar(trimmed);
      setCuentas(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al buscar cuentas contables');
      setCuentas([]);
    }
  };

  const toggleSeleccion = (cuenta: CuentaContableResumenDTO) => {
    setSeleccionadas((prev) => {
      const existe = prev.some((c) => c.noCuenta === cuenta.noCuenta);
      return existe ? prev.filter((c) => c.noCuenta !== cuenta.noCuenta) : [...prev, cuenta];
    });
  };

  const handleAceptar = () => {
    if (seleccionadas.length === 0) return;
    onSeleccionarMultiples?.(seleccionadas);
    onClose();
  };

  const columnas = [
    {
      title: 'No. Cuenta',
      dataIndex: 'noCuenta',
      key: 'noCuenta',
      width: 140,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
    },
  ];

  const dataSource = buscar ? cuentas : cuentasFiltradas;

  const rowSelection = multiple
    ? {
        selectedRowKeys: seleccionadas.map((c) => c.noCuenta),
        onChange: (_keys: React.Key[], rows: CuentaContableResumenDTO[]) => setSeleccionadas(rows),
      }
    : undefined;

  return (
    <Modal
      title="Buscar Cuenta Contable"
      open={open}
      onCancel={onClose}
      footer={
        multiple
          ? () => (
              <div style={{ textAlign: 'right' }}>
                <Button
                  type="primary"
                  disabled={seleccionadas.length === 0}
                  onClick={handleAceptar}
                >
                  Aceptar
                </Button>
              </div>
            )
          : null
      }
      width={700}
      destroyOnClose
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar por No. Cuenta o Nombre..."
        allowClear
        onSearch={(val) => {
          if (buscar) {
            handleBuscarServidor(val);
          } else {
            setSearchText(val || '');
          }
        }}
        onChange={(e) => {
          if (buscar) {
            if (!e.target.value) {
              setSearchText('');
              setCuentas([]);
            }
          } else {
            setSearchText(e.target.value || '');
          }
        }}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={dataSource}
        columns={columnas}
        rowKey="noCuenta"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
        rowSelection={rowSelection}
        onRow={(record) => ({
          onClick: () => {
            if (multiple) {
              toggleSeleccion(record);
            } else {
              onSelect(record);
              onClose();
            }
          },
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                description={
                  buscar
                    ? (searchText ? 'Sin resultados' : 'Escriba para buscar cuentas')
                    : 'No hay cuentas contables'
                }
              />
            </div>
          ),
        }}
      />
    </Modal>
  );
};

export default BuscarCuentaContableModal;
