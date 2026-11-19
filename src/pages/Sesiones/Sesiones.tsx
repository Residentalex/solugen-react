import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Input, Modal, Switch, Table, Tag, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CloseCircleOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { sesionesApi } from '../../api/sesionesApi';
import type { SesionFirebirdDTO } from '../../types/sesion';
import { useAuthStore } from '../../stores/authStore';
import { Select } from '../../components/Select';
import PermissionGate from '../../components/PermissionGate';

const REFRESCO_MS = 30_000;

const mensajeError = (
  err: unknown,
  porDefecto = 'No se pudieron cargar las sesiones.',
): string => {
  const e = err as {
    response?: { data?: { errorMessage?: string } };
    message?: string;
  };
  return e?.response?.data?.errorMessage || e?.message || porDefecto;
};

const fechaHora = (valor: string | null): string => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Sesiones() {
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const sucursales = useAuthStore((s) => s.sucursalesPermitidas);

  const [sucursal, setSucursal] = useState<number>(Number(sucursalActiva));
  const [filas, setFilas] = useState<SesionFirebirdDTO[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [soloInactivas, setSoloInactivas] = useState(false);
  const [cerrando, setCerrando] = useState<number | null>(null);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [cerrandoMasivo, setCerrandoMasivo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await sesionesApi.obtener(sucursal);
      setFilas(data);
      setSeleccionadas((prev) =>
        prev.filter((id) => data.some((f) => f.attachmentId === id)),
      );
      setError(null);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [sucursal]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asincrona
    void cargar();
  }, [cargar]);

  // Refresco automatico: las conexiones idle-in-transaction aparecen y
  // desaparecen sin aviso.
  useEffect(() => {
    const id = window.setInterval(() => {
      void cargar();
    }, REFRESCO_MS);
    return () => window.clearInterval(id);
  }, [cargar]);

  const filtradas = useMemo(() => {
    const busqueda = texto.trim().toLowerCase();
    return filas.filter((f) => {
      if (soloInactivas && !f.inactiva) return false;
      if (!busqueda) return true;
      return (
        f.usuario.toLowerCase().includes(busqueda) ||
        f.ip.toLowerCase().includes(busqueda) ||
        String(f.pid ?? '').includes(busqueda) ||
        String(f.attachmentId).includes(busqueda)
      );
    });
  }, [filas, texto, soloInactivas]);

  const inactivas = useMemo(() => filas.filter((f) => f.inactiva).length, [filas]);

  const cerrarSesion = (fila: SesionFirebirdDTO) => {
    Modal.confirm({
      title: 'Cerrar conexión',
      width: 520,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>
            Se va a desconectar la sesión de <strong>{fila.usuario || 'SYSDBA'}</strong> desde{' '}
            <strong>{fila.ip || 'local'}</strong>.
          </span>
          <span>
            Conexión <strong>#{fila.attachmentId}</strong> · PID{' '}
            <strong>{fila.pid ?? '—'}</strong>
          </span>
          <span style={{ color: '#cf1322' }}>
            Firebird hará rollback de todo lo que esa conexión tenga sin confirmar. Si es una caja
            en plena venta, esa operación se pierde.
          </span>
        </div>
      ),
      okText: 'Cerrar conexión',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      async onOk() {
        setCerrando(fila.attachmentId);
        try {
          await sesionesApi.cerrar(sucursal, fila.attachmentId);
          message.success(`Conexión #${fila.attachmentId} cerrada.`);
          await cargar();
        } catch (err) {
          message.error(mensajeError(err, 'No se pudo cerrar la conexión.'));
          throw err;
        } finally {
          setCerrando(null);
        }
      },
    });
  };

  const cerrarSeleccionadas = () => {
    const elegidas = filas.filter((f) => seleccionadas.includes(f.attachmentId));
    if (elegidas.length === 0) return;

    Modal.confirm({
      title: `Cerrar ${elegidas.length} conexión(es)`,
      width: 560,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Se van a desconectar estas sesiones:</span>
          <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 180, overflow: 'auto' }}>
            {elegidas.map((f) => (
              <li key={f.attachmentId}>
                <strong>{f.usuario || 'SYSDBA'}</strong> · {f.ip || 'local'} · PID{' '}
                {f.pid ?? '—'} · #{f.attachmentId}
              </li>
            ))}
          </ul>
          <span style={{ color: '#cf1322' }}>
            Firebird hará rollback de todo lo que cada conexión tenga sin confirmar. Si alguna es
            una caja en plena venta, esa operación se pierde.
          </span>
        </div>
      ),
      okText: `Cerrar ${elegidas.length}`,
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      async onOk() {
        setCerrandoMasivo(true);
        const errores: string[] = [];

        for (const fila of elegidas) {
          try {
            await sesionesApi.cerrar(sucursal, fila.attachmentId);
          } catch (err) {
            errores.push(`#${fila.attachmentId}: ${mensajeError(err, 'no se pudo cerrar')}`);
          }
        }

        setSeleccionadas([]);
        await cargar();
        setCerrandoMasivo(false);

        if (errores.length > 0) {
          message.warning(
            `Se cerraron ${elegidas.length - errores.length} de ${elegidas.length}. Fallaron: ${errores.join(' | ')}`,
          );
        } else {
          message.success(`${elegidas.length} conexión(es) cerrada(s).`);
        }
      },
    });
  };

  const columnas: ColumnsType<SesionFirebirdDTO> = [
    {
      title: 'Usuario',
      dataIndex: 'usuario',
      key: 'usuario',
      width: 150,
      fixed: 'left',
      render: (valor: string) => <strong>{valor || 'SYSDBA'}</strong>,
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 190,
      render: (valor: string) => valor || 'local',
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 80,
      render: (valor: number | null) => valor ?? '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 95,
      render: (valor: number) =>
        valor === 1 ? <Tag color="green">Activo</Tag> : <Tag>Idle</Tag>,
    },
    {
      title: 'Conectado',
      dataIndex: 'conectadoDesde',
      key: 'conectadoDesde',
      width: 145,
      render: (valor: string | null) => fechaHora(valor),
    },
    {
      title: 'Horas',
      dataIndex: 'horasAbierta',
      key: 'horasAbierta',
      width: 85,
      align: 'right',
      sorter: (a, b) => a.horasAbierta - b.horasAbierta,
      render: (valor: number) => (
        <span style={{ color: valor >= 1 ? '#cf1322' : undefined, fontWeight: valor >= 1 ? 700 : 400 }}>
          {valor.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Transacción',
      key: 'transaccion',
      width: 160,
      render: (_, fila) => {
        if (fila.transaccionesActivas === 0) return <Tag>Sin transacción</Tag>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Tag color={fila.inactiva ? 'red' : 'blue'}>
              {fila.transaccionesActivas} abierta(s)
            </Tag>
            {fila.inactiva && <Tag color="red">Idle in transaction</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Sentencia actual',
      dataIndex: 'sentenciaActual',
      key: 'sentenciaActual',
      width: 320,
      ellipsis: true,
      render: (valor: string) =>
        valor ? (
          <Tooltip title={valor}>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {valor.length > 80 ? `${valor.slice(0, 80)}…` : valor}
            </span>
          </Tooltip>
        ) : (
          <span style={{ color: '#8c8c8c' }}>—</span>
        ),
    },
    {
      title: 'Acción',
      key: 'accion',
      width: 105,
      align: 'center',
      fixed: 'right',
      render: (_, fila) => (
        <PermissionGate accion="EDITAR">
          <Button
            danger
            size="small"
            icon={<CloseCircleOutlined />}
            loading={cerrando === fila.attachmentId}
            onClick={() => cerrarSesion(fila)}
          >
            Cerrar
          </Button>
        </PermissionGate>
      ),
    },
  ];

  return (
    <>
      {error && (
        <Alert
          type="error"
          showIcon
          message="No se pudieron cargar las sesiones"
          description={error}
          style={{ marginBottom: 16 }}
        />
      )}

      {inactivas > 0 && (
        <Alert
          type="warning"
          showIcon
          message={`${inactivas} conexión(es) idle-in-transaction`}
          description="Tienen una transacción abierta sin ejecutar nada. Retienen locks y bloquean el mantenimiento de la base."
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
              placeholder="Buscar por usuario, IP, PID o conexión..."
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
              <Switch checked={soloInactivas} onChange={setSoloInactivas} size="small" />
              Solo inactivas
            </span>

            <div style={{ flex: 1 }} />

            <PermissionGate accion="EDITAR">
              <Button
                danger
                icon={<CloseCircleOutlined />}
                disabled={seleccionadas.length === 0}
                loading={cerrandoMasivo}
                onClick={cerrarSeleccionadas}
              >
                Cerrar seleccionadas
                {seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ''}
              </Button>
            </PermissionGate>

            <Button icon={<ReloadOutlined />} onClick={() => void cargar()} loading={cargando} />
          </div>
        </div>

        <Table<SesionFirebirdDTO>
          className="paces-border-top paces-list-table"
          rowKey="attachmentId"
          columns={columnas}
          dataSource={filtradas}
          loading={cargando}
          size="small"
          scroll={{ x: 1350 }}
          rowSelection={{
            selectedRowKeys: seleccionadas,
            onChange: (keys) => setSeleccionadas(keys.map((k) => Number(k))),
          }}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `${total} conexiones`,
          }}
        />
      </Card>
    </>
  );
}
