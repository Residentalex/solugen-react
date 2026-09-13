import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Row, Col, Tabs, Typography, Skeleton, message } from 'antd';
import ProductCard from './ProductCard';
import { ecommerceApi } from '../../../api/ecommerceApi';
const { Title, Text } = Typography;
const tabs = [
    { key: 'todos', label: 'Todos' },
    { key: 'ofertas', label: 'Ofertas' },
];
const ProductosDestacados = ({ productos }) => {
    const [searchParams] = useSearchParams();
    const ofertasParam = searchParams.get('ofertas') === 'true';
    const [tabActiva, setTabActiva] = useState(ofertasParam ? 'ofertas' : 'todos');
    const [ofertas, setOfertas] = useState([]);
    const [loadingOfertas, setLoadingOfertas] = useState(false);
    const [errorOfertas, setErrorOfertas] = useState(false);
    const cargarOfertas = useCallback(async () => {
        setLoadingOfertas(true);
        setErrorOfertas(false);
        try {
            const result = await ecommerceApi.obtenerOfertas({ pagina: 1, tamano: 20 });
            setOfertas(result.items);
        }
        catch (err) {
            setErrorOfertas(true);
            message.error(err?.response?.data?.errorMessage || 'Error al cargar las ofertas');
        }
        finally {
            setLoadingOfertas(false);
        }
    }, []);
    useEffect(() => {
        if (tabActiva === 'ofertas') {
            cargarOfertas();
        }
    }, [tabActiva, cargarOfertas]);
    const handleTabChange = useCallback((key) => {
        setTabActiva(key);
    }, []);
    const productosMostrar = tabActiva === 'ofertas' ? ofertas : productos;
    return (_jsxs("section", { className: "store-section", children: [_jsx("div", { className: "store-section-header", children: _jsx(Title, { level: 4, className: "store-section-title", children: "Productos Destacados" }) }), _jsx(Tabs, { activeKey: tabActiva, onChange: handleTabChange, items: tabs, className: "store-tabs" }), tabActiva === 'ofertas' && loadingOfertas && (_jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: Array.from({ length: 4 }).map((_, i) => (_jsx(Col, { xs: 12, sm: 12, md: 8, lg: 6, xl: 4, children: _jsx(Skeleton, { active: true, paragraph: { rows: 2 } }) }, i))) })), tabActiva === 'ofertas' && !loadingOfertas && !errorOfertas && productosMostrar.length === 0 && (_jsx("div", { style: { textAlign: 'center', padding: '40px 0' }, children: _jsx(Text, { type: "secondary", children: "No hay ofertas activas en este momento" }) })), !(tabActiva === 'ofertas' && loadingOfertas) && (_jsx(Row, { gutter: [16, 16], style: { marginTop: 16 }, children: productosMostrar.map((producto) => (_jsx(Col, { xs: 12, sm: 12, md: 8, lg: 6, xl: 4, children: _jsx(ProductCard, { producto: producto }) }, producto.codigo))) }))] }));
};
export default ProductosDestacados;
