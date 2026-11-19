import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Modal, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ajusteAlmacenApi, type TipoAjuste } from '../../api/ajusteAlmacenApi';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import DetalleToolbar from '../../components/DetalleToolbar';
import FechaColumnCell from '../../components/FechaColumnCell';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { DetalleMovimientoDTO } from '../../types/notaCredito';
import { ordenarLineasPorFamiliaYCodigo } from '../../utils/ordenLineas';
import {
  extraerMensajeError,
  formatCurrency,
  formatDateRaw,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';

const { Text } = Typography;

const ESTADO_AJUSTE_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Borrador', color: 'default' },
  1: { label: 'Aplicado', color: 'success' },
  3: { label: 'Anulado', color: 'error' },
};

const estadoAjuste = (estado: number): { label: string; color: string } =>
  ESTADO_AJUSTE_MAP[estado] ?? { label: String(estado), color: 'default' };

interface AjusteAlmacenDetalleProps {
  tipo: TipoAjuste;
}

/**
 * Detalle del ajuste de conteo (EPJ/SPJ) dentro de la ruta /FENP/{id}.
 *
 * Reutiliza el flujo de documentos: se abre con /FENP/:id?tipoDoc=EPJ|SPJ y
 * desde aquí se aplica o se edita. La edición navega al formulario del ajuste
 * (/FENP/:id/editar?tipoDoc=...), que actualiza solo documentos en borrador.
 */
