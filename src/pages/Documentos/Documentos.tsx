import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  message,
  Empty,
  Typography,
  Alert,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { documentosApi } from '../../api/documentosApi';
import type { DocumentoDTO } from '../../types/documento';
import { toTitleCase } from '../../utils/formats';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';

const { Text } = Typography;

const Documentos: React.FC = () => {
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.securitySucursal);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MDocumento');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeEliminar = pantallaActual?.acciones.includes('ELIMINAR') ?? false;

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['documentos', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva === undefined) return { datos: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      const resultado = await documentosApi.filtrar(sucursalActiva, params);
      return { datos: resultado.datos || [], total: resultado.total ?? 0 };
    },
    enabled: sucursalActiva !== undefined,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule('MDocumento');
    updateToolbar({});
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearchText(value);
  };

  const handleEliminar = async (doc: DocumentoDTO) => {
    try {
      if (sucursalActiva === undefined) return;
      await documentosApi.eliminar(sucursalActiva, doc.id);
      message.success('Documento eliminado correctamente');
      refetch();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al eliminar documento');
    }
  };

  const columns: ColumnsType<DocumentoDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      fixed: 'left',
      width: 120,
      render: (val: string, record: DocumentoDTO) => (
        <Text
          style={{ fontFamily: 'monospace', cursor: 'pointer', color: '#556ee6' }}
          onClick={() => navigate(`/MDocumento/${record.id}`)}
        >
          {val}
        </Text>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (nombre: string) => <Text>{toTitleCase(nombre ?? '')}</Text>,
    },
    {
      title: 'Longitud',
      dataIndex: 'longitudCodigo',
      key: 'longitudCodigo',
      width: 100,
      align: 'center',
      render: (val: number) => <Text>{val ?? '-'}</Text>,
    },
    {
      title: 'Documento Reverso',
      dataIndex: 'documentoReverso',
      key: 'documentoReverso',
      width: 160,
      render: (val: string) => <Text>{val || '-'}</Text>,
    },
    ...(puedeEditar || puedeEliminar
      ? [
          {
            title: 'Acción',
            key: 'accion',
            width: 120,
            align: 'center' as const,
            render: (_: any, record: DocumentoDTO) => (
              <>
                {puedeEditar && (
                  <Button
                    type="link"
                    size="small"
                    style={{ marginRight: 8 }}
                    onClick={() => navigate(`/MDocumento/${record.id}/editar`)}
                  >
                    Editar
                  </Button>
                )}
                {puedeEliminar && (
                  <Popconfirm
                    title="¿Eliminar este documento?"
                    onConfirm={() => handleEliminar(record)}
                    okText="Sí"
                    cancelText="No"
                  >
                    <Button type="link" danger size="small">
                      Eliminar
                    </Button>
                  </Popconfirm>
                )}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar documentos"
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
      <Card className="paces-card-erp" style={{ borderRadius: 8, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
        <CatalogoListadoToolbar
          onSearch={handleSearch}
          pageSize={pageSize}
          onPageSizeChange={(v) => { setPageSize(v); }}
          onNuevo={() => navigate('/MDocumento/nuevo')}
          onReload={() => refetch()}
        />
        <Table<DocumentoDTO>
          columns={columns}
          dataSource={data?.datos || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 700 }}
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
          locale={{ emptyText: <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Empty description="No hay documentos registrados" /></div> }}
        />
      </Card>
    </>
  );
};

export default Documentos;
