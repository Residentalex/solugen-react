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

  // ===== CÃ¡lculo de pendiente (misma lÃ³gica que desktop VTransaccionesPendientes) =====
  // Para SUP: pendiente = total - (origen Credito ? creditos : debitos)
  // Para CLI: pendiente = total - (origen Credito ? debitos : creditos)
  // origen viene de las props (como el escritorio con vTransacciones.origen)
  const calcularPendiente = useCallback((doc: any): number => {
    if (tipoEntidad === 'SUP') {
      return Math.max(0, (doc?.total || 0) - ((origen ?? 0) === 1 ? (doc?.creditos || 0) : (doc?.debitos || 0)));
    } else {
      return Math.max(0, (doc?.total || 0) - ((origen ?? 0) === 1 ? (doc?.debitos || 0) : (doc?.creditos || 0)));
    }
  }, [tipoEntidad, origen]);

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

      const { data } = await apiClient.get<any>(endpoint, { params });
      let docs = data?.data || [];

      // Filtrar solo documentos con pendiente > 0
      docs = docs.filter((d: any) => calcularPendiente(d) > 0);

      // ===== Filtrar por origenCuenta opuesto (igual que VTransaccionesPendientes del escritorio) =====
      // Si recibimos origen, mostrar SOLO documentos con OrigenCuenta opuesto al del RI
      if (origen !== undefined) {
        docs = docs.filter((d: any) => {
          const docOrigen = d.documento?.origenCuenta ?? d.origenCuenta;
          if (docOrigen === undefined) return true;
          return docOrigen !== origen;
        });
      }

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
  }, [sucursalActiva, tipoEntidad, codEntidad, esDocumentoInventario, documentoEnviado, obtenerCodigoCompleto, calcularPendiente]);

  // ===== Pre-seleccionar filas y precargar montos al abrir el modal =====
  useEffect(() => {
    if (open) {
      setSelectedRowKeys([]);
      setMontoADistribuir(montoTotal || 0);
      setDistribuido(0);
      setMontosPorFila({});

      cargar().then((docs) => {
        // Una vez cargados los documentos, establecer selecciÃ³n inicial y montos
        if (documentosIniciales && documentosIniciales.length > 0) {
          setSelectedRowKeys(documentosIniciales);
          // Precargar montos respetando montoADistribuir
          const montosIniciales: Record<string, number> = {};
          let restante = montoTotal || 0;
          (documentosIniciales || []).forEach((id) => {
            const doc = docs.find((d: any) => d.id === id);
            if (!doc) return;
            const pendiente = calcularPendiente(doc);
            if (pendiente <= 0 || restante <= 0) {
              montosIniciales[String(id)] = 0;
              return;
            }
            const asignar = Math.min(pendiente, restante);
            montosIniciales[String(id)] = asignar;
            restante -= asignar;
          });
          setMontosPorFila(montosIniciales);
        }
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Asignar montos automÃ¡ticamente al seleccionar/deseleccionar filas =====
  const handleSelectionChange = (keys: React.Key[]) => {
    // Detectar filas agregadas y removidas
    const prevKeys = selectedRowKeys;
    const added = keys.filter((k) => !prevKeys.includes(k));
    const removed = prevKeys.filter((k) => !keys.includes(k));

    setMontosPorFila((prev) => {
      const nuevos = { ...prev };
      // Filas removidas â†’ monto 0 (el disponible se recalcularÃ¡ automÃ¡ticamente con la suma)
      removed.forEach((key) => {
        nuevos[String(key)] = 0;
      });
      // Filas agregadas â†’ asignar pendiente limitado por el disponible restante
      added.forEach((key) => {
        const doc = documentos.find((d) => d.id === key);
        if (!doc) return;
        const pendiente = calcularPendiente(doc);
        // Calcular cuÃ¡nto estÃ¡ ya asignado en TODAS las filas (incluyendo las ya existentes en 'nuevos')
        const yaAsignado = Object.values(nuevos).reduce((s, v) => s + v, 0);
        const disponible = montoADistribuir - yaAsignado;
        if (pendiente <= 0 || disponible <= 0.01) {
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
      const p = doc ? calcularPendiente(doc) : 0;
      return s + Math.min(p, Math.max(0, montoADistribuir - s));
    }, 0);
    setDistribuido(totalNuevo);
    setSelectedRowKeys(keys);
  };

  // ===== Asignar montos automÃ¡ticamente =====
  const handleAsignar = () => {
    if (montoADistribuir <= 0) return;
    let restante = montoADistribuir;
    const nuevosMontos: Record<string, number> = {};

    const filas = selectedRowKeys.length > 0 ? selectedRowKeys : documentos.map(d => d.id);

    for (const id of filas) {
      const key = String(id);
      if (restante <= 0) { nuevosMontos[key] = 0; continue; }
      const doc = documentos.find(d => d.id === id);
      const pendiente = calcularPendiente(doc);
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
        const abonado = tipoEntidad === 'SUP'
          ? ((origen ?? 0) === 1 ? (r.creditos || 0) : (r.debitos || 0))
          : ((origen ?? 0) === 1 ? (r.debitos || 0) : (r.creditos || 0));
        return formatNumber(abonado);
      },
    },
    {
      title: 'Saldo Pendiente', key: 'saldo', width: 120, align: 'right' as const,
      render: (_: any, r: any) => <strong>{formatNumber(calcularPendiente(r))}</strong>,
    },
    {
      title: 'Monto a Asignar',
      key: 'montoAsignar',
      width: 130,
      align: 'right' as const,
      render: (_: any, record: any) => {
        const pendiente = calcularPendiente(record);
        const estaSeleccionado = selectedRowKeys.includes(record.id);
        return (
          <InputNumber
            size="small"
            style={{ width: '100%' }}
            min={0}
            max={pendiente}
            step={0.01}
            precision={2}
            controls={false}
            disabled={!puedeAsignar || !estaSeleccionado}
            value={montosPorFila[String(record.id)] ?? (estaSeleccionado ? pendiente : 0)}
            onChange={(val) => {
              setMontosPorFila(prev => ({ ...prev, [String(record.id)]: val || 0 }));
            }}
          />
        );
      },
    },
  ];

  // ===== Confirmar selecciÃ³n =====
  const handleConfirm = () => {
    const selected = selectedRowKeys.map((key) => {
      const doc = documentos.find((d) => d.id === key);
      const pendiente = calcularPendiente(doc);
      const montoFila = montosPorFila[String(key)] ?? pendiente;
      return {
        transaccionAsociadaID: doc?.id,
        id: doc?.id,
        documento: doc?.noDocumento,
        nCF: doc?.ncf,
        ncf: doc?.ncf,
        montoOriginal: doc?.total || 0,
        pagado: (doc?.total || 0) - pendiente,
        saldoPendiente: pendiente,
        monto: Math.min(montoFila, pendiente),
        fecha: doc?.fechaDocumento,
        tipoDocumento: doc?.tipoDocumento,
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
