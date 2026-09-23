import React, { useEffect, useState } from 'react';
import { Card, Table, DatePicker, message, Typography, Button, Alert, Space, Tag } from 'antd';
import { FileExcelOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { cierreMesApi } from '../../api/cierreMesApi';
import type { CierreMesDTO } from '../../api/cierreMesApi';
import type { Dayjs } from 'dayjs';
import { useAuthStore } from '../../stores/authStore';
import PermissionGate from '../../components/PermissionGate';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';

const { Title, Text } = Typography;

const CierreMes: React.FC = () => {
  const [datos, setDatos] = useState<CierreMesDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [fechasEditadas, setFechasEditadas] = useState<Record<number, Dayjs>>({});
  const [guardando, setGuardando] = useState(false);
  const [erroresIds, setErroresIds] = useState<number[]>([]);

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

  const handleExportarExcel = async () => {
    const sucursalActiva = useAuthStore.getState().sucursalActiva;
    const companyName = await getCompanyName(sucursalActiva);
    const exportCols = columns.filter((col: any) => col.title && col.title !== '');
    const columnHeaders = exportCols.map((col: any) => col.title);
    const dataRows = datos.map((item: any) =>
      exportCols.map((col: any) => {
        const val = item[col.dataIndex];
        return val != null ? String(val) : '';
      })
    );
    exportToExcel({
      fileName: `CierreMes_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      sheetName: 'CierreMes',
      companyName,
      columnHeaders,
      dataRows,
    });
  };

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

  const handleReintentar = async () => {
    setGuardando(true);
    let erroresIdsTemp: number[] = [];
    const idsFallidas = erroresIds;

    for (const sucursalId of idsFallidas) {
      const date = fechasEditadas[sucursalId];
      if (!date) continue;
      try {
        const fechaStr = date.format('YYYYMMDDHHmmss');
        await cierreMesApi.actualizarFecha(sucursalId, fechaStr);
      } catch {
        erroresIdsTemp.push(sucursalId);
      }
    }

    setErroresIds(erroresIdsTemp);
    setGuardando(false);

    if (erroresIdsTemp.length === 0) {
      message.success(`${idsFallidas.length} fecha(s) reintentada(s) correctamente`);
      setFechasEditadas({});
      cargar();
    } else {
      message.error(`${erroresIdsTemp.length} de ${idsFallidas.length} reintentos fallaron`);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const entries = Object.entries(fechasEditadas);
    let erroresIdsTemp: number[] = [];

    for (const [sucursalId, date] of entries) {
      try {
        const fechaStr = date.format('YYYYMMDDHHmmss');
        await cierreMesApi.actualizarFecha(Number(sucursalId), fechaStr);
      } catch {
        erroresIdsTemp.push(Number(sucursalId));
      }
    }

    setErroresIds(erroresIdsTemp);
    setGuardando(false);

    if (erroresIdsTemp.length === 0) {
      message.success(`${entries.length} fecha(s) actualizada(s) correctamente`);
      setFechasEditadas({});
      cargar();
    } else {
      message.error(`${erroresIdsTemp.length} de ${entries.length} actualizaciones fallaron — quedan destacadas para reintento`);
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
        <Space>
          <DatePicker
            value={fechasEditadas[record.sucursalId] || (fecha ? dayjs(fecha) : null)}
            onChange={(date) => handleFechaChange(record.sucursalId, date)}
            format="DD/MM/YYYY"
            style={{
              width: 160,
              borderColor: fechasEditadas[record.sucursalId] ? '#556ee6' : erroresIds.includes(record.sucursalId) ? '#f46a6a' : undefined,
            }}
          />
          {fechasEditadas[record.sucursalId] && (
            <Tag color="processing" style={{ fontSize: 11, padding: '0 6px', borderRadius: 4 }}>Sin guardar</Tag>
          )}
          {erroresIds.includes(record.sucursalId) && (
            <Tag color="error" style={{ fontSize: 11, padding: '0 6px', borderRadius: 4 }}>Falló</Tag>
          )}
        </Space>
      ),
    },
  ];

  const cantCambios = Object.keys(fechasEditadas).length;

  return (
    <>
      {/* Encabezado normalizado */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>Cierre de Mes</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Gestión de fechas de cierre por sucursal
          </Text>
        </div>
        <div style={{ flex: 1 }} />
        <PermissionGate accion="EXPORTAR">
          <Button icon={<FileExcelOutlined />} onClick={handleExportarExcel} />
        </PermissionGate>
        <Button icon={<ReloadOutlined />} onClick={cargar} loading={loading} />
        {cantCambios > 0 && (
          <Tag color="processing" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
            {cantCambios} cambio{cantCambios !== 1 ? 's' : ''} sin guardar
          </Tag>
        )}
        {cantCambios > 0 && (
          <Button type="primary" onClick={handleGuardar} loading={guardando}>
            Guardar cambios ({cantCambios})
          </Button>
        )}
        {erroresIds.length > 0 && (
          <Button danger onClick={handleReintentar} loading={guardando} style={{ marginLeft: 8 }}>
            Reintentar fallidas ({erroresIds.length})
          </Button>
        )}
      </div>

      <div style={{ padding: '0 24px 24px' }}>
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
          rowClassName={(record: any) => {
            if (fechasEditadas[record.sucursalId]) {
              return 'paces-row-selected';
            }
            if (erroresIds.includes(record.sucursalId)) {
              return 'paces-row-error';
            }
            return 'paces-row-hover';
          }}
        />
      </Card>
    </div>
    </>
  );
};

export default CierreMes;
