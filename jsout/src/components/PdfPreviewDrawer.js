import React, { useEffect } from 'react';
const PdfPreviewDrawer = ({ pdfPreview, onClose }) => {
    useEffect(() => {
        if (pdfPreview?.url) {
            window.open(pdfPreview.url, '_blank');
            onClose();
        }
    }, [pdfPreview, onClose]);
    return null;
};
export default PdfPreviewDrawer;
