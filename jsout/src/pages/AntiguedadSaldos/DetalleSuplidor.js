import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Spin, message, Button, Alert } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { parametrosApi } from '../../api/parametrosApi';
import { conceptosApi } from '../../api/conceptosApi';
import { entidadApi } from '../../api/entidadApi';
import { tipoApi } from '../../api/tipoApi';
import { toTitleCase, formatCurrency, formatDate } from '../../utils/formats';
const { Text } = Typography;
// Misma lógica de aging que en AntiguedadSaldos.tsx
function calcularDias(fechaDoc, fechaRef) {
    if (!fechaDoc)
        return 0;
    const d = new Date(fechaDoc);
    return Math.floor((fechaRef.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
const DetalleSuplidor = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const skipGuard = searchParams.get('skipGuard');
    // Leer datos desde localStorage (enviados desde la página principal)
    // Determinar tipo entidad desde la ruta
    const rutaTipo = window.location.pathname.includes('RAntiguedaCXC') ? 'CLI' : 'SUP';
    const storageKey = `detalleSuplidor_data_${rutaTipo}`;
    const storedData = localStorage.getItem(storageKey);
    const parsedData = storedData ? JSON.parse(storedData) : null;
    const codEntidad = parsedData?.codEntidad || searchParams.get('codEntidad') || '';
    const nomEntidad = parsedData?.nomEntidad || searchParams.get('nomEntidad') || '';
    const tipoEntidad = parsedData?.tipoEntidad || rutaTipo;
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fechaRef] = useState(new Date());
    const [selectedDocs, setSelectedDocs] = useState([]);
    const cargarDatos = async () => {
        if (!codEntidad)
            return;
        setLoading(true);
        setError(null);
        setSelectedDocs([]);
        try {
            const d = new Date();
            const hasta = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
            const { data: resp } = await apiClient.get(`/Transaccion/${sucursalActiva}/${tipoEntidad}/balances`, {
                params: { hasta, codEntidad }
            });
            const docs = resp?.data || [];
            const docsConSaldo = docs
                .map((d) => {
                const creditos = d.creditos || 0;
                const debitos = d.debitos || 0;
                const balance = creditos - debitos;
                return {
                    ...d,
                    abonado: Math.abs(debitos || 0),
                    saldoPendiente: Math.round(balance * 100) / 100,
                    esSobrepago: balance < 0,
                    dias: calcularDias(d.fechaDocumento, fechaRef),
                };
            })
                .filter((d) => d.saldoPendiente !== 0);
            setDocumentos(docsConSaldo);
        }
        catch {
            setError('Error al cargar los datos');
        }
        finally {
            setLoading(false);
        }
    };
    const ajustarSaldo = async (docs) => {
        try {
            const params = await parametrosApi.obtenerParametrosAjuste(sucursalActiva);
            const conceptoAjuste = params?.conceptoAjuste || '';
            // Obtener concepto
            const concepto = await conceptosApi.obtenerPorCodigo(sucursalActiva, conceptoAjuste);
            // Construir entidad con los datos que ya tenemos
            const entidad = {
                codigo: codEntidad,
                idExterno: codEntidad,
                nombre: nomEntidad,
                identificacion: '',
                tipoEntidad: { codigo: tipoEntidad },
            };
            // Calcular total y determinar tipo de ajuste
            let totalMonto = 0;
            const transaccionesAsociadas = [];
            let haySobrepago = false;
            let haySaldoPositivo = false;
            for (const d of docs) {
                const montoAbs = Math.abs(Math.round((d.saldoPendiente || 0) * 100) / 100);
                totalMonto += montoAbs;
                if (d.esSobrepago)
                    haySobrepago = true;
                else
                    haySaldoPositivo = true;
                transaccionesAsociadas.push({
                    transaccionAsociadaID: d.id,
                    id: d.id,
                    documento: `${d.tipoDocumento || ''}-${d.noDocumento || ''}`,
                    ncf: d.ncf || '',
                    montoOriginal: Math.round((d.total || 0) * 100) / 100,
                    monto: montoAbs,
                    pagado: d.abonado || 0,
                    saldoPendiente: montoAbs,
                    fecha: d.fechaDocumento,
                    tipoDocumento: d.tipoDocumento,
                });
            }
            // SUP: sobrepago → NC, saldo positivo → ND
            // CLI: saldo positivo → NC, sobrepago → ND (invertido)
            const esNC = tipoEntidad === 'SUP'
                ? (haySobrepago && !haySaldoPositivo)
                : (haySaldoPositivo && !haySobrepago);
            // Obtener tipo de documento según caso
            let tipoCodigo = '';
            if (tipoEntidad === 'SUP') {
                tipoCodigo = esNC ? params.tipoNCSUP : params.tipoNDSUP;
            }
            else {
                tipoCodigo = esNC ? params.tipoNCCLI : params.tipoNDCLI;
            }
            // Obtener tipo
            const tipo = await tipoApi.obtenerPorCodigo(sucursalActiva, esNC ? 'NC' : 'ND', tipoCodigo);
            const cloneData = {
                tipoEntidad,
                concepto,
                entidad,
                tipo,
                fechaDocumento: new Date().toISOString(),
                total: Math.round(totalMonto * 100) / 100,
                transaccionesAsociadas,
                moneda: docs[0]?.moneda,
            };
            const ruta = esNC ? `/FNC${tipoEntidad}/nuevo` : `/FND${tipoEntidad}/nuevo`;
            navigate(ruta, { state: { cloneData } });
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al preparar ajuste de saldo');
        }
    };
    useEffect(() => {
        cargarDatos();
    }, [codEntidad, sucursalActiva]);
    // Columnas estilo AntiguedadSaldos (rangos de días)
    const columnas = [
        {
            title: 'Documento', key: 'documento', width: 160,
            fixed: 'left',
            render: (_, r) => (_jsxs("span", { style: { color: '#556ee6', fontWeight: 500 }, children: [r.tipoDocumento || '', "-", r.noDocumento || ''] })),
        },
        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150, render: (v) => v ? _jsx(Text, { style: { fontSize: 12 }, children: v }) : '-' },
        {
            title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fecha', width: 100,
            render: (v) => v ? formatDate(v) : '-',
        },
        {
            title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right',
            render: (v) => formatCurrency(v || 0),
        },
        {
            title: 'Abonado', key: 'abonado', width: 120, align: 'right',
            render: (_, r) => formatCurrency(r.abonado || 0),
        },
        {
            title: 'Saldo Pendiente', key: 'saldo', width: 130, align: 'right',
            render: (_, r) => (_jsx(Text, { strong: true, style: { color: r.saldoPendiente < 0 ? '#ff4d4f' : undefined }, children: formatCurrency(Math.abs(r.saldoPendiente)) })),
        },
    ];
    return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx(Text, { strong: true, style: { fontSize: 16, marginLeft: 8 }, children: toTitleCase(nomEntidad || '') }), codEntidad && (_jsxs(Text, { style: { color: '#8c8c8c', fontSize: 13 }, children: ["(", codEntidad, ")"] })), _jsx("div", { style: { flex: 1 } }), selectedDocs.length > 0 && selectedDocs.some((d) => d.esSobrepago !== selectedDocs[0].esSobrepago) ? (_jsx(Text, { style: { color: '#ff4d4f', fontSize: 12 }, children: "Selecciona solo sobrepagos o solo saldos positivos" })) : (_jsxs(Button, { type: "primary", disabled: selectedDocs.length === 0, onClick: () => ajustarSaldo(selectedDocs), children: ["Ajustar Saldo (", selectedDocs.length, ")"] })), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: cargarDatos })] }) }), error && (_jsx(Alert, { message: error, type: "error", showIcon: true, style: { margin: '0 24px 16px' }, action: _jsx(Button, { size: "small", onClick: cargarDatos, children: "Reintentar" }) })), _jsx(Table, { dataSource: documentos, columns: columnas, rowKey: (r) => r.id, rowSelection: {
                    type: 'checkbox',
                    onChange: (_, selectedRows) => {
                        setSelectedDocs(selectedRows);
                    },
                }, loading: loading, size: "small", className: "paces-border-top paces-list-table", rowClassName: () => 'paces-row-hover', pagination: {
                    pageSize: 25,
                    showTotal: (t) => `${t} documentos`,
                    showSizeChanger: false,
                }, scroll: { x: 1100 }, locale: {
                    emptyText: (_jsx("div", { style: { padding: 40, textAlign: 'center' }, children: _jsx(Text, { style: { color: '#8c8c8c' }, children: "No hay documentos pendientes" }) })),
                } })] }));
};
export default DetalleSuplidor;
