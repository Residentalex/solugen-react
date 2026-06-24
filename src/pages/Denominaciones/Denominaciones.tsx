import React, { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Table, Button, Tag, Typography, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { denominacionApi } from '../../api/denominacionApi';
import type { DenominacionDTO } from '../../types/denominacion';
import { toTitleCase, formatNumber } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import DenominacionFormulario from './DenominacionFormulario';

const { Text } = Typography;

const Denominaciones: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const updateToolbar = useUIStore((s) => s.updateToolbar);
  const resetToolbar = useUIStore((s) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p) => p.codigo === 'FDenominacion');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;

  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [formularioVisible, setFormularioVisible] = useState(false);
  const [editItem, setEditItem] = useState<DenominacionDTO | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['denominaciones', sucursalActiva],
    queryFn: async () => {
      if (sucursalActiva === undefined) return [];
      return denominacionApi.listarTodo(sucursalActiva);
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  const datos = data ?? [];

  const datosFiltrados = useMemo(() => {
    if (!searchText) return datos;
    const q = searchText.toLowerCase();
    return datos.filter((d) => {
      const tipoTexto = d.tipo === 'B' ? 'billete' : 'moneda';
      return (
        d.descripcion.toLowerCase().includes(q) ||
        d.valor.toString().includes(q) ||
        tipoTexto.includes(q)
      );
    });
  }, [datos, searchText]);

  useEffect(() => {
    setActiveModule('FDenominacion');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const abrirNuevo = () => {
    setEditItem(null);
    setFormularioVisible(true);
  };

  const abrirEditar = (item: DenominacionDTO) => {
    if (!puedeEditar) return;
    setEditItem(item);
    setFormularioVisible(true);
  };

  const handleGuardar = () => {
    refetch();
  };

  const columns: ColumnsType<DenominacionDTO> = [
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 280,
      fixed: 'left',
      render: (val: string, record: DenominacionDTO) =>
        puedeEditar ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontWeight: 500, height: 'auto' }}
            onClick={() => abrirEditar(record)}
          >
            {toTitleCase(val)}
          </Button>
        ) : (
          <Text>{toTitleCase(val)}</Text>
        ),
    },
    {
      title: 'Valor',
      dataIndex: 'valor',
      key: 'valor',
      width: 150,
      align: 'right',
      render: (val: number) => (
        <Text strong className="paces-text-total">{formatNumber(val)}</Text>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 110,
      align: 'center',
      render: (tipo: string) => (
        <Tag color={tipo === 'B' ? 'blue' : 'green'}>
          {tipo === 'B' ? 'Billete' : 'Moneda'}
        </Tag>
      ),
    },
    {
      title: 'Activo',
      dataIndex: 'activo',
      key: 'activo',
      width: 100,
      align: 'center',
      render: (activo: boolean) => (
        <Tag color={activo ? 'green' : 'red'}>
          {activo ? 'Sí' : 'No'}
        </Tag>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'orden',
      key: 'orden',
      width: 80,
      align: 'center',
      render: (val: number) => <Text>{val}</Text>,
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar denominaciones"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => refetch()}>
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
          placeholder="Buscar por descripción..."
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); setPage(1); }}
          onNuevo={abrirNuevo}
          onReload={() => refetch()}
        />
        <Table<DenominacionDTO>
          columns={columns}
          dataSource={datosFiltrados}
          rowKey={(record) => record.id ?? 0}
          loading={isLoading}
          scroll={{ x: 800 }}
          size="middle"
          rowClassName="paces-row-hover"
          className="paces-border-top paces-list-table"
          pagination={{
            current: page,
            pageSize,
            total: datosFiltrados.length,
            onChange: (p) => setPage(p),
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          locale={{
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {searchText
                  ? <Empty description="Sin resultados para la búsqueda" />
                  : <Empty description="No hay denominaciones registradas" />
                }
              </div>
            ),
          }}
        />
      </Card>

      <DenominacionFormulario
        visible={formularioVisible}
        editItem={editItem}
        onClose={() => setFormularioVisible(false)}
        onSaved={handleGuardar}
      />
    </>
  );
};

export default Denominaciones;
