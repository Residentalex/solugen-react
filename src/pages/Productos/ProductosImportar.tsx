import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Upload, Table, Steps, message, Typography, Space, Tag, Result, Alert, Spin,
  Row, Col,
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, UploadOutlined, InboxOutlined, FilterOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useCompanyStore } from '../../stores/companyStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import type { ResultadoImportacionDTO } from '../../types/productos';
import * as XLSX from 'xlsx';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface VistaPreviaDTO {
  totalFilas: number;
  filasValidas: number;
  filasConAdvertencias: number;
  filasRechazadas: number;
}

const ProductosImportar: React.FC = () => {
  const navigate = useNavigate();
  const sucursalProductos = useCompanyStore((s) => s.data.sucursalProductos);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionDTO | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingError, setLoadingError] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<VistaPreviaDTO | null>(null);
  const [erroresFiltrados, setErroresFiltrados] = useState<string[]>([]);
  const importandoRef = useRef(false);

  React.useEffect(() => {
    setActiveModule('MProducto');
  }, [setActiveModule]);

  const handleDescargarResultado = async () => {
    if (!resultado?.productos?.length) return;
    try {
      const blob = await productoApi.descargarResultado(sucursalProductos, resultado.productos);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Productos_Creados.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Error al descargar resultado');
    }
  };

  const handleDescargarErrores = async () => {
    if (!resultado?.errores?.length) return;
    try {
      const errores = resultado.errores.map((e, i) => ({
        'Nº': i + 1,
        'Fila': e.fila,
        'Error': e.mensaje,
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(errores);
      XLSX.utils.book_append_sheet(wb, ws, 'Errores');
      XLSX.writeFile(wb, 'Errores_Importacion.xlsx');
    } catch {
      message.error('Error al descargar errores');
    }
  };

  const handleDescargarPlantilla = async () => {
    if (importandoRef.current) return;
    try {
      const blob = await productoApi.descargarPlantilla(sucursalProductos);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Productos.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al descargar plantilla');
      setLoadingError(true);
    }
  };

  const handleRefresh = () => {
    setLoadingError(false);
    handleDescargarPlantilla();
  };

  const handleProcesarVistaPrevia = (uploadedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

        if (!jsonData || jsonData.length < 2) {
          setVistaPrevia({
            totalFilas: 0,
            filasValidas: 0,
            filasConAdvertencias: 0,
            filasRechazadas: 0,
          });
          return;
        }

        const totalFilas = jsonData.length - 1;
        setVistaPrevia({
          totalFilas,
          filasValidas: totalFilas,
          filasConAdvertencias: 0,
          filasRechazadas: 0,
        });
      } catch {
        message.error('Error al leer el archivo');
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const uploadProps: UploadProps = {
    name: 'archivo',
    multiple: false,
    accept: '.xlsx',
    showUploadList: true,
    beforeUpload: (uploadedFile) => {
      if (importandoRef.current) return Upload.LIST_IGNORE;
      const isXlsx = uploadedFile.name.endsWith('.xlsx');
      if (!isXlsx) {
        message.error('Solo se permiten archivos .xlsx');
        return Upload.LIST_IGNORE;
      }
      setFile(uploadedFile);
      setVistaPrevia(null);
      setStep(1);
      handleProcesarVistaPrevia(uploadedFile);
      return false;
    },
    onRemove: () => {
      if (importandoRef.current) return false;
      setFile(null);
      setVistaPrevia(null);
      setStep(0);
    },
  };

  const handleImportar = useCallback(async () => {
    if (!file) return;
    if (importandoRef.current) return;
    importandoRef.current = true;
    setImportando(true);
    setErrorMsg('');
    setErroresFiltrados([]);
    try {
      const res = await productoApi.importarExcel(sucursalProductos, file);
      setResultado(res);
      setStep(2);
    } catch (err) {
      message.error(err?.response?.data?.errorMessage || 'Error al importar');
      setStep(2);
    } finally {
      importandoRef.current = false;
    }
  }, [file, sucursalProductos]);

  const handleVolver = () => {
    if (importandoRef.current) return;
    navigate('/MProducto');
  };

  const resetear = () => {
    if (importandoRef.current) return;
    setFile(null);
    setResultado(null);
    setErrorMsg('');
    setVistaPrevia(null);
    setErroresFiltrados([]);
    setStep(0);
  };

  const erroresColumns = [
    { title: 'Fila', dataIndex: 'fila', key: 'fila', width: 80 },
    { title: 'Error', dataIndex: 'mensaje', key: 'mensaje' },
  ];

  const handleFiltrarErrores = () => {
    if (!resultado?.errores?.length) return;
    const mensajes = Array.from(new Set(resultado.errores.map((e) => e.mensaje)));
    if (erroresFiltrados.length === mensajes.length) {
      setErroresFiltrados([]);
    } else {
      setErroresFiltrados(mensajes);
    }
  };

  const erroresFiltradosData = resultado?.errores?.filter(
    (e) => erroresFiltrados.length === 0 || erroresFiltrados.includes(e.mensaje)
  ) || [];

  const omitidos = resultado
    ? resultado.total - (resultado.insertados || 0) - (resultado.actualizados || 0) - (resultado.errores?.length || 0)
    : 0;

  const filasColumnas = [
    { title: 'Fila', dataIndex: 'fila', key: 'fila', width: 60 },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Código Generado',
      dataIndex: 'codigoGenerado',
      key: 'codigoGenerado',
      width: 140,
      render: (val: string) => <Text code>{val}</Text>,
    },
    { title: 'Referencia', dataIndex: 'referencia', key: 'referencia' },
    {
      title: 'Precio',
      dataIndex: 'precio',
      key: 'precio',
      width: 100,
      render: (val: number) => (val ? `$${val.toFixed(2)}` : '-'),
    },
    {
      title: 'Costo',
      dataIndex: 'ultimoCosto',
      key: 'ultimoCosto',
      width: 100,
      render: (val: number) => (val ? `$${val.toFixed(2)}` : '-'),
    },
    { title: 'Familia', dataIndex: 'familia', key: 'familia' },
    { title: 'Categoría', dataIndex: 'categoria', key: 'categoria' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleVolver} disabled={importando}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        {step > 0 && (
          <Button onClick={resetear} disabled={importando}>Nueva Importación</Button>
        )}
      </div>

      {loadingError && (
        <Alert
          message="Error al cargar importación"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      )}
      {/* Steps Indicator */}
      <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 16 }}>
        <div style={{ padding: '16px 24px' }}>
          <Steps
            current={importando ? 2 : step}
            size="small"
            items={[
              { title: 'Descargar Plantilla', content: 'Obtén el formato', status: importando ? 'finish' : 'wait' },
              { title: 'Subir Archivo', content: 'Selecciona tu Excel', status: importando ? 'finish' : 'wait' },
              {
                title: 'Resultado',
                content: importando ? 'Importando archivo…' : 'Revisa la importación',
                status: importando ? 'process' : 'wait',
              },
            ]}
          />
        </div>
      </Card>

      {/* Step 0: Download template + Upload */}
      {step === 0 && (
        <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Title level={4} style={{ marginBottom: 8 }}>Importar Productos desde Excel</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Descarga la plantilla, completa los datos y luego sube el archivo
            </Text>

            <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: 500 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                block
                disabled={importando}
                onClick={handleDescargarPlantilla}
              >
                Descargar Plantilla Excel
              </Button>

              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Haga clic o arrastre un archivo aquí</p>
                <p className="ant-upload-hint">
                  Solo archivos .xlsx con el formato de la plantilla
                </p>
              </Dragger>
            </Space>
          </div>
        </Card>
      )}

      {/* Step 1: File selected - Preview and confirm */}
      {step === 1 && file && !importando && (
        <>
          <Card className="paces-card-erp" style={{ borderRadius: 8, marginBottom: 16 }}>
            <div style={{ padding: 24 }}>
              <Title level={5} style={{ marginBottom: 16 }}>Resumen previo a importar</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Tag color="blue" style={{ fontSize: 16 }}>{vistaPrevia?.totalFilas ?? 0}</Tag>
                    <Text type="secondary">Total filas</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Tag color="green" style={{ fontSize: 16 }}>{vistaPrevia?.filasValidas ?? 0}</Tag>
                    <Text type="secondary">Filas válidas</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Tag color="orange" style={{ fontSize: 16 }}>{vistaPrevia?.filasConAdvertencias ?? 0}</Tag>
                    <Text type="secondary">Con advertencias</Text>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Tag color="red" style={{ fontSize: 16 }}>{vistaPrevia?.filasRechazadas ?? 0}</Tag>
                    <Text type="secondary">Rechazadas</Text>
                  </Card>
                </Col>
              </Row>
            </div>
          </Card>

          <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: 500 }}>
                <Alert
                  message={`Archivo seleccionado: ${file.name}`}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text>Tamaño: {(file.size / 1024).toFixed(1)} KB</Text>
                      <Text>Tipo: {file.type}</Text>
                    </Space>
                  }
                  type="success"
                  showIcon
                />
                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  size="large"
                  block
                  loading={importando}
                  disabled={importando}
                  onClick={handleImportar}
                >
                  Importar Productos
                </Button>
              </Space>
            </div>
          </Card>
        </>
      )}

      {/* Step 1: Processing visual feedback */}
      {step === 1 && importando && (
        <Card className="paces-card-erp" style={{ borderRadius: 8, textAlign: 'center' }}>
          <div style={{ padding: '40px 24px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Title level={4}>Importando archivo…</Title>
              <Text type="secondary">Esto puede tomar unos segundos. Por favor espere.</Text>
            </div>
            <Alert
              type="info"
              showIcon
              icon={<Spin size="small" />}
              style={{ marginTop: 24, textAlign: 'left' }}
              message="Procesando importación"
              description={
                <Space orientation="vertical" size={0}>
                  <Text strong>{file?.name}</Text>
                  <Text type="secondary">{file ? `${(file.size / 1024).toFixed(1)} KB` : '-'}</Text>
                </Space>
              }
            />
          </div>
        </Card>
      )}

      {/* Step 2: Results */}
      {step === 2 && (
        <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
          <div style={{ padding: 24 }}>
            {errorMsg ? (
              <Result
                status="error"
                title="Error al importar"
                subTitle={errorMsg}
                extra={[
                  <Button key="back" onClick={resetear}>Intentar de nuevo</Button>,
                ]}
              />
            ) : resultado ? (
              <>
                <Result
                  status={resultado.errores.length > 0 ? 'warning' : 'success'}
                  title="Importación completada"
                  subTitle={
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Tag color="blue">{resultado.total} Total</Tag>
                        <Tag color="green">{resultado.insertados} Insertados</Tag>
                        <Tag color="orange">{resultado.actualizados} Actualizados</Tag>
                        {omitidos > 0 && (
                          <Tag color="gray">{omitidos} Omitidos</Tag>
                        )}
                        {resultado.errores.length > 0 && (
                          <Tag color="red">{resultado.errores.length} Errores</Tag>
                        )}
                      </Space>
                    </Space>
                  }
                />

                <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card className="paces-card" size="small" title="Estadísticas" bordered>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Insertados:</Text>
                          <Text strong>{resultado.insertados}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Actualizados:</Text>
                          <Text strong>{resultado.actualizados}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Omitidos:</Text>
                          <Text strong>{omitidos}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text>Fallidos:</Text>
                          <Text strong style={{ color: '#cf1322' }}>{resultado.errores.length}</Text>
                        </div>
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
                    <Card className="paces-card" size="small" title="Acciones" bordered>
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Button
                          type="primary"
                          icon={<DownloadOutlined />}
                          onClick={handleDescargarResultado}
                          block
                          disabled={!resultado.productos?.length}
                        >
                          Descargar Productos
                        </Button>
                        <Button
                          icon={<FilterOutlined />}
                          onClick={handleFiltrarErrores}
                          block
                          style={{
                            borderColor: erroresFiltrados.length > 0 ? '#556ee6' : '#bfbfbf',
                            color: erroresFiltrados.length > 0 ? '#556ee6' : '#bfbfbf',
                          }}
                        >
                          {erroresFiltrados.length > 0 ? 'Limpiar filtro de errores' : 'Filtrar errores'}
                        </Button>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={handleDescargarErrores}
                          block
                          disabled={!resultado.errores?.length}
                        >
                          Descargar Errores
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                </Row>

                {resultado.productos && resultado.productos.length > 0 && (
                  <Card
                    title="Productos importados"
                    size="small"
                    style={{ marginTop: 16 }}
                    className="paces-card"
                  >
                    <Table
                      dataSource={resultado.productos}
                      columns={filasColumnas}
                      rowKey="fila"
                      size="small"
                      pagination={{ pageSize: 10, showTotal: (t) => `${t} registros` }}
                    />
                  </Card>
                )}

                {resultado.errores.length > 0 && (
                  <Card
                    title="Errores por fila"
                    size="small"
                    style={{ marginTop: 16 }}
                    className="paces-card"
                  >
                    <Alert
                      message={`Mostrando ${erroresFiltrados.length > 0 ? erroresFiltradosData.length : resultado.errores.length} de ${resultado.errores.length} error(es)`}
                      type="info"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                    <Table
                      dataSource={erroresFiltradosData}
                      columns={erroresColumns}
                      rowKey="fila"
                      size="small"
                      pagination={{ pageSize: 10, showTotal: (t) => `${t} registros` }}
                    />
                  </Card>
                )}
              </>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProductosImportar;
