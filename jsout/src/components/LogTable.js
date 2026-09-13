import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Empty } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { formatDate, toTitleCase } from '../utils/formats';
// Mapa de acciones (0-indexed, usado en todo el sistema)
export const ACCION_MAP = {
    0: 'Crear',
    1: 'Modificar',
    2: 'Eliminar',
    3: 'Aplicar',
    4: 'Desaplicar',
    5: 'Postear',
    6: 'Anular',
    7: 'Revisar',
    8: 'Reversar',
    9: 'Escanear',
};
export const ACCION_TAG_COLOR_MAP = {
    0: 'success', 1: 'processing', 2: 'error', 3: 'success',
    4: 'warning', 5: 'processing', 6: 'error', 7: 'cyan',
    8: 'orange', 9: 'default',
};
const LogTable = ({ dataSource, loading, scroll }) => {
    const sortedData = useMemo(() => {
        if (!dataSource)
            return [];
        return [...dataSource].sort((a, b) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            if (dateA !== dateB)
                return dateB - dateA;
            const idA = a.logid ?? a.id ?? 0;
            const idB = b.logid ?? b.id ?? 0;
            return idB - idA;
        });
    }, [dataSource]);
    const columns = [
        {
            title: 'Fecha / Hora',
            dataIndex: 'fecha',
            key: 'fecha',
            width: 160,
            render: (v) => {
                if (!v)
                    return '-';
                const d = new Date(v);
                if (isNaN(d.getTime()))
                    return '-';
                const h = d.getHours();
                const m = String(d.getMinutes()).padStart(2, '0');
                const s = String(d.getSeconds()).padStart(2, '0');
                const ampm = h >= 12 ? 'p. m.' : 'a. m.';
                const h12 = h % 12 || 12;
                const hora = `${h12}:${m}:${s} ${ampm}`;
                return (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 13 }, children: formatDate(v) }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 11 }, children: hora })] }));
            },
        },
        {
            title: 'Usuario',
            dataIndex: 'usuario',
            key: 'usuario',
            width: 240,
            render: (v) => {
                const nombre = v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : null;
                const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?';
                return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("div", { className: "paces-avatar-initials", style: { background: 'var(--paces-hover-bg)', color: 'var(--paces-primary)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }, children: inicial }), _jsx("span", { style: { fontSize: 13 }, children: nombre || '-' })] }));
            },
        },
        {
            title: 'Acción',
            dataIndex: 'accion',
            key: 'accion',
            width: 130,
            render: (v) => (_jsx(Tag, { color: ACCION_TAG_COLOR_MAP[v] ?? 'default', style: { fontSize: 11, lineHeight: '18px', padding: '0 6px' }, children: ACCION_MAP[v] || `Acción ${v}` })),
        },
        {
            title: 'Origen',
            key: 'origen',
            render: (_, record) => {
                const esWeb = record.estacion?.toUpperCase().includes('WEB') ?? false;
                const canal = esWeb ? 'WEB' : 'Desktop';
                const canalColor = esWeb ? 'geekblue' : 'purple';
                const versionMatch = record.estacion?.match(/v?(\d+\.\d+\.\d+(?:\.\d+)?)/);
                const version = versionMatch ? `v${versionMatch[1]}` : '';
                let nombreEstacion = '';
                if (!esWeb && record.estacion) {
                    const match = record.estacion.match(/desde\s+(.+?)\s+[Vv]ersion/i);
                    if (match)
                        nombreEstacion = match[1].trim();
                    else if (record.estacion)
                        nombreEstacion = record.estacion.replace(/v?\d+\.\d+\.\d+(?:\.\d+)?/g, '').trim();
                }
                return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: record.descripcion ? 4 : 0 }, children: [_jsx(Tooltip, { title: version ? `Versión ${version}` : undefined, children: _jsx(Tag, { color: canalColor, style: { fontSize: 10, lineHeight: '16px', padding: '0 5px', cursor: version ? 'help' : 'default' }, children: canal }) }), nombreEstacion && (_jsx("span", { className: "paces-text-secondary", style: { fontSize: 12 }, children: nombreEstacion }))] }), record.descripcion && (_jsx("div", { className: "paces-text-secondary", style: { fontSize: 11, lineHeight: 1.4 }, children: record.descripcion }))] }));
            },
        },
    ];
    // Modo tabla
    return (_jsx(Table, { dataSource: sortedData, columns: columns, rowKey: (record) => String(record.id ?? record.logid ?? `${record.fecha}-${record.accion}-${record.usuario?.nombreUsuario ?? ''}`), size: "small", pagination: false, loading: loading, scroll: { x: scroll?.x || 900 }, locale: {
            emptyText: (_jsxs("div", { style: { padding: '24px 0', textAlign: 'center' }, children: [_jsx(HistoryOutlined, { style: { fontSize: 28, color: 'var(--paces-text-secondary)', marginBottom: 8, display: 'block' } }), _jsx("div", { className: "paces-text-secondary", style: { fontSize: 13 }, children: "Sin registros de historial" })] })),
        } }));
};
export default LogTable;
