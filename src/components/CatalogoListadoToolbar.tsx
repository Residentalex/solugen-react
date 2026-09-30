import React, { useRef, useState } from 'react';
import { Input, Button, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined, FileExcelOutlined, CopyOutlined } from '@ant-design/icons';
import PageSizeSelect from './PageSizeSelect';
import PermissionGate from './PermissionGate';

const { Search } = Input;

interface CatalogoListadoToolbarProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  ocultarPageSize?: boolean;
  filtros?: React.ReactNode;
  onNuevo?: () => void;
  acciones?: React.ReactNode;
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
  pageSize,
  onPageSizeChange,
  ocultarPageSize = false,
  filtros,
  onNuevo,
  acciones,
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

  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Search
          key={searchKey}
          ref={searchRef}
          placeholder={placeholder}
          allowClear
          onSearch={onSearch}
          onKeyDown={handleSearchKeyDown}
          style={{ width: '100%', maxWidth: 400, minWidth: 200 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        {filtros}
        {!ocultarPageSize && <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />}
        <div style={{ flex: 1 }} />
        {onNuevo && (
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={onNuevo} disabled={deshabilitado}>
              Nuevo
            </Button>
          </PermissionGate>
        )}
        {acciones}
        {showClonar && onClonar && (
          <PermissionGate accion="CLONAR">
            <Tooltip title="Clonar">
              <Button icon={<CopyOutlined />} aria-label="Clonar" disabled={clonarDisabled || deshabilitado} onClick={onClonar} />
            </Tooltip>
          </PermissionGate>
        )}
        {onExportarExcel && (
          <PermissionGate accion="EXPORTAR">
            <Tooltip title="Exportar a Excel">
              <Button
                icon={<FileExcelOutlined />}
                aria-label="Exportar a Excel"
                onClick={onExportarExcel}
                disabled={deshabilitado}
                loading={exportando}
              />
            </Tooltip>
          </PermissionGate>
        )}
        <Tooltip title="Actualizar">
          <Button icon={<ReloadOutlined />} aria-label="Actualizar" onClick={onReload} disabled={deshabilitado} />
        </Tooltip>
      </div>
    </div>
  );
};

export default CatalogoListadoToolbar;
