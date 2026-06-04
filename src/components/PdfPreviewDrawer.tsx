import React from 'react';
import { Drawer } from 'antd';

interface PdfPreviewDrawerProps {
  pdfPreview: { url: string; title: string } | null;
  onClose: () => void;
}

const PdfPreviewDrawer: React.FC<PdfPreviewDrawerProps> = ({ pdfPreview, onClose }) => {
  return (
    <Drawer
      title={pdfPreview?.title}
      open={!!pdfPreview}
      onClose={onClose}
      size="70%"
    >
      {pdfPreview && (
        <div style={{ width: '100%', height: '100%', overflow: 'auto', transform: 'scale(1.1)', transformOrigin: 'top left' }}>
          <iframe src={pdfPreview.url} style={{ width: '100%', height: '90vh', border: 'none' }} title="PDF" />
        </div>
      )}
    </Drawer>
  );
};

export default PdfPreviewDrawer;
