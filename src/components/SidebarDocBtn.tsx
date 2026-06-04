import React from 'react';
import { BookOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

interface SidebarDocBtnProps {
  collapsed: boolean;
}

const SidebarDocBtn: React.FC<SidebarDocBtnProps> = ({ collapsed }) => {
  const handleClick = () => {
    window.open('/documentacion', '_blank');
  };

  const content = (
    <div className="sidebar-footer-btn" onClick={handleClick}>
      <BookOutlined />
      {!collapsed && <span className="footer-btn-text">Documentación</span>}
    </div>
  );

  if (collapsed) {
    return <Tooltip title="Documentación" placement="right">{content}</Tooltip>;
  }

  return content;
};

export default SidebarDocBtn;
