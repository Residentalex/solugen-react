import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import ProductCard from './ProductCard';
const { Title, Text } = Typography;
const ProductosPorCategoria = ({ productos }) => {
    const navigate = useNavigate();
    const categoriasConProductos = useMemo(() => {
        const map = new Map();
        productos.forEach((p) => {
            const list = map.get(p.categoria) || [];
            list.push(p);
            map.set(p.categoria, list);
        });
        return Array.from(map.entries()).slice(0, 4);
    }, [productos]);
    return (_jsx(_Fragment, { children: categoriasConProductos.map(([categoria, items]) => (_jsxs("section", { className: "store-section", children: [_jsxs("div", { className: "store-section-header", children: [_jsx(Title, { level: 4, className: "store-section-title", children: categoria }), _jsxs("a", { className: "store-section-link", role: "button", tabIndex: 0, onClick: (e) => {
                                e.preventDefault();
                                navigate(`/store?categoria=${encodeURIComponent(categoria)}`);
                            }, onKeyDown: (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate(`/store?categoria=${encodeURIComponent(categoria)}`);
                                }
                            }, children: ["Ver m\u00E1s ", _jsx(RightOutlined, { className: "store-section-link-icon" })] })] }), _jsx("div", { className: "store-horizontal-scroll", children: _jsx(Row, { gutter: [16, 16], wrap: false, style: { flexWrap: 'nowrap' }, children: items.slice(0, 5).map((producto) => (_jsx(Col, { style: { minWidth: 220, maxWidth: 220, flex: '0 0 auto' }, children: _jsx(ProductCard, { producto: producto, compact: true }) }, producto.codigo))) }) })] }, categoria))) }));
};
export default ProductosPorCategoria;
