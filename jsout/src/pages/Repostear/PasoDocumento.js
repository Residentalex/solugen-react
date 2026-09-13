import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Input, Button, Card, Descriptions, Typography, Space, message, Spin, Tag } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { transaccionApi } from '../../api/transaccionApi';
import { useUIStore } from '../../stores/uiStore';
import { getMonedaSucursalActiva } from '../../utils/moneda';
const { Text } = Typography;
const ESTADO_LABELS = {
    0: { label: 'Borrador', color: 'default' },
    1: { label: 'Aplicado', color: 'success' },
    2: { label: 'Autorizado', color: 'processing' },
    3: { label: 'Anulado', color: 'error' },
    4: { label: 'Pagado', color: 'cyan' },
    5: { label: 'Abierto', color: 'warning' },
    6: { label: 'Cerrado', color: 'default' },
};
const PasoDocumento = ({ sucursal, documento, transaccion, onDocumentoChange, onTransaccionEncontrada, }) => {
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState(documento);
    const isDarkMode = useUIStore((s) => s.isDarkMode);
    const primaryColor = useUIStore((s) => s.primaryColor);
    const handleBuscar = async () => {
        if (!busqueda.trim()) {
            message.warning('Ingrese un número de documento');
            return;
        }
        setLoading(true);
        onTransaccionEncontrada(null);
        try {
            const partes = busqueda.trim().split('-');
            if (partes.length < 2) {
                message.error('Formato inválido. Use TIPO-00000001 (ej: ENP-00000001)');
                return;
            }
            const tipoDoc = partes[0];
            const noDocumento = partes.slice(1).join('-');
            const transacciones = await transaccionApi.filtrar(sucursal, {
                documento: noDocumento,
                tipoEntidad: tipoDoc,
            });
            if (transacciones && transacciones.length > 0) {
                const t = await transaccionApi.obtenerPorId(sucursal, transacciones[0].id);
                onTransaccionEncontrada(t);
                onDocumentoChange(busqueda.trim());
                message.success('Documento encontrado');
            }
            else {
                message.error('No se encontró el documento especificado');
            }
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al buscar el documento');
        }
        finally {
            setLoading(false);
        }
    };
    const estadoInfo = transaccion
        ? ESTADO_LABELS[transaccion.estado] || { label: 'Desconocido', color: 'default' }
        : null;
    return (_jsxs("div", { children: [_jsx(Text, { style: {
                    display: 'block',
                    marginBottom: 24,
                    fontSize: 16,
                    color: primaryColor,
                    fontWeight: 500,
                }, children: "Busque el documento que desea repostear" }), _jsx(Space.Compact, { style: { width: '100%', maxWidth: 560, marginBottom: 24 }, children: _jsx(Input.Search, { placeholder: "Ejemplo: ENP-00000001", value: busqueda, onChange: (e) => setBusqueda(e.target.value), onSearch: handleBuscar, size: "large", enterButton: _jsx(Button, { type: "primary", icon: _jsx(SearchOutlined, {}), size: "large", loading: loading, children: "Buscar" }), style: {
                        boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                        borderRadius: 8,
                    } }) }), loading && (_jsx("div", { style: { textAlign: 'center', padding: 40 }, children: _jsx(Spin, { size: "large" }) })), transaccion && !loading && (_jsx(Card, { className: "repostear-doc-result", style: { marginTop: 16 }, title: _jsxs(Space, { children: [_jsx(CheckCircleOutlined, { style: { color: '#52c41a', fontSize: 18 } }), _jsx(Text, { strong: true, style: { fontSize: 16 }, children: "Documento Encontrado" }), _jsx(Tag, { color: estadoInfo.color, style: { fontSize: 13, padding: '2px 10px', marginLeft: 4 }, children: estadoInfo.label })] }), children: _jsxs(Descriptions, { column: 2, size: "small", bordered: true, className: "repostear-descriptions", children: [_jsx(Descriptions.Item, { label: "Documento", children: transaccion.documento?.codigo || transaccion.noDocumento }), _jsx(Descriptions.Item, { label: "No. Documento", children: transaccion.noDocumento }), _jsx(Descriptions.Item, { label: "Entidad", children: transaccion.nombreEntidad || '-' }), _jsx(Descriptions.Item, { label: "Concepto", children: transaccion.concepto?.nombre || '-' }), _jsx(Descriptions.Item, { label: "Total", children: new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: getMonedaSucursalActiva().codigo,
                            }).format(transaccion.total) }), _jsx(Descriptions.Item, { label: "D\u00E9bitos", children: new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: getMonedaSucursalActiva().codigo,
                            }).format(transaccion.debitos) }), _jsx(Descriptions.Item, { label: "Cr\u00E9ditos", children: new Intl.NumberFormat('es-DO', {
                                style: 'currency',
                                currency: getMonedaSucursalActiva().codigo,
                            }).format(transaccion.creditos) }), _jsx(Descriptions.Item, { label: "Referencia", children: transaccion.referencia || '-' })] }) }))] }));
};
export default PasoDocumento;
