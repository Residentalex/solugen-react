import React from 'react';
import { Select } from 'antd';

interface PageSizeSelectProps {
  value: number;
  onChange: (value: number) => void;
}

const PageSizeSelect: React.FC<PageSizeSelectProps> = ({ value, onChange }) => {
  return (
    <Select
      style={{ width: 65 }}
      value={value}
      onChange={onChange}
      options={[
        { value: 25, label: '25' },
        { value: 50, label: '50' },
        { value: 100, label: '100' },
      ]}
    />
  );
};

export default PageSizeSelect;
