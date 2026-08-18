import React, { useState } from 'react';
import { Modal, Checkbox, Button, Space, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { monitoreoApi } from '../../api/monitoreoApi';
import { TIPOS_SINCRONIZACION } from '../../types/monitoreo';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';

interface SyncModalProps {
  ip?: string;
  ipList?: string[];
  nombre?: string;
  open: boolean;
  onClose: () => void;
}

const SyncModal: React.FC<SyncModalProps> = ({ ip, ipList, nombre, open, onClose }) => {
  const [tiposSeleccionados, setTiposSeleccionados] = useState<CheckboxValueType[]>([]);
  const [syncAll, setSyncAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSyncAllChange = (e: any) => {
    const checked = e.target.checked;
    setSyncAll(checked);
    if (checked) {
      setTiposSeleccionados(TIPOS_SINCRONIZACION.map((t) => t.value));
    } else {
      setTiposSeleccionados([]);
    }
  };

  const handleTiposChange = (checkedValues: CheckboxValueType[]) => {
    setTiposSeleccionados(checkedValues);
    if (checkedValues.length === TIPOS_SINCRONIZACION.length) {
      setSyncAll(true);
    } else {
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
            tipos: tiposSeleccionados as string[],
            syncAll,
          });
          exitos++;
        } catch {
          errores++;
        }
      }
      const total = ipList.length;
      if (errores === 0) {
        message.success(`Comando de sincronización enviado a ${exitos} cajas`);
      } else if (exitos > 0) {
        message.warning(`Comando enviado a ${exitos} de ${total} cajas`);
      } else {
        message.error('Error al enviar comando de sincronización a las cajas');
      }
      onClose();
    } else if (ip) {
      try {
        await monitoreoApi.sincronizar(ip, {
          tipos: tiposSeleccionados as string[],
          syncAll,
        });
        message.success(`Sincronización iniciada para ${nombre}`);
        onClose();
      } catch (err: any) {
        message.error(err?.response?.data?.errorMessage || 'Error al iniciar sincronización');
      }
    }

    setLoading(false);
  };

  return (
    <Modal
      title={ipList ? 'Sincronizar - Todas las cajas' : `Sincronizar - ${nombre}`}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            loading={loading}
            onClick={handleSincronizar}
          >
            Sincronizar
          </Button>
        </Space>
      }
      width={420}
    >
      <div style={{ padding: '8px 0' }}>
        <Checkbox
          checked={syncAll}
          onChange={handleSyncAllChange}
          style={{ marginBottom: 12, fontWeight: 500 }}
        >
          Sincronizar todo
        </Checkbox>

        <Checkbox.Group
          options={TIPOS_SINCRONIZACION.map((t) => ({
            label: t.label,
            value: t.value,
          }))}
          value={tiposSeleccionados}
          onChange={handleTiposChange}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 24 }}
        />
      </div>
    </Modal>
  );
};

export default SyncModal;
