import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { Card, Table, Typography, Empty } from 'antd';
import ListadoErrorAlert from '../components/ListadoErrorAlert';
import DocumentListadoToolbar from '../components/DocumentListadoToolbar';
const { Text } = Typography;
function DocumentListadoLayout(props) {
    const { columns, data, rowKey, loading, total, page, pageSize, scrollX = 1350, selectedRowId, loadingError, errorMessage, onRefresh, onRowClick, onPageChange, toolbarProps, extraFooter, emptyText, } = props;
    const handleTableChange = (pagination) => {
        if (pagination.current)
            onPageChange(pagination.current);
    };
    return (_jsxs(_Fragment, { children: [loadingError && (_jsx(ListadoErrorAlert, { message: errorMessage, onRetry: onRefresh })), _jsxs(Card, { styles: { body: { padding: 0 } }, className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, children: [toolbarProps && (_jsx("div", { style: { padding: '16px 24px 0' }, children: _jsx(DocumentListadoToolbar, { ...toolbarProps }) })), _jsx(Table, { columns: columns, dataSource: data, rowKey: rowKey, loading: loading, scroll: { x: scrollX }, size: "middle", rowClassName: (record) => selectedRowId && record.id === selectedRowId
                            ? 'paces-row-selected'
                            : 'paces-row-hover', onRow: (record) => ({
                            onClick: () => onRowClick(record),
                            style: { cursor: 'pointer' },
                        }), onChange: handleTableChange, pagination: {
                            current: page,
                            pageSize,
                            total,
                            showSizeChanger: false,
                            showTotal: (t) => `${t} registros`,
                        }, className: "paces-border-top paces-list-table", locale: emptyText ? { emptyText } : undefined }), extraFooter && (_jsx("div", { style: { padding: '8px 24px 12px' }, children: extraFooter }))] })] }));
}
export default DocumentListadoLayout;
