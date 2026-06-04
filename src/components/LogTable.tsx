import React from 'react';
import { Table } from 'antd';
import { formatDate, toTitleCase } from '../utils/formats';

// Mapa de acciones (0-indexed, usado en todo el sistema)
export const ACCION_MAP: Record<number, string> = {
  0: 'Crear',
  1: 'Modificar',
  2: 'Eliminar',
  3: 'Aplicar',
  4: 'Desaplicar',
  5: 'Postear',
  6: 'Anular',
  7: 'Revisar',
  8: 'Reversar',
  9: 'Escanear',
};

interface LogEntry {
  id?: number;
  logid?: number;
  fecha: string;
  usuario?: { nombre?: string; nombreUsuario?: string };
  estacion?: string;
  accion: number;
  descripcion?: string;
  [key: string]: any;
}

interface LogTableProps {
  dataSource: LogEntry[];
  loading?: boolean;
  scroll?: { x?: number };
}

const LogTable: React.FC<LogTableProps> = ({ dataSource, loading, scroll }) => {
  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 200,
      render: (v: any) =>
        v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : '-',
    },
    {
      title: 'Acción',
      dataIndex: 'accion',
      key: 'accion',
      width: 120,
      render: (v: number) => ACCION_MAP[v] || `Acción ${v}`,
    },
    {
      title: 'Origen',
      dataIndex: 'estacion',
      key: 'estacion',
      width: 280,
      render: (v: string) => {
        if (!v) return '-';
        // Ya viene formateado como "desde PC-NAME Version 1.0.0" o "WEB v1.0.0"
        return v;
      },
    },
    {
      title: 'Motivos',
      key: 'motivos',
      ellipsis: true,
      render: (_: any, record: LogEntry) => {
        // Extraer version desde estacion: "WEB v1.0.0.0" o "desde PC-NAME Version 1.0.0.0"
        const versionMatch = record.estacion?.match(/v?(\d+\.\d+\.\d+(?:\.\d+)?)/);
        const version = versionMatch ? `v${versionMatch[1]}` : '';

        // Accion en texto legible
        const accionTexto = ACCION_MAP[record.accion] || `Acción ${record.accion}`;

        // Hora desde la fecha
        let hora = '';
        try {
          if (record.fecha) {
            const d = new Date(record.fecha);
            if (!isNaN(d.getTime())) {
              const h = d.getHours();
              const m = String(d.getMinutes()).padStart(2, '0');
              const s = String(d.getSeconds()).padStart(2, '0');
              const ampm = h >= 12 ? 'p. m.' : 'a. m.';
              const h12 = h % 12 || 12;
              hora = `${h12}:${m}:${s} ${ampm}`;
            }
          }
        } catch {}

        const partes = [version, accionTexto].filter(Boolean).join(' | ');

        if (!partes) return '-';

        let resultado = partes;
        if (hora) resultado += ` a las ${hora}`;

        return resultado;
      },
    },
  ];

  return (
    <Table
      dataSource={dataSource || []}
      columns={columns}
      rowKey={(record) => record.id || record.logid || Math.random().toString()}
      size="small"
      pagination={false}
      loading={loading}
      scroll={{ x: scroll?.x || 900 }}
    />
  );
};

export default LogTable;
