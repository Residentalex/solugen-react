import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Spin, Empty } from 'antd';
import {
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import type { PantallaDTO } from '../../types/auth';

const ReportesModulo: React.FC = () => {
  const { modulo } = useParams<{ modulo: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = useAuthStore((s) => s.usuario);
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const moduloNombre = modulo || '';

  // Detectar si estamos en ruta /saas
  const isSaas = location.pathname.startsWith('/saas');
  const prefix = isSaas ? '/saas/' : '/';

  // Filtrar reportes del módulo
  const reportesFiltrados = useMemo<PantallaDTO[]>(() => {
    if (!usuario?.pantallas || !moduloNombre) return [];
    return usuario.pantallas.filter((p) => {
      const perteneceAlModulo = p.modulos?.some((m) => m.nombre === moduloNombre);
      if (!perteneceAlModulo) return false;
      return p.esReporte === true || p.grupo?.toLowerCase() === 'reportes';
    });
  }, [usuario?.pantallas, moduloNombre]);

  // Estados
  useEffect(() => {
    const codigoReportes = `Reportes_${moduloNombre}`;
    setActiveModule(codigoReportes);
    setPageTitleOverride(`${moduloNombre} - Reportes`);
  }, [moduloNombre, setActiveModule, setPageTitleOverride]);

  // Limpiar pageTitleOverride al desmontar
  useEffect(() => {
    return () => {
      setPageTitleOverride('');
    };
  }, [setPageTitleOverride]);

  const loading = false; // datos locales, sin llamada API

  return (
    <div style={{ padding: 0 }}>
      {/* Header section */}
      <div style={{ marginBottom: 32 }}>
        {/* Título principal: "Reportes de {moduloNombre}" */}
        <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>
          Reportes de {moduloNombre}
        </Typography.Title>

        {/* Subtítulo con conteo */}
        {!loading && (
          <Typography.Text type="secondary" style={{ fontSize: 14 }}>
            {reportesFiltrados.length} reporte{reportesFiltrados.length !== 1 ? 's' : ''} disponible{reportesFiltrados.length !== 1 ? 's' : ''}
          </Typography.Text>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" />
        </div>
      ) : reportesFiltrados.length === 0 ? (
        <Empty
          description="No hay reportes disponibles para este módulo"
          style={{ padding: '80px 0' }}
        >
          <Typography.Link onClick={() => navigate('/')}>
            Volver al dashboard
          </Typography.Link>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {reportesFiltrados.map((reporte) => (
            <Col key={reporte.codigo} xs={24} sm={12} md={12} lg={8} xxl={6}>
              <Card
                hoverable
                className="paces-card"
                style={{
                  borderRadius: 12,
                  height: '100%',
                  border: '1px solid #e8ecf0',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
                styles={{
                  body: { padding: 20 },
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = '#556ee6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e8ecf0';
                }}
                onClick={() => navigate(prefix + reporte.codigo)}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {/* Icono grande con fondo degradado */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #556ee6, #3b4cb8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileTextOutlined style={{ fontSize: 22, color: '#fff' }} />
                  </div>

                  {/* Nombre del reporte */}
                  <Typography.Text strong style={{ fontSize: 14, color: '#1a1d21' }}>
                    {reporte.nombre}
                  </Typography.Text>

                  {/* Código del reporte */}
                  <Typography.Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                    {reporte.codigo}
                  </Typography.Text>

                  {/* Indicador de clic */}
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
                    <Typography.Text style={{ color: '#556ee6', fontSize: 12, fontWeight: 500 }}>
                      Abrir reporte →
                    </Typography.Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default ReportesModulo;
