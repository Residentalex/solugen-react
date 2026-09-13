import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { generadorOrdenCompraReporteApi } from '../../api/generadorOrdenCompraReporteApi';
const GeneradorOrdenCompraReporte = () => {
    const navigate = useNavigate();
    const { idExterno } = useParams();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!idExterno)
            return;
        cargarReporte();
    }, [idExterno]);
    const cargarReporte = async () => {
        setLoading(true);
        try {
            const blob = await generadorOrdenCompraReporteApi.obtenerReporte(sucursalActiva, idExterno);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al cargar el reporte');
        }
        finally {
            setLoading(false);
        }
    };
    const handlePrint = () => {
        if (!pdfUrl)
            return;
        window.open(pdfUrl, '_blank');
    };
    const handleDownload = () => {
        if (!pdfUrl)
            return;
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = `GORC-${idExterno}.pdf`;
        a.click();
    };
    if (loading) {
        return _jsx("div", { style: { display: 'flex', justifyContent: 'center', padding: 80 }, children: _jsx(Spin, { size: "large" }) });
    }
    return (_jsxs(_Fragment, { children: [_jsx(Card, { className: "paces-card-erp", style: { marginBottom: 16 }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate(-1), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { icon: _jsx(PrinterOutlined, {}), onClick: handlePrint, children: "Imprimir" }), _jsx(Button, { type: "primary", icon: _jsx(DownloadOutlined, {}), onClick: handleDownload, children: "Descargar PDF" })] }) }), pdfUrl && (_jsx(Card, { className: "paces-card-erp", style: { padding: 0, overflow: 'hidden' }, children: _jsx("iframe", { src: pdfUrl, style: { width: '100%', height: 'calc(100vh - 200px)', border: 'none' }, title: "Reporte GORC" }) }))] }));
};
export default GeneradorOrdenCompraReporte;
