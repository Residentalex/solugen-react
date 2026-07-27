import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Modal, Input, Table, Empty, Spin, message } from 'antd';
import { cuentaBancariaApi, type CuentaBancariaDTO } from '../../api/cuentaBancariaApi';
import { toTitleCase } from '../../utils/formats';

interface BuscarCuentaBancariaModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (cuenta: CuentaBancariaDTO) => void;
  sucursal: number;
}

const BuscarCuentaBancariaModal: React.FC<BuscarCuentaBancariaModalProps> = ({
  open, onClose, onSelect, sucursal,
}) => {
  const [cuentas, setCuentas] = useState<CuentaBancariaDTO[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    cuentaBancariaApi.obtenerListado(sucursal)
      .then((res) => setCuentas(res || []))
      .catch(() => message.error('Error al cargar cuentas bancarias'))
      .finally(() => setLoading(false));
  }, [open, sucursal]);

  const cuentasFiltradas = useMemo(() => {
    if (!searchText) return cuentas;
    const q = searchText.toLowerCase();
    return cuentas.filter(
      (c) =>
        (c.noCuenta || '').toLowerCase().includes(q) ||
        (c.banco || '').toLowerCase().includes(q) ||
        (c.nombre || '').toLowerCase().includes(q)
    );
  }, [cuentas, searchText]);

  const columnas = [
    {
      title: 'Banco',
      key: 'banco',
      width: 200,
      render: (_: any, r: CuentaBancariaDTO) => (
        <span>
          <strong>{toTitleCase(r.banco || '')}</strong>
        </span>
      ),
    },
    {
      title: 'No. Cuenta',
      dataIndex: 'noCuenta',
      key: 'noCuenta',
      width: 200,
    },
  ];

  return (
    <Modal
      title="Buscar Cuenta Bancaria"
      open={open}
      onCancel={onClose}
      footer={null}
      width={750}
      destroyOnHidden
    >
      <Spin spinning={loading} tip="Cargando cuentas bancarias...">
        <Input.Search
          ref={searchRef}
          placeholder="Buscar por banco, número de cuenta o nombre..."
          allowClear
          onSearch={(val) => setSearchText(val || '')}
          onChange={(e) => {
            if (!e.target.value) setSearchText('');
          }}
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={cuentasFiltradas}
          columns={columnas}
          rowKey="noCuenta"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
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
                <Empty description="No hay cuentas bancarias" />
              </div>
            ),
          }}
          scroll={{ x: 650 }}
        />
      </Spin>
    </Modal>
  );
};

export default BuscarCuentaBancariaModal;
