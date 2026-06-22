import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
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
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const usuario = useAuthStore((s: any) => s.usuario);
  const pantallaActual = usuario?.pantallas.find((p: any) => p.codigo === 'MDocumento');
  const puedeEditar = pantallaActual?.acciones.includes('EDITAR') ?? false;
  const puedeCrear = pantallaActual?.acciones.includes('CREAR') ?? false;
  const puedeEliminar = pantallaActual?.acciones.includes('ELIMINAR') ?? false;

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<DocumentoDTO | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm();

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

  const abrirNuevo = () => {
    if (!puedeCrear) return;
    setEditando(null);
    form.resetFields();
    setModalVisible(true);
  };

  const abrirEditar = (doc: DocumentoDTO) => {
    if (!puedeEditar) return;
    setEditando(doc);
    form.setFieldsValue({
      codigo: doc.codigo,
      nombre: doc.nombre,
    });
    setModalVisible(true);
  };

  const guardar = async () => {
    try {
      const values = await form.validateFields();
      if (sucursalActiva === undefined) return;
      setGuardando(true);
      const payload: DocumentoDTO = {
        codigo: values.codigo?.toUpperCase() || '',
        nombre: values.nombre,
      } as DocumentoDTO;
      if (editando) {
        payload.id = editando.id;
        await documentosApi.actualizar(sucursalActiva, editando.id, payload);
        message.success('Documento actualizado correctamente');
      } else {
        await documentosApi.crear(sucursalActiva, payload);
        message.success('Documento creado correctamente');
      }
      setModalVisible(false);
      refetch();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al guardar documento');
    } finally {
      setGuardando(false);
    }
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
      render: (val: string, record: DocumentoDTO) =>
        puedeEditar ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => abrirEditar(record)}
          >
            {val}
          </Button>
        ) : (
          <Text>{val}</Text>
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
    ...(puedeEliminar
      ? [
          {
            title: 'Acción',
            key: 'accion',
            width: 80,
            align: 'center' as const,
            render: (_: any, record: DocumentoDTO) => (
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
          onNuevo={abrirNuevo}
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

      <Modal
        title={editando ? 'Editar Documento' : 'Nuevo Documento'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={guardar}
        confirmLoading={guardando}
        width={520}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Código"
            rules={[{ required: true, message: 'El código es obligatorio' }]}
          >
            <Input
              placeholder="Ej. ENP"
              maxLength={4}
              disabled={!!editando}
              style={{ textTransform: 'uppercase' }}
            />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej. Entrada de Almacén" maxLength={50} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default Documentos;
