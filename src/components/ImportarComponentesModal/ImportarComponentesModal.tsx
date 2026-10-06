import React, { useRef, useState, useCallback } from 'react';
import {
  Alert,
  Button,
  Modal,
  Result,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { recetaApi } from '../../api/recetaApi';
import type {
  ComponenteProductoDTO,
  ErrorImportacionComponenteDTO,
  ResultadoImportacionComponenteDTO,
} from '../../types/receta';
import { exportarErroresImportacion } from '../../utils/importarExcel';
import { extraerMensajeError } from '../../utils/formats';

const { Text } = Typography;
const { Dragger } = Upload;

export interface ImportarComponentesModalProps {
  open: boolean;
  sucursal: number;
  onClose: () => void;
  onConfirm: (componentes: ComponenteProductoDTO[]) => void;
}

const ImportarComponentesModal: React.FC<ImportarComponentesModalProps> = ({
  open,
  sucursal,
  onClose,
  onConfirm,
}) => {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacionComponenteDTO | null>(null);
  const importandoRef = useRef(false);

  const handleClose = () => {
    if (importandoRef.current) return;
    setStep(0);
    setFile(null);
    setResultado(null);
    onClose();
  };

  const handleDescargarPlantilla = async () => {
    if (descargando || importandoRef.current) return;
    try {
      setDescargando(true);
      const blob = await recetaApi.descargarPlantilla(sucursal);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Componentes.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      message.error(extraerMensajeError(err, 'Error al descargar la plantilla'));
    } finally {
      setDescargando(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'archivo',
    multiple: false,
    accept: '.xlsx',
    showUploadList: true,
    beforeUpload: (uploadedFile) => {
      if (importandoRef.current) return Upload.LIST_IGNORE;
      if (!uploadedFile.name.endsWith('.xlsx')) {
        message.error('Solo se permiten archivos .xlsx');
        return Upload.LIST_IGNORE;
      }
      setFile(uploadedFile);
      setResultado(null);
      setStep(1);
      return false;
    },
    onRemove: () => {
      if (importandoRef.current) return false;
      setFile(null);
      setStep(0);
      return true;
    },
  };

  const handleImportar = useCallback(async () => {
    if (!file) return;
    if (importandoRef.current) return;
    importandoRef.current = true;
    setImportando(true);
    try {
      const res = await recetaApi.importarExcel(sucursal, file);
      setResultado(res);
      setStep(2);
    } catch (err: unknown) {
      message.error(extraerMensajeError(err, 'Error al importar la plantilla'));
    } finally {
      importandoRef.current = false;
      setImportando(false);
    }
  }, [file, sucursal]);

  const handleDescargarErrores = () => {
    if (!resultado?.errores?.length) return;
    try {
      exportarErroresImportacion(resultado.errores, 'Errores_Importacion_Componentes.xlsx');
    } catch {
      message.error('Error al descargar los errores');
    }
  };

  const handleAplicar = () => {
    if (!resultado?.componentes?.length) return;
    onConfirm(resultado.componentes);
    handleClose();
  };

  const columnasErrores: ColumnsType<ErrorImportacionComponenteDTO> = [
    { title: 'Fila', dataIndex: 'fila', width: 90, align: 'right' },
    { title: 'Error', dataIndex: 'mensaje' },
  ];

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={760}
      title="Importar Componentes desde Plantilla"
      footer={
        step === 2 ? (
          <Space>
            {resultado?.errores?.length ? (
              <Button icon={<FileExcelOutlined />} onClick={handleDescargarErrores}>
                Descargar errores
              </Button>
            ) : null}
            <Button onClick={handleClose}>Cerrar</Button>
            <Button
              type="primary"
              disabled={!resultado?.componentes?.length}
              onClick={handleAplicar}
            >
              Cargar en la lista ({resultado?.componentes?.length || 0})
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancelar</Button>
            {step === 1 && (
              <Button type="primary" loading={importando} disabled={!file} onClick={handleImportar}>
                Importar
              </Button>
            )}
          </Space>
        )
      }
      destroyOnClose
    >
      <Steps
        current={step}
        size="small"
        style={{ marginBottom: 20 }}
        items={[
          { title: 'Plantilla' },
          { title: 'Subir archivo' },
          { title: 'Resultado' },
        ]}
      />

      {step === 0 && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ marginBottom: 16 }}>
            <Text type="secondary">
              Descargue la plantilla, complete las columnas <Text strong>Codigo</Text> y{' '}
              <Text strong>Cantidad</Text> con los componentes del producto y vuelva a subirla.
            </Text>
          </p>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={descargando}
            onClick={handleDescargarPlantilla}
          >
            Descargar plantilla
          </Button>
        </div>
      )}

      {step === 1 && (
        <Dragger {...uploadProps} disabled={importando}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: 'var(--paces-primary)', fontSize: 44 }} />
          </p>
          <p className="ant-upload-text">Haga clic o arrastre el archivo .xlsx aquí</p>
          <p className="ant-upload-hint">Solo se aceptan archivos .xlsx de hasta 10 MB</p>
        </Dragger>
      )}

      {step === 2 && resultado && (
        <>
          <Result
            status={resultado.errores.length > 0 ? 'warning' : 'success'}
            title={
              <Space wrap>
                <span>{resultado.total} fila(s) leída(s)</span>
                <Tag color="green">{resultado.validos} válida(s)</Tag>
                {resultado.errores.length > 0 && (
                  <Tag color="red">{resultado.errores.length} con error(es)</Tag>
                )}
              </Space>
            }
            subTitle="Al cargar la lista, la composición actual del producto se reemplaza por la del archivo. Revise antes de guardar."
            style={{ padding: '16px 0' }}
          />

          {resultado.errores.length > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Algunas filas fueron descartadas por errores"
            />
          )}

          {resultado.errores.length > 0 && (
            <Table<ErrorImportacionComponenteDTO>
              dataSource={resultado.errores}
              columns={columnasErrores}
              rowKey={(_, i) => String(i)}
              size="small"
              pagination={false}
              scroll={{ y: 220, x: 500 }}
              locale={{ emptyText: 'Sin errores' }}
              className="paces-border-top paces-list-table"
            />
          )}

          {resultado.componentes.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              No hay componentes válidos para cargar.
            </Text>
          )}
        </>
      )}
    </Modal>
  );
};

export default ImportarComponentesModal;
