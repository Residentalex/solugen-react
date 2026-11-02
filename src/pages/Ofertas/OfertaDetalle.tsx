import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Card, Descriptions, Empty, Grid, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { ofertaApi } from '../../api/ofertaApi';
import type { DetalleOfertaDTO, OfertaDTO } from '../../types/oferta';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import {
  extraerMensajeError,
  formatCurrency,
  formatDate,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';

const { Text } = Typography;

function getVigencia(item: OfertaDTO): { text: string; color: string } {
  if (!item.activo) return { text: 'Inactiva', color: 'default' };
  const hoy = new Date();
  const fechaFinal = new Date(item.fechaFinal);
  if (fechaFinal < hoy) return { text: 'Expirada', color: 'red' };
  return { text: 'Vigente', color: 'green' };
}

const OfertaDetalle: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [oferta, setOferta] = useState<OfertaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  const rutaVolver = location.pathname.startsWith('/saas') ? '/saas/FOfertas' : '/FOfertas';

  useEffect(() => {
    setActiveModule('FOfertas');
  }, [setActiveModule]);

  const cargar = useCallback(async () => {
    if (!codigo || sucursalActiva === undefined) {
      setLoading(false);
      setLoadingError(true);
      return;
    }

    setLoading(true);
    setLoadingError(false);

    try {
      const resultados = await ofertaApi.obtenerPorCodigo(sucursalActiva, codigo);
      const encontrada = resultados?.[0];

      if (!encontrada) {
        setOferta(null);
        setLoadingError(true);
        return;
      }

      setOferta(encontrada);
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al cargar la oferta'));
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [codigo, sucursalActiva]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const detalles = oferta?.detalles || [];
  const vigencia = oferta ? getVigencia(oferta) : null;

  const columnas: ColumnsType<DetalleOfertaDTO> = [
    {
      title: 'Código',
      dataIndex: 'codigo',
      key: 'codigo',
      width: 120,
      fixed: 'left',
    },
    {
      title: 'Artículo',
      dataIndex: 'articulo',
      key: 'articulo',
      ellipsis: true,
      render: (val: string) => toTitleCase(val ?? '') || '-',
    },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 130,
      align: 'right',
      render: (val: number) => formatCurrency(val),
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
      width: 110,
      align: 'right',
      render: (val: number) => formatNumber(val),
    },
    {
      title: 'Cant. Oferta',
      dataIndex: 'cantidadOferta',
      key: 'cantidadOferta',
      width: 120,
      align: 'right',
      render: (val: number) => formatNumber(val),
    },
    {
      title: 'Cantidad Máxima',
      dataIndex: 'cantidadMaxima',
      key: 'cantidadMaxima',
      width: 140,
      align: 'right',
      render: (val: number) => formatNumber(val),
    },
    {
      title: 'Dto %',
      dataIndex: 'porcentajeDescuento',
      key: 'porcentajeDescuento',
      width: 90,
      align: 'right',
      render: (val: number) => `${formatNumber(val)}%`,
    },
  ];

  return (
    <DetalleCatalogoLayout
      rutaVolver={rutaVolver}
      loading={loading}
      mensajeLoading="Cargando oferta..."
      loadingError={loadingError}
      mensajeError="Error al cargar la oferta"
      onRecargar={cargar}
      dataDisponible={!!oferta}
    >
      {oferta && (
        <>
          <Card
            className="paces-card"
            size="small"
            style={{ marginBottom: 16 }}
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>
                {vigencia && <Tag color={vigencia.color}>{vigencia.text}</Tag>}
              </div>
            }
          >
            <Descriptions
              bordered
              size="small"
              column={screens.xxl === true ? 3 : 1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Código">{oferta.codigo || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nombre" span={screens.xxl === true ? 2 : 1}>
                {toTitleCase(oferta.nombre ?? '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Inicio">
                {oferta.fechaInicio ? formatDate(oferta.fechaInicio) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Final">
                {oferta.fechaFinal ? formatDate(oferta.fechaFinal) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Aplica Crédito">
                {oferta.aplicaClienteCredito ? 'Sí' : 'No'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            className="paces-card"
            size="small"
            title={<span style={{ fontSize: 16, fontWeight: 600 }}>Productos</span>}
            extra={
              <Text type="secondary">
                {detalles.length} producto{detalles.length !== 1 ? 's' : ''}
              </Text>
            }
          >
            <Table<DetalleOfertaDTO>
              dataSource={[...detalles].sort((a, b) => (b.codigo ?? '').localeCompare(a.codigo ?? ''))}
              columns={columnas}
              rowKey="codigo"
              size="small"
              pagination={false}
              scroll={{ x: 900 }}
              locale={{ emptyText: <Empty description="No hay productos en esta oferta" /> }}
            />
          </Card>
        </>
      )}
    </DetalleCatalogoLayout>
  );
};

export default OfertaDetalle;
