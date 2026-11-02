import React from 'react';
import { Input } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, EditOutlined, CopyOutlined, PrinterOutlined, FileExcelOutlined } from '@ant-design/icons';
import FiltrosDocumento from './FiltrosDocumento/FiltrosDocumento';
import PageSizeSelect from './PageSizeSelect';
import ToolbarAcciones from './ToolbarAcciones';
import type { ToolbarAccion } from './ToolbarAcciones';

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

  accionesItems?: ToolbarAccion[];

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
  accionesItems,
  extraLeft,
  extraRight,
  extraToolbar,
}) => {
  const accionesToolbar: ToolbarAccion[] = [
    ...(showCrear && onCrear
      ? [{
          key: 'nuevo',
          label: 'Nuevo',
          icon: <PlusOutlined />,
          tipo: 'primary' as const,
          onClick: onCrear,
          permiso: { accion: 'CREAR' },
          prioridad: 100,
        }]
      : []),
    {
      key: 'recargar',
      label: 'Actualizar',
      icon: <ReloadOutlined />,
      soloIcono: true,
      tooltip: 'Actualizar',
      onClick: onRefresh,
      prioridad: 90,
    },
    ...(showEditar && onEditar
      ? [{
          key: 'editar',
          label: 'Editar',
          icon: <EditOutlined />,
          onClick: onEditar,
          permiso: { accion: 'EDITAR' },
          prioridad: 80,
          disabled: editarDisabled,
        }]
      : []),
    ...(showClonar && onClonar
      ? [{
          key: 'clonar',
          label: 'Clonar',
          icon: <CopyOutlined />,
          soloIcono: true,
          tooltip: 'Clonar',
          onClick: onClonar,
          permiso: { accion: 'CLONAR' },
          prioridad: 70,
          disabled: clonarDisabled,
        }]
      : []),
    ...(showImprimir && onImprimir
      ? [{
          key: 'imprimir',
          label: 'Imprimir',
          icon: <PrinterOutlined />,
          soloIcono: true,
          tooltip: 'Imprimir',
          onClick: onImprimir,
          permiso: { accion: 'IMPRIMIR' },
          prioridad: 60,
          disabled: imprimirDisabled,
        }]
      : []),
    ...(showExportarExcel && onExportarExcel
      ? [{
          key: 'exportar',
          label: 'Exportar a Excel',
          icon: <FileExcelOutlined />,
          soloIcono: true,
          tooltip: 'Exportar a Excel',
          onClick: onExportarExcel,
          permiso: { accion: 'EXPORTAR' },
          prioridad: 50,
          disabled: exportarExcelDisabled,
        }]
      : []),
    ...(accionesItems ?? []).map((a) => ({ ...a, prioridad: a.prioridad ?? 50 })),
  ];

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
        style={{ width: '100%', maxWidth: 400, minWidth: 200 }}
        prefix={<SearchOutlined className="paces-text-icon" />}
      />}
      <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      {extraToolbar}
      <div style={{ flex: 1 }} />
      <ToolbarAcciones acciones={accionesToolbar} />
      {extraRight}
    </div>
  );
};

export default DocumentListadoToolbar;
