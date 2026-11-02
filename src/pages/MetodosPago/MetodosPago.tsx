import React, { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Typography, Empty, Alert, Space, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { puntoVentaApi } from '../../api/puntoVentaApi';
import type { MetodoPagoDTO } from '../../types/facturacion';
import { DeleteOutlined } from '@ant-design/icons';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import MetodoPagoFormulario from './MetodoPagoFormulario';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Text } = Typography;

const MetodosPago: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'MMetodosPago');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [editItem, setEditItem] = useState<MetodoPagoDTO | null>(null);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);
  const eliminandoRef = useRef(false);
  const bloqueado = eliminandoId !== null;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['metodosPago', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const { items, total } = await puntoVentaApi.filtrarMetodosPago(sucursalActiva, params);
      return { datos: items, total };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MMetodosPago');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleExportarExcel = async () => {
    if (eliminandoRef.current) return;
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = Array.isArray(data?.datos) ? data.datos : [];
    const exportCols = columns.filter((col: any) => col.title && col.title !== '' && col.title !== 'Acciones');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = dataSource.map((item: any) =>
      exportCols.map((col: any) => {
        if (col.dataIndex) {
          const val = item[col.dataIndex];
          return val != null ? String(val) : '';
        }
        return '';
      })
    );
    exportToExcel({
      fileName: `MetodosPago_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'MetodosPago',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirNuevo = () => {
    if (bloqueado || eliminandoRef.current) return;
    setEditItem(null);
    setFormularioVisible(true);
  };

  const abrirEditar = (item: MetodoPagoDTO) => {
    if (!puedeEditar) return;
    if (bloqueado || eliminandoRef.current) return;
    setEditItem(item);
    setFormularioVisible(true);
  };

  const handleGuardar = () => {
    refetch();
  };

  const handleReload = () => {
    if (bloqueado || eliminandoRef.current) return;
    refetch();
  };

  const handleEliminar = async (id: number) => {
    if (eliminandoRef.current || bloqueado) return;
    eliminandoRef.current = true;
    setEliminandoId(id);
    try {
      await puntoVentaApi.eliminarMetodoPago(sucursalActiva, id);
      message.success('Método de pago eliminado correctamente');
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar método de pago');
    } finally {
      eliminandoRef.current = false;
      setEliminandoId(null);
    }
  };

  const columns: ColumnsType<MetodoPagoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      render: (val: string, record: MetodoPagoDTO) =>
        puedeEditar ? (
          <Button
            type="link"
            size="small"
            className="paces-doc-link"
            style={{ padding: 0, fontWeight: 500, height: 'auto', fontFamily: 'monospace' }}
            disabled={bloqueado}
            onClick={() => abrirEditar(record)}
          >
            {val || '-'}
          </Button>
        ) : (
          <Text strong className="paces-doc-link" style={{ fontFamily: 'monospace' }}>
            {val || '-'}
          </Text>
        ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (val: string) => <Text strong>{toTitleCase(val ?? '')}</Text>,
    },
    {
      title: 'Requiere Documento',
      dataIndex: 'requiereDocumento',
      key: 'requiereDocumento',
      width: 160,
      render: (val: boolean) => (
        <Tag color={val ? 'blue' : 'default'}>{val ? 'Sí' : 'No'}</Tag>
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'codigoDocumento',
      key: 'codigoDocumento',
      width: 120,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    {
      title: '',
      key: 'acciones',
      width: 60,
      align: 'center',
      fixed: 'right',
      render: (_: unknown, record: MetodoPagoDTO) =>
        puedeEditar ? (
          <Space size={0}>
            <Popconfirm
              title="Eliminar método de pago"
              description={`¿Estás seguro de eliminar ${record.nombre}?`}
              onConfirm={() => handleEliminar(record.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
              disabled={bloqueado}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={eliminandoId === record.id}
                disabled={bloqueado && eliminandoId !== record.id}
              />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="No fue posible cargar los métodos de pago"
          description={(error as any)?.response?.data?.errorMessage || error?.message}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleReload} disabled={bloqueado}>
              Reintentar
            </Button>
          }
        />
      )}
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={handleReload}
          onExportarExcel={handleExportarExcel}
          deshabilitado={bloqueado}
        />

      <Table<MetodoPagoDTO>
        columns={columns}
        dataSource={Array.isArray(data?.datos) ? data.datos : []}
        rowKey="id"
        loading={isLoading}
        scroll={{ x: 600 }}
        size="middle"
        rowClassName="paces-row-hover"
        className="paces-border-top paces-list-table"
        pagination={{
          current: page,
          pageSize,
          total: data?.total || 0,
          onChange: (p) => setPage(p),
          showSizeChanger: false,
          showTotal: (t) => `${t} registros`,
        }}
        locale={{
          emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {searchText
              ? <Empty description="Sin resultados para la búsqueda" />
              : <Empty description="No hay métodos de pago configurados" />
            }
          </div>
        }}
      />
    </Card>

    <MetodoPagoFormulario
      visible={formularioVisible}
      editItem={editItem}
      onClose={() => setFormularioVisible(false)}
      onSaved={handleGuardar}
    />
    </>
  );
};

export default MetodosPago;
