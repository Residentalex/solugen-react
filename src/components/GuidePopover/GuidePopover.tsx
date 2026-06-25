import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Popover } from 'antd';

interface GuidePopoverProps {
  title: string;
  description: string;
  targetElement: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const GuidePopover: React.FC<GuidePopoverProps> = ({
  title,
  description,
  targetElement,
  open,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (targetElement && !targetElement.contains(e.target as Node) && !(e.target as HTMLElement).closest('.ant-popover')) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
  }, [open, onClose, targetElement]);

  if (!targetElement) return null;

  const rect = targetElement.getBoundingClientRect();

  return createPortal(
    <Popover
      open={open}
      onOpenChange={(visible) => { if (!visible) onClose(); }}
      content={
        <div style={{ maxWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{title}</div>
          {description}
        </div>
      }
      placement="top"
      trigger={[]}
      rootClassName="guide-popover"
    >
      <span
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </Popover>,
    document.body,
  );
};

export default GuidePopover;
