import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Checkbox, Button, Spin, Empty, Tag } from 'antd';
import { impuestoApi } from '../../api/impuestoApi';
import type { ImpuestoDTO } from '../../types/contabilidad';
import { toTitleCase } from '../../utils/formats';

export interface ImpuestoSeleccionado {
  codigo: string;
  idExterno: string;
  nombre: string;
  porcentaje: number;
  tipo: string; // 'Impuesto' | 'Retencion' | 'Informativo' | 'Otro'
  monto: number;
  noCuenta?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: ImpuestoSeleccionado[]) => void;
  tipoEntidad?: 'SUP' | 'CLI';
  sucursal: number;
  existentes?: ImpuestoSeleccionado[];
}

function mapTipoImpuesto(tipo: string): string {
  const map: Record<string, string> = {
    I: 'Impuesto',
    R: 'Retencion',
    V: 'Informativo',
    L: 'Otro',
  };
  return map[tipo] || 'Otro';
}

const SeleccionarImpuestosModal: React.FC<Props> = ({
  open, onClose, onConfirm, tipoEntidad, sucursal, existentes = [],
}) => {
  const [catalogo, setCatalogo] = useState<ImpuestoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelectedKeys(new Set(existentes.map((e) => e.codigo || e.idExterno)));

    const cargar = async () => {
      try {
        let lista: ImpuestoDTO[] = [];

        if (tipoEntidad === 'SUP') {
          // Solo compras
          lista = (await impuestoApi.obtenerParaCompras(sucursal)) || [];
        } else if (tipoEntidad === 'CLI') {
          // Solo ventas
          lista = (await impuestoApi.obtenerParaVentas(sucursal)) || [];
        } else {
          // Ambos — llamar a las dos APIs independientemente y deduplicar
          const [compras, ventas] = await Promise.all([
            impuestoApi.obtenerParaCompras(sucursal).catch(() => [] as ImpuestoDTO[]),
            impuestoApi.obtenerParaVentas(sucursal).catch(() => [] as ImpuestoDTO[]),
          ]);
          const mapa = new Map<string, ImpuestoDTO>();
          for (const imp of [...(compras || []), ...(ventas || [])]) {
            const key = imp.codigo || imp.idExterno;
            if (key && !mapa.has(key)) {
              mapa.set(key, imp);
            }
          }
          lista = Array.from(mapa.values());
        }

        setCatalogo(lista || []);
      } catch {
        setCatalogo([]);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [open, tipoEntidad, sucursal, existentes]);

  const handleConfirmar = useCallback(() => {
    const nuevos: ImpuestoSeleccionado[] = catalogo
      .filter((imp) => selectedKeys.has(imp.codigo || imp.idExterno))
      .map((imp) => ({
        codigo: imp.codigo,
        idExterno: imp.idExterno,
        nombre: imp.nombre,
        porcentaje: imp.porcentaje,
        tipo: mapTipoImpuesto(imp.tipo),
        monto: 0,
        noCuenta: imp.noCuenta || '',
      }));

    // Mezclar con existentes: conservar montos previos
    const mapaExistentes = new Map(existentes.map((e) => [e.codigo || e.idExterno, e.monto]));
    for (const n of nuevos) {
      if (mapaExistentes.has(n.codigo || n.idExterno)) {
        n.monto = mapaExistentes.get(n.codigo || n.idExterno)!;
      }
    }

    onConfirm(nuevos);
    onClose();
  }, [catalogo, selectedKeys, existentes, onConfirm, onClose]);

  const toggleKey = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  return (
    <Modal
      title="Seleccionar impuestos / retenciones"
      open={open}
      onCancel={onClose}
      width={680}
      footer={[
        <Button key="cancel" onClick={onClose}>Cancelar</Button>,
        <Button key="ok" type="primary" onClick={handleConfirmar} disabled={selectedKeys.size === 0}>
          Agregar seleccionados ({selectedKeys.size})
        </Button>,
      ]}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : catalogo.length === 0 ? (
        <Empty description="No hay impuestos disponibles" />
      ) : (
        <Table
          dataSource={catalogo}
          rowKey={(r) => r.codigo || r.idExterno}
          size="small"
          pagination={false}
          scroll={{ y: 400 }}
          columns={[
            {
              title: '',
              key: 'selection',
              width: 50,
              render: (_: any, record: ImpuestoDTO) => {
                const key = record.codigo || record.idExterno;
                return (
                  <Checkbox
                    checked={selectedKeys.has(key)}
                    onChange={(e) => toggleKey(key, e.target.checked)}
                  />
                );
              },
            },
            {
              title: 'Nombre',
              dataIndex: 'nombre',
              key: 'nombre',
              ellipsis: true,
              render: (v: string) => toTitleCase(v || ''),
            },
            {
              title: 'Tipo',
              key: 'tipo',
              width: 120,
              render: (_: any, record: ImpuestoDTO) => {
                const labels: Record<string, string> = {
                  I: 'Impuesto', R: 'Retención', V: 'Informativo', L: 'Liquidación',
                };
                return <Tag>{labels[record.tipo] || record.tipo}</Tag>;
              },
            },
            {
              title: '%',
              dataIndex: 'porcentaje',
              key: 'porcentaje',
              width: 80,
              align: 'right' as const,
              render: (v: number) => (v ? `${v}%` : '-'),
            },
          ]}
        />
      )}
    </Modal>
  );
};

export default SeleccionarImpuestosModal;
