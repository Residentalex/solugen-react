import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Select, Button, message, Spin, Space, Typography, Alert, Input } from 'antd';
import { ScanOutlined, ReloadOutlined } from '@ant-design/icons';
const { Text } = Typography;
const SCANNER_AGENT_LOCAL_IP = import.meta.env.VITE_SCANNER_AGENT_IP || '';
const getScannerAgentUrl = () => {
    const localIP = localStorage.getItem('scannerAgentIP') || SCANNER_AGENT_LOCAL_IP || 'localhost';
    return `http://${localIP}:5123`;
};
const EscanerModal = ({ open, onClose, onScanned, filePath, uploadEndpoint, sucursal, id, }) => {
    const [scanners, setScanners] = useState([]);
    const [selectedScanner, setSelectedScanner] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [agentOnline, setAgentOnline] = useState(null);
    const [localIPInput, setLocalIPInput] = useState('');
    // Verificar estado del Scanner Agent
    const checkAgent = useCallback(async () => {
        try {
            const res = await fetch(`${getScannerAgentUrl()}/api/status`, { signal: AbortSignal.timeout(2000) });
            setAgentOnline(res.ok);
            return res.ok;
        }
        catch {
            setAgentOnline(false);
            return false;
        }
    }, []);
    // Listar escáneres
    const listScanners = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${getScannerAgentUrl()}/api/scanners`);
            const data = await res.json();
            setScanners(data.scanners || []);
            if (data.scanners?.length > 0 && !selectedScanner) {
                setSelectedScanner(data.scanners[0].id);
            }
        }
        catch {
            message.error('No se pudo conectar con el Scanner Agent');
            setScanners([]);
        }
        finally {
            setLoading(false);
        }
    }, [selectedScanner]);
    // Escanear
    const handleScan = async () => {
        if (!selectedScanner) {
            message.warning('Selecciona un escáner');
            return;
        }
        setScanning(true);
        try {
            const res = await fetch(`${getScannerAgentUrl()}/api/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scannerId: selectedScanner,
                    filePath: filePath,
                    format: 'jpg',
                }),
            });
            const data = await res.json();
            if (data.success) {
                message.success('Documento escaneado exitosamente');
                onScanned();
                onClose();
            }
            else {
                message.error(data.error || 'Error al escanear');
            }
        }
        catch {
            // Fallback: si el agente no responde, usar upload si está configurado
            message.error('Scanner Agent no disponible');
        }
        finally {
            setScanning(false);
        }
    };
    // Upload manual como respaldo
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadEndpoint || !sucursal || !id)
            return;
        const formData = new FormData();
        formData.append('file', file);
        setScanning(true);
        try {
            const res = await fetch(uploadEndpoint, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                message.success('Archivo subido exitosamente');
                onScanned();
                onClose();
            }
            else {
                message.error('Error al subir el archivo');
            }
        }
        catch {
            message.error('Error de conexión al servidor');
        }
        finally {
            setScanning(false);
        }
    };
    useEffect(() => {
        if (open) {
            checkAgent().then(online => {
                if (online)
                    listScanners();
            });
        }
    }, [open, checkAgent, listScanners]);
    return (_jsxs(Modal, { title: "Escanear Documento", open: open, onCancel: onClose, footer: null, width: 480, destroyOnClose: true, children: [agentOnline === false && (_jsxs(_Fragment, { children: [_jsx(Alert, { type: "warning", showIcon: true, message: "Scanner Agent no detectado", description: "Ingresa la IP de tu m\u00E1quina donde corre el Scanner Agent", style: { marginBottom: 16 } }), _jsxs(Space.Compact, { style: { width: '100%', marginBottom: 12 }, children: [_jsx(Input, { placeholder: "Ej: 192.168.1.50", value: localIPInput, onChange: (e) => setLocalIPInput(e.target.value) }), _jsx(Button, { type: "primary", onClick: () => {
                                    if (localIPInput.trim()) {
                                        localStorage.setItem('scannerAgentIP', localIPInput.trim());
                                        setLocalIPInput('');
                                        checkAgent();
                                    }
                                }, children: "Conectar" })] }), _jsx("div", { style: { textAlign: 'center' }, children: _jsx(Button, { size: "small", onClick: () => { checkAgent(); listScanners(); }, children: "Reintentar" }) })] })), agentOnline === true && (_jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: "middle", children: [_jsxs("div", { children: [_jsx(Text, { strong: true, children: "Esc\u00E1ner disponible:" }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 4 }, children: [_jsx(Select, { style: { flex: 1 }, placeholder: "Seleccionar esc\u00E1ner...", value: selectedScanner, onChange: setSelectedScanner, loading: loading, options: scanners.map(s => ({ value: s.id, label: s.name })), notFoundContent: loading ? _jsx(Spin, { size: "small" }) : 'No se encontraron escáneres' }), _jsx(Button, { icon: _jsx(ReloadOutlined, {}), onClick: listScanners, disabled: loading })] })] }), _jsx(Button, { type: "primary", icon: _jsx(ScanOutlined, {}), onClick: handleScan, loading: scanning, disabled: !selectedScanner || scanners.length === 0, size: "large", block: true, children: scanning ? 'Escaneando...' : 'Escanear' }), uploadEndpoint && (_jsxs(_Fragment, { children: [_jsx(Text, { type: "secondary", style: { textAlign: 'center', display: 'block' }, children: "\u2500 o subir archivo \u2500" }), _jsx("input", { type: "file", accept: "image/*,.pdf", onChange: handleFileUpload, style: { display: 'none' }, id: "scan-file-upload" }), _jsx(Button, { onClick: () => document.getElementById('scan-file-upload')?.click(), block: true, disabled: scanning, children: "Subir archivo escaneado" })] }))] })), agentOnline === null && (_jsxs("div", { style: { textAlign: 'center', padding: 24 }, children: [_jsx(Spin, {}), _jsx("div", { style: { marginTop: 8 }, children: _jsx(Text, { type: "secondary", children: "Conectando con Scanner Agent..." }) })] }))] }));
};
export default EscanerModal;
