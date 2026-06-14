import React, { useState } from 'react';
import { DatePicker, Select, Button, Table, Typography, Space, message, Badge } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { transaccionApi, formatDateParam } from '../../api/transaccionApi';
import { useUIStore } from '../../stores/uiStore';
import type { TransaccionDTO } from '../../types/transaccion';
import { getMonedaSucursalActiva } from '../../utils/moneda';
import type { Sucursal } from '../../types/auth';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const TIPOS_DOCUMENTO = [
  { value: 'ENP', label: 'ENP - Entrada de Almacén' },
  { value: 'SAP', label: 'SAP - Salida de Almacén' },
  { value: 'FAC', label: 'FAC - Factura a Cliente' },
  { value: 'DEV', label: 'DEV - Devolución de Venta' },
  { value: 'DVC', label: 'DVC - Devolución de Compra' },
  { value: 'RDE', label: 'RDE - Factura de Suplidor' },
  { value: 'TRA', label: 'TRA - Transferencia' },
  { value: 'DEP', label: 'DEP - Documento Bancario' },
  { value: 'EDI', label: 'EDI - Entrada de Diario' },
];

interface Props {
  sucursal: Sucursal;
  tipoDoc: string;
  fechaDesde: string;
  fechaHasta: string;
  documentos: TransaccionDTO[];
  seleccionados: TransaccionDTO[];
  onTipoDocChange: (v: string) => void;
  onFechasChange: (desde: string, hasta: string) => void;
  onDocumentosChange: (docs: TransaccionDTO[]) => void;
  onSeleccionChange: (sel: TransaccionDTO[]) => void;
}

const PasoNoCuadrados: React.FC<Props> = ({
  sucursal,
  tipoDoc,
  fechaDesde,
  fechaHasta,
  documentos,
  seleccionados,
  onTipoDocChange,
  onFechasChange,
  onDocumentosChange,
  onSeleccionChange,
}) => {
  const [loading, setLoading] = useState(false);
  const primaryColor = useUIStore((s) => s.primaryColor);

  const handleBuscar = async () => {
    if (!fechaDesde || !fechaHasta) {
      message.warning('Seleccione un rango de fechas');
      return;
    }

    setLoading(true);
    try {
      const docs = await transaccionApi.obtenerNoCuadrados(
        sucursal,
        fechaDesde,
        fechaHasta,
        tipoDoc || undefined
      );
      onDocumentosChange(docs);
      onSeleccionChange([]);
      if (docs.length === 0) {
        message.info('No se encontraron documentos con asientos no cuadrados');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al buscar documentos');
    } finally {
      setLoading(false);
    }
  };

  const noCuadradosCount = documentos.filter(
    (d) => Math.abs(d.debitos - d.creditos) > 0.01
  ).length;

  const columns: ColumnsType<TransaccionDTO> = [
    {
      title: 'Documento',
      dataIndex: 'noDocumento',
      key: 'noDocumento',
      width: 150,
    },
    {
      title: 'Tipo',
      key: 'tipoDoc',
      width: 80,
      render: (_, r) => r.documento?.codigo || '-',
    },
    {
      title: 'Entidad',
      dataIndex: 'nombreEntidad',
      key: 'nombreEntidad',
      width: 200,
      render: (v) => v || '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (v) =>
        new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: getMonedaSucursalActiva().codigo,
        }).format(v),
    },
    {
      title: 'Débitos',
      dataIndex: 'debitos',
      key: 'debitos',
      width: 120,
      align: 'right',
      render: (v) =>
        new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: getMonedaSucursalActiva().codigo,
        }).format(v),
    },
    {
      title: 'Créditos',
      dataIndex: 'creditos',
      key: 'creditos',
      width: 120,
      align: 'right',
      render: (v) =>
        new Intl.NumberFormat('es-DO', {
          style: 'currency',
          currency: getMonedaSucursalActiva().codigo,
        }).format(v),
    },
    {
      title: 'Diferencia',
      key: 'diferencia',
      width: 120,
      align: 'right',
      render: (_, r) => {
        const diff = Math.abs(r.debitos - r.creditos);
        if (diff > 0.01) {
          return (
            <Badge
              count={new Intl.NumberFormat('es-DO', {
                style: 'currency',
                currency: getMonedaSucursalActiva().codigo,
              }).format(diff)}
              style={{ backgroundColor: '#ff4d4f', fontSize: 11 }}
              overflowCount={999999}
            />
          );
        }
        return (
          <Badge
            count="0.00"
            style={{ backgroundColor: '#52c41a', fontSize: 11 }}
            overflowCount={999999}
          />
        );
      },
    },
  ];

  return (
    <div>
      <Text
        style={{
          display: 'block',
          marginBottom: 24,
          fontSize: 16,
          color: primaryColor,
          fontWeight: 500,
        }}
      >
        Busque documentos con asientos no cuadrados
      </Text>

      {/* Panel de filtros */}
      <div className="repostear-filters-panel">
        <Space wrap size={12}>
          <Select
            placeholder="Tipo de documento (opcional)"
            value={tipoDoc || undefined}
            onChange={onTipoDocChange}
            allowClear
            style={{ width: 280 }}
            options={TIPOS_DOCUMENTO}
          />
          <RangePicker
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                const desde = formatDateParam(dates[0].toDate());
                const hasta = formatDateParam(dates[1].toDate());
                onFechasChange(desde, hasta);
              }
            }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleBuscar}
            loading={loading}
          >
            Buscar
          </Button>
        </Space>
      </div>

      {/* Resumen */}
      {documentos.length > 0 && (
        <div className="repostear-summary">
          <span>
            <Text strong>{documentos.length}</Text> documentos encontrados
          </span>
          <span>
            <Text strong style={{ color: noCuadradosCount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {noCuadradosCount}
            </Text> no cuadrados
          </span>
          {seleccionados.length > 0 && (
            <span>
              <Badge
                count={seleccionados.length}
                style={{ backgroundColor: primaryColor }}
              />{' '}
              seleccionados
            </span>
          )}
        </div>
      )}

      <Table
        rowKey="id"
        columns={columns}
        dataSource={documentos}
        loading={loading}
        size="small"
        pagination={{ pageSize: 50 }}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys: seleccionados.map((s) => s.id),
          onChange: (_, rows) => onSeleccionChange(rows as TransaccionDTO[]),
        }}
        scroll={{ x: 900 }}
        className="repostear-striped-table"
      />

      {seleccionados.length > 0 && (
        <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
          {seleccionados.length} documento(s) seleccionado(s)
        </Text>
      )}
    </div>
  );
};

export default PasoNoCuadrados;