import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Modal, Checkbox, Button, Space, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { monitoreoApi } from '../../api/monitoreoApi';
import { TIPOS_SINCRONIZACION } from '../../types/monitoreo';
const SyncModal = ({ ip, ipList, nombre, open, onClose }) => {
    const [tiposSeleccionados, setTiposSeleccionados] = useState([]);
    const [syncAll, setSyncAll] = useState(false);
    const [loading, setLoading] = useState(false);
    const handleSyncAllChange = (e) => {
        const checked = e.target.checked;
        setSyncAll(checked);
        if (checked) {
            setTiposSeleccionados(TIPOS_SINCRONIZACION.map((t) => t.value));
        }
        else {
            setTiposSeleccionados([]);
        }
    };
    const handleTiposChange = (checkedValues) => {
        setTiposSeleccionados(checkedValues);
        if (checkedValues.length === TIPOS_SINCRONIZACION.length) {
            setSyncAll(true);
        }
        else {
            setSyncAll(false);
        }
    };
    const handleSincronizar = async () => {
        if (tiposSeleccionados.length === 0) {
            message.warning('Seleccione al menos un tipo para sincronizar');
            return;
        }
        setLoading(true);
        if (ipList && ipList.length > 0) {
            let exitos = 0;
            let errores = 0;
            for (const itemIp of ipList) {
                try {
                    await monitoreoApi.sincronizar(itemIp, {
                        tipos: tiposSeleccionados,
                        syncAll,
                    });
                    exitos++;
                }
                catch {
                    errores++;
                }
            }
            const total = ipList.length;
            if (errores === 0) {
                message.success(`Comando de sincronización enviado a ${exitos} cajas`);
            }
            else if (exitos > 0) {
                message.warning(`Comando enviado a ${exitos} de ${total} cajas`);
            }
            else {
                message.error('Error al enviar comando de sincronización a las cajas');
            }
            onClose();
        }
        else if (ip) {
            try {
                await monitoreoApi.sincronizar(ip, {
                    tipos: tiposSeleccionados,
                    syncAll,
                });
                message.success(`Sincronización iniciada para ${nombre}`);
                onClose();
            }
            catch (err) {
                message.error(err?.response?.data?.errorMessage || 'Error al iniciar sincronización');
            }
        }
        setLoading(false);
    };
    return (_jsx(Modal, { title: ipList ? 'Sincronizar - Todas las cajas' : `Sincronizar - ${nombre}`, open: open, onCancel: onClose, footer: _jsxs(Space, { children: [_jsx(Button, { onClick: onClose, children: "Cancelar" }), _jsx(Button, { type: "primary", icon: _jsx(SyncOutlined, {}), loading: loading, onClick: handleSincronizar, children: "Sincronizar" })] }), width: 420, children: _jsxs("div", { style: { padding: '8px 0' }, children: [_jsx(Checkbox, { checked: syncAll, onChange: handleSyncAllChange, style: { marginBottom: 12, fontWeight: 500 }, children: "Sincronizar todo" }), _jsx(Checkbox.Group, { options: TIPOS_SINCRONIZACION.map((t) => ({
                        label: t.label,
                        value: t.value,
                    })), value: tiposSeleccionados, onChange: handleTiposChange, style: { display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 24 } })] }) }));
};
export default SyncModal;
