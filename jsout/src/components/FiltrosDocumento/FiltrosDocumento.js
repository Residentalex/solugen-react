import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useMemo } from 'react';
import { Button, Popover, DatePicker, Select, Badge } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
const { RangePicker } = DatePicker;
function parseDateParam(val) {
    if (!val)
        return null;
    const num = val.replace(/\D/g, '');
    if (num.length >= 14) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        const hh = parseInt(num.slice(8, 10), 10);
        const mm = parseInt(num.slice(10, 12), 10);
        const ss = parseInt(num.slice(12, 14), 10);
        return dayjs(new Date(y, m, d, hh, mm, ss));
    }
    if (num.length === 8) {
        const y = parseInt(num.slice(0, 4), 10);
        const m = parseInt(num.slice(4, 6), 10) - 1;
        const d = parseInt(num.slice(6, 8), 10);
        return dayjs(new Date(y, m, d));
    }
    return null;
}
function formatDateParam(d) {
    return d.format('YYYYMMDDHHmmss');
}
const FiltrosDocumento = ({ filtros, onAplicar, opcionesEstado, rangoDefault, extraFiltros, }) => {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState({});
    const abrirPopover = () => {
        setDraft({ ...filtros });
        setOpen(true);
    };
    const handleAplicar = () => {
        setOpen(false);
        onAplicar(draft);
    };
    const handleLimpiar = () => {
        setDraft({});
    };
    const activeCount = useMemo(() => {
        let count = 0;
        if (rangoDefault) {
            const desdeChanged = filtros.desde !== undefined && filtros.desde !== rangoDefault.desde;
            const hastaChanged = filtros.hasta !== undefined && filtros.hasta !== rangoDefault.hasta;
            if (desdeChanged || hastaChanged)
                count++;
        }
        else if (filtros.desde || filtros.hasta) {
            count++;
        }
        if (filtros.estado !== undefined)
            count++;
        return count;
    }, [filtros, rangoDefault]);
    return (_jsx(Popover, { open: open, trigger: "click", placement: "bottomRight", onOpenChange: (visible) => {
            if (!visible)
                setOpen(false);
        }, content: _jsxs("div", { style: { width: 320 }, children: [_jsxs("div", { style: { fontWeight: 600, marginBottom: 16, fontSize: 15 }, children: [_jsx(FilterOutlined, { style: { marginRight: 8 } }), "Filtros"] }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Per\u00EDodo" }), _jsx(RangePicker, { value: draft.desde && draft.hasta
                                ? [parseDateParam(draft.desde), parseDateParam(draft.hasta)]
                                : undefined, onChange: (dates) => {
                                if (dates && dates[0] && dates[1]) {
                                    setDraft({
                                        ...draft,
                                        desde: formatDateParam(dates[0]),
                                        hasta: formatDateParam(dates[1]),
                                    });
                                }
                                else {
                                    const { desde, hasta, ...rest } = draft;
                                    setDraft(rest);
                                }
                            }, style: { width: '100%' }, placeholder: ['Desde', 'Hasta'], allowClear: true, renderExtraFooter: () => (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                            const hoy = dayjs();
                                            setDraft({ ...draft, desde: formatDateParam(hoy), hasta: formatDateParam(hoy) });
                                        }, children: "Hoy" }), _jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                            const inicio = dayjs().startOf('month');
                                            const fin = dayjs();
                                            setDraft({ ...draft, desde: formatDateParam(inicio), hasta: formatDateParam(fin) });
                                        }, children: "Este mes" }), _jsx(Button, { type: "link", size: "small", style: { padding: 0 }, onClick: () => {
                                            const inicio = dayjs().subtract(30, 'day');
                                            const fin = dayjs();
                                            setDraft({ ...draft, desde: formatDateParam(inicio), hasta: formatDateParam(fin) });
                                        }, children: "30 d\u00EDas" })] })) })] }), extraFiltros, _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { style: { marginBottom: 4, color: '#666', fontSize: 13 }, children: "Estado" }), _jsx(Select, { style: { width: '100%' }, value: draft.estado, onChange: (val) => setDraft({ ...draft, estado: val }), placeholder: "Todos", allowClear: true, options: opcionesEstado })] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 12 }, children: [_jsx(Button, { onClick: handleLimpiar, children: "Limpiar" }), _jsx(Button, { type: "primary", onClick: handleAplicar, children: "Aplicar" })] })] }), children: _jsx(Badge, { count: activeCount, size: "small", offset: [-5, 5], children: _jsx(Button, { icon: _jsx(FilterOutlined, {}), onClick: abrirPopover, style: activeCount > 0 ? { borderColor: '#556ee6', color: '#556ee6' } : undefined, children: "Filtros" }) }) }));
};
export default FiltrosDocumento;
