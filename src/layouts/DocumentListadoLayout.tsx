import React from 'react';
import { Card, Table, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import ListadoErrorAlert from '../components/ListadoErrorAlert';
import DocumentListadoToolbar from '../components/DocumentListadoToolbar';
import PdfPreviewDrawer from '../components/PdfPreviewDrawer';

const { Text } = Typography;

interface DocumentListadoLayoutProps<T> {
  columns: ColumnsType<T>;
  data: T[];
  rowKey: string | ((record: T) => string);
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  scrollX?: number;
  selectedRowId?: number | string;

  loadingError: boolean;
  errorMessage: string;
  onRefresh: () => void;

  onRowClick: (record: T) => void;
  onPageChange: (page: number) => void;

  pdfPreview: { url: string; title: string } | null;
  onPdfClose: () => void;

  toolbarProps?: {
    showFiltros?: boolean;
    filtros?: { desde?: string; hasta?: string; estado?: number };
    rangoDefault?: { desde: string; hasta: string };
    opcionesEstado?: { value: number; label: string }[];
    onFiltrosAplicar?: (filtros: any) => void;
    searchPlaceholder?: string;
    onSearch: (value: string) => void;
    pageSize: number;
    onPageSizeChange: (value: number) => void;
    showCrear?: boolean;
    onCrear?: () => void;
    showEditar?: boolean;
    editarDisabled?: boolean;
    onEditar?: () => void;
    showImprimir?: boolean;
    imprimirDisabled?: boolean;
    onImprimir?: () => void;
    onRefresh: () => void;
  };

  extraFooter?: React.ReactNode;
}

function DocumentListadoLayout<T extends { id?: number | string }>(
  props: DocumentListadoLayoutProps<T>
) {
  const {
    columns, data, rowKey, loading, total, page, pageSize, scrollX = 1350,
    selectedRowId,
    loadingError, errorMessage, onRefresh,
    onRowClick, onPageChange,
    pdfPreview, onPdfClose,
    toolbarProps,
    extraFooter,
  } = props;

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) onPageChange(pagination.current);
  };

  return (
    <>
      {loadingError && (
        <ListadoErrorAlert message={errorMessage} onRetry={onRefresh} />
      )}
      <Card
        styles={{ body: { padding: 0 } }}
        className="paces-card-erp"
        style={{ borderRadius: 8, overflow: 'hidden' }}
      >
        {toolbarProps && (
          <div style={{ padding: '16px 24px 0' }}>
            <DocumentListadoToolbar {...toolbarProps} />
          </div>
        )}

        <Table<T>
          columns={columns}
          dataSource={data}
          rowKey={rowKey}
          loading={loading}
          scroll={{ x: scrollX }}
          size="middle"
          rowClassName={(record) =>
            selectedRowId && (record as any).id === selectedRowId
              ? 'paces-row-selected'
              : 'paces-row-hover'
          }
          onRow={(record) => ({
            onClick: () => onRowClick(record),
            style: { cursor: 'pointer' },
          })}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} registros`,
          }}
          className="paces-border-top paces-list-table"
        />

        {extraFooter && (
          <div style={{ padding: '8px 24px 12px' }}>
            {extraFooter}
          </div>
        )}
      </Card>

      <PdfPreviewDrawer pdfPreview={pdfPreview} onClose={onPdfClose} />
    </>
  );
}

export default DocumentListadoLayout;
