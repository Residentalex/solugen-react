import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Typography, Space, Spin, Empty } from 'antd';
import { FileTextOutlined, } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
const ReportesModulo = () => {
    const { modulo } = useParams();
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
    const reportesFiltrados = useMemo(() => {
        if (!usuario?.pantallas || !moduloNombre)
            return [];
        return usuario.pantallas.filter((p) => {
            const perteneceAlModulo = p.modulos?.some((m) => m.nombre === moduloNombre);
            if (!perteneceAlModulo)
                return false;
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
    return (_jsxs("div", { style: { padding: 0 }, children: [_jsxs("div", { style: { marginBottom: 32 }, children: [_jsxs(Typography.Title, { level: 3, style: { margin: 0, fontWeight: 700 }, children: ["Reportes de ", moduloNombre] }), !loading && (_jsxs(Typography.Text, { type: "secondary", style: { fontSize: 14 }, children: [reportesFiltrados.length, " reporte", reportesFiltrados.length !== 1 ? 's' : '', " disponible", reportesFiltrados.length !== 1 ? 's' : ''] }))] }), loading ? (_jsx("div", { style: { textAlign: 'center', padding: '80px 0' }, children: _jsx(Spin, { size: "large" }) })) : reportesFiltrados.length === 0 ? (_jsx(Empty, { description: "No hay reportes disponibles para este m\u00F3dulo", style: { padding: '80px 0' }, children: _jsx(Typography.Link, { onClick: () => navigate('/'), children: "Volver al dashboard" }) })) : (_jsx(Row, { gutter: [16, 16], children: reportesFiltrados.map((reporte) => (_jsx(Col, { xs: 24, sm: 12, md: 12, lg: 8, xxl: 6, children: _jsx(Card, { hoverable: true, className: "paces-card", style: {
                            borderRadius: 12,
                            height: '100%',
                            border: '1px solid #e8ecf0',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                        }, styles: {
                            body: { padding: 20 },
                        }, onMouseEnter: (e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                            e.currentTarget.style.borderColor = '#556ee6';
                        }, onMouseLeave: (e) => {
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                            e.currentTarget.style.borderColor = '#e8ecf0';
                        }, onClick: () => navigate(prefix + reporte.codigo), children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: 12, children: [_jsx("div", { style: {
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #556ee6, #3b4cb8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }, children: _jsx(FileTextOutlined, { style: { fontSize: 22, color: '#fff' } }) }), _jsx(Typography.Text, { strong: true, style: { fontSize: 14, color: '#1a1d21' }, children: reporte.nombre }), _jsx(Typography.Text, { type: "secondary", style: { fontSize: 11, fontFamily: 'monospace' }, children: reporte.codigo }), _jsx("div", { style: { marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f0f0f0' }, children: _jsx(Typography.Text, { style: { color: '#556ee6', fontSize: 12, fontWeight: 500 }, children: "Abrir reporte \u2192" }) })] }) }) }, reporte.codigo))) }))] }));
};
export default ReportesModulo;
