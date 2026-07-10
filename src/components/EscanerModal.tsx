import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Select, Button, message, Spin, Space, Typography, Alert, Input } from 'antd';
import { ScanOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;
const SCANNER_AGENT_LOCAL_IP = import.meta.env.VITE_SCANNER_AGENT_IP || '';

const getScannerAgentUrl = () => {
  const localIP = localStorage.getItem('scannerAgentIP') || SCANNER_AGENT_LOCAL_IP || 'localhost';
  return `http://${localIP}:5123`;
};

interface ScannerInfo {
  id: string;
  name: string;
}

interface EscanerModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: () => void;
  filePath: string; // ej: \\server\ScannerPath\OrensePlaza\ENP\ENP-12345.pdf
  uploadEndpoint?: string; // endpoint de respaldo para upload
  sucursal?: number;
  id?: number;
}

const EscanerModal: React.FC<EscanerModalProps> = ({
  open, onClose, onScanned, filePath, uploadEndpoint, sucursal, id,
}) => {
  const [scanners, setScanners] = useState<ScannerInfo[]>([]);
  const [selectedScanner, setSelectedScanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null);
  const [localIPInput, setLocalIPInput] = useState('');

  // Verificar estado del Scanner Agent
  const checkAgent = useCallback(async () => {
    try {
      const res = await fetch(`${getScannerAgentUrl()}/api/status`, { signal: AbortSignal.timeout(2000) });
      setAgentOnline(res.ok);
      return res.ok;
    } catch {
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
    } catch {
      message.error('No se pudo conectar con el Scanner Agent');
      setScanners([]);
    } finally {
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
      } else {
        message.error(data.error || 'Error al escanear');
      }
    } catch {
      // Fallback: si el agente no responde, usar upload si está configurado
      message.error('Scanner Agent no disponible');
    } finally {
      setScanning(false);
    }
  };

  // Upload manual como respaldo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadEndpoint || !sucursal || !id) return;

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
      } else {
        message.error('Error al subir el archivo');
      }
    } catch {
      message.error('Error de conexión al servidor');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkAgent().then(online => {
        if (online) listScanners();
      });
    }
  }, [open, checkAgent, listScanners]);

  return (
    <Modal
      title="Escanear Documento"
      open={open}
      onCancel={onClose}
      footer={null}
      width={480}
      destroyOnClose
    >
      {agentOnline === false && (
        <>
          <Alert
            type="warning"
            showIcon
            message="Scanner Agent no detectado"
            description="Ingresa la IP de tu máquina donde corre el Scanner Agent"
            style={{ marginBottom: 16 }}
          />
          <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
            <Input
              placeholder="Ej: 192.168.1.50"
              value={localIPInput}
              onChange={(e) => setLocalIPInput(e.target.value)}
            />
            <Button
              type="primary"
              onClick={() => {
                if (localIPInput.trim()) {
                  localStorage.setItem('scannerAgentIP', localIPInput.trim());
                  setLocalIPInput('');
                  checkAgent();
                }
              }}
            >
              Conectar
            </Button>
          </Space.Compact>
          <div style={{ textAlign: 'center' }}>
            <Button size="small" onClick={() => { checkAgent(); listScanners(); }}>
              Reintentar
            </Button>
          </div>
        </>
      )}

      {agentOnline === true && (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Escáner disponible:</Text>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Select
                style={{ flex: 1 }}
                placeholder="Seleccionar escáner..."
                value={selectedScanner}
                onChange={setSelectedScanner}
                loading={loading}
                options={scanners.map(s => ({ value: s.id, label: s.name }))}
                notFoundContent={loading ? <Spin size="small" /> : 'No se encontraron escáneres'}
              />
              <Button icon={<ReloadOutlined />} onClick={listScanners} disabled={loading} />
            </div>
          </div>

          <Button
            type="primary"
            icon={<ScanOutlined />}
            onClick={handleScan}
            loading={scanning}
            disabled={!selectedScanner || scanners.length === 0}
            size="large"
            block
          >
            {scanning ? 'Escaneando...' : 'Escanear'}
          </Button>

          {uploadEndpoint && (
            <>
              <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
                ─ o subir archivo ─
              </Text>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="scan-file-upload"
              />
              <Button
                onClick={() => document.getElementById('scan-file-upload')?.click()}
                block
                disabled={scanning}
              >
                Subir archivo escaneado
              </Button>
            </>
          )}
        </Space>
      )}

      {agentOnline === null && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}><Text type="secondary">Conectando con Scanner Agent...</Text></div>
        </div>
      )}
    </Modal>
  );
};

export default EscanerModal;
