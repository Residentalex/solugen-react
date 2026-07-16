import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { generadorOrdenCompraReporteApi } from '../../api/generadorOrdenCompraReporteApi';

const GeneradorOrdenCompraReporte: React.FC = () => {
  const navigate = useNavigate();
  const { idExterno } = useParams<{ idExterno: string }>();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!idExterno) return;
    cargarReporte();
  }, [idExterno]);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      const blob = await generadorOrdenCompraReporteApi.obtenerReporte(sucursalActiva, idExterno!);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `GORC-${idExterno}.pdf`;
    a.click();
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <>
      <Card className="paces-card-erp" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Volver</Button>
          <div style={{ flex: 1 }} />
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>Imprimir</Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>Descargar PDF</Button>
        </div>
      </Card>
      {pdfUrl && (
        <Card className="paces-card-erp" style={{ padding: 0, overflow: 'hidden' }}>
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none' }}
            title="Reporte GORC"
          />
        </Card>
      )}
    </>
  );
};

export default GeneradorOrdenCompraReporte;
