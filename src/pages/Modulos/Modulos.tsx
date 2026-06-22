import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Alert, message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { toTitleCase } from '../../utils/formats';
import type { ModuloDTO } from '../../types/auth';

const Modulos: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('MODULOS');

  const [data, setData] = useState<ModuloDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<ModuloDTO | null>(null);
  const [pageSize, setPageSize] = useState(25);

  const cargar = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const res = await moduloApi.obtenerTodo(sucursalActiva);
      setData(Array.isArray(res) ? res : []);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule(screenCode);
    setPageTitleOverride('Módulos');
    cargar();
    return () => { resetToolbar(); setPageTitleOverride(''); };
  }, [setActiveModule, setPageTitleOverride, resetToolbar, cargar, screenCode]);

  const handleSearch = (val: string) => {
    setSearchText(val);
    setSelectedRow(null);
  };

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSize(value);
  }, []);

  const filtered = searchText.trim()
    ? data.filter((r) =>
        r.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
        String(r.id).includes(searchText))
    : data;

  const handleDelete = (record: ModuloDTO) => {
    Modal.confirm({
      title: 'Eliminar módulo',
      icon: <ExclamationCircleOutlined />,
      content: `¿Está seguro de eliminar el módulo "${record.nombre}"?`,
      okText: 'Eliminar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await moduloApi.eliminar(sucursalActiva, record.id);
          message.success('Módulo eliminado');
          cargar();
        } catch (err: any) {
          message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
        }
      },
    });
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (v: string, record: ModuloDTO) => (
        <a onClick={() => navigate(`/Modulos/${record.id}`)}>
          {toTitleCase(v || '')}
        </a>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 100,
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 100,
      render: (_: any, record: ModuloDTO) => (
        <Button type="link" danger onClick={(e) => { e.stopPropagation(); handleDelete(record); }}>
          Eliminar
        </Button>
      ),
    },
  ];

  return (
    <>
      {loadingError && <Alert message="Error al cargar módulos" type="error" showIcon style={{ marginBottom: 16 }} />}
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          placeholder="Buscar módulo..."
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          onNuevo={() => navigate('/Modulos/nuevo')}
          onReload={cargar}
        />
        <Table
          className="paces-border-top paces-list-table"
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowClassName={(record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover'}
          onRow={(record) => ({
            onClick: () => setSelectedRow(record),
            onDoubleClick: () => navigate(`/Modulos/${record.id}`),
          })}
          pagination={{ showTotal: (t) => `${t} registros` }}
          locale={{ emptyText: 'No hay módulos registrados' }}
        />
      </Card>
    </>
  );
};

export default Modulos;
