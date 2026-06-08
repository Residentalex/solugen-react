import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Input, Table, Button, Typography, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { empleadoApi, type EmpleadoDTO } from '../../api/empleadoApi';

const { Text } = Typography;

export interface EmpleadoSeleccionado {
  codigo: string;
  nombre: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (empleado: EmpleadoSeleccionado) => void;
}

const BuscarEmpleadoModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  const sucursal = useAuthStore((s) => s.compania);
  const [data, setData] = useState<EmpleadoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const cargar = useCallback(async (busqueda: string) => {
    if (!sucursal) return;
    setLoading(true);
    try {
      const result = await empleadoApi.obtenerListado(sucursal, busqueda, 50, 0);
      setData(result.datos);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sucursal]);

  useEffect(() => {
    if (open) {
      setSearch('');
      cargar('');
    }
  }, [open, cargar]);

  const handleSearch = (val: string) => {
    setSearch(val);
    cargar(val);
  };

  return (
    <Modal
      title="Buscar Empleado"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      <Input.Search
        placeholder="Buscar por nombre o código..."
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
        prefix={<SearchOutlined />}
      />
      <Table
        columns={[
          { title: 'Código', dataIndex: 'codigo', width: 100 },
          { title: 'Nombre', dataIndex: 'nombre', ellipsis: true },
          { title: 'Cédula', dataIndex: 'cedula', width: 130 },
        ]}
        dataSource={data}
        rowKey="codigo"
        loading={loading}
        size="small"
        pagination={false}
        scroll={{ y: 350 }}
        locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay empleados" /></div> }}
        onRow={(record) => ({
          style: { cursor: 'pointer' },
          onClick: () => {
            onSelect({ codigo: record.codigo, nombre: record.nombre });
            onClose();
          },
        })}
      />
    </Modal>
  );
};

export default BuscarEmpleadoModal;
