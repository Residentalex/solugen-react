import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Upload, Table, Steps, message, Typography, Space, Tag, Result, Alert, Spin, } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
const { Text, Title } = Typography;
const { Dragger } = Upload;
const ProductosImportar = () => {
    const navigate = useNavigate();
    const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
    const setActiveModule = useUIStore((s) => s.setActiveModule);
    const [step, setStep] = useState(0);
    const [file, setFile] = useState(null);
    const [importando, setImportando] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [loadingError, setLoadingError] = useState(false);
    const handleRefresh = () => {
        setLoadingError(false);
        handleDescargarPlantilla();
    };
    React.useEffect(() => {
        setActiveModule('MProducto');
    }, [setActiveModule]);
    const handleDescargarResultado = async () => {
        if (!resultado?.productos?.length)
            return;
        try {
            const blob = await productoApi.descargarResultado(sucursalProductos, resultado.productos);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Productos_Creados.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        }
        catch (e) {
            message.error('Error al descargar resultado');
        }
    };
    const handleDescargarPlantilla = async () => {
        try {
            const blob = await productoApi.descargarPlantilla(sucursalProductos);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Plantilla_Productos.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        }
        catch (err) {
            message.error(err?.response?.data?.errorMessage || 'Error al descargar plantilla');
            setLoadingError(true);
        }
    };
    const uploadProps = {
        name: 'archivo',
        multiple: false,
        accept: '.xlsx',
        showUploadList: true,
        beforeUpload: (file) => {
            const isXlsx = file.name.endsWith('.xlsx');
            if (!isXlsx) {
                message.error('Solo se permiten archivos .xlsx');
                return Upload.LIST_IGNORE;
            }
            setFile(file);
            setStep(1);
            return false; // Prevent auto upload
        },
        onRemove: () => {
            setFile(null);
            setStep(0);
        },
    };
    const handleImportar = async () => {
        if (!file)
            return;
        setImportando(true);
        setErrorMsg('');
        try {
            const res = await productoApi.importarExcel(sucursalProductos, file);
            setResultado(res);
            setStep(2);
        }
        catch (err) {
            setErrorMsg(err?.response?.data?.errorMessage || 'Error al importar');
            setStep(2);
        }
        finally {
            setImportando(false);
        }
    };
    const resetear = () => {
        setFile(null);
        setResultado(null);
        setErrorMsg('');
        setStep(0);
    };
    const erroresColumns = [
        { title: 'Fila', dataIndex: 'fila', key: 'fila', width: 80 },
        { title: 'Error', dataIndex: 'mensaje', key: 'mensaje' },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }, children: [_jsx(Button, { icon: _jsx(ArrowLeftOutlined, {}), onClick: () => navigate('/MProducto'), children: "Volver" }), _jsx("div", { style: { flex: 1 } }), step > 0 && (_jsx(Button, { onClick: resetear, children: "Nueva Importaci\u00F3n" }))] }), loadingError && (_jsx(Alert, { message: "Error al cargar importaci\u00F3n", type: "error", showIcon: true, style: { marginBottom: 16 }, action: _jsx(Button, { size: "small", onClick: handleRefresh, children: "Reintentar" }) })), _jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, marginBottom: 16 }, children: _jsx("div", { style: { padding: '16px 24px' }, children: _jsx(Steps, { current: step, size: "small", items: [
                            { title: 'Descargar Plantilla', content: 'Obtén el formato' },
                            { title: 'Subir Archivo', content: 'Selecciona tu Excel' },
                            { title: 'Resultado', content: 'Revisa la importación' },
                        ] }) }) }), step === 0 && (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, children: _jsxs("div", { style: { padding: 24, textAlign: 'center' }, children: [_jsx(Title, { level: 4, style: { marginBottom: 8 }, children: "Importar Productos desde Excel" }), _jsx(Text, { type: "secondary", style: { display: 'block', marginBottom: 24 }, children: "Descarga la plantilla, completa los datos y luego sube el archivo" }), _jsxs(Space, { orientation: "vertical", size: "large", style: { width: '100%', maxWidth: 500 }, children: [_jsx(Button, { type: "primary", icon: _jsx(DownloadOutlined, {}), size: "large", block: true, onClick: handleDescargarPlantilla, children: "Descargar Plantilla Excel" }), _jsxs(Dragger, { ...uploadProps, children: [_jsx("p", { className: "ant-upload-drag-icon", children: _jsx(InboxOutlined, {}) }), _jsx("p", { className: "ant-upload-text", children: "Haga clic o arrastre un archivo aqu\u00ED" }), _jsx("p", { className: "ant-upload-hint", children: "Solo archivos .xlsx con el formato de la plantilla" })] })] })] }) })), step === 1 && file && !importando && (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, children: _jsx("div", { style: { padding: 24, textAlign: 'center' }, children: _jsxs(Space, { orientation: "vertical", size: "large", style: { width: '100%', maxWidth: 500 }, children: [_jsx(Alert, { message: `Archivo seleccionado: ${file.name}`, description: `Tamaño: ${(file.size / 1024).toFixed(1)} KB`, type: "success", showIcon: true }), _jsx(Button, { type: "primary", icon: _jsx(UploadOutlined, {}), size: "large", block: true, loading: importando, onClick: handleImportar, children: "Importar Productos" })] }) }) })), step === 1 && importando && (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8, textAlign: 'center' }, children: _jsxs("div", { style: { padding: '40px 24px' }, children: [_jsx(Spin, { size: "large" }), _jsxs("div", { style: { marginTop: 16 }, children: [_jsx(Title, { level: 4, children: "Procesando importaci\u00F3n..." }), _jsx(Text, { type: "secondary", children: "Esto puede tomar unos segundos. Por favor espere." })] })] }) })), step === 2 && (_jsx(Card, { className: "paces-card-erp", style: { borderRadius: 8 }, children: _jsx("div", { style: { padding: 24 }, children: errorMsg ? (_jsx(Result, { status: "error", title: "Error al importar", subTitle: errorMsg, extra: [
                            _jsx(Button, { onClick: resetear, children: "Intentar de nuevo" }, "back"),
                        ] })) : resultado ? (_jsxs(_Fragment, { children: [_jsx(Result, { status: resultado.errores.length > 0 ? 'warning' : 'success', title: "Importaci\u00F3n completada", subTitle: _jsxs(Space, { children: [_jsxs(Tag, { color: "blue", children: [resultado.total, " Total"] }), _jsxs(Tag, { color: "green", children: [resultado.insertados, " Insertados"] }), _jsxs(Tag, { color: "orange", children: [resultado.actualizados, " Actualizados"] }), resultado.errores.length > 0 && (_jsxs(Tag, { color: "red", children: [resultado.errores.length, " Errores"] }))] }), extra: [] }), resultado.productos && resultado.productos.length > 0 && (_jsx(Card, { title: "Productos importados", extra: _jsx(Button, { type: "text", icon: _jsx(DownloadOutlined, {}), onClick: handleDescargarResultado }), size: "small", style: { marginTop: 16 }, className: "paces-card", children: _jsx(Table, { dataSource: resultado.productos, columns: [
                                        { title: 'Fila', dataIndex: 'fila', key: 'fila', width: 60 },
                                        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
                                        {
                                            title: 'Código Generado',
                                            dataIndex: 'codigoGenerado',
                                            key: 'codigoGenerado',
                                            width: 140,
                                            render: (val) => _jsx(Text, { code: true, children: val }),
                                        },
                                    ], rowKey: "fila", size: "small", pagination: false }) })), resultado.errores.length > 0 && (_jsx(Card, { title: "Errores por fila", size: "small", style: { marginTop: 16 }, className: "paces-card", children: _jsx(Table, { dataSource: resultado.errores, columns: erroresColumns, rowKey: "fila", size: "small", pagination: false }) }))] })) : null }) }))] }));
};
export default ProductosImportar;
