import React, { useState, useEffect } from 'react';
import { Modal, Input, Card, Button, InputNumber, Divider, Spin, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { productoApi } from '../../api/productoApi';
import { useAuthStore } from '../../stores/authStore';

// ===== Tipos =====
export interface ScannerProducto {
  codigo: string;
  articulo: string;
  referencia: string;
  costo: number;
  cantidad?: number;
  familia?: any;
  medida?: any;
}

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producto: ScannerProducto) => void;
}

// ===== Helpers locales =====
function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const ScannerModal: React.FC<ScannerModalProps> = ({ open, onClose, onSelect }) => {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [productoEncontrado, setProductoEncontrado] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    if (open) {
      setCodigo('');
      setProductoEncontrado(null);
      setCantidad(1);
    }
  }, [open]);

  const handleBuscar = async () => {
    if (!codigo.trim()) return;
    setLoading(true);
    try {
      const res = await productoApi.obtenerDetalle(sucursalActiva, codigo.trim());
      setProductoEncontrado({
        codigo: res.idExterno || codigo,
        articulo: res.nombre,
        referencia: res.referenciaInterna || '',
        costo: res.ultimoCosto || 0,
        familia: res.familia,
        medida: res.unidadMedida
          ? { nombre: res.unidadMedida.nombre || '', codigo: '', factor: 1, idExterno: res.unidadMedida.idExterno || 0 }
          : undefined,
      });
    } catch {
      message.error('Producto no encontrado');
      setProductoEncontrado(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAgregar = () => {
    if (!productoEncontrado) return;
    onSelect({ ...productoEncontrado, cantidad: cantidad || 1 });
    onClose();
  };

  return (
    <Modal
      title="Scanner - Código de Barras"
      open={open}
      onCancel={onClose}
      footer={null}
      width={450}
      destroyOnHidden
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input
          size="large"
          placeholder="Escanea o digita el código..."
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onPressEnter={handleBuscar}
          suffix={loading ? <Spin size="small" /> : <SearchOutlined />}
          autoFocus
          style={{ fontFamily: 'monospace', fontSize: 16 }}
        />

        {productoEncontrado && (
          <Card className="paces-card" size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><strong>Código:</strong> {productoEncontrado.codigo}</div>
              <div><strong>Artículo:</strong> {toTitleCase(productoEncontrado.articulo)}</div>
              {productoEncontrado.referencia && (
                <div><strong>Ref:</strong> {productoEncontrado.referencia}</div>
              )}
              <div><strong>Costo:</strong> {formatNumber(productoEncontrado.costo)}</div>
              {productoEncontrado.familia && (
                <div><strong>Familia:</strong> {productoEncontrado.familia.nombre || productoEncontrado.familia}</div>
              )}
              <Divider style={{ margin: '4px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>Cantidad:</span>
                <InputNumber
                  size="small"
                  style={{ width: 120 }}
                  styles={{ input: { textAlign: 'right' } }}
                  min={0.01}
                  step={0.01}
                  precision={2}
                  controls={false}
                  value={cantidad}
                  onChange={(val) => setCantidad(val || 1)}
                  onPressEnter={handleAgregar}
                />
                <Button type="primary" onClick={handleAgregar}>
                  Agregar
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default ScannerModal;
