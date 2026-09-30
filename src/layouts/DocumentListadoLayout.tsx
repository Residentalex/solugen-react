import React from 'react';
import { Card, Table, Typography, Empty } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import ListadoErrorAlert from '../components/ListadoErrorAlert';
import DocumentListadoToolbar from '../components/DocumentListadoToolbar';
import EmptyState from '../components/EmptyState';

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

  toolbarProps?: {
    showFiltros?: boolean;
    filtros?: { desde?: string; hasta?: string; estado?: string | number };
    rangoDefault?: { desde: string; hasta: string };
    opcionesEstado?: { value: string | number; label: string }[];
    onFiltrosAplicar?: (filtros: any) => void;
    searchPlaceholder?: string;
    searchDefaultValue?: string;
    onSearch: (value: string) => void;
    pageSize: number;
    onPageSizeChange: (value: number) => void;
    extraLeft?: React.ReactNode;
    extraRight?: React.ReactNode;
    extraToolbar?: React.ReactNode;
    showCrear?: boolean;
    onCrear?: () => void;
    showEditar?: boolean;
    editarDisabled?: boolean;
    onEditar?: () => void;
    showClonar?: boolean;
    clonarDisabled?: boolean;
    onClonar?: () => void;
    showImprimir?: boolean;
    imprimirDisabled?: boolean;
    onImprimir?: () => void;
    showExportarExcel?: boolean;
    exportarExcelDisabled?: boolean;
    onExportarExcel?: () => void;
    onRefresh: () => void;
  };

  extraFooter?: React.ReactNode;
  emptyText?: React.ReactNode;
}

function DocumentListadoLayout<T extends { id?: number | string }>(
  props: DocumentListadoLayoutProps<T>
) {
  const {
    columns, data, rowKey, loading, total, page, pageSize, scrollX = 1350,
    selectedRowId,
    loadingError, errorMessage, onRefresh,
    onRowClick, onPageChange,
    toolbarProps,
    extraFooter,
    emptyText,
  } = props;

  const contenedorRef = React.useRef<HTMLDivElement>(null);
  const [indiceFocado, setIndiceFocado] = React.useState(0);

  const ultimoIndice = Math.max(0, data.length - 1);
  const indiceEfectivo = Math.min(indiceFocado, ultimoIndice);

  const enfocarFila = (indice: number) => {
    setIndiceFocado(indice);
    requestAnimationFrame(() => {
      const filas = contenedorRef.current?.querySelectorAll<HTMLElement>('tbody > tr[data-row-key]');
      filas?.[indice]?.focus();
    });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setIndiceFocado(0);
    if (pagination.current) onPageChange(pagination.current);
  };

  const esFilaSeleccionada = (record: T) =>
    Boolean(selectedRowId) && (record as any).id === selectedRowId;

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

        <div ref={contenedorRef}>
          <Table<T>
            columns={columns}
            dataSource={data}
            rowKey={rowKey}
            loading={loading}
            scroll={{ x: scrollX }}
            size="middle"
            rowClassName={(record) =>
              esFilaSeleccionada(record)
                ? 'paces-row-selected'
                : 'paces-row-hover'
            }
            onRow={(record, index) => {
              const idx = index ?? 0;
              return {
                onClick: () => {
                  setIndiceFocado(idx);
                  onRowClick(record);
                },
                tabIndex: idx === indiceEfectivo ? 0 : -1,
                onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (e.key === ' ') e.preventDefault();
                    onRowClick(record);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    enfocarFila(Math.min(idx + 1, ultimoIndice));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    enfocarFila(Math.max(idx - 1, 0));
                  } else if (e.key === 'Home') {
                    e.preventDefault();
                    enfocarFila(0);
                  } else if (e.key === 'End') {
                    e.preventDefault();
                    enfocarFila(ultimoIndice);
                  }
                },
                'aria-selected': esFilaSeleccionada(record),
                style: { cursor: 'pointer' },
              };
            }}
            onChange={handleTableChange}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (t) => `${t} registros`,
            }}
            className="paces-border-top paces-list-table"
            locale={{
              emptyText: (
                <EmptyState
                  title={emptyText ? undefined : 'Sin registros'}
                  description={emptyText ? String(emptyText) : 'No hay datos para los filtros aplicados.'}
                />
              ),
            }}
          />
        </div>

        {extraFooter && (
          <div style={{ padding: '8px 24px 12px' }}>
            {extraFooter}
          </div>
        )}
      </Card>
    </>
  );
}

export default DocumentListadoLayout;
