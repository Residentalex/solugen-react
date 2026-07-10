import React, { useState } from 'react';
import { Button, Checkbox, Popover } from 'antd';
import { TableOutlined } from '@ant-design/icons';

export interface ColumnConfig {
  key: string;
  label: string;
  defaultVisible?: boolean;
}

interface ColumnVisibilityToggleProps {
  columns: ColumnConfig[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
}

const ColumnVisibilityToggle: React.FC<ColumnVisibilityToggleProps> = ({
  columns,
  visibleKeys,
  onChange,
}) => {
  const [open, setOpen] = useState(false);

  const allVisible = columns.length > 0 && columns.every((col) => visibleKeys.includes(col.key));
  const someVisible = !allVisible && visibleKeys.length > 0;

  const content = (
    <div style={{ width: 200, padding: 4 }}>
      <Checkbox
        indeterminate={someVisible}
        checked={allVisible}
        onChange={(e) => {
          if (e.target.checked) {
            onChange(columns.map((col) => col.key));
          } else {
            onChange([]);
          }
        }}
        style={{ marginBottom: 8, fontWeight: 600 }}
      >
        Todas
      </Checkbox>
      <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 8 }} />
      {columns.map((col) => (
        <div key={col.key} style={{ marginBottom: 4 }}>
          <Checkbox
            checked={visibleKeys.includes(col.key)}
            onChange={(e) => {
              if (e.target.checked) {
                onChange([...visibleKeys, col.key]);
              } else {
                onChange(visibleKeys.filter((k) => k !== col.key));
              }
            }}
          >
            {col.label}
          </Checkbox>
        </div>
      ))}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomRight"
      content={content}
    >
      <Button icon={<TableOutlined />}>
        Columnas
      </Button>
    </Popover>
  );
};

export default ColumnVisibilityToggle;
