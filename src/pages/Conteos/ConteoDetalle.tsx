import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Tag, Descriptions, Typography, Empty,
} from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { conteoApi } from '../../api/conteoApi';
import { formatCurrency, formatDate, toTitleCase, formatNumber } from '../../utils/formats';
import type { ConteoFisicoDTO } from '../../types/conteo';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import SucursalDocumentoSelector from '../../components/SucursalDocumentoSelector';

const ConteoDetalle: React.FC = () => {
  const { documento } = useParams<{ documento: string }>();
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [data, setData] = useState<ConteoFisicoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [sucursalDestino, setSucursalDestino] = useState<number | undefined>(undefined);

  const cargar = useCallback(async () => {
    if (!documento) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const result = await conteoApi.obtenerPorDocumento(sucursalActiva, documento);
      setData(result);
      setPageTitleOverride(result.documento);
    } catch {
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [documento, sucursalActiva, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule('FConteos');
    cargar();
    return () => setPageTitleOverride('');
  }, [cargar, setActiveModule, setPageTitleOverride]);

  if (!data) return null;

  return (
    <DetalleCatalogoLayout
      rutaVolver="/FConteos"
      loading={loading}
      mensajeLoading="Cargando conteo..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle del conteo"
      onRecargar={cargar}
      dataDisponible={!!data}
      extraLeft={<SucursalDocumentoSelector value={sucursalDestino} onChange={setSucursalDestino} />}
      extraActions={
        <Tag color={data.bloqueado ? 'red' : 'green'}>
          {data.bloqueado ? 'Bloqueado' : 'Activo'}
        </Tag>
      }
    >

      <Card
        className="paces-card"
        size="small"
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>Datos Generales</span>}
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered size="small" column={2} styles={{ content: { background: 'transparent' } }}>
          <Descriptions.Item label="Documento">{data.documento}</Descriptions.Item>
          <Descriptions.Item label="Fecha">{formatDate(data.fecha)}</Descriptions.Item>
          <Descriptions.Item label="Almacén">{toTitleCase(data.almacen)}</Descriptions.Item>
          <Descriptions.Item label="Usuario">{toTitleCase(data.usuario) || '-'}</Descriptions.Item>
          <Descriptions.Item label="Suplidor">
            {data.nombreSuplidor ? toTitleCase(data.nombreSuplidor) : data.codigoSuplidor || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Concepto">{data.concepto || '-'}</Descriptions.Item>
          <Descriptions.Item label="Tipo">—</Descriptions.Item>
          <Descriptions.Item label="Cantidad">{data.cantidad.toLocaleString('es-DO')}</Descriptions.Item>
          <Descriptions.Item label="Costo">{formatCurrency(data.costo)}</Descriptions.Item>
          <Descriptions.Item label="Modo">
            {data.modo === 0 ? 'Manual' : data.modo === 1 ? 'Automático' : String(data.modo)}
          </Descriptions.Item>
          <Descriptions.Item label="Período">{data.periodo}</Descriptions.Item>
          <Descriptions.Item label="Nota" span={2}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        className="paces-card"
        size="small"
        title={<span style={{ fontSize: 16, fontWeight: 600 }}>Detalles ({data.detalles?.length || 0})</span>}
      >
        {data.detalles?.length > 0 ? (
          <Table
            dataSource={data.detalles}
            rowKey="codigo"
            size="small"
            pagination={false}
            scroll={{ x: 600 }}
          >
            <Table.Column title="Código" dataIndex="codigo" width={100} />
            <Table.Column
              title="Artículo"
              dataIndex="articulo"
              ellipsis
              render={(v: string) => toTitleCase(v || '')}
            />
            <Table.Column
              title="Cantidad"
              dataIndex="cantidad"
              align="right"
              width={100}
              render={(v: number) => v.toLocaleString('es-DO')}
            />
            <Table.Column
              title="Factor"
              dataIndex="factor"
              align="right"
              width={80}
              render={(v: number) => formatNumber(v || 1)}
            />
            <Table.Column
              title="Costo"
              dataIndex="ultimoCosto"
              align="right"
              width={120}
              render={(v: number) => formatCurrency(v || 0)}
            />
            <Table.Column
              title="Medida"
              dataIndex={['medida', 'nombre']}
              width={100}
              render={(v: string) => v || '-'}
            />
            <Table.Column
              title="Familia"
              dataIndex={['familia', 'nombre']}
              ellipsis
              render={(v: string) => (v ? toTitleCase(v) : '-')}
            />
            <Table.Column
              title="Referencia"
              dataIndex="referencia"
              ellipsis
              render={(v: string) => v || '-'}
            />
          </Table>
        ) : (
          <Empty description="Sin detalles" />
        )}
      </Card>
    </DetalleCatalogoLayout>
  );
};

export default ConteoDetalle;
