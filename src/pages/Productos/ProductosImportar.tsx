import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Upload, Table, Steps, message, Typography, Space, Tag, Result, Alert, Spin,
} from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { productoApi } from '../../api/productoApi';
import type { ResultadoImportacionDTO } from '../../types/productos';

const { Text, Title } = Typography;
const { Dragger } = Upload;

const ProductosImportar: React.FC = () => {
  const navigate = useNavigate();
  const sucursalActiva = useAuthStore((s: any) => s.sucursalActiva);
  const setActiveModule = useUIStore((s: any) => s.setActiveModule);

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionDTO | null>(null);
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
    if (!resultado?.productos?.length) return;
    try {
      const blob = await productoApi.descargarResultado(sucursalActiva, resultado.productos);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Productos_Creados.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { message.error('Error al descargar resultado'); }
  };

  const handleDescargarPlantilla = async () => {
    try {
      const blob = await productoApi.descargarPlantilla(sucursalActiva);
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

  const uploadProps: UploadProps = {
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
    if (!file) return;
    setImportando(true);
    setErrorMsg('');
    try {
      const res = await productoApi.importarExcel(sucursalActiva, file);
      setResultado(res);
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.errorMessage || 'Error al importar');
      setStep(2);
    } finally {
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

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/MProducto')}>
          Volver
        </Button>
        <div style={{ flex: 1 }} />
        {step > 0 && (
          <Button onClick={resetear}>Nueva Importación</Button>
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
            current={step}
            size="small"
            items={[
              { title: 'Descargar Plantilla', content: 'Obtén el formato' },
              { title: 'Subir Archivo', content: 'Selecciona tu Excel' },
              { title: 'Resultado', content: 'Revisa la importación' },
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
        <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
          <div style={{ padding: 24, textAlign: 'center' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%', maxWidth: 500 }}>
              <Alert
                message={`Archivo seleccionado: ${file.name}`}
                description={`Tamaño: ${(file.size / 1024).toFixed(1)} KB`}
                type="success"
                showIcon
              />
              <Button
                type="primary"
                icon={<UploadOutlined />}
                size="large"
                block
                loading={importando}
                onClick={handleImportar}
              >
                Importar Productos
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Step 1: Processing visual feedback */}
      {step === 1 && importando && (
        <Card className="paces-card-erp" style={{ borderRadius: 8, textAlign: 'center' }}>
          <div style={{ padding: '40px 24px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Title level={4}>Procesando importación...</Title>
              <Text type="secondary">Esto puede tomar unos segundos. Por favor espere.</Text>
            </div>
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
                    <Space>
                      <Tag color="blue">{resultado.total} Total</Tag>
                      <Tag color="green">{resultado.insertados} Insertados</Tag>
                      <Tag color="orange">{resultado.actualizados} Actualizados</Tag>
                      {resultado.errores.length > 0 && (
                        <Tag color="red">{resultado.errores.length} Errores</Tag>
                      )}
                    </Space>
                  }
                  extra={[]}
                />
                {resultado.productos && resultado.productos.length > 0 && (
                  <Card
                    title="Productos importados"
                    extra={
                      <Button type="text" icon={<DownloadOutlined />} onClick={handleDescargarResultado} />
                    }
                    size="small"
                    style={{ marginTop: 16 }}
                    className="paces-card"
                  >
                    <Table
                      dataSource={resultado.productos}
                      columns={[
                        { title: 'Fila', dataIndex: 'fila', key: 'fila', width: 60 },
                        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
                        {
                          title: 'Código Generado',
                          dataIndex: 'codigoGenerado',
                          key: 'codigoGenerado',
                          width: 140,
                          render: (val: string) => <Text code>{val}</Text>,
                        },
                      ]}
                      rowKey="fila"
                      size="small"
                      pagination={false}
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
                    <Table
                      dataSource={resultado.errores}
                      columns={erroresColumns}
                      rowKey="fila"
                      size="small"
                      pagination={false}
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
