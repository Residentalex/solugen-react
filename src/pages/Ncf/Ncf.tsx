import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Switch, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { ncfApi } from '../../api/ncfApi';
import type { NcfCajaDTO, NcfRangoDTO } from '../../types/ncf';
import { useAuthStore } from '../../stores/authStore';
import { Select } from '../../components/Select';

type FilaNcf = NcfRangoDTO & {
  ip: string;
  noCaja: string;
  nombre: string;
  error: string;
};

const CRITICO_DISPONIBLES = 20;
const DIAS_AVISO_VENCIMIENTO = 30;

const fechaCorta = (valor: string | null): string => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const diasParaVencer = (valor: string | null): number | null => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return Math.ceil((fecha.getTime() - Date.now()) / 86_400_000);
};

type Nivel = 'rojo' | 'ambar' | 'verde';

const nivelRango = (r: NcfRangoDTO): Nivel => {
  const vencido = r.fechaVenc ? new Date(r.fechaVenc).getTime() < Date.now() : false;
  if (r.activo === 0 || r.disponibles <= 0 || vencido) return 'rojo';
  const dias = diasParaVencer(r.fechaVenc);
  if (r.disponibles < CRITICO_DISPONIBLES || (dias !== null && dias <= DIAS_AVISO_VENCIMIENTO)) {
    return 'ambar';
  }
  return 'verde';
};

const colorNivel: Record<Nivel, string> = {
  rojo: 'red',
  ambar: 'orange',
  verde: 'green',
};

const textoNivel: Record<Nivel, string> = {
  rojo: 'Crítico',
  ambar: 'Por agotarse',
  verde: 'OK',
};

