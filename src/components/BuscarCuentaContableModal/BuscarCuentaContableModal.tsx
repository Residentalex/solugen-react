import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { cuentaContableApi } from '../../api/cuentaContableApi';
import type { CuentaContableDTO } from '../../types/contabilidad';

interface BuscarCuentaContableModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cuenta: CuentaContableDTO) => void;
  sucursal: number;
}

const BuscarCuentaContableModal: React.FC<BuscarCuentaContableModalProps> = ({
  open,
  onClose,
  onSelect,
  sucursal,
}) => {
  const [cuentas, setCuentas] = useState<CuentaContableDTO[]>([]);
  const [searchText, setSearchText] = useState('');
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
    if (!open) return;
    setSearchText('');
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

  return (
    <Modal
      title="Buscar Cuenta Contable"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnHidden
    >
      <Input.Search
        ref={searchRef}
        placeholder="Buscar por No. Cuenta o Nombre..."
        allowClear
        onSearch={(val) => setSearchText(val || '')}
        onChange={(e) => setSearchText(e.target.value || '')}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={cuentasFiltradas}
        columns={columnas}
        rowKey="noCuenta"
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ y: 400 }}
        onRow={(record) => ({
          onClick: () => {
            onSelect(record);
            onClose();
          },
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="No hay cuentas contables" />
            </div>
          ),
        }}
      />
    </Modal>
  );
};

export default BuscarCuentaContableModal;
