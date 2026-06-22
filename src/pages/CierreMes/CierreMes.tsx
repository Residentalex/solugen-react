import React, { useEffect, useState } from 'react';
import { Card, Table, DatePicker, message, Typography, Button, Alert } from 'antd';
import dayjs from 'dayjs';
import { cierreMesApi } from '../../api/cierreMesApi';
import type { CierreMesDTO } from '../../api/cierreMesApi';
import type { Dayjs } from 'dayjs';

const { Title } = Typography;

const CierreMes: React.FC = () => {
  const [datos, setDatos] = useState<CierreMesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [fechasEditadas, setFechasEditadas] = useState<Record<number, Dayjs>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const data = await cierreMesApi.obtenerListado();
      setDatos(data);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos');
      setLoadingError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleFechaChange = (sucursalId: number, date: dayjs.Dayjs | null) => {
    if (date) {
      setFechasEditadas(prev => ({ ...prev, [sucursalId]: date }));
    } else {
      setFechasEditadas(prev => {
        const newState = { ...prev };
        delete newState[sucursalId];
        return newState;
      });
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const entries = Object.entries(fechasEditadas);
    let errores = 0;

    for (const [sucursalId, date] of entries) {
      try {
        const fechaStr = date.format('YYYYMMDDHHmmss');
        await cierreMesApi.actualizarFecha(Number(sucursalId), fechaStr);
      } catch {
        errores++;
      }
    }

    setGuardando(false);

    if (errores === 0) {
      message.success(`${entries.length} fecha(s) actualizada(s) correctamente`);
      setFechasEditadas({});
      cargar();
    } else {
      message.error(`${errores} de ${entries.length} actualizaciones fallaron`);
    }
  };

  const columns = [
    {
      title: 'Sucursal',
      dataIndex: 'nombre',
      key: 'nombre',
    },
    {
      title: 'Fecha Último Cierre',
      dataIndex: 'fechaUltimoCierre',
      key: 'fechaUltimoCierre',
      render: (fecha: string | null, record: CierreMesDTO) => (
        <DatePicker
          value={fechasEditadas[record.sucursalId] || (fecha ? dayjs(fecha) : null)}
          onChange={(date) => handleFechaChange(record.sucursalId, date)}
          format="DD/MM/YYYY"
          style={{
            width: 160,
            borderColor: fechasEditadas[record.sucursalId] ? '#556ee6' : undefined,
          }}
        />
      ),
    },
  ];

  const cantCambios = Object.keys(fechasEditadas).length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Cierre de Mes</Title>
        {cantCambios > 0 && (
          <Button type="primary" onClick={handleGuardar} loading={guardando}>
            Guardar cambios ({cantCambios})
          </Button>
        )}
      </div>
      {loadingError && (
        <Alert
          message="Error al cargar datos"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={<Button onClick={cargar}>Reintentar</Button>}
        />
      )}
      <Card
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={datos}
          rowKey="sucursalId"
          loading={loading}
          pagination={false}
          className="paces-border-top paces-list-table"
          locale={{ emptyText: 'No hay sucursales activas' }}
        />
      </Card>
    </div>
  );
};

export default CierreMes;
