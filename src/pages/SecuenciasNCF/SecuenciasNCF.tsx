import React, { useEffect, useState, useCallback } from 'react';
import { Table, message, Card, Button, Tooltip, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { ncfApi } from '../../api/ncfApi';
import type { SecuenciaNCFListDTO } from '../../types/contabilidad';

const formatearFecha = (fecha?: string): string => {
  if (!fecha) return '-';
  try {
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    return d.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return fecha;
  }
};

const SecuenciasNCF: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const toTitleCase = (str: string): string =>
    str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const [data, setData] = useState<SecuenciaNCFListDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const result = await ncfApi.obtenerListado(sucursalActiva);
      setData(result || []);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar secuencias NCF');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('MSecuenciaNCF');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const columns: ColumnsType<SecuenciaNCFListDTO> = [
    {
      title: 'Tipo Comprobante',
      dataIndex: 'tipoComprobante',
      key: 'tipoComprobante',
      width: 200,
      render: (val: string) => toTitleCase(val ?? ''),
    },
    {
      title: 'Secuencia Inicial',
      dataIndex: 'secuenciaInicial',
      key: 'secuenciaInicial',
      width: 150,
    },
    {
      title: 'Secuencia Final',
      dataIndex: 'secuenciaFinal',
      key: 'secuenciaFinal',
      width: 150,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 100,
      align: 'right',
      render: (val: number) => (val ?? 0).toLocaleString('es-DO'),
    },
    {
      title: 'Mínimo',
      dataIndex: 'minimo',
      key: 'minimo',
      width: 100,
      align: 'right',
      render: (val: number) => (val ?? 0).toLocaleString('es-DO'),
    },
    {
      title: 'Usado',
      dataIndex: 'usado',
      key: 'usado',
      width: 100,
      align: 'right',
      render: (val: number) => (val ?? 0).toLocaleString('es-DO'),
    },
    {
      title: 'Fecha Vencimiento',
      dataIndex: 'fechaVencimiento',
      key: 'fechaVencimiento',
      width: 140,
      align: 'right',
      render: (val?: string) => formatearFecha(val),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      fixed: 'right',
      width: 80,
      render: (_: any, record: SecuenciaNCFListDTO) => (
        <Space size={0}>
          <Tooltip title="Ver detalle">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                message.info('Funcionalidad en desarrollo')
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Secuencias NCF</h4>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => message.info('Funcionalidad en desarrollo')}
        >
          Nueva Secuencia
        </Button>
      </div>

      <Card className="paces-card-erp" style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table<SecuenciaNCFListDTO>
          columns={columns}
          dataSource={data}
          rowKey="idExterno"
          loading={loading}
          scroll={{ x: 900 }}
          size="middle"
          pagination={{
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} secuencias`,
            pageSizeOptions: ['10', '20', '50', '100'],
            defaultPageSize: 10,
          }}
        />
      </Card>
    </>
  );
};

export default SecuenciasNCF;
