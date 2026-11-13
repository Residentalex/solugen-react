import React, { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Input,
  message,
  Modal,
  Space,
  Tag,
  Typography,
  Upload,
} from 'antd';
import {
  CloudUploadOutlined,
  DesktopOutlined,
  DownloadOutlined,
  RobotOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { appActualizacionApi } from '../../api/appActualizacionApi';
import type { AppEstadoDTO } from '../../types/appActualizacion';

const { Text } = Typography;

const PATRON_VERSION = /^\d+(\.\d+){1,3}$/;

const mensajeError = (err: unknown, porDefecto: string): string => {
  const respuesta = (err as { response?: { data?: { errorMessage?: string } } })?.response;
  return respuesta?.data?.errorMessage || porDefecto;
};

interface TarjetaAppProps {
  estado: AppEstadoDTO;
  onPublicado: () => Promise<void> | void;
}

const formatearBytes = (bytes: number): string => {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatearFecha = (valor: string | null): string => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleString('es-DO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Tarjeta de publicacion de una app (AGENTE o CAJA).
 *
 * Publicar aqui deja el binario y la version en el servidor. El equipo lo
 * aplica desde su propio boton "Buscar actualizaciones".
 */
const TarjetaApp: React.FC<TarjetaAppProps> = ({ estado, onPublicado }) => {
  const esCaja = estado.name.toUpperCase() === 'CAJA';
  const [version, setVersion] = useState(estado.version || '');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [latestYml, setLatestYml] = useState<File | null>(null);
  const [publicando, setPublicando] = useState(false);

  const validarVersion = (): boolean => {
    const valor = version.trim();
    if (!valor) {
      message.warning('Indica la version a publicar.');
      return false;
    }
    if (!PATRON_VERSION.test(valor)) {
      message.warning('La version debe tener el formato 1.0.1.');
      return false;
    }
    return true;
  };

  const confirmarPublicacion = () => {
    if (!validarVersion()) return;
    if (!archivo) {
      message.warning('Selecciona el binario a publicar.');
      return;
    }
    if (esCaja && !latestYml) {
      message.warning('La caja necesita tambien el archivo latest.yml.');
      return;
    }

    const versionFinal = version.trim();

    Modal.confirm({
      title: `Publicar ${estado.name} ${versionFinal}`,
      width: 520,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            Se reemplazara el binario publicado y la version en la tabla APP.
          </p>
          <p style={{ marginBottom: 0 }}>
            <Text strong>{archivo.name}</Text> ({formatearBytes(archivo.size)})
            {latestYml ? (
              <>
                <br />
                <Text strong>{latestYml.name}</Text> ({formatearBytes(latestYml.size)})
              </>
            ) : null}
          </p>
        </div>
      ),
      okText: 'Publicar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setPublicando(true);
        try {
          await appActualizacionApi.subir(
            estado.name,
            versionFinal,
            archivo,
            esCaja ? latestYml ?? undefined : undefined
          );
          message.success(`Version ${versionFinal} publicada para ${estado.name}.`);
          setArchivo(null);
          setLatestYml(null);
          await onPublicado();
        } catch (err: unknown) {
          message.error(
            mensajeError(err, 'No se pudo publicar la actualizacion')
          );
        } finally {
          setPublicando(false);
        }
      },
    });
  };

  const confirmarSoloVersion = () => {
    if (!validarVersion()) return;
    const versionFinal = version.trim();

    Modal.confirm({
      title: `Actualizar version de ${estado.name}`,
      content: `Se cambiara APP.VERSION a ${versionFinal} sin reemplazar el binario. Usalo solo si el archivo ya se copio por otro medio.`,
      okText: 'Actualizar',
      cancelText: 'Cancelar',
      onOk: async () => {
        setPublicando(true);
        try {
          await appActualizacionApi.actualizarVersion(estado.name, versionFinal);
          message.success(`Version ${versionFinal} actualizada para ${estado.name}.`);
          await onPublicado();
        } catch (err: unknown) {
          message.error(
            mensajeError(err, 'No se pudo actualizar la version')
          );
        } finally {
          setPublicando(false);
        }
      },
    });
  };

  return (
    <Card
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden', height: '100%' }}
      title={
        <Space>
          {esCaja ? <DesktopOutlined /> : <RobotOutlined />}
          <span>{estado.name}</span>
          <Tag color={estado.version ? 'blue' : 'default'}>
            {estado.version || 'sin version'}
          </Tag>
        </Space>
      }
      extra={
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={!estado.existe}
          onClick={() => window.open(appActualizacionApi.urlDescarga(estado.name), '_blank')}
        >
          Descargar
        </Button>
      }
    >
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="Version publicada">
          <Text strong>{estado.version || '—'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Archivo">
          {estado.existe ? (
            <Space wrap>
              <Tag color="green">Disponible</Tag>
              <Text>{formatearBytes(estado.bytes)}</Text>
              <Text type="secondary">{formatearFecha(estado.fechaModificacion)}</Text>
            </Space>
          ) : (
            <Tag color="red">No existe en el servidor</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Ruta">
          <Text code style={{ fontSize: 11, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
            {estado.ruta || '—'}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {esCaja && (
        <Alert
          style={{ marginTop: 16 }}
          type="info"
          showIcon
          message="La caja se actualiza con electron-updater"
          description="Sube el instalador y su latest.yml. El instalador conserva su nombre original porque latest.yml lo referencia."
        />
      )}

      <Divider style={{ margin: '16px 0' }} />

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong>Version</Text>
          <Input
            style={{ marginTop: 4 }}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.1"
            disabled={publicando}
          />
        </div>

        <div>
          <Text strong>Binario</Text>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Upload
              accept=".exe"
              showUploadList={false}
              beforeUpload={(file) => {
                setArchivo(file as File);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} disabled={publicando}>
                Seleccionar archivo
              </Button>
            </Upload>
            {archivo ? (
              <Space size={4}>
                <Text ellipsis style={{ maxWidth: 260 }}>
                  {archivo.name}
                </Text>
                <Button type="link" size="small" onClick={() => setArchivo(null)} disabled={publicando}>
                  Quitar
                </Button>
              </Space>
            ) : (
              <Text type="secondary">Ningun archivo seleccionado</Text>
            )}
          </div>
        </div>

        {esCaja && (
          <div>
            <Text strong>latest.yml</Text>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Upload
                accept=".yml,.yaml"
                showUploadList={false}
                beforeUpload={(file) => {
                  setLatestYml(file as File);
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} disabled={publicando}>
                  Seleccionar latest.yml
                </Button>
              </Upload>
              {latestYml ? (
                <Space size={4}>
                  <Text ellipsis style={{ maxWidth: 260 }}>
                    {latestYml.name}
                  </Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setLatestYml(null)}
                    disabled={publicando}
                  >
                    Quitar
                  </Button>
                </Space>
              ) : (
                <Text type="secondary">Obligatorio para la caja</Text>
              )}
            </div>
          </div>
        )}

        <Space wrap>
          <Button
            type="primary"
            icon={<CloudUploadOutlined />}
            loading={publicando}
            onClick={confirmarPublicacion}
          >
            Publicar actualizacion
          </Button>
          {esCaja && (
            <Button onClick={confirmarSoloVersion} disabled={publicando}>
              Solo actualizar version
            </Button>
          )}
        </Space>
      </Space>
    </Card>
  );
};

export default TarjetaApp;
