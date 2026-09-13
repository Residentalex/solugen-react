import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, CopyOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import FiltrosDocumento from './FiltrosDocumento/FiltrosDocumento';
import PageSizeSelect from './PageSizeSelect';
import PermissionGate from './PermissionGate';

const { Search } = Input;

interface DocumentListadoToolbarProps {
  showFiltros?: boolean;
  filtros?: { desde?: string; hasta?: string; estado?: string | number };
  rangoDefault?: { desde: string; hasta: string };
  opcionesEstado?: { value: string | number; label: string }[];
  onFiltrosAplicar?: (filtros: any) => void;

  searchPlaceholder?: string;
  searchDefaultValue?: string;
  onSearch: (value: string) => void;

  pageSize: number;
  onPageSizeChange: (value: number) => void;

  showCrear?: boolean;
  onCrear?: () => void;

  showEditar?: boolean;
  editarDisabled?: boolean;
  onEditar?: () => void;

  showClonar?: boolean;
  clonarDisabled?: boolean;
  onClonar?: () => void;

  showImprimir?: boolean;
  imprimirDisabled?: boolean;
  onImprimir?: () => void;
  showExportarExcel?: boolean;
  exportarExcelDisabled?: boolean;
  onExportarExcel?: () => void;
  ocultarSearch?: boolean;
  onRefresh: () => void;

  extraLeft?: React.ReactNode;
  extraRight?: React.ReactNode;
  extraToolbar?: React.ReactNode;
}

const DocumentListadoToolbar: React.FC<DocumentListadoToolbarProps> = ({
  showFiltros,
  filtros,
  rangoDefault,
  opcionesEstado,
  onFiltrosAplicar,
  searchPlaceholder = 'Buscar...',
  searchDefaultValue,
  onSearch,
  pageSize,
  onPageSizeChange,
  showCrear,
  onCrear,
  showEditar,
  editarDisabled,
  onEditar,
  showClonar,
  clonarDisabled,
  onClonar,
  showImprimir,
  imprimirDisabled,
  onImprimir,
  showExportarExcel,
  exportarExcelDisabled,
  onExportarExcel,
  ocultarSearch,
  onRefresh,
  extraLeft,
  extraRight,
  extraToolbar,
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: 16,
      flexWrap: 'wrap',
    }}>
      {extraLeft}
      {showFiltros && filtros && onFiltrosAplicar && (
        <FiltrosDocumento
          filtros={filtros}
          onAplicar={onFiltrosAplicar}
          opcionesEstado={opcionesEstado || []}
          rangoDefault={rangoDefault}
        />
      )}
      {!ocultarSearch && <Search
        placeholder={searchPlaceholder}
        allowClear
        defaultValue={searchDefaultValue}
        onSearch={onSearch}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            (e.target as HTMLInputElement).blur();
            onSearch('');
          }
        }}
        style={{ width: 400 }}
        prefix={<SearchOutlined className="paces-text-icon" />}
      />}
      <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      {extraToolbar}
      <div style={{ flex: 1 }} />
      {showCrear && onCrear && (
        <PermissionGate accion="CREAR">
          <Button type="primary" icon={<PlusOutlined />} onClick={onCrear}>
            Nuevo
          </Button>
        </PermissionGate>
      )}
      {showEditar && onEditar && (
        <PermissionGate accion="EDITAR">
          <Button icon={<EditOutlined />} disabled={editarDisabled} onClick={onEditar}>
            Editar
          </Button>
        </PermissionGate>
      )}
      {showClonar && onClonar && (
        <PermissionGate accion="CREAR">
          <Button icon={<CopyOutlined />} disabled={clonarDisabled} onClick={onClonar} />
        </PermissionGate>
      )}
      {showImprimir && onImprimir && (
        <PermissionGate accion="IMPRIMIR">
          <Button icon={<PrinterOutlined />} onClick={onImprimir} disabled={imprimirDisabled} />
        </PermissionGate>
      )}
      {showExportarExcel && onExportarExcel && (
        <PermissionGate accion="EXPORTAR">
          <Button icon={<FileExcelOutlined />} onClick={onExportarExcel} disabled={exportarExcelDisabled} />
        </PermissionGate>
      )}
      <Button icon={<ReloadOutlined />} onClick={onRefresh} />
      {extraRight}
    </div>
  );
};

export default DocumentListadoToolbar;
