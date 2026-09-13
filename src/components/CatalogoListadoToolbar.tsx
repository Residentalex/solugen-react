import React from 'react';
import { Input, Button } from 'antd';
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
}) => {
  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
        <Search
          placeholder={placeholder}
          allowClear
          onSearch={onSearch}
          style={{ width: 400 }}
          prefix={<SearchOutlined className="paces-text-icon" />}
        />
        {filtros}
        {!ocultarPageSize && <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />}
        <div style={{ flex: 1 }} />
        {onNuevo && (
          <PermissionGate accion="CREAR">
            <Button type="primary" icon={<PlusOutlined />} onClick={onNuevo}>
              Nuevo
            </Button>
          </PermissionGate>
        )}
        {acciones}
        {showClonar && onClonar && (
          <PermissionGate accion="CLONAR">
            <Button icon={<CopyOutlined />} disabled={clonarDisabled} onClick={onClonar} />
          </PermissionGate>
        )}
        {onExportarExcel && (
          <PermissionGate accion="EXPORTAR">
            <Button icon={<FileExcelOutlined />} onClick={onExportarExcel} />
          </PermissionGate>
        )}
        <Button icon={<ReloadOutlined />} onClick={onReload} />
      </div>
    </div>
  );
};

export default CatalogoListadoToolbar;
