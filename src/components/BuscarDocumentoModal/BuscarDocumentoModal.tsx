import React, { useEffect, useState, useCallback } from 'react';
import { Modal, Table, Button, Space, message, InputNumber } from 'antd';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { formatDate, formatNumber } from '../../utils/formats';

interface BuscarDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (docs: any[]) => void;
  tipoEntidad: 'SUP' | 'CLI';
  codEntidad: string;
  origen?: number;  // 0=Debito, 1=Credito (viene del padre, como el escritorio)
  esDocumentoInventario?: boolean;
  montoTotal?: number;
  /** IDs de documentos ya asociados, se pre-seleccionan al abrir el modal */
  documentosIniciales?: number[];
  /** Texto del documento a excluir (ej: "RI-000123") */
  documentoEnviado?: string;
  /** Si false, el monto se asigna automaticamente y el InputNumber es readonly */
  puedeAsignar?: boolean;
}

const BuscarDocumentoModal: React.FC<BuscarDocumentoModalProps> = ({
  open, onClose, onSelect, tipoEntidad, codEntidad, origen,
  esDocumentoInventario, montoTotal,
  documentosIniciales, documentoEnviado, puedeAsignar = true,
}) => {
  const TIPO_DOC_CODES: string[] = [
    'AID','AIC','ABN','AJA','CBI','CDC','CHK','CHN','CIE','CIT',
    'CKO','CPF','CTT','DBA','DBI','DCA','DCN','DEC','DEP','DEV',
    'DGA','DPN','DPR','DVC','DVN','ED','EDI','EDN','EIN','ENP',
    'EPJ','EPN','ER','EXP','FAC','FAN','LAC','NBN','NC','NCB',
    'NCN','ND','NDB','NDD','NDN','NDV','NOM','ORC','ORT','PAG',
    'PRES','PV','PVC','PVN','PVS','PVT','RAC','RBN','RCM','RDE',
    'RDN','REA','REQ','RES','RETA','RI','RIN','RSV','RTB','RUA',
    'SAP','SCO','SDD','SPA','SPJ','SPN','SPT','TBN','TID','TRB',
    'TRP','TUR','UBD','VD','DBN','PVComponente','Existencia'
  ];

  const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [montosPorFila, setMontosPorFila] = useState<Record<string, number>>({});
  const [montoADistribuir, setMontoADistribuir] = useState(0);
  const [distribuido, setDistribuido] = useState(0);

  // ===== Helper: construir codigo completo del documento =====
  const obtenerCodigoCompleto = useCallback((doc: any): string => {
    const codigoTipo = doc?.documento?.codigo
      || (typeof doc?.tipoDocumento === 'number' ? TIPO_DOC_CODES[doc.tipoDocumento] : doc?.tipoDocumento)
      || '';
    const num = doc?.noDocumento || '';
    return codigoTipo ? `${codigoTipo}-${num}` : num;
  }, []);

  // ===== Helper: obtener pendiente real (puede ser negativo en caso de sobrepago) =====
  // Infiere el tipo de documento desde los valores numéricos sin depender de documento.origenCuenta
  const _obtenerPendienteReal = useCallback((doc: any): number => {
    const total = doc?.total || 0;
    const creditos = doc?.creditos || 0;
    const debitos = doc?.debitos || 0;

    const diffCred = total - creditos;
    const diffDeb = total - debitos;

    // Sobrepago en crédito (doc débito donde pagaron de más)
    if (diffCred < 0) return diffCred;
    // Sobrepago en débito (doc crédito donde pagaron de más)
    if (diffDeb < 0) return diffDeb;
    // Pendiente normal por crédito
    if (diffCred > 0) return diffCred;
    // Pendiente normal por débito
    if (diffDeb > 0) return diffDeb;
    // Sin saldo
    return 0;
  }, []);

  // ===== Cálculo de pendiente para UI (nunca negativo) =====
  const calcularPendiente = useCallback((doc: any): number => {
    return Math.abs(_obtenerPendienteReal(doc));
  }, [_obtenerPendienteReal]);

  // ===== Cargar documentos pendientes =====
  const cargar = useCallback(async (): Promise<any[]> => {
    if (!codEntidad) { setDocumentos([]); return []; }
    setLoading(true);
    try {
      const endpoint = esDocumentoInventario
        ? `/Transaccion/${sucursalActiva}/pendienteInv/${codEntidad}`
        : `/Transaccion/${sucursalActiva}/pendiente/${codEntidad}`;

      const params: any = {};
      if (!esDocumentoInventario) params.tipoEntidad = tipoEntidad;

      const { data: respData } = await apiClient.get<any>(endpoint, { params });
      let docs = respData?.data || [];

      // ===== Filtrar documentos con pendiente real != 0 (tanto saldo como sobrepago) =====
      docs = docs.filter((d: any) => _obtenerPendienteReal(d) !== 0);

      // ===== Filtrar documentoEnviado =====
      if (documentoEnviado) {
        docs = docs.filter((d: any) => obtenerCodigoCompleto(d) !== documentoEnviado);
      }

      setDocumentos(docs);
      return docs;
    } catch {
      message.error('Error al cargar documentos pendientes');
      return [];
    } finally {
      setLoading(false);
    }
  }, [sucursalActiva, tipoEntidad, codEntidad, esDocumentoInventario, documentoEnviado, obtenerCodigoCompleto, _obtenerPendienteReal]);

  // ===== Pre-seleccionar filas y precargar montos al abrir el modal =====
  useEffect(() => {
    if (open) {
      setSelectedRowKeys([]);
      setMontoADistribuir(montoTotal || 0);
      setDistribuido(0);
      setMontosPorFila({});

      cargar().then((docs) => {
        const montosIniciales: Record<string, number> = {};
        let restante = montoTotal || 0;

        if (documentosIniciales && documentosIniciales.length > 0) {
          // Precargar selección y montos desde documentosIniciales
          setSelectedRowKeys(documentosIniciales);
          (documentosIniciales || []).forEach((id) => {
            const doc = docs.find((d: any) => d.id === id);
            if (!doc) return;
            const pendienteReal = _obtenerPendienteReal(doc);
            const pendiente = calcularPendiente(doc);
            if (pendienteReal < 0) {
              // Sobrepago: asignar valor absoluto
              const asignar = Math.min(Math.abs(pendienteReal), restante);
              montosIniciales[String(id)] = asignar;
              restante -= asignar;
              return;
            }
            if (pendiente <= 0 || restante <= 0) {
              montosIniciales[String(id)] = 0;
              return;
            }
            const asignar = Math.min(pendiente, restante);
            montosIniciales[String(id)] = asignar;
            restante -= asignar;
          });
        }

        setDistribuido(Object.values(montosIniciales).reduce((s: number, v: any) => s + (v || 0), 0));
        setMontosPorFila(montosIniciales);
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Asignar montos automáticamente al seleccionar/deseleccionar filas =====
  const handleSelectionChange = (keys: React.Key[]) => {
    // Detectar filas agregadas y removidas
    const prevKeys = selectedRowKeys;
    const added = keys.filter((k) => !prevKeys.includes(k));
    const removed = prevKeys.filter((k) => !keys.includes(k));

    setMontosPorFila((prev) => {
      const nuevos = { ...prev };
      // Filas removidas → monto 0 (el disponible se recalculará automáticamente con la suma)
      removed.forEach((key) => {
        nuevos[String(key)] = 0;
      });
      // Filas agregadas → asignar pendiente limitado por el disponible restante
      added.forEach((key) => {
        const doc = documentos.find((d) => d.id === key);
        if (!doc) return;
        const pendienteReal = _obtenerPendienteReal(doc);
        const pendiente = calcularPendiente(doc);
        // Calcular cuánto está ya asignado en TODAS las filas (incluyendo las ya existentes en 'nuevos')
        const yaAsignado = Object.values(nuevos).reduce((s, v) => s + v, 0);
        const disponible = montoADistribuir > 0 ? montoADistribuir - yaAsignado : Math.abs(pendienteReal);

        if (pendienteReal < 0) {
          // Sobrepago: asignar valor absoluto
          nuevos[String(key)] = Math.min(Math.abs(pendienteReal), Math.max(0, disponible));
          return;
        }
        if (pendiente <= 0 || (montoADistribuir > 0 && disponible <= 0.01)) {
          nuevos[String(key)] = 0;
          return;
        }
        nuevos[String(key)] = Math.min(pendiente, disponible);
      });
      return nuevos;
    });

    // Sincronizar state distribuido con el total calculado
    const totalNuevo = keys.reduce<number>((s, id) => {
      const doc = documentos.find((d) => d.id === id);
      if (!doc) return s;
      const pendienteReal = _obtenerPendienteReal(doc);
      if (pendienteReal < 0) {
        return s + Math.abs(pendienteReal);
      }
      const p = calcularPendiente(doc);
      return s + Math.min(p, Math.max(0, montoADistribuir - s));
    }, 0);
    setDistribuido(totalNuevo);
    setSelectedRowKeys(keys);
  };

  // ===== Asignar montos automáticamente =====
  const handleAsignar = () => {
    if (montoADistribuir <= 0) return;
    let restante = montoADistribuir;
    const nuevosMontos: Record<string, number> = {};

    const filas = selectedRowKeys.length > 0 ? selectedRowKeys : documentos.map(d => d.id);

    for (const id of filas) {
      const key = String(id);
      if (restante <= 0) { nuevosMontos[key] = 0; continue; }
      const doc = documentos.find(d => d.id === id);
      const pendienteReal = _obtenerPendienteReal(doc);
      const pendiente = calcularPendiente(doc);
      if (pendienteReal < 0) {
        const asignar = Math.min(Math.abs(pendienteReal), restante);
        nuevosMontos[key] = asignar;
        restante -= asignar;
        continue;
      }
      if (pendiente <= 0) { nuevosMontos[key] = 0; continue; }
      const asignar = Math.min(restante, pendiente);
      nuevosMontos[key] = asignar;
      restante -= asignar;
    }

    setMontosPorFila(nuevosMontos);
  };

  // ===== Columnas de la tabla =====
  const columnas = [
    {
      title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fecha', width: 110,
      render: (v: string) => v ? formatDate(v) : '-',
    },
    {
      title: 'Documento', key: 'documento', width: 200,
      render: (_: any, r: any) => {
        const codigoTipo = r.documento?.codigo || (typeof r.tipoDocumento === 'number' ? TIPO_DOC_CODES[r.tipoDocumento] : r.tipoDocumento) || '';
        const num = r.noDocumento || '';
        return codigoTipo ? `${codigoTipo}-${num}` : num;
      },
    },
    { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 140, render: (v: string) => v || '-' },
    {
      title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
      render: (v: number) => formatNumber(v || 0),
    },
    {
      title: 'Abonado', key: 'abonado', width: 120, align: 'right' as const,
      render: (_: any, r: any) => {
        const total = r?.total || 0;
        const pendienteReal = _obtenerPendienteReal(r);
        const abonado = total - pendienteReal;
        return formatNumber(Math.max(0, abonado));
      },
    },
    {
      title: 'Saldo Pendiente', key: 'saldo', width: 120, align: 'right' as const,
      render: (_: any, r: any) => {
        const pendienteReal = _obtenerPendienteReal(r);
        return <strong>{formatNumber(Math.abs(pendienteReal))}</strong>;
      },
    },
    {
      title: 'Monto a Asignar',
      key: 'montoAsignar',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: any) => {
        const pendienteReal = _obtenerPendienteReal(record);
        const pendiente = calcularPendiente(record);
        const estaSeleccionado = selectedRowKeys.includes(record.id);
        const maxMonto = pendienteReal < 0 ? Math.abs(pendienteReal) : pendiente;
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={maxMonto}
            step={0.01}
            precision={2}
            controls={false}
            disabled={!puedeAsignar || !estaSeleccionado}
            value={montosPorFila[String(record.id)] ?? (estaSeleccionado ? maxMonto : 0)}
            onChange={(val) => {
              setMontosPorFila(prev => ({ ...prev, [String(record.id)]: val || 0 }));
            }}
          />
        );
      },
    },
  ];

  // ===== Confirmar selección =====
  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const doc = documentos.find((d) => d.id === key);
      const pendienteReal = _obtenerPendienteReal(doc);
      const pendiente = calcularPendiente(doc);
      const montoFila = montosPorFila[String(key)] ?? pendiente;
      const esSobrepago = pendienteReal < 0;
      return {
        transaccionAsociadaID: doc?.id,
        id: doc?.id,
        documento: obtenerCodigoCompleto(doc),
        nCF: doc?.ncf,
        ncf: doc?.ncf,
        montoOriginal: doc?.total || 0,
        pagado: (doc?.total || 0) - pendienteReal,
        saldoPendiente: pendiente,
        monto: Math.min(montoFila, esSobrepago ? Math.abs(pendienteReal) : pendiente),
        fecha: doc?.fechaDocumento,
        tipoDocumento: doc?.tipoDocumento,
        codigoSucursal: doc?.codigoSucursal,
        sucursal: doc?.sucursal?.nombre,
      };
    });
    onSelect(selected);
    onClose();
  };

  // Calcular total distribuido de filas seleccionadas
  const totalDistribuido = selectedRowKeys.reduce<number>((s, k) => s + (montosPorFila[String(k)] || 0), 0);

  return (
    <Modal
      title="Buscar Documentos Relacionados"
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <span>Monto a distribuir:</span>
            <InputNumber
              size="small"
              style={{ width: 120 }}
              min={0}
              step={0.01}
              precision={2}
              value={montoADistribuir}
              onChange={(val) => setMontoADistribuir(val || 0)}
            />
            <span style={{ marginLeft: 16, color: '#888' }}>
              Distribuido: {formatNumber(totalDistribuido)} |{' '}
              Disponible:{' '}
              <span style={{ color: (montoADistribuir - totalDistribuido) < 0 ? '#ff4d4f' : '#52c41a' }}>
                {formatNumber(Math.max(0, montoADistribuir - totalDistribuido))}
              </span>
            </span>
          </Space>
          <Space>
            <Button onClick={handleAsignar}>Asignar</Button>
            <Button onClick={onClose}>Cancelar</Button>
            <Button type="primary" onClick={handleConfirm} disabled={selectedRowKeys.length === 0}>
              Agregar ({selectedRowKeys.length})
            </Button>
          </Space>
        </div>
      }
      width={1000}
      destroyOnHidden
    >
      <Table
        dataSource={documentos}
        columns={columnas}
        rowKey={(r) => r.id}
        loading={loading}
        size="small"
        pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{
          selectedRowKeys,
          onChange: handleSelectionChange,
        }}
        scroll={{ x: 900 }}
      />
    </Modal>
  );
};

export default BuscarDocumentoModal;
