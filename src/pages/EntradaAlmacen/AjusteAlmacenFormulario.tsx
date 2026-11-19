import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Input,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { ajusteAlmacenApi, type TipoAjuste } from '../../api/ajusteAlmacenApi';
import { useAuthStore } from '../../stores/authStore';
import FormularioToolbar from '../../components/FormularioToolbar';
import ListadoErrorAlert from '../../components/ListadoErrorAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import BuscarConceptoModal from '../../components/BuscarConceptoModal/BuscarConceptoModal';
import type { AjusteAlmacenDTO } from '../../types/ajusteAlmacen';
import type { ConceptoDTO } from '../../types/entradaAlmacen';
import type { DetalleMovimientoDTO } from '../../types/notaCredito';
import { ordenarLineasPorFamiliaYCodigo } from '../../utils/ordenLineas';
import {
  extraerMensajeError,
  formatCurrency,
  formatNumber,
  toTitleCase,
} from '../../utils/formats';

const { Text } = Typography;
const { TextArea } = Input;

interface AjusteAlmacenFormularioProps {
  tipo: TipoAjuste;
}

const redondear = (valor: number, decimales = 2) => Math.round(valor * 10 ** decimales) / 10 ** decimales;

/**
 * Edición de un ajuste de conteo (EPJ/SPJ) dentro de la ruta
 * /FENP/:id/editar?tipoDoc=...
 *
 * Solo se editan los datos que el backend permite en borrador: fecha, nota,
 * concepto y las cantidades/costos de las líneas. El tipo, número y estado los
 * controla el documento.
 */
