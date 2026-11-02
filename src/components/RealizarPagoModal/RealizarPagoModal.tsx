import React, { useState } from 'react';
import { Modal, Button, InputNumber, Row, Col, Empty, Divider, Tag, Space, Table, message } from 'antd';
import {
  DollarCircleOutlined,
  FileTextOutlined,
  SwapOutlined,
  CreditCardOutlined,
  CreditCardFilled,
  GiftOutlined,
  TagOutlined,
  RollbackOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { CobroDTO, ClienteDTO } from '../../types/facturaPOS';
import type { DocumentoRelacionadoDTO } from '../../types/notaDebito';
import type { FacturaVistaDTO } from '../../types/facturacion';
import { facturaPOSApi } from '../../api/facturaPOSApi';
import { devolucionVentaApi } from '../../api/devolucionVentaApi';
import { formatNumber, extraerMensajeError } from '../../utils/formats';

type MedioPago =
  | 'efectivo'
  | 'cheque'
  | 'transferencia'
  | 'tarjetaCredito'
  | 'tarjetaDebito'
  | 'bono'
  | 'tarjetaRegalo'
  | 'notaCredito';

interface MedioInfo {
  key: MedioPago;
  label: string;
  icon: React.ReactNode;
}

const MEDIOS: MedioInfo[] = [
  { key: 'efectivo', label: 'Efectivo', icon: <DollarCircleOutlined /> },
  { key: 'cheque', label: 'Cheque', icon: <FileTextOutlined /> },
  { key: 'transferencia', label: 'Transferencia', icon: <SwapOutlined /> },
  { key: 'tarjetaCredito', label: 'Tarjeta Crédito', icon: <CreditCardOutlined /> },
  { key: 'tarjetaDebito', label: 'Tarjeta Débito', icon: <CreditCardFilled /> },
  { key: 'bono', label: 'Bono', icon: <GiftOutlined /> },
  { key: 'tarjetaRegalo', label: 'Tarjeta Regalo', icon: <TagOutlined /> },
  { key: 'notaCredito', label: 'Nota Crédito', icon: <RollbackOutlined /> },
];

/** Item seleccionado en el modal de NC / Devoluciones disponibles. */
interface NcSeleccionado {
  record: FacturaVistaDTO;
  montoAplicar: number;
}

interface PagoItem {
  key: string;
  medio: MedioPago;
  monto: number;
  /** Número de documento (solo Nota Crédito). */
  numeroDocumento?: string;
  /** ID de transacción del documento NC/DEV, para armar el payload. */
  transaccionID?: number;
  tipoDocumento?: 'DEV' | 'NC';
}

type DocumentoNCRef = Pick<DocumentoRelacionadoDTO, 'documento' | 'transaccionAsociadaID' | 'monto'>;

interface RealizarPagoModalProps {
  open: boolean;
  onClose: () => void;
  sucursal: number;
  facturaID: number;
  cobros?: CobroDTO;
  /** Docs NC/DEV actualmente asociados (documento, transaccionAsociadaID, monto). */
  documentosAsociados?: DocumentoNCRef[];
  cliente?: Pick<ClienteDTO, 'codigo' | 'identificacion' | 'nombre'>;
  /** Total del documento, para calcular la Diferencia. */
  total?: number;
  onGuardado: () => void;
}

/** Arma la lista inicial de pagos desde el cobro y los docs NC/DEV actuales. */
function calcularItemsIniciales(cobros?: CobroDTO, documentosAsociados?: DocumentoNCRef[]): PagoItem[] {
  const iniciales: PagoItem[] = [];

  MEDIOS.forEach((m) => {
    if (m.key === 'notaCredito') return;
    const monto = cobros?.[m.key] ?? 0;
    if (monto > 0) {
      iniciales.push({ key: `${m.key}-inicial`, medio: m.key, monto });
    }
  });

  (documentosAsociados || []).forEach((d, idx) => {
    iniciales.push({
      key: `nc-inicial-${idx}-${d.transaccionAsociadaID ?? d.documento ?? ''}`,
      medio: 'notaCredito',
      monto: d.monto || 0,
      numeroDocumento: d.documento,
      transaccionID: d.transaccionAsociadaID,
      tipoDocumento: (d.documento || '').toUpperCase().startsWith('DEV') ? 'DEV' : 'NC',
    });
  });

  return iniciales;
}

const RealizarPagoModal: React.FC<RealizarPagoModalProps> = ({
  open,
  onClose,
  sucursal,
  facturaID,
  cobros,
  documentosAsociados,
  cliente,
  total,
  onGuardado,
}) => {
  const [items, setItems] = useState<PagoItem[]>([]);
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioPago>('efectivo');
  const [montoActual, setMontoActual] = useState<number | null>(null);
  const [ncModalOpen, setNcModalOpen] = useState(false);
  const [ncDocumentos, setNcDocumentos] = useState<FacturaVistaDTO[]>([]);
  const [ncSeleccionados, setNcSeleccionados] = useState<NcSeleccionado[]>([]);
  const [cargandoNC, setCargandoNC] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Reset del estado al abrir (patron de ajuste de estado durante el render).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setItems(calcularItemsIniciales(cobros, documentosAsociados));
      setMedioSeleccionado('efectivo');
      setMontoActual(null);
      setNcModalOpen(false);
      setNcSeleccionados([]);
    }
  }

  const sumarMedio = (medio: MedioPago) =>
    items.filter((i) => i.medio === medio).reduce((s, i) => s + (i.monto || 0), 0);

  const totalCobrado = items.reduce((s, i) => s + (i.monto || 0), 0);
  const diferencia = total !== undefined ? total - totalCobrado : undefined;

  const handleAnadir = () => {
    const monto = Number(montoActual ?? 0);
    if (!monto || monto <= 0) {
      message.warning('Ingrese un monto mayor a cero');
      return;
    }
    setItems((prev) => [
      ...prev,
      { key: `${medioSeleccionado}-${Date.now()}-${prev.length}`, medio: medioSeleccionado, monto },
    ]);
    setMontoActual(null);
  };

  const handleEliminar = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const abrirSelectorNC = async () => {
    if (!cliente?.codigo) {
      message.warning('No hay cliente para buscar NC / Devoluciones');
      return;
    }
    try {
      setCargandoNC(true);
      const result = await devolucionVentaApi.filtrar(sucursal, {
        cliente: cliente.codigo,
        cantidad: 50,
        salto: 0,
      });
      const disponibles = (result.data || []).filter(
        (d) => (d.estado || '').toUpperCase() !== 'ANULADO'
      );
      setNcDocumentos(disponibles);
      setNcSeleccionados([]);
      setNcModalOpen(true);
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al cargar NC / Devoluciones disponibles'));
    } finally {
      setCargandoNC(false);
    }
  };

  const confirmarNC = () => {
    const nuevos: PagoItem[] = ncSeleccionados
      .filter((d) => (d.montoAplicar || 0) > 0)
      .map((d, idx) => {
        const numero = d.record.documento || '';
        return {
          key: `nc-doc-${Date.now()}-${idx}`,
          medio: 'notaCredito',
          monto: d.montoAplicar,
          numeroDocumento: numero,
          transaccionID: d.record.id,
          tipoDocumento: numero.toUpperCase().startsWith('DEV') ? 'DEV' : 'NC',
        };
      });
    setItems((prev) => [...prev, ...nuevos]);
    setNcModalOpen(false);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const payload: CobroDTO = {
        efectivo: sumarMedio('efectivo'),
        cheque: sumarMedio('cheque'),
        transferencia: sumarMedio('transferencia'),
        tarjetaCredito: sumarMedio('tarjetaCredito'),
        tarjetaDebito: sumarMedio('tarjetaDebito'),
        bono: sumarMedio('bono'),
        tarjetaRegalo: sumarMedio('tarjetaRegalo'),
        notaCredito: sumarMedio('notaCredito'),
        facturaID,
        documentosAsociados: items
          .filter((i) => i.medio === 'notaCredito' && i.transaccionID != null)
          .map((i) => ({
            transaccionID: i.transaccionID as number,
            tipoDocumento: i.tipoDocumento || 'NC',
            // El backend arma el codigo como `${tipoDocumento}-${noDocumento}`:
            // se envia el numero sin el prefijo de tipo para no duplicarlo.
            noDocumento: (i.numeroDocumento || '').replace(/^(DEV|NC)-/i, ''),
            monto: i.monto,
          })),
      };

      await facturaPOSApi.actualizarCobros(sucursal, payload);
      message.success('Cobros actualizados correctamente');
      onGuardado();
      onClose();
    } catch (err) {
      message.error(extraerMensajeError(err, 'Error al actualizar cobros'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title="Realizar pago"
      open={open}
      onCancel={onClose}
      onOk={handleGuardar}
      okText="Guardar"
      cancelText="Cancelar"
      confirmLoading={guardando}
      width={820}
      destroyOnHidden
    >
      <Row gutter={16}>
        {/* Izquierda: lista de medios de pago */}
        <Col xs={24} md={9}>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 4, marginBottom: 16 }}>
            {MEDIOS.map((m) => {
              const seleccionado = medioSeleccionado === m.key;
              return (
                <div
                  key={m.key}
                  onClick={() => setMedioSeleccionado(m.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: seleccionado ? '#eef2ff' : 'transparent',
                    color: seleccionado ? '#556ee6' : 'inherit',
                    fontWeight: seleccionado ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{m.icon}</span>
                  <span style={{ fontSize: 13 }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </Col>

        {/* Derecha: captura + lista de pagos + totales */}
        <Col xs={24} md={15}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            {medioSeleccionado === 'notaCredito' ? (
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={abrirSelectorNC}
                disabled={!cliente?.codigo}
                loading={cargandoNC}
              >
                Buscar documento
              </Button>
            ) : (
              <>
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  step={0.01}
                  precision={2}
                  placeholder="Monto"
                  value={montoActual}
                  onChange={(v) => setMontoActual(v)}
                />
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAnadir}>
                  Añadir
                </Button>
              </>
            )}
          </div>

          <div style={{ maxHeight: 260, overflow: 'auto' }}>
            {items.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin pagos agregados" />
            ) : (
              items.map((i) => {
                const medioInfo = MEDIOS.find((m) => m.key === i.medio);
                return (
                  <div
                    key={i.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: 'var(--paces-bg-secondary)',
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 14, color: 'var(--paces-text-secondary)' }}>
                        {medioInfo?.icon}
                      </span>
                      <span style={{ fontSize: 13 }}>{medioInfo?.label}</span>
                      {i.numeroDocumento && (
                        <Tag color="blue" style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}>
                          {i.numeroDocumento}
                        </Tag>
                      )}
                    </div>
                    <Space size={4}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{formatNumber(i.monto)}</span>
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleEliminar(i.key)}
                      />
                    </Space>
                  </div>
                );
              })
            )}
          </div>

          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 32, fontSize: 14 }}>
            <span>
              <strong>Cobrado:</strong> {formatNumber(totalCobrado)}
            </span>
            {diferencia !== undefined && (
              <span style={{ color: diferencia > 0 ? '#ff4d4f' : '#52c41a' }}>
                <strong>Diferencia:</strong> {formatNumber(diferencia)}
              </span>
            )}
          </div>
        </Col>
      </Row>

      <Modal
        title="Seleccionar Notas de Crédito / Devoluciones disponibles"
        open={ncModalOpen}
        onCancel={() => { setNcSeleccionados([]); setNcModalOpen(false); }}
        onOk={confirmarNC}
        okText="Agregar"
        cancelText="Cancelar"
        width={700}
      >
        <Table
          dataSource={ncDocumentos}
          rowKey="id"
          loading={cargandoNC}
          rowSelection={{
            type: 'checkbox',
            onChange: (_keys, selectedRows) => {
              setNcSeleccionados(
                selectedRows.map((r) => ({
                  record: r,
                  montoAplicar: ncSeleccionados.find((d) => d.record.id === r.id)?.montoAplicar || r.total,
                }))
              );
            },
          }}
          columns={[
            { title: 'Documento', dataIndex: 'documento', width: 140 },
            { title: 'Fecha', dataIndex: 'fecha', width: 110 },
            {
              title: 'Total', dataIndex: 'total', width: 120, align: 'right' as const,
              render: (v: number) => formatNumber(v),
            },
            {
              title: 'Monto a Aplicar', key: 'monto', width: 150,
              render: (_: unknown, record: FacturaVistaDTO) => {
                const item = ncSeleccionados.find((d) => d.record.id === record.id);
                return (
                  <InputNumber
                    size="small"
                    min={0}
                    max={record.total}
                    step={0.01}
                    precision={2}
                    value={item?.montoAplicar || 0}
                    onChange={(val) => {
                      setNcSeleccionados((prev) =>
                        prev.map((d) =>
                          d.record.id === record.id ? { ...d, montoAplicar: val || 0 } : d
                        )
                      );
                    }}
                  />
                );
              },
            },
          ]}
          pagination={false}
          size="small"
        />
      </Modal>
    </Modal>
  );
};

export default RealizarPagoModal;
