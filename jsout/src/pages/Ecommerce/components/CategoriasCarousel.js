import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
const { Title } = Typography;
const CategoriasCarousel = ({ categorias, categoriaActiva, onCategoriaClick, }) => {
    const navigate = useNavigate();
    const handleClick = useCallback((id) => {
        if (onCategoriaClick) {
            onCategoriaClick(id);
        }
        else {
            navigate(`/store?categoria=${encodeURIComponent(id)}`);
        }
    }, [navigate, onCategoriaClick]);
    return (_jsxs("section", { className: "store-section", children: [_jsx(Title, { level: 4, className: "store-section-title", children: "Categor\u00EDas Populares" }), _jsx("div", { className: "store-categorias-scroll", children: categorias.map((cat) => {
                    const isActive = categoriaActiva === cat.id;
                    return (_jsxs("div", { className: `store-categoria-card${isActive ? ' active' : ''}`, onClick: () => handleClick(cat.id), role: "button", tabIndex: 0, "aria-label": `Categoría ${cat.nombre}`, onKeyDown: (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleClick(cat.id);
                            }
                        }, children: [_jsx("div", { className: "store-categoria-icon", children: _jsx(ShoppingOutlined, {}) }), _jsx("div", { className: "store-categoria-name", children: cat.nombre }), _jsxs("div", { className: "store-categoria-count", children: [cat.totalProductos, " productos"] })] }, cat.id));
                }) })] }));
};
export default CategoriasCarousel;
