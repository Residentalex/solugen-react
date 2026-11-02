import React, { useRef, useState } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileExcelOutlined, CopyOutlined } from '@ant-design/icons';
import PageSizeSelect from './PageSizeSelect';
import ToolbarAcciones from './ToolbarAcciones';
import type { ToolbarAccion } from './ToolbarAcciones';

const { Search } = Input;

interface CatalogoListadoToolbarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  ocultarPageSize?: boolean;
  filtros?: React.ReactNode;
  onNuevo?: () => void;
  acciones?: React.ReactNode;
  accionesItems?: ToolbarAccion[];
  showClonar?: boolean;
  clonarDisabled?: boolean;
  onClonar?: () => void;
  onReload: () => void;
  onExportarExcel?: () => void;
  exportando?: boolean;
  deshabilitado?: boolean;
}

const CatalogoListadoToolbar: React.FC<CatalogoListadoToolbarProps> = ({
  onSearch,
  placeholder = 'Buscar...',
  maxLength,
  pageSize,
  onPageSizeChange,
  ocultarPageSize = false,
  filtros,
  onNuevo,
  acciones,
  accionesItems,
  showClonar,
  clonarDisabled,
  onClonar,
  onReload,
  onExportarExcel,
  exportando = false,
  deshabilitado = false,
}) => {
  // El Input.Search es no controlado. Remontarlo garantiza el texto vacío al
  // limpiar con ESC en cualquier navegador (el borrado nativo de type="search"
  // no existe en todos) y permite liberar el filtro de verdad.
  const [searchKey, setSearchKey] = useState(0);
  const searchRef = useRef<InputRef>(null);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    setSearchKey((k) => k + 1);
    onSearch('');
    setTimeout(() => searchRef.current?.focus?.(), 0);
  };

  const accionesToolbar: ToolbarAccion[] = [
    ...(onNuevo
      ? [{
          key: 'nuevo',
          label: 'Nuevo',
          icon: <PlusOutlined />,
          tipo: 'primary' as const,
          onClick: onNuevo,
          permiso: { accion: 'CREAR' },
          prioridad: 100,
          disabled: deshabilitado,
        }]
      : []),
    {
      key: 'recargar',
      label: 'Actualizar',
      icon: <ReloadOutlined />,
      soloIcono: true,
      tooltip: 'Actualizar',
      onClick: onReload,
      prioridad: 90,
      disabled: deshabilitado,
    },
    ...(showClonar && onClonar
      ? [{
          key: 'clonar',
          label: 'Clonar',
          icon: <CopyOutlined />,
          soloIcono: true,
          tooltip: 'Clonar',
          onClick: onClonar,
          permiso: { accion: 'CLONAR' },
          prioridad: 80,
          disabled: clonarDisabled || deshabilitado,
        }]
      : []),
    ...(onExportarExcel
      ? [{
          key: 'exportar',
          label: 'Exportar a Excel',
          icon: <FileExcelOutlined />,
          soloIcono: true,
          tooltip: 'Exportar a Excel',
          loading: exportando,
          onClick: onExportarExcel,
          permiso: { accion: 'EXPORTAR' },
          prioridad: 70,
          disabled: deshabilitado,
        }]
      : []),
    ...(accionesItems ?? []).map((a) => ({ ...a, prioridad: a.prioridad ?? 50 })),
  ];

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Search
          key={searchKey}
          ref={searchRef}
          placeholder={placeholder}
          maxLength={maxLength}
          allowClear
          onSearch={onSearch}
          onKeyDown={handleSearchKeyDown}
          style={{ width: '100%', maxWidth: 400, minWidth: 200 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        {filtros}
        {!ocultarPageSize && <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />}
        <div style={{ flex: 1 }} />
        {acciones}
        <ToolbarAcciones acciones={accionesToolbar} />
      </div>
    </div>
  );
};

export default CatalogoListadoToolbar;
