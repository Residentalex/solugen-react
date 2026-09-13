import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Card, Table, Typography, Empty, Space, Skeleton } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatNumber, formatDate } from '../../utils/formats';
const { Text } = Typography;
const RUTAS_DEFAULT = {
    ND: '/FNDSUP',
    NC: '/FNCSUP',
    TRN: '/FTRN',
    RDE: '/FRDE',
    ENP: '/FENP',
    DVC: '/FDVC',
    SAP: '/FSAP',
    DEV: '/FDEV',
    PV: '/FPV',
};
const TransaccionesAsociadasCard = ({ documentos = [], readOnly = false, loading = false, scrollX, emptyText, onDocumentoClick, rutas, ocultarPerdida = false, }) => {
    const navigate = useNavigate();
    const docsNormalizados = useMemo(() => documentos.map((d) => ({ ...d, nCF: d.nCF || d.ncf || '', perdida: d.perdida || 0, descuento: d.descuento || 0, esDocumentoInventario: d.esDocumentoInventario ?? false })), [documentos]);
    const columns = [
        { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', width: 110, render: (v) => v ? formatDate(v) : '-' },
        {
            title: 'Documento',
            key: 'documento',
            width: 140,
            render: (_, record) => {
                const label = record.documento || `${record.tipoDocumento || '?'}-${record.noDocumento || '?'}`;
                const tieneNavegacion = !readOnly || onDocumentoClick || rutas;
                const content = tieneNavegacion
                    ? _jsx("a", { className: "paces-doc-link", style: { cursor: 'pointer' }, children: label })
                    : _jsx(Text, { children: label });
                if (record.esDocumentoInventario) {
                    return (_jsx("div", { style: { borderLeft: '3px solid #fa8c16', paddingLeft: 8 }, children: content }));
                }
                return content;
            },
        },
        {
            title: 'NCF',
            dataIndex: 'nCF',
            key: 'nCF',
            width: 130,
            render: (v) => v || '-',
        },
        {
            title: 'Monto Original',
            dataIndex: 'montoOriginal',
            key: 'montoOriginal',
            width: 130,
            align: 'right',
            render: (v) => formatNumber(v ?? 0),
        },
        {
            title: 'Pagado',
            dataIndex: 'pagado',
            key: 'pagado',
            width: 120,
            align: 'right',
            render: (v) => formatNumber(v ?? 0),
        },
        {
            title: 'Descuento',
            dataIndex: 'descuento',
            key: 'descuento',
            width: 120,
            align: 'right',
            render: (v) => formatNumber(v ?? 0),
        },
        {
            title: 'Monto',
            dataIndex: 'monto',
            key: 'monto',
            width: 120,
            align: 'right',
            render: (v) => _jsx(Text, { strong: true, children: formatNumber(v ?? 0) }),
        },
        ...(!ocultarPerdida ? [{
                title: 'Pérdida',
                dataIndex: 'perdida',
                key: 'perdida',
                width: 110,
                align: 'right',
                render: (v) => _jsx(Text, { children: formatNumber(v ?? 0) }),
            }] : []),
    ];
    const renderContent = () => {
        if (loading) {
            return _jsx(Skeleton, { active: true, paragraph: { rows: 3 } });
        }
        if (documentos.length === 0) {
            return (_jsx(Empty, { image: _jsx(FileTextOutlined, { style: { fontSize: 32, color: '#bfbfbf' } }), imageStyle: { height: 40 }, description: _jsx("span", { className: "paces-text-secondary", style: { fontSize: 13 }, children: emptyText || 'Sin documentos asociados' }) }));
        }
        return (_jsx(Table, { dataSource: docsNormalizados, rowKey: (r) => r.transaccionAsociadaID ?? r.id, size: "small", pagination: false, scroll: { x: scrollX || 900 }, summary: () => {
                const totales = docsNormalizados.reduce((acc, d) => {
                    acc.montoOriginal += d.montoOriginal || 0;
                    acc.pagado += d.pagado || 0;
                    acc.descuento += d.descuento || 0;
                    acc.monto += d.monto || 0;
                    acc.perdida += d.perdida || 0;
                    return acc;
                }, { montoOriginal: 0, pagado: 0, descuento: 0, monto: 0, perdida: 0 });
                return (_jsxs(Table.Summary.Row, { children: [_jsx(Table.Summary.Cell, { align: "left", children: _jsx(Text, { strong: true, children: "Totales" }) }), _jsx(Table.Summary.Cell, {}), _jsx(Table.Summary.Cell, {}), _jsx(Table.Summary.Cell, { align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.montoOriginal) }) }), _jsx(Table.Summary.Cell, { align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.pagado) }) }), _jsx(Table.Summary.Cell, { align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.descuento) }) }), _jsx(Table.Summary.Cell, { align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.monto) }) }), !ocultarPerdida && (_jsx(Table.Summary.Cell, { align: "right", children: _jsx(Text, { strong: true, children: formatNumber(totales.perdida) }) }))] }));
            }, onRow: (!readOnly || onDocumentoClick || rutas) ? (record) => ({
                onClick: () => {
                    if (onDocumentoClick) {
                        onDocumentoClick(record);
                    }
                    else {
                        const rutasFinal = { ...RUTAS_DEFAULT, ...rutas };
                        const ruta = rutasFinal[record.tipoDocumento || ''] || '/FTRN';
                        navigate(`${ruta}/${record.transaccionAsociadaID ?? record.id}`);
                    }
                },
                style: { cursor: 'pointer' },
                className: 'paces-row-hover',
            }) : undefined, columns: columns }));
    };
    return (_jsx(Card, { className: "paces-card", size: "small", title: _jsxs(Space, { size: 8, children: [_jsx(FileTextOutlined, { style: { color: '#556ee6' } }), _jsx("span", { style: { fontSize: 14, fontWeight: 600 }, children: "Documentos Asociados" })] }), children: renderContent() }));
};
export default TransaccionesAsociadasCard;
