import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Tag, Typography, message, Spin, Button, Table, Empty } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { parametrosApi } from '../../api/parametrosApi';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface CierreInfo {
  label: string;
  fecha: string;
  color: 'success' | 'warning' | 'error' | 'default';
  estado: string;
  icon: React.ReactNode;
}

interface PeriodoRow {
  key: string;
  mes: string;
  cierreOp: string;
  cierreFis: string;
  estado: string;
  color: string;
}

const CierreFiscal: React.FC = () => {
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);
  const updateToolbar = useUIStore((s: any) => s.updateToolbar);
  const resetToolbar = useUIStore((s: any) => s.resetToolbar);
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);

  const [loading, setLoading] = useState(false);
  const [fechaCierre, setFechaCierre] = useState<string>('');
  const [fechaCierreFiscal, setFechaCierreFiscal] = useState<string>('');
  const [fechaCierreInv, setFechaCierreInv] = useState<string>('');

  const cargarDatos = useCallback(async () => {
    if (sucursalActiva === undefined) return;
    setLoading(true);
    try {
      const [op, fiscal, inv] = await Promise.all([
        parametrosApi.obtenerFechaCierre(sucursalActiva),
        parametrosApi.obtenerFechaCierreFiscal(sucursalActiva),
        parametrosApi.obtenerFechaCierreInventario(sucursalActiva),
      ]);
      setFechaCierre(op);
      setFechaCierreFiscal(fiscal);
      setFechaCierreInv(inv);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al cargar datos de cierre');
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva]);

  useEffect(() => {
    setActiveModule('RCIERREFISCAL');
    updateToolbar({});
    cargarDatos();
    return () => resetToolbar();
  }, [setActiveModule, updateToolbar, resetToolbar, cargarDatos]);

  const esCerrado = (fecha: string): boolean => {
    if (!fecha) return false;
    const d = new Date(fecha);
    const hoy = new Date();
    return d < new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  };

  const cierres: CierreInfo[] = [
    {
      label: 'Cierre Operacional',
      fecha: fechaCierre,
      color: esCerrado(fechaCierre) ? 'success' : 'warning',
      estado: esCerrado(fechaCierre) ? 'Cerrado' : 'Abierto',
      icon: esCerrado(fechaCierre) ? <LockOutlined /> : <CheckCircleOutlined />,
    },
    {
      label: 'Cierre Fiscal',
      fecha: fechaCierreFiscal,
      color: esCerrado(fechaCierreFiscal) ? 'success' : 'warning',
      estado: esCerrado(fechaCierreFiscal) ? 'Cerrado' : 'Abierto',
      icon: esCerrado(fechaCierreFiscal) ? <LockOutlined /> : <CheckCircleOutlined />,
    },
    {
      label: 'Cierre Inventario',
      fecha: fechaCierreInv,
      color: esCerrado(fechaCierreInv) ? 'success' : 'warning',
      estado: esCerrado(fechaCierreInv) ? 'Cerrado' : 'Abierto',
      icon: esCerrado(fechaCierreInv) ? <LockOutlined /> : <CheckCircleOutlined />,
    },
  ];

  // Generar últimos 6 meses como períodos de ejemplo
  const periodos: PeriodoRow[] = [];
  const hoy = new Date();
  for (let i = 0; i < 6; i++) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const mesNombre = mes.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    const cierreOp =
      i === 0
        ? fechaCierre
          ? formatDate(fechaCierre)
          : '-'
        : formatDate(new Date(mes.getFullYear(), mes.getMonth() + 1, 15).toISOString());
    const cierreFis =
      i === 0
        ? fechaCierreFiscal
          ? formatDate(fechaCierreFiscal)
          : '-'
        : formatDate(new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString());
    const cerrado = i > 0;
    periodos.push({
      key: String(i),
      mes: mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1),
      cierreOp,
      cierreFis,
      estado: cerrado ? 'Cerrado' : 'Abierto',
      color: cerrado ? 'success' : 'warning',
    });
  }

  const columnasPeriodo: ColumnsType<PeriodoRow> = [
    { title: 'Mes', dataIndex: 'mes', key: 'mes', width: 200 },
    { title: 'Cierre Operacional', dataIndex: 'cierreOp', key: 'cierreOp', width: 180 },
    { title: 'Cierre Fiscal', dataIndex: 'cierreFis', key: 'cierreFis', width: 180 },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (est: string, record: PeriodoRow) => <Tag color={record.color}>{est}</Tag>,
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Text type="secondary">Estado actual de los cierres del sistema</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={cargarDatos} loading={loading} />
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {cierres.map((c) => (
            <Col key={c.label} xs={24} sm={12} lg={8}>
              <Card className="paces-card" style={{ borderRadius: 8, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 32,
                    marginBottom: 8,
                    color: c.color === 'success' ? '#34c38f' : '#f1b44c',
                  }}
                >
                  {c.icon}
                </div>
                <Text style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  {c.label}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  {c.fecha ? formatDate(c.fecha) : '\u2014'}
                </Text>
                <Tag color={c.color}>{c.estado}</Tag>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          title="Últimos períodos"
          className="paces-card-erp"
          style={{ borderRadius: 8 }}
        >
          <Table<PeriodoRow>
            columns={columnasPeriodo}
            dataSource={periodos}
            rowKey="key"
            pagination={false}
            size="middle"
            locale={{ emptyText: <Empty description="No hay datos de períodos" /> }}
          />
        </Card>
      </Spin>
    </>
  );
};

export default CierreFiscal;
