import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Table, Typography, Spin, message, Button, Alert } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { apiClient } from '../../api/client';
import { parametrosApi } from '../../api/parametrosApi';
import { conceptosApi } from '../../api/conceptosApi';
import { entidadApi } from '../../api/entidadApi';
import { tipoApi } from '../../api/tipoApi';
import { toTitleCase, formatCurrency, formatDate } from '../../utils/formats';

const { Text } = Typography;

// Misma lógica de aging que en AntiguedadSaldos.tsx
function calcularDias(fechaDoc: string, fechaRef: Date): number {
    if (!fechaDoc) return 0;
    const d = new Date(fechaDoc);
    return Math.floor((fechaRef.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

const DetalleSuplidor: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sucursalActiva = useAuthStore((s) => s.sucursalActiva);
    const skipGuard = searchParams.get('skipGuard');

    // Leer datos desde localStorage (enviados desde la página principal)
    const storedData = localStorage.getItem('detalleSuplidor_data');
    const parsedData = storedData ? JSON.parse(storedData) : null;
    
    const codEntidad = parsedData?.codEntidad || searchParams.get('codEntidad') || '';
    const nomEntidad = parsedData?.nomEntidad || searchParams.get('nomEntidad') || '';
    const tipoEntidad = parsedData?.tipoEntidad || 'SUP';

    const [documentos, setDocumentos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fechaRef] = useState(new Date());
    const [selectedDocs, setSelectedDocs] = useState<any[]>([]);

    const cargarDatos = async () => {
        if (!codEntidad) return;
        setLoading(true);
        setError(null);
        setSelectedDocs([]);
        try {
            const d = new Date();
            const hasta = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`;
            
            const { data: resp } = await apiClient.get(`/Transaccion/${sucursalActiva}/${tipoEntidad}/balances`, {
                params: { hasta, codEntidad }
            });
            
            const docs = resp?.data || [];
            const docsConSaldo = docs
                .map((d: any) => {
                    const creditos = d.creditos || 0;
                    const debitos = d.debitos || 0;
                    const total = d.total || 0;
                    const saldo = tipoEntidad === 'SUP'
                        ? total - debitos
                        : total - creditos;
                    
                    return {
                        ...d,
                        abonado: tipoEntidad === 'SUP' ? debitos : creditos,
                        saldoPendiente: Math.round(saldo * 100) / 100,
                        esSobrepago: saldo < 0,
                        dias: calcularDias(d.fechaDocumento, fechaRef),
                    };
                })
                .filter((d: any) => d.saldoPendiente !== 0);

            setDocumentos(docsConSaldo);
        } catch {
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const ajustarSaldo = async (docs: any[]) => {
        try {
            const params = await parametrosApi.obtenerParametrosAjuste(sucursalActiva);
            const conceptoAjuste = params?.conceptoAjuste || '';
            
            // Obtener concepto
            const concepto = await conceptosApi.obtenerPorCodigo(sucursalActiva, conceptoAjuste);
            
            // Construir entidad con los datos que ya tenemos
            const entidad = {
                codigo: codEntidad,
                idExterno: codEntidad,
                nombre: nomEntidad,
                identificacion: '',
                tipoEntidad: { codigo: tipoEntidad },
            };
            
            // Calcular total y determinar tipo de ajuste
            let totalMonto = 0;
            const transaccionesAsociadas: any[] = [];
            let haySobrepago = false;
            let haySaldoPositivo = false;
            
            for (const d of docs) {
                const montoAbs = Math.abs(Math.round((d.saldoPendiente || 0) * 100) / 100);
                totalMonto += montoAbs;
                if (d.esSobrepago) haySobrepago = true;
                else haySaldoPositivo = true;
                
                transaccionesAsociadas.push({
                    transaccionAsociadaID: d.id,
                    id: d.id,
                    documento: `${d.tipoDocumento || ''}-${d.noDocumento || ''}`,
                    ncf: d.ncf || '',
                    montoOriginal: Math.round((d.total || 0) * 100) / 100,
                    monto: montoAbs,
                    pagado: d.abonado || 0,
                    saldoPendiente: montoAbs,
                    fecha: d.fechaDocumento,
                    tipoDocumento: d.tipoDocumento,
                });
            }
            
            // Si hay mezcla, priorizar ND (saldo positivo predomina)
            const esNC = haySobrepago && !haySaldoPositivo;
            
            // Obtener tipo de documento según caso
            let tipoCodigo = '';
            if (tipoEntidad === 'SUP') {
                tipoCodigo = esNC ? params.tipoNCSUP : params.tipoNDSUP;
            } else {
                tipoCodigo = esNC ? params.tipoNCCLI : params.tipoNDCLI;
            }
            
            // Obtener tipo
            const tipo = await tipoApi.obtenerPorCodigo(sucursalActiva, esNC ? 'NC' : 'ND', tipoCodigo);
            
            const cloneData = {
                tipoEntidad,
                concepto,
                entidad,
                tipo,
                fechaDocumento: new Date().toISOString(),
                total: Math.round(totalMonto * 100) / 100,
                transaccionesAsociadas,
                moneda: docs[0]?.moneda,
            };
            
            const ruta = esNC ? `/FNC${tipoEntidad}/nuevo` : `/FND${tipoEntidad}/nuevo`;
            navigate(ruta, { state: { cloneData } });
            
        } catch (err: any) {
            message.error(err?.response?.data?.errorMessage || 'Error al preparar ajuste de saldo');
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [codEntidad, sucursalActiva]);

    // Columnas estilo AntiguedadSaldos (rangos de días)
    const columnas = [
        {
            title: 'Documento', key: 'documento', width: 160,
            fixed: 'left' as const,
            render: (_: any, r: any) => (
                <span style={{ color: '#556ee6', fontWeight: 500 }}>
                    {r.tipoDocumento || ''}-{r.noDocumento || ''}
                </span>
            ),
        },
        { title: 'NCF', dataIndex: 'ncf', key: 'ncf', width: 150, render: (v: string) => v ? <Text style={{ fontSize: 12 }}>{v}</Text> : '-' },
        {
            title: 'Fecha', dataIndex: 'fechaDocumento', key: 'fecha', width: 100,
            render: (v: string) => v ? formatDate(v) : '-',
        },
        {
            title: 'Total', dataIndex: 'total', key: 'total', width: 120, align: 'right' as const,
            render: (v: number) => formatCurrency(v || 0),
        },
        {
            title: 'Abonado', key: 'abonado', width: 120, align: 'right' as const,
            render: (_: any, r: any) => formatCurrency(r.abonado || 0),
        },
        {
            title: 'Saldo Pendiente', key: 'saldo', width: 130, align: 'right' as const,
            render: (_: any, r: any) => (
                <Text strong style={{ color: r.saldoPendiente < 0 ? '#ff4d4f' : undefined }}>
                    {formatCurrency(r.saldoPendiente)}
                </Text>
            ),
        },
    ];

    return (
        <Card
            className="paces-card-erp"
            style={{ borderRadius: 8, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}
        >
            {/* Toolbar estilo EntradaAlmacen */}
            <div style={{ padding: '16px 24px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 16, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 16, marginLeft: 8 }}>
                        {toTitleCase(nomEntidad || '')}
                    </Text>
                    {codEntidad && (
                        <Text style={{ color: '#8c8c8c', fontSize: 13 }}>
                            ({codEntidad})
                        </Text>
                    )}
                    <div style={{ flex: 1 }} />
                    {selectedDocs.length > 0 && selectedDocs.some((d: any) => d.esSobrepago !== selectedDocs[0].esSobrepago) ? (
                        <Text style={{ color: '#ff4d4f', fontSize: 12 }}>Selecciona solo sobrepagos o solo saldos positivos</Text>
                    ) : (
                        <Button
                            type="primary"
                            disabled={selectedDocs.length === 0}
                            onClick={() => ajustarSaldo(selectedDocs)}
                        >
                            Ajustar Saldo ({selectedDocs.length})
                        </Button>
                    )}
                    <Button icon={<ReloadOutlined />} onClick={cargarDatos} />
                </div>
            </div>

            {error && (
                <Alert
                    message={error}
                    type="error"
                    showIcon
                    style={{ margin: '0 24px 16px' }}
                    action={<Button size="small" onClick={cargarDatos}>Reintentar</Button>}
                />
            )}

            <Table
                dataSource={documentos}
                columns={columnas}
                rowKey={(r) => r.id}
                rowSelection={{
                type: 'checkbox' as const,
                onChange: (_: React.Key[], selectedRows: any[]) => {
                setSelectedDocs(selectedRows);
                },
}}
                loading={loading}
                size="small"
                className="paces-border-top paces-list-table"
                rowClassName={() => 'paces-row-hover'}
                pagination={{
                    pageSize: 25,
                    showTotal: (t) => `${t} documentos`,
                    showSizeChanger: false,
                }}
                scroll={{ x: 1100 }}
                locale={{
                    emptyText: (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <Text style={{ color: '#8c8c8c' }}>No hay documentos pendientes</Text>
                        </div>
                    ),
                }}
            />
        </Card>
    );
};

export default DetalleSuplidor;
