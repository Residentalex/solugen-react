import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
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
  onReload: () => void;
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
  onReload,
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
        <Button icon={<ReloadOutlined />} onClick={onReload} />
      </div>
    </div>
  );
};

export default CatalogoListadoToolbar;