const AjusteAlmacenFormulario: React.FC<AjusteAlmacenFormularioProps> = ({ tipo }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);

  const ajusteId = Number(id);

  const tipoEfectivo = useMemo<TipoAjuste>(() => {
    const porQuery = searchParams.get('tipoDoc');
    if (porQuery === 'EPJ' || porQuery === 'SPJ') return porQuery;
    return tipo;
  }, [searchParams, tipo]);

  const [fecha, setFecha] = useState<Dayjs | null>(null);
  const [nota, setNota] = useState('');
  const [lineas, setLineas] = useState<DetalleMovimientoDTO[]>([]);
  const [conceptoSeleccionado, setConceptoSeleccionado] = useState<ConceptoDTO | null>(null);
  const [conceptoModalOpen, setConceptoModalOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ajusteAlmacenFormulario', sucursalActiva, tipoEfectivo, ajusteId],
    queryFn: () => ajusteAlmacenApi.obtenerPorId(sucursalActiva, tipoEfectivo, ajusteId),
    enabled: sucursalActiva !== undefined && Number.isFinite(ajusteId),
  });

  useEffect(() => {
    if (!data) return;
    setFecha(data.fechaDocumento ? dayjs(data.fechaDocumento) : null);
    setNota(data.nota || '');
    setLineas(ordenarLineasPorFamiliaYCodigo((data.detalles ?? []).map((d) => ({ ...d }))));
    setConceptoSeleccionado(data.concepto ?? null);
  }, [data]);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error('No hay documento cargado.');
      if (!fecha) throw new Error('Indique la fecha del ajuste.');

      const detalles = lineas.map((linea) => {
        const cantidad = Math.abs(Number(linea.cantidad) || 0);
        const costo = Number(linea.costo) || 0;
        const total = redondear(cantidad * costo);

        return {
          ...linea,
          cantidad,
          costo,
          precio: costo,
          porcentajeDescuento: 0,
          descuento: 0,
          porcentajeImpuesto: 0,
          impuestos: 0,
          subTotal: total,
          total,
        };
      });

      const payload: AjusteAlmacenDTO = {
        ...data,
        // El cuerpo va como JSON DateTime: usar ISO, no el formato de query
        // yyyyMMddHHmmss (ese solo aplica a parametros de URL).
        fechaDocumento: fecha.format('YYYY-MM-DDTHH:mm:ss'),
        nota,
        // El concepto se puede cambiar; manda la moneda con que se valora.
        codigoConcepto: conceptoSeleccionado?.codigo ?? data.codigoConcepto,
        concepto: conceptoSeleccionado ?? data.concepto,
        codigoMoneda: conceptoSeleccionado?.moneda?.codigo ?? data.codigoMoneda,
        moneda: conceptoSeleccionado?.moneda ?? data.moneda,
        tasa: 1,
        detalles,
      };

      return ajusteAlmacenApi.actualizar(sucursalActiva, tipoEfectivo, ajusteId, payload);
    },
    onSuccess: (actualizado) => {
      message.success(`Documento ${tipoEfectivo}-${actualizado.noDocumento} actualizado.`);
      // EPJ vuelve a Entrada de Almacén; SPJ a Salida de Almacén.
      const ruta = tipoEfectivo === 'SPJ' ? '/FSAP' : '/FENP';
      navigate(`${ruta}/${ajusteId}?tipoDoc=${tipoEfectivo}`);
    },
    onError: (err) => message.error(extraerMensajeError(err, 'Error al guardar el ajuste.')),
  });

  const actualizarLinea = useCallback(
    (indice: number, campo: 'cantidad' | 'costo', valor: number | null) => {
      setLineas((prev) =>
        prev.map((linea, i) => (i === indice ? { ...linea, [campo]: valor ?? 0 } : linea))
      );
    },
    []
  );

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
        width: 130,
        align: 'right',
        render: (valor: number, _registro, indice) => (
          <InputNumber
            min={0}
            step={1}
            value={Number(valor) || 0}
            onChange={(nuevo) => actualizarLinea(indice, 'cantidad', nuevo)}
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: 'Costo',
        dataIndex: 'costo',
        key: 'costo',
        width: 150,
        align: 'right',
        render: (valor: number, _registro, indice) => (
          <InputNumber
            min={0}
            step={0.01}
            precision={4}
            value={Number(valor) || 0}
            onChange={(nuevo) => actualizarLinea(indice, 'costo', nuevo)}
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: 'Total',
        key: 'total',
        width: 150,
        align: 'right',
        render: (_: unknown, registro) => (
          <Text strong className="paces-text-total">
            {formatCurrency(redondear((Number(registro.cantidad) || 0) * (Number(registro.costo) || 0)))}
          </Text>
        ),
      },
    ],
    [actualizarLinea]
  );

  const totalDocumento = useMemo(
    () =>
      redondear(
        lineas.reduce(
          (suma, linea) =>
            suma + (Number(linea.cantidad) || 0) * (Number(linea.costo) || 0),
          0
        )
      ),
    [lineas]
  );

  const documentoCodigo = data
    ? `${data.documento?.codigo || tipoEfectivo}-${data.noDocumento}`
    : `${tipoEfectivo}-${id}`;

  const soloLectura = data ? data.estado !== 0 : false;

  return (
    <Card
      styles={{ body: { padding: 0 } }}
      className="paces-card-erp"
      style={{ borderRadius: 8, overflow: 'hidden' }}
    >
      <div style={{ padding: '16px 24px 0' }}>
        <FormularioToolbar
          mode="editar"
          saving={guardar.isPending}
          bloqueado={soloLectura || isLoading}
          estado={data?.estado ?? 0}
          periodo={data?.periodo ?? 0}
          onGuardar={() => guardar.mutate()}
          onCancelar={() => {
            const ruta = tipoEfectivo === 'SPJ' ? '/FSAP' : '/FENP';
            navigate(`${ruta}/${ajusteId}?tipoDoc=${tipoEfectivo}`);
          }}
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
          {soloLectura && (
            <div style={{ padding: '0 24px 16px' }}>
              <Alert
                type="warning"
                showIcon
                message="Solo se puede editar un documento en borrador."
              />
            </div>
          )}

          <div style={{ padding: '0 24px 16px' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Documento">{documentoCodigo}</Descriptions.Item>
              <Descriptions.Item label="Tipo">
                <Space size={6}>
                  <Text>{data.documento?.codigo || tipoEfectivo}</Text>
                  <Tag>{tipoEfectivo}</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Almacén">
                {toTitleCase(data.almacen?.nombre || '') || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Concepto">
                <Space size={8}>
                  <Text>
                    {toTitleCase(
                      conceptoSeleccionado?.nombre ||
                        data.concepto?.nombre ||
                        data.codigoConcepto ||
                        ''
                    ) || '-'}
                  </Text>
                  <Button
                    size="small"
                    onClick={() => setConceptoModalOpen(true)}
                    disabled={soloLectura}
                  >
                    Cambiar
                  </Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                <DatePicker
                  value={fecha}
                  onChange={(valor) => setFecha(valor)}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  disabled={soloLectura}
                  style={{ width: '100%' }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                <Text strong className="paces-text-total">{formatCurrency(totalDocumento)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nota" span={2}>
                <TextArea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  disabled={soloLectura}
                />
              </Descriptions.Item>
            </Descriptions>
          </div>

          <div style={{ padding: '0 24px 8px' }}>
            <Text strong>Líneas ({lineas.length})</Text>
          </div>

          <Table<DetalleMovimientoDTO>
            columns={columnas}
            dataSource={lineas}
            rowKey={(r) => r.id || r.codigo}
            size="middle"
            scroll={{ x: 950 }}
            pagination={false}
            className="paces-border-top paces-list-table"
            locale={{ emptyText: 'El ajuste no tiene líneas.' }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 16,
              padding: '12px 24px 16px',
            }}
          >
            <Text type="secondary">
              {formatNumber(lineas.length)} líneas · Total{' '}
              <Text strong>{formatCurrency(totalDocumento)}</Text>
            </Text>
          </div>
        </>
      ) : null}

      <BuscarConceptoModal
        open={conceptoModalOpen}
        onClose={() => setConceptoModalOpen(false)}
        onSelect={(concepto) => {
          setConceptoSeleccionado(concepto);
          setConceptoModalOpen(false);
        }}
        title="Cambiar concepto del ajuste"
        sucursal={sucursalActiva}
        documento={tipoEfectivo}
      />
    </Card>
  );
};

export default AjusteAlmacenFormulario;
