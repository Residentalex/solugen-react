import React, { useEffect } from 'react';

interface PdfPreviewDrawerProps {
  pdfPreview: { url: string; title: string } | null;
  onClose: () => void;
}

const PdfPreviewDrawer: React.FC<PdfPreviewDrawerProps> = ({ pdfPreview, onClose }) => {
  useEffect(() => {
    if (pdfPreview?.url) {
      window.open(pdfPreview.url, '_blank');
      onClose();
    }
  }, [pdfPreview, onClose]);

  return null;
};

export default PdfPreviewDrawer;
