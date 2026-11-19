import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Table, Card, Button, Typography, Alert, Empty, Tag, Switch, Modal, message, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, PlusOutlined, ReloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import PermissionGate from '../../components/PermissionGate';
import { promocionApi, mensajeErrorPromocion } from '../../api/promocionApi';
import type { PromocionListadoDTO } from '../../types/promocion';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
import { formatDateRaw } from '../../utils/formats';

const { Text } = Typography;

const Promociones: React.FC = () => {
  const navigate = useNavigate();
  const { screenCode } = useScreenConfig('MPromocion');
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const setPageTitleOverride = useUIStore((s: any) => s.setPageTitleOverride);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [pageSize] = useState(25);
  const [operandoId, setOperandoId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['promociones', sucursalActiva, page, pageSize, searchText],
    queryFn: async () => {
      if (sucursalActiva == null) return { items: [], total: 0 };
      const salto = (page - 1) * pageSize;
      const params: { cantidad: number; salto: number; busqueda?: string } = { cantidad: pageSize, salto };
      if (searchText) params.busqueda = searchText;

      return await promocionApi.filtrar(sucursalActiva, params);
    },
    enabled: sucursalActiva != null,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    setActiveModule(screenCode || 'MPromocion');
    updateToolbar({});
    setPageTitleOverride('Promociones');
    return () => {
      resetToolbar();
      setPageTitleOverride('');
    };
  }, [setActiveModule, updateToolbar, resetToolbar, setPageTitleOverride, screenCode]);

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleCambiarActiva = (record: PromocionListadoDTO, checked: boolean) => {
    const accion = checked ? 'activar' : 'desactivar';
    Modal.confirm({
      title: checked ? 'Activar promoción' : 'Desactivar promoción',
      content: checked
        ? `¿Desea activar la promoción "${record.descripcion}"?`
        : `¿Desea desactivar la promoción "${record.descripcion}"?`,
      okText: checked ? 'Sí, activar' : 'Sí, desactivar',
      cancelText: 'Cancelar',
      onOk: async () => {
        if (sucursalActiva == null) return;
        setOperandoId(record.id);
        try {
          const res = await promocionApi.cambiarActiva(sucursalActiva, record.id, checked);
          if (res.advertencias && res.advertencias.length > 0) {
            Modal.warning({
              title: 'Promoción actualizada con advertencias',
              content: (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {res.advertencias.map((adv, idx) => (
                    <li key={idx}>{adv}</li>
                  ))}
                </ul>
              ),
            });
          } else {
            message.success(checked ? 'Promoción activada' : 'Promoción desactivada');
          }
          refetch();
        } catch (err: any) {
          message.error(mensajeErrorPromocion(err, `Error al ${accion} la promoción`));
        } finally {
          setOperandoId(null);
        }
      },
    });
  };

  const handleExportarExcel = async () => {
    const companyName = await getCompanyName(sucursalActiva);
    const dataSource = data?.items || [];
    const columnHeaders = ['Código', 'Descripción', 'Desde', 'Hasta', 'Estado'];
    const dataRows = dataSource.map((item) => [
      item.id,
      item.descripcion,
      formatDateRaw(item.fechaInicio),
      formatDateRaw(item.fechaFinal),
      item.activa ? 'Activa' : 'Inactiva',
    ]);
    exportToExcel({
      fileName: `Promociones_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'Promociones',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

  const columns: ColumnsType<PromocionListadoDTO> = [
    {
      title: 'Código',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      fixed: 'left',
      render: (val: string) =>
        val ? (
          <Text
            strong
            className="paces-doc-link"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/MPromocion/${encodeURIComponent(val)}/editar`)}
          >
            {val}
          </Text>
        ) : (
          <Text>-</Text>
        ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 280,
      ellipsis: true,
      render: (val: string) => <Text strong>{val ?? ''}</Text>,
    },
    {
      title: 'Desde',
      dataIndex: 'fechaInicio',
      key: 'fechaInicio',
      width: 130,
      render: (val: string) => <Text>{formatDateRaw(val)}</Text>,
    },
    {
      title: 'Hasta',
      dataIndex: 'fechaFinal',
      key: 'fechaFinal',
      width: 130,
      render: (val: string) => <Text>{formatDateRaw(val)}</Text>,
    },
    {
      title: 'Estado',
      dataIndex: 'activa',
      key: 'activa',
      width: 110,
      render: (activa: boolean) => (
        <Tag color={activa ? 'green' : 'default'}>{activa ? 'Activa' : 'Inactiva'}</Tag>
      ),
    },
    {
      title: '',
      key: 'activa-switch',
      width: 80,
      align: 'center',
      render: (_: unknown, record: PromocionListadoDTO) => (
        <Switch
          checked={record.activa}
          loading={operandoId === record.id}
          disabled={operandoId !== null}
          onChange={(checked) => handleCambiarActiva(record, checked)}
        />
      ),
    },
  ];

  return (
    <>
      {isError && (
        <Alert
          message="Error al cargar promociones"
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
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
            <Input.Search
              placeholder="Buscar..."
              allowClear
              maxLength={60}
              onSearch={handleSearch}
              style={{ width: '100%', maxWidth: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />
            <div style={{ flex: 1 }} />
            <PermissionGate accion="CREAR">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/MPromocion/nuevo')}>
                Nuevo
              </Button>
            </PermissionGate>
            <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
          </div>
        </div>
        <Table<PromocionListadoDTO>
          columns={columns}
          dataSource={data?.items || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
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
            emptyText: (
              <div style={{ minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="No hay promociones registradas" />
              </div>
            ),
          }}
        />
      </Card>
    </>
  );
};

export default Promociones;
