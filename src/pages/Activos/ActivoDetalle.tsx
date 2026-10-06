import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Col, Descriptions, Grid, Row, Tag, Typography, message } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import DetalleCatalogoLayout from '../../components/DetalleCatalogoLayout';
import { activoApi } from '../../api/activoApi';
import type { ActivoDTO } from '../../types/activo';
import { formatCurrency, formatDate, formatNumber, toTitleCase } from '../../utils/formats';

const { Text } = Typography;

const ActivoDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
  const { screenCode } = useScreenConfig('mActivos');

  const [data, setData] = useState<ActivoDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);

  const screens = Grid.useBreakpoint();
  const isLarge = screens.xxl === true;

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadingError(false);
    try {
      const activo = await activoApi.obtenerPorId(id);
      setData(activo);
      setPageTitleOverride(
        activo.codigo ? `${activo.codigo} - ${toTitleCase(activo.descripcion || '')}` : 'Activo Fijo'
      );
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar el activo');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  }, [id, setPageTitleOverride]);

  useEffect(() => {
    setActiveModule(screenCode);
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride, screenCode]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <DetalleCatalogoLayout
      rutaVolver="/mactivos"
      loading={loading}
      mensajeLoading="Cargando activo..."
      loadingError={loadingError}
      mensajeError="Error al cargar detalle de activo"
      onRecargar={cargar}
      dataDisponible={!!data}
      onEditar={() => navigate(`/mactivos/${id}/editar`)}
    >
      <Row gutter={16}>
        <Col span={24}>
          <Card title="Datos Generales" className="paces-card" size="small" style={{ marginBottom: 16 }}>
            <Descriptions
              bordered
              size="small"
              column={isLarge ? 3 : 1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Código">
                <Text style={{ fontFamily: 'monospace' }}>{data?.codigo || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Descripción">
                {toTitleCase(data?.descripcion || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha Adquisición">
                {data?.fechaAdq ? formatDate(data.fechaAdq) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Clasificación">
                {toTitleCase(data?.clasificacionDesc || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tipo">
                {toTitleCase(data?.tipoDesc || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Ubicación">
                {toTitleCase(data?.ubicacionDesc || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="No. Serie">{data?.noSerie || '-'}</Descriptions.Item>
              <Descriptions.Item label="Referencia">{data?.referencia || '-'}</Descriptions.Item>
              <Descriptions.Item label="Documento">{data?.documento || '-'}</Descriptions.Item>
              <Descriptions.Item label="Edificio">{data?.edificio ? 'Sí' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="No Genera Depreciación">{data?.noGenDepr ? 'Sí' : 'No'}</Descriptions.Item>
              <Descriptions.Item label="Retirado">
                {data?.retirado ? <Tag color="red">Retirado</Tag> : <Tag color="green">Activo</Tag>}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Contable y Depreciación" className="paces-card" size="small" style={{ marginBottom: 16 }}>
            <Descriptions
              bordered
              size="small"
              column={isLarge ? 3 : 1}
              styles={{ content: { background: 'transparent' } }}
            >
              <Descriptions.Item label="Cuenta Activo">
                <Text style={{ fontFamily: 'monospace' }}>{data?.ctaActivo || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Cuenta Gasto">
                <Text style={{ fontFamily: 'monospace' }}>{data?.ctaGasto || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Cuenta Dep. Acumulada">
                <Text style={{ fontFamily: 'monospace' }}>{data?.ctaDeprAcum || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Vida Útil">{formatNumber(data?.vidaUtil ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Tasa">{formatNumber(data?.tasa ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Valor Adquisición">{formatCurrency(data?.valorAdq ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Ajustes">{formatCurrency(data?.ajustes ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Dep. Acumulada">{formatCurrency(data?.deprAcum ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Dep. Mensual">{formatCurrency(data?.deprMens ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Periodo Dep.">{formatNumber(data?.periodDep ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Depre. Acum. V">{formatCurrency(data?.depreAcumV ?? 0)}</Descriptions.Item>
              <Descriptions.Item label="Depr. Mens. V">{formatCurrency(data?.deprMensV ?? 0)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </DetalleCatalogoLayout>
  );
};

export default ActivoDetalle;
