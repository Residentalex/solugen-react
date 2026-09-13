import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from 'react';
import { Card, Table, Button, Checkbox, message, Modal, Progress, Typography, } from 'antd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, ExclamationCircleOutlined, CheckCircleOutlined, } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { transaccionBancariaApi } from '../../api/transaccionBancariaApi';
import { toISOFormat } from '../../utils/formats';
const { Text } = Typography;
// ===== Helpers =====
function formatDateDisplay(fecha) {
    if (!fecha)
        return '';
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function formatNumber(n) {
    return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
// ===== Columnas de plantilla =====
const COLUMNAS_PLANTILLA = ['fecha', 'tipoDocumento', 'monto', 'moneda', 'concepto', 'ctaBancaria', 'referencia', 'nota', 'sucursal'];
function handleDescargarPlantilla() {
    const data = [COLUMNAS_PLANTILLA.reduce((acc, col) => ({ ...acc, [col]: '' }), {})];
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = COLUMNAS_PLANTILLA.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
    XLSX.writeFile(workbook, 'plantilla_documentos_bancarios.xlsx');
}
// ===== Componente principal =====
const ImportarDocBanco = () => {
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const [filas, setFilas] = useState([]);
    const [postear, setPostear] = useState(true);
    const [creando, setCreando] = useState(false);
    const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
    const [nombreArchivo, setNombreArchivo] = useState('');
    const fileInputRef = useRef(null);
    const [resultado, setResultado] = useState(null);
    useEffect(() => {
        setActiveModule('OImportarDocBanco');
        setPageTitleOverride('Importar Documentos Bancarios');
        return () => {
            resetToolbar();
            setPageTitleOverride('');
        };
    }, [setActiveModule, setPageTitleOverride, resetToolbar]);
    // ===== Carga de Excel =====
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.name.endsWith('.xlsx')) {
            message.error('Solo se permiten archivos .xlsx');
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                if (rows.length < 2) {
                    message.warning('El archivo no contiene datos válidos.');
                    return;
                }
                const headers = rows[0].map((h) => String(h).trim().toLowerCase());
                const idxFecha = headers.indexOf('fecha');
                const idxTipoDoc = headers.indexOf('tipodocumento');
                const idxMonto = headers.indexOf('monto');
                const idxMoneda = headers.indexOf('moneda');
                const idxConcepto = headers.indexOf('concepto');
                const idxCta = headers.indexOf('ctabancaria');
                const idxRef = headers.indexOf('referencia');
                const idxNota = headers.indexOf('nota');
                const idxSuc = headers.indexOf('sucursal');
                const parsed = [];
                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i];
                    if (cols.every((c) => !c && c !== 0))
                        continue;
                    let fecha = null;
                    if (idxFecha >= 0 && cols[idxFecha]) {
                        const val = cols[idxFecha];
                        if (val instanceof Date) {
                            fecha = val;
                        }
                        else if (typeof val === 'number') {
                            // Excel serial date
                            const excelEpoch = new Date(1899, 11, 30);
                            fecha = new Date(excelEpoch.getTime() + val * 24 * 60 * 60 * 1000);
                        }
                        else if (typeof val === 'string') {
                            const parsedDate = new Date(val);
                            if (!isNaN(parsedDate.getTime()))
                                fecha = parsedDate;
                        }
                    }
                    parsed.push({
                        key: i,
                        fecha,
                        tipoDocumento: idxTipoDoc >= 0 ? (String(cols[idxTipoDoc] ?? '').trim().toUpperCase() || 'DEP') : 'DEP',
                        monto: idxMonto >= 0 ? parseFloat(cols[idxMonto]) || 0 : 0,
                        moneda: idxMoneda >= 0 ? String(cols[idxMoneda] ?? '').trim() : '',
                        concepto: idxConcepto >= 0 ? String(cols[idxConcepto] ?? '').trim() : '',
                        ctaBancaria: idxCta >= 0 ? String(cols[idxCta] ?? '').trim() : '',
                        referencia: idxRef >= 0 ? String(cols[idxRef] ?? '').trim() : '',
                        nota: idxNota >= 0 ? String(cols[idxNota] ?? '').trim() : '',
                        sucursal: idxSuc >= 0 ? String(cols[idxSuc] ?? '').trim() : '',
                    });
                }
                if (parsed.length === 0) {
                    message.warning('El archivo no contiene datos válidos.');
                    return;
                }
                setFilas(parsed);
                setNombreArchivo(file.name);
                message.success(`${parsed.length} filas cargadas desde Excel`);
            }
            catch (err) {
                message.error('Error al leer el archivo. Verifique el formato.');
            }
        };
        reader.onerror = () => {
            message.error('Error al leer el archivo');
        };
        reader.readAsArrayBuffer(file);
        // Resetear input para permitir recargar el mismo archivo
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    // ===== Eliminar fila individual =====
    const handleEliminarFila = (key) => {
        setFilas((prev) => prev.filter((f) => f.key !== key));
    };
    // ===== Eliminar todas las filas =====
    const handleEliminarTodo = () => {
        Modal.confirm({
            title: 'Eliminar archivo',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: '¿Está seguro que desea eliminar todas las filas cargadas?',
            okText: 'Sí, eliminar',
            cancelText: 'No, cancelar',
            okButtonProps: { danger: true },
            onOk: () => {
                setFilas([]);
                setNombreArchivo('');
                message.success('Filas eliminadas');
            },
        });
    };
    // ===== Crear documentos bancarios =====
    const handleCrearDocumentos = async () => {
        if (filas.length === 0)
            return;
        setCreando(true);
        setProgreso({ actual: 0, total: filas.length });
        const creados = [];
        const errores = [];
        for (let i = 0; i < filas.length; i++) {
            const fila = filas[i];
            try {
                const tipoDoc = fila.tipoDocumento || 'DEP';
                const dto = {
                    id: 0,
                    fechaDocumento: fila.fecha ? toISOFormat(fila.fecha) : toISOFormat(new Date()),
                    total: fila.monto,
                    nota: fila.nota,
                    referencia: fila.referencia,
                    codigoSucursal: fila.sucursal,
                    codigoConcepto: fila.concepto,
                    codigoMoneda: fila.moneda,
                    ctaBancaria: fila.ctaBancaria,
                    estado: 1,
                    tipoDocumento: tipoDoc,
                    documento: { codigo: tipoDoc },
                    debitos: 0,
                    creditos: 0,
                    tasa: 1,
                    subTotal: 0,
                    descuento: 0,
                    impuestos: 0,
                    retenciones: 0,
                    periodo: new Date().getMonth() + 1,
                };
                const idCreado = await transaccionBancariaApi.crearDocBancario(sucursalActiva, dto, postear);
                creados.push({
                    id: idCreado,
                    fecha: fila.fecha,
                    tipoDocumento: tipoDoc,
                    monto: fila.monto,
                    moneda: fila.moneda,
                    referencia: fila.referencia,
                    nota: fila.nota,
                    sucursal: fila.sucursal,
                });
            }
            catch (err) {
                const msg = err?.response?.data?.errorMessage || `Error en fila ${i + 1}`;
                errores.push({ fila, error: msg });
            }
            setProgreso({ actual: i + 1, total: filas.length });
        }
        setCreando(false);
        setResultado({ creados, errores });
    };
    // ===== Columnas de la tabla =====
    const columnas = [
        {
            title: 'Fecha',
            key: 'fecha',
            width: 120,
            render: (_, record) => (_jsx(Text, { children: formatDateDisplay(record.fecha) })),
        },
        {
            title: 'Tipo',
            dataIndex: 'tipoDocumento',
            key: 'tipoDocumento',
            width: 80,
        },
        {
            title: 'Monto',
            key: 'monto',
            width: 120,
            align: 'right',
            render: (_, record) => (_jsx(Text, { strong: true, children: formatNumber(record.monto) })),
        },
        {
            title: 'Moneda',
            dataIndex: 'moneda',
            key: 'moneda',
            width: 80,
        },
        {
            title: 'Concepto',
            dataIndex: 'concepto',
            key: 'concepto',
            width: 100,
        },
        {
            title: 'Cta. Bancaria',
            dataIndex: 'ctaBancaria',
            key: 'ctaBancaria',
            width: 140,
        },
        {
            title: 'Referencia',
            dataIndex: 'referencia',
            key: 'referencia',
            width: 120,
            ellipsis: true,
        },
        {
            title: 'Nota',
            dataIndex: 'nota',
            key: 'nota',
            ellipsis: true,
        },
        {
            title: 'Sucursal',
            dataIndex: 'sucursal',
            key: 'sucursal',
            width: 100,
        },
        {
            title: '',
            key: 'acciones',
            width: 50,
            render: (_, record) => (_jsx(Button, { type: "text", danger: true, size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => handleEliminarFila(record.key), disabled: creando })),
        },
    ];
    const columnasCreados = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 90 },
        {
            title: 'Fecha', key: 'fecha', width: 120,
            render: (_, record) => _jsx(Text, { children: formatDateDisplay(record.fecha) }),
        },
        { title: 'Tipo', dataIndex: 'tipoDocumento', key: 'tipoDocumento', width: 80 },
        {
            title: 'Monto', key: 'monto', width: 120, align: 'right',
            render: (_, record) => _jsx(Text, { strong: true, children: formatNumber(record.monto) }),
        },
        { title: 'Moneda', dataIndex: 'moneda', key: 'moneda', width: 80 },
        { title: 'Referencia', dataIndex: 'referencia', key: 'referencia', width: 120, ellipsis: true },
        { title: 'Nota', dataIndex: 'nota', key: 'nota', ellipsis: true },
        { title: 'Sucursal', dataIndex: 'sucursal', key: 'sucursal', width: 100 },
    ];
    const handleCerrarResultado = () => {
        if (!resultado)
            return;
        const { creados, errores } = resultado;
        if (errores.length === 0) {
            setFilas([]);
            setNombreArchivo('');
            message.success(`Se crearon ${creados.length} documentos bancarios exitosamente.`);
        }
        else {
            const clavesFallidas = new Set(errores.map((e) => e.fila.key));
            setFilas((prev) => prev.filter((f) => clavesFallidas.has(f.key)));
            message.warning(`Se crearon ${creados.length} documentos. ${errores.length} fallaron.`);
        }
        setResultado(null);
    };
    return (_jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsxs("div", { style: { padding: '16px 24px 0' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("input", { type: "file", accept: ".xlsx", ref: fileInputRef, onChange: handleFileChange, style: { display: 'none' } }), _jsx(Button, { icon: _jsx(UploadOutlined, {}), onClick: () => fileInputRef.current?.click(), disabled: creando, children: "Cargar archivo" }), _jsx(Button, { icon: _jsx(DownloadOutlined, {}), onClick: handleDescargarPlantilla, disabled: creando, children: "Descargar plantilla" }), _jsx(Checkbox, { checked: postear, onChange: (e) => setPostear(e.target.checked), disabled: creando, children: "Postear documentos" }), _jsx("div", { style: { flex: 1 } }), _jsx(Button, { type: "primary", icon: _jsx(CheckCircleOutlined, {}), onClick: handleCrearDocumentos, disabled: filas.length === 0 || creando, loading: creando, children: "Crear Documentos Bancarios" }), _jsx(Button, { icon: _jsx(DeleteOutlined, {}), onClick: handleEliminarTodo, disabled: filas.length === 0 || creando, danger: true, children: "Eliminar" })] }), nombreArchivo && (_jsx("div", { style: { marginBottom: 8 }, children: _jsxs(Text, { type: "secondary", style: { fontSize: 12 }, children: ["Archivo: ", nombreArchivo, " \u2014 ", filas.length, " filas"] }) })), creando && (_jsx("div", { style: { marginBottom: 16 }, children: _jsx(Progress, { percent: Math.round((progreso.actual / progreso.total) * 100), format: () => `${progreso.actual} / ${progreso.total}` }) }))] }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: filas, columns: columnas, rowKey: "key", size: "small", pagination: { pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} registros` }, scroll: { x: 1000 } }), _jsx(Modal, { open: !!resultado, onCancel: () => setResultado(null), title: "Resultado de importaci\u00F3n", width: 900, footer: [
                    _jsx(Button, { type: "primary", onClick: handleCerrarResultado, children: "Cerrar" }, "cerrar"),
                ], children: resultado && (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsxs(Text, { strong: true, children: ["Creados (", resultado.creados.length, ")"] }) }), _jsx(Table, { className: "paces-list-table", dataSource: resultado.creados, columns: columnasCreados, rowKey: "id", size: "small", pagination: { pageSize: 10, showSizeChanger: true, showTotal: (t) => `${t} registros` }, scroll: { x: 900 } }), resultado.errores.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { marginBottom: 8, marginTop: 16 }, children: _jsxs(Text, { strong: true, children: ["Errores (", resultado.errores.length, ")"] }) }), _jsx(Table, { className: "paces-list-table", dataSource: resultado.errores, rowKey: (_, index) => String(index), size: "small", pagination: false, columns: [
                                        {
                                            title: 'Fila', key: 'fila', width: 80,
                                            render: (_, record) => _jsx(Text, { children: record.fila.key }),
                                        },
                                        {
                                            title: 'Referencia', key: 'referencia', width: 130,
                                            render: (_, record) => _jsx(Text, { children: record.fila.referencia || '-' }),
                                        },
                                        {
                                            title: 'Monto', key: 'monto', width: 120, align: 'right',
                                            render: (_, record) => _jsx(Text, { children: formatNumber(record.fila.monto) }),
                                        },
                                        {
                                            title: 'Error', dataIndex: 'error', key: 'error',
                                            render: (v) => _jsx(Text, { type: "danger", children: v }),
                                        },
                                    ] })] }))] })) })] }));
};
export default ImportarDocBanco;
