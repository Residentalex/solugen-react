import React from 'react';
import { Button, DatePicker, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { ArrowLeftOutlined, SearchOutlined, FileExcelOutlined, FilePdfOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface ReporteToolbarProps {
  /** Navegar hacia atras */
  onVolver: () => void;
  /** Rango de fechas seleccionado */
  fechas?: [dayjs.Dayjs, dayjs.Dayjs] | null;
  /** Cambio de fechas */
  onFechasChange?: (fechas: [dayjs.Dayjs, dayjs.Dayjs] | null) => void;
  /** Ejecutar consulta */
  onConsultar: () => void;
  /** Estado de carga */
  loading?: boolean;
  /** Exportar a Excel */
  onExportarExcel?: () => void;
  /** Exportar a PDF (window.print) */
  onExportarPDF?: () => void;
  /** Estado de exportacion */
  exportando?: boolean;
  /** Filtros adicionales a la izquierda */
  extraLeft?: React.ReactNode;
}

const ReporteToolbar: React.FC<ReporteToolbarProps> = ({
  onVolver,
  fechas,
  onFechasChange,
  onConsultar,
  loading,
  onExportarExcel,
  onExportarPDF,
  exportando,
  extraLeft,
}) => {
  const exportMenu: MenuProps = {
    items: [
      ...(onExportarExcel
        ? [{ key: 'excel', icon: <FileExcelOutlined />, label: 'Exportar a Excel', onClick: onExportarExcel }]
        : []),
      ...(onExportarPDF
        ? [{ key: 'pdf', icon: <FilePdfOutlined />, label: 'Guardar como PDF', onClick: onExportarPDF }]
        : []),
    ],
  };

  const tieneExport = onExportarExcel || onExportarPDF;

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={onVolver}>Volver</Button>

      <div style={{ flex: 1 }} />

      {extraLeft}

      {fechas !== undefined && onFechasChange && (
        <RangePicker
          value={fechas}
          onChange={onFechasChange as any}
          format="YYYY-MM-DD"
          allowClear={false}
        />
      )}

      <Button type="primary" icon={<SearchOutlined />} onClick={onConsultar} loading={loading}>
        Consultar
      </Button>

      {tieneExport && (
        <Dropdown menu={exportMenu} trigger={['click']}>
          <Button loading={exportando}>
            <Space>
              <FileExcelOutlined />
              Exportar
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      )}
    </div>
  );
};

export default ReporteToolbar;
