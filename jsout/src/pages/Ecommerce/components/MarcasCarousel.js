import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Typography } from 'antd';
const { Title } = Typography;
const MarcasCarousel = ({ marcas }) => {
    if (!marcas || marcas.length === 0) {
        return null;
    }
    return (_jsxs("section", { className: "store-section", children: [_jsx(Title, { level: 4, className: "store-section-title", children: "Marcas Destacadas" }), _jsx("div", { className: "store-marcas-scroll", children: marcas.map((marca) => (_jsxs("div", { className: "store-marca-item", role: "button", tabIndex: 0, "aria-label": `Marca ${marca.nombre}`, onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                        }
                    }, children: [_jsx("div", { className: "store-marca-logo", children: _jsx("span", { children: marca.nombre.charAt(0).toUpperCase() }) }), _jsx("div", { className: "store-marca-name", children: marca.nombre })] }, marca.id))) })] }));
};
export default MarcasCarousel;