export default function Ncf() {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursales = useAuthStore((s) => s.sucursalesPermitidas);

  const [sucursal, setSucursal] = useState<number>(Number(sucursalActiva));
  const [cajas, setCajas] = useState<NcfCajaDTO[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [soloCriticos, setSoloCriticos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await ncfApi.obtenerPorSucursal(sucursal);
      setCajas(data);
      setError(null);
    } catch (err) {
      const e = err as {
        response?: { data?: { errorMessage?: string } };
        message?: string;
      };
      setError(
        e?.response?.data?.errorMessage || e?.message || 'No se pudieron cargar los NCF.',
      );
    } finally {
      setCargando(false);
    }
  }, [sucursal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asincrona
    void cargar();
  }, [cargar]);

  const filas = useMemo<FilaNcf[]>(() => {
    const todas: FilaNcf[] = [];
    for (const caja of cajas) {
      if (caja.error) {
        todas.push({
          ip: caja.ip,
          noCaja: caja.noCaja,
          nombre: caja.nombre,
          error: caja.error,
          ncf1: '',
          tipo: '',
          usado: 0,
          cant: 0,
          disponibles: 0,
          activo: 0,
          fechaVenc: null,
        });
        continue;
      }
      for (const r of caja.rangos) {
        todas.push({ ...r, ip: caja.ip, noCaja: caja.noCaja, nombre: caja.nombre, error: '' });
      }
    }
    return todas;
  }, [cajas]);

  const filtradas = useMemo(() => {
    const busqueda = texto.trim().toLowerCase();
    return filas.filter((f) => {
      if (soloCriticos && !f.error && nivelRango(f) === 'verde') return false;
      if (!busqueda) return true;
      return (
        f.ip.toLowerCase().includes(busqueda) ||
        f.noCaja.toLowerCase().includes(busqueda) ||
        f.nombre.toLowerCase().includes(busqueda) ||
        f.ncf1.toLowerCase().includes(busqueda) ||
        f.tipo.toLowerCase().includes(busqueda)
      );
    });
  }, [filas, texto, soloCriticos]);

  const criticos = useMemo(
    () => filas.filter((f) => f.error || nivelRango(f) === 'rojo').length,
    [filas],
  );
  const porVencer = useMemo(
    () => filas.filter((f) => !f.error && nivelRango(f) === 'ambar').length,
    [filas],
  );

  const columnas: ColumnsType<FilaNcf> = [
    {
      title: 'Caja',
      key: 'caja',
      width: 170,
      render: (_, f) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <strong>{f.noCaja || '—'}</strong>
          <span style={{ fontSize: 11, color: '#8c8c8c' }}>{f.ip}</span>
        </div>
      ),
    },
    {
      title: 'NCF',
      dataIndex: 'ncf1',
      key: 'ncf1',
      width: 180,
      render: (valor: string, f) =>
        f.error ? <span style={{ color: '#cf1322' }}>Sin lectura</span> : <strong>{valor}</strong>,
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
      width: 80,
    },
    {
      title: 'Usado',
      dataIndex: 'usado',
      key: 'usado',
      width: 90,
      align: 'right',
    },
    {
      title: 'Cantidad',
      dataIndex: 'cant',
      key: 'cant',
      width: 100,
      align: 'right',
    },
    {
      title: 'Disponibles',
      dataIndex: 'disponibles',
      key: 'disponibles',
      width: 115,
      align: 'right',
      sorter: (a, b) => a.disponibles - b.disponibles,
      render: (valor: number, f) => {
        if (f.error) return '—';
        const nivel = nivelRango(f);
        return (
          <span
            style={{
              color: nivel === 'rojo' ? '#cf1322' : nivel === 'ambar' ? '#d46b08' : undefined,
              fontWeight: nivel === 'verde' ? 400 : 700,
            }}
          >
            {valor.toLocaleString('en-US')}
          </span>
        );
      },
    },
    {
      title: 'Vence',
      dataIndex: 'fechaVenc',
      key: 'fechaVenc',
      width: 120,
      render: (valor: string | null, f) => {
        if (f.error) return '—';
        const dias = diasParaVencer(valor);
        const vencido = dias !== null && dias < 0;
        return (
          <span style={{ color: vencido ? '#cf1322' : undefined }}>
            {fechaCorta(valor)}
            {dias !== null && dias >= 0 && dias <= DIAS_AVISO_VENCIMIENTO ? ` (${dias} d)` : ''}
          </span>
        );
      },
    },
    {
      title: 'Estado',
      key: 'estado',
      width: 140,
      render: (_, f) => {
        if (f.error) {
          return (
            <Tooltip title={f.error}>
              <Tag color="red">Sin conexión</Tag>
            </Tooltip>
          );
        }
        const nivel = nivelRango(f);
        return <Tag color={colorNivel[nivel]}>{textoNivel[nivel]}</Tag>;
      },
    },
  ];

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message="No se pudieron cargar los NCF"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {criticos > 0 && (
        <Alert
          type="error"
          showIcon
          message={`${criticos} rango(s) crítico(s)`}
          description="Agotados, inactivos o vencidos. La caja emitirá facturas sin NCF y sin QR."
          style={{ marginBottom: 16 }}
        />
      )}

      {porVencer > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${porVencer} rango(s) por agotarse`}
          description={`Quedan menos de ${CRITICO_DISPONIBLES} NCF o vencen en menos de ${DIAS_AVISO_VENCIMIENTO} días.`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: '16px 24px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <Input.Search
              placeholder="Buscar por caja, IP, NCF o tipo..."
              allowClear
              onSearch={setTexto}
              style={{ width: '100%', maxWidth: 400 }}
              prefix={<SearchOutlined className="paces-text-icon" />}
            />

            <Select
              value={sucursal}
              onChange={(valor) => setSucursal(Number(valor))}
              style={{ minWidth: 220 }}
              options={sucursales.map((s) => ({
                value: Number(s.sucursal),
                label: s.nombre || `Sucursal ${s.sucursal}`,
              }))}
            />

            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Switch checked={soloCriticos} onChange={setSoloCriticos} size="small" />
              Solo críticos
            </span>

            <div style={{ flex: 1 }} />

            <Button icon={<ReloadOutlined />} onClick={() => void cargar()} loading={cargando} />
          </div>
        </div>

        <Table<FilaNcf>
          className="paces-border-top paces-list-table"
          rowKey={(f) => `${f.ip}|${f.ncf1}|${f.tipo}`}
          columns={columnas}
          dataSource={filtradas}
          loading={cargando}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `${total} rangos`,
          }}
        />
      </Card>
    </>
  );
}
