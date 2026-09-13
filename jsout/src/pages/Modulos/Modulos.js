import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Alert, message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useScreenConfig } from '../../hooks/useScreenConfig';
import { moduloApi } from '../../api/moduloApi';
import CatalogoListadoToolbar from '../../components/CatalogoListadoToolbar';
import { toTitleCase } from '../../utils/formats';
import { exportToExcel, getCompanyName } from '../../utils/exportToExcel';
const Modulos = () => {
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const resetToolbar = useUIStore((s) => s.resetToolbar);
    const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);
    const { screenCode } = useScreenConfig('MODULOS');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingError, setLoadingError] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedRow, setSelectedRow] = useState(null);
    const [pageSize, setPageSize] = useState(25);
    const cargar = useCallback(async () => {
        setLoading(true);
        setLoadingError(false);
        try {
            const res = await moduloApi.obtenerTodo(sucursalActiva);
            setData(Array.isArray(res) ? res : []);
        }
        catch {
            setLoadingError(true);
        }
        finally {
            setLoading(false);
        }
    }, [sucursalActiva]);
    useEffect(() => {
        setActiveModule(screenCode);
        setPageTitleOverride('Módulos');
        cargar();
        return () => { resetToolbar(); setPageTitleOverride(''); };
    }, [setActiveModule, setPageTitleOverride, resetToolbar, cargar, screenCode]);
    const handleExportarExcel = async () => {
        const companyName = await getCompanyName(sucursalActiva);
        const cols = columns.filter((c) => c.key !== 'acciones');
        exportToExcel({
            fileName: `Modulos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            sheetName: 'Módulos',
            companyName,
            columnHeaders: cols.map((c) => c.title),
            dataRows: filtered.map((item) => cols.map((col) => {
                const val = item[col.dataIndex];
                return val !== null && val !== undefined ? String(val) : '';
            })),
        });
    };
    const handleSearch = (val) => {
        setSearchText(val);
        setSelectedRow(null);
    };
    const handlePageSizeChange = useCallback((value) => {
        setPageSize(value);
    }, []);
    const filtered = searchText.trim()
        ? data.filter((r) => r.nombre?.toLowerCase().includes(searchText.toLowerCase()) ||
            String(r.id).includes(searchText))
        : data;
    const handleDelete = (record) => {
        Modal.confirm({
            title: 'Eliminar módulo',
            icon: _jsx(ExclamationCircleOutlined, {}),
            content: `¿Está seguro de eliminar el módulo "${record.nombre}"?`,
            okText: 'Eliminar',
            okButtonProps: { danger: true },
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await moduloApi.eliminar(sucursalActiva, record.id);
                    message.success('Módulo eliminado');
                    cargar();
                }
                catch (err) {
                    message.error(err?.response?.data?.errorMessage || 'Error al eliminar');
                }
            },
        });
    };
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Nombre',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (v, record) => (_jsx("a", { onClick: () => navigate(`/Modulos/${record.id}`), children: toTitleCase(v || '') })),
        },
        {
            title: 'Orden',
            dataIndex: 'orden',
            key: 'orden',
            width: 100,
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 100,
            render: (_, record) => (_jsx(Button, { type: "link", danger: true, onClick: (e) => { e.stopPropagation(); handleDelete(record); }, children: "Eliminar" })),
        },
    ];
    return (_jsxs(_Fragment, { children: [loadingError && _jsx(Alert, { message: "Error al cargar m\u00F3dulos", type: "error", showIcon: true, style: { marginBottom: 16 } }), _jsxs(Card, { className: "paces-card-erp", style: { borderRadius: 8, overflow: 'hidden' }, styles: { body: { padding: 0 } }, children: [_jsx(CatalogoListadoToolbar, { onSearch: handleSearch, placeholder: "Buscar m\u00F3dulo...", pageSize: pageSize, onPageSizeChange: handlePageSizeChange, onNuevo: () => navigate('/Modulos/nuevo'), onReload: cargar, onExportarExcel: handleExportarExcel }), _jsx(Table, { className: "paces-border-top paces-list-table", dataSource: filtered, columns: columns, rowKey: "id", loading: loading, rowClassName: (record) => selectedRow?.id === record.id ? 'paces-row-selected' : 'paces-row-hover', onRow: (record) => ({
                            onClick: () => setSelectedRow(record),
                            onDoubleClick: () => navigate(`/Modulos/${record.id}`),
                        }), pagination: { showTotal: (t) => `${t} registros` }, locale: { emptyText: 'No hay módulos registrados' } })] })] }));
};
export default Modulos;
