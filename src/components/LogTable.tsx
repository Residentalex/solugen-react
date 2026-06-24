import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Empty } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
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

export const ACCION_TAG_COLOR_MAP: Record<number, string> = {
  0: 'success', 1: 'processing', 2: 'error', 3: 'success',
  4: 'warning', 5: 'processing', 6: 'error', 7: 'cyan',
  8: 'orange', 9: 'default',
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
  const sortedData = useMemo(() => {
    if (!dataSource) return [];
    return [...dataSource].sort((a, b) => {
      const dateA = new Date(a.fecha).getTime();
      const dateB = new Date(b.fecha).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const idA = a.logid ?? a.id ?? 0;
      const idB = b.logid ?? b.id ?? 0;
      return idB - idA;
    });
  }, [dataSource]);

  const columns = [
    {
      title: 'Fecha / Hora',
      dataIndex: 'fecha',
      key: 'fecha',
      width: 160,
      render: (v: string) => {
        if (!v) return '-';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '-';
        const h = d.getHours();
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const ampm = h >= 12 ? 'p. m.' : 'a. m.';
        const h12 = h % 12 || 12;
        const hora = `${h12}:${m}:${s} ${ampm}`;
        return (
          <div>
            <div style={{ fontSize: 13 }}>{formatDate(v)}</div>
            <div className="paces-text-secondary" style={{ fontSize: 11 }}>{hora}</div>
          </div>
        );
      },
    },
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 240,
      render: (v: any) => {
        const nombre = v?.nombre ? toTitleCase(v.nombre) : v?.nombreUsuario ? toTitleCase(v.nombreUsuario) : null;
        const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="paces-avatar-initials" style={{ background: 'var(--paces-hover-bg)', color: 'var(--paces-primary)', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
              {inicial}
            </div>
            <span style={{ fontSize: 13 }}>{nombre || '-'}</span>
          </div>
        );
      },
    },
    {
      title: 'Acción',
      dataIndex: 'accion',
      key: 'accion',
      width: 130,
      render: (v: number) => (
        <Tag color={ACCION_TAG_COLOR_MAP[v] ?? 'default'} style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
          {ACCION_MAP[v] || `Acción ${v}`}
        </Tag>
      ),
    },
    {
      title: 'Origen',
      key: 'origen',
      render: (_: any, record: LogEntry) => {
        const esWeb = record.estacion?.toUpperCase().includes('WEB') ?? false;
        const canal = esWeb ? 'WEB' : 'Desktop';
        const canalColor = esWeb ? 'geekblue' : 'purple';
        const versionMatch = record.estacion?.match(/v?(\d+\.\d+\.\d+(?:\.\d+)?)/);
        const version = versionMatch ? `v${versionMatch[1]}` : '';
        let nombreEstacion = '';
        if (!esWeb && record.estacion) {
          const match = record.estacion.match(/desde\s+(.+?)\s+[Vv]ersion/i);
          if (match) nombreEstacion = match[1].trim();
          else if (record.estacion) nombreEstacion = record.estacion.replace(/v?\d+\.\d+\.\d+(?:\.\d+)?/g, '').trim();
        }
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: record.descripcion ? 4 : 0 }}>
              <Tooltip title={version ? `Versión ${version}` : undefined}>
                <Tag color={canalColor} style={{ fontSize: 10, lineHeight: '16px', padding: '0 5px', cursor: version ? 'help' : 'default' }}>
                  {canal}
                </Tag>
              </Tooltip>
              {nombreEstacion && (
                <span className="paces-text-secondary" style={{ fontSize: 12 }}>{nombreEstacion}</span>
              )}
            </div>
            {record.descripcion && (
              <div className="paces-text-secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>{record.descripcion}</div>
            )}
          </div>
        );
      },
    },
  ];

  // Modo tabla
  return (
    <Table
      dataSource={sortedData}
      columns={columns}
      rowKey={(record) => String(record.id ?? record.logid ?? `${record.fecha}-${record.accion}-${record.usuario?.nombreUsuario ?? ''}`)}
      size="small"
      pagination={false}
      loading={loading}
      scroll={{ x: scroll?.x || 900 }}
      locale={{
        emptyText: (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <HistoryOutlined style={{ fontSize: 28, color: 'var(--paces-text-secondary)', marginBottom: 8, display: 'block' }} />
            <div className="paces-text-secondary" style={{ fontSize: 13 }}>Sin registros de historial</div>
          </div>
        ),
      }}
    />
  );
};

export default LogTable;