const AjusteAlmacenDetalle: React.FC<AjusteAlmacenDetalleProps> = ({ tipo }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const usuario = useAuthStore((s) => s.usuario);

  const ajusteId = Number(id);

  // El tipo puede venir por prop (resolver de ruta) o por query.
  const tipoEfectivo = useMemo<TipoAjuste>(() => {
    const porQuery = searchParams.get('tipoDoc');
    if (porQuery === 'EPJ' || porQuery === 'SPJ') return porQuery;
    return tipo;
  }, [searchParams, tipo]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ajusteAlmacenDetalle', sucursalActiva, tipoEfectivo, ajusteId],
    queryFn: () => ajusteAlmacenApi.obtenerPorId(sucursalActiva, tipoEfectivo, ajusteId),
    enabled: sucursalActiva !== undefined && Number.isFinite(ajusteId),
  });

  const aplicar = useMutation({
    mutationFn: () =>
      ajusteAlmacenApi.aplicar(sucursalActiva, tipoEfectivo, ajusteId, usuario?.nombreUsuario),
    onSuccess: (aplicado) => {
      message.success(`Documento ${tipoEfectivo}-${aplicado.noDocumento} aplicado.`);
      void refetch();
    },
    onError: (err) => message.error(extraerMensajeError(err, 'Error al aplicar el ajuste.')),
  });

  const desaplicar = useMutation({
    mutationFn: () => ajusteAlmacenApi.desaplicar(sucursalActiva, tipoEfectivo, ajusteId),
    onSuccess: (desaplicado) => {
      message.success(`Documento ${tipoEfectivo}-${desaplicado.noDocumento} desaplicado.`);
      void refetch();
    },
    onError: (err) => message.error(extraerMensajeError(err, 'Error al desaplicar el ajuste.')),
  });

  const anular = useMutation({
    mutationFn: () => ajusteAlmacenApi.anular(sucursalActiva, tipoEfectivo, ajusteId),
    onSuccess: (anulado) => {
      message.success(`Documento ${tipoEfectivo}-${anulado.noDocumento} anulado.`);
      void refetch();
    },
    onError: (err) => message.error(extraerMensajeError(err, 'Error al anular el ajuste.')),
  });

  const confirmarAnular = useCallback(() => {
    if (!data) return;
    Modal.confirm({
      title: 'Anular documento de ajuste',
      icon: <ExclamationCircleOutlined />,
      width: 520,
      okText: 'Anular',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      content: (
        <Space direction="vertical" size={8} style={{ marginTop: 12 }}>
          <Text>
            Va a anular <Text strong>{`${tipoEfectivo}-${data.noDocumento}`}</Text>.
          </Text>
          <Text type="secondary">
            El documento quedará anulado y no podrá aplicarse.
          </Text>
        </Space>
      ),
      onOk: () => anular.mutate(),
    });
  }, [data, tipoEfectivo, anular]);

  const confirmarDesaplicar = useCallback(() => {
    if (!data) return;
    Modal.confirm({
      title: 'Desaplicar documento de ajuste',
      icon: <ExclamationCircleOutlined />,
      width: 520,
      okText: 'Desaplicar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      content: (
        <Space direction="vertical" size={8} style={{ marginTop: 12 }}>
          <Text>
            Va a desaplicar <Text strong>{`${tipoEfectivo}-${data.noDocumento}`}</Text>.
          </Text>
          <Text type="secondary">
            El documento deja de contar para la existencia del almacén.
          </Text>
        </Space>
      ),
      onOk: () => desaplicar.mutate(),
    });
  }, [data, tipoEfectivo, desaplicar]);

  const [imprimiendo, setImprimiendo] = useState(false);

  const handleImprimir = useCallback(async () => {
    if (!data) return;
    setImprimiendo(true);
    try {
      const esSalida = tipoEfectivo === 'SPJ';
      // El reporte de documentos es el de entrada/salida de almacén: se arma el
      // mismo payload con el tipo que le corresponde al ajuste.
      const payload = {
        ...data,
        tipoDocumento: esSalida ? 'SAP' : 'ENP',
        detalles: (data.detalles ?? []).map((detalle) => ({
          ...detalle,
          subTotal: detalle.subTotal ?? detalle.total,
        })),
      };
      const ruta = esSalida
        ? '/reportes/inventario/salida'
        : '/reportes/inventario/entrada';
      const res = await apiClient.post(ruta, payload, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al generar el PDF del ajuste.'));
    } finally {
      setImprimiendo(false);
    }
  }, [data, tipoEfectivo]);

  const confirmarAplicar = useCallback(() => {
    if (!data) return;
    Modal.confirm({
      title: 'Aplicar documento de ajuste',
      icon: <ExclamationCircleOutlined />,
      width: 520,
      okText: 'Aplicar',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      content: (
        <Space direction="vertical" size={8} style={{ marginTop: 12 }}>
          <Text>
            Va a aplicar <Text strong>{`${tipoEfectivo}-${data.noDocumento}`}</Text>.
          </Text>
          <Text type="secondary">
            Aplicar el documento mueve el stock: la existencia del almacén cambiará de
            forma permanente.
          </Text>
        </Space>
      ),
      onOk: () => aplicar.mutate(),
    });
  }, [data, tipoEfectivo, aplicar]);

  const columnas: ColumnsType<DetalleMovimientoDTO> = useMemo(
    () => [
      {
        title: 'Código',
        dataIndex: 'codigo',
        key: 'codigo',
        width: 130,
        fixed: 'left',
        render: (valor: string) => <Text strong>{valor}</Text>,
      },
      {
        title: 'Artículo',
        dataIndex: 'articulo',
        key: 'articulo',
        ellipsis: true,
        render: (valor: string) => <Text>{toTitleCase(valor || '') || '-'}</Text>,
      },
      {
        title: 'Familia',
        key: 'familia',
        width: 180,
        ellipsis: true,
        render: (_: unknown, registro) => (
          <Text>{toTitleCase(registro.familia?.nombre || '') || '-'}</Text>
        ),
      },
      {
        title: 'Cantidad',
        dataIndex: 'cantidad',
        key: 'cantidad',
        width: 120,
        align: 'right',
        render: (valor: number) => <Text>{formatNumber(valor ?? 0)}</Text>,
      },
      {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        width: 140,
        align: 'right',
        render: (valor: number) => <Text>{formatCurrency(valor ?? 0)}</Text>,
      },
      {
        title: 'Total',
        dataIndex: 'total',
        key: 'total',
        width: 140,
        align: 'right',
        render: (valor: number) => (
          <Text strong className="paces-text-total">{formatCurrency(valor ?? 0)}</Text>
        ),
      },
    ],
    []
  );

  const documentoCodigo = data
    ? `${data.documento?.codigo || tipoEfectivo}-${data.noDocumento}`
    : `${tipoEfectivo}-${id}`;

  // EPJ se muestra en Entrada de Almacén y SPJ en Salida de Almacén.
  const rutaBase = tipoEfectivo === 'SPJ' ? '/FSAP' : '/FENP';

  const estado = data?.estado ?? 0;

  // Las líneas se muestran agrupadas por familia y, dentro, por código.
  const detalles = useMemo(
    () => ordenarLineasPorFamiliaYCodigo(data?.detalles ?? []),
    [data?.detalles]
  );

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <DetalleToolbar
          modulo="OPROCESARCONTEO"
          estado={estado}
          periodo={data?.periodo ?? 0}
          operacionLoading={aplicar.isPending || desaplicar.isPending || anular.isPending}
          imprimiendo={imprimiendo}
          onVolver={() => navigate('/OPROCESARCONTEO')}
          onEditar={() =>
            navigate(`${rutaBase}/${ajusteId}/editar?tipoDoc=${tipoEfectivo}`)
          }
          onAplicar={confirmarAplicar}
          onDesaplicar={confirmarDesaplicar}
          // Anular solo aplica a documentos en borrador; un aplicado debe
          // desaplicarse primero.
          onAnular={data?.estado === 0 ? confirmarAnular : undefined}
          onImprimir={handleImprimir}
          // OProcesarConteo no tiene accion EDITAR: la edicion del ajuste se
          // controla con la accion PROCESAR de esa pantalla.
          editarPermiso={{ codigoPantalla: 'OPROCESARCONTEO', accion: 'PROCESAR' }}
          showImprimir
          extraButtons={
            <Tag color={estadoAjuste(estado).color}>{estadoAjuste(estado).label}</Tag>
          }
        />
      </div>

      {isError && (
        <div style={{ padding: '0 24px 16px' }}>
          <ListadoErrorAlert
            message={extraerMensajeError(error, 'Error al cargar el ajuste')}
            onRetry={() => void refetch()}
          />
        </div>
      )}

      {isLoading && !data ? (
        <LoadingSpinner mensaje="Cargando ajuste…" />
      ) : data ? (
        <>
          <div style={{ padding: '0 24px 16px' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Documento">{documentoCodigo}</Descriptions.Item>
              <Descriptions.Item label="Tipo">{data.documento?.codigo || tipoEfectivo}</Descriptions.Item>
              <Descriptions.Item label="Fecha">
                <FechaColumnCell fecha={data.fechaDocumento} />
              </Descriptions.Item>
              <Descriptions.Item label="Almacén">
                {toTitleCase(data.almacen?.nombre || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Concepto">
                {toTitleCase(data.concepto?.nombre || data.codigoConcepto || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={estadoAjuste(data.estado).color}>
                  {estadoAjuste(data.estado).label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Subtotal">{formatCurrency(data.subTotal)}</Descriptions.Item>
              <Descriptions.Item label="Descuento">{formatCurrency(data.descuento)}</Descriptions.Item>
              <Descriptions.Item label="Impuestos">{formatCurrency(data.impuestos)}</Descriptions.Item>
              <Descriptions.Item label="Total">
                <Text strong className="paces-text-total">{formatCurrency(data.total)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nota" span={2}>
                <Text style={{ whiteSpace: 'pre-wrap' }}>{data.nota || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div style={{ padding: '0 24px 8px' }}>
            <Text strong>Líneas ({detalles.length})</Text>
          </div>

          <Table<DetalleMovimientoDTO>
            columns={columnas}
            dataSource={detalles}
            rowKey={(r) => r.id || r.codigo}
            size="middle"
            scroll={{ x: 900 }}
            pagination={false}
            className="paces-border-top paces-list-table"
            locale={{ emptyText: 'El ajuste no tiene líneas.' }}
          />

          {data.estado === 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 24px 16px',
              }}
            >
              <Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Borrador: puede editarse o aplicarse.
                </Text>
                <Tag icon={<CheckCircleOutlined />} color="processing">
                  {tipoEfectivo}
                </Tag>
              </Space>
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
};

export default AjusteAlmacenDetalle;
