import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, Button, Tag, Spin, Alert, Row, Col, Empty, Tooltip, message, Typography,
  Modal, Form, Input, Select,
} from 'antd';
import { ReloadOutlined, FileTextOutlined, CheckCircleFilled, PlusOutlined } from '@ant-design/icons';
import { useUIStore } from '../../stores/uiStore';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import type { ReportePlantillaListaDTO } from '../../types/reportesConfig';
import ReportesConfigEditor from './ReportesConfigEditor';
import './ReportesConfig.css';

const { Text } = Typography;

const TIPOS_PLANTILLA = [
  { value: 'TICKET_POS', label: 'Ticket POS (Factura POS)' },
  { value: 'TICKET_RI', label: 'Ticket RI (Recibo Ingreso)' },
  { value: 'TICKET_VSNT', label: 'Ticket VSNT (Voucher Visanet)' },
];

const TIPOS_DOC_TICKET = ['PV', 'RI', 'NC'];

/**
 * Configuración de plantillas de tickets ESC/POS (reportes config).
 * En pantallas grandes (xxl): lista como selector de cards (5/19) +
 * editor con vista previa a la derecha. En pantallas menores: apilado.
 */
const ReportesConfig: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [plantillas, setPlantillas] = useState<ReportePlantillaListaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [creando, setCreando] = useState(false);
  const [entdocAsignaciones, setEntdocAsignaciones] = useState<Record<string, number | null>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    setActiveModule('REPORTESCONFIG');
    setPageTitleOverride('Configuración de Plantillas de Tickets');
    return () => setPageTitleOverride('');
  }, [setActiveModule, setPageTitleOverride]);

  const cargarPlantillas = useCallback(async () => {
    setLoading(true);
    setLoadingError(false);
    try {
      const data = await reportesConfigApi.obtenerListado();
      setPlantillas(data || []);
      const asignaciones: Record<string, number | null> = {};
      await Promise.all(
        TIPOS_DOC_TICKET.map(async (codigo) => {
          try {
            const p = await reportesConfigApi.obtenerPorEntdoc(codigo);
            asignaciones[codigo] = p?.plantillaId ?? null;
          } catch {
            asignaciones[codigo] = null;
          }
        }),
      );
      setEntdocAsignaciones(asignaciones);
    } catch (err: any) {
      setLoadingError(true);
      message.error(err?.response?.data?.errorMessage || 'Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPlantillas();
  }, [cargarPlantillas]);

  const plantillaSeleccionada = useMemo(
    () => plantillas.find((p) => p.plantillaId === selectedId) || null,
    [plantillas, selectedId],
  );

  const handleRefresh = () => {
    cargarPlantillas();
  };

  const handleGuardado = useCallback(() => {
    cargarPlantillas();
  }, [cargarPlantillas]);

  const handleCrearPlantilla = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreando(true);
      await reportesConfigApi.crear({
        codigo: values.codigo.toUpperCase(),
        nombre: values.nombre,
        tipo: values.tipo,
      });
      message.success('Plantilla creada correctamente');
      setModalNuevoOpen(false);
      form.resetFields();
      cargarPlantillas();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.response?.data?.errorMessage || 'Error al crear la plantilla');
    } finally {
      setCreando(false);
    }
  }, [form, cargarPlantillas]);

  const handleAsignarEntdoc = useCallback(async (plantillaId: number, entdocCodigo: string | null) => {
    try {
      const codigoAnterior = Object.entries(entdocAsignaciones).find(([, pid]) => pid === plantillaId)?.[0];
      if (codigoAnterior && codigoAnterior !== entdocCodigo) {
        await reportesConfigApi.asignarEntdoc(codigoAnterior, null);
        setEntdocAsignaciones((prev) => ({ ...prev, [codigoAnterior]: null }));
      }
      await reportesConfigApi.asignarEntdoc(entdocCodigo ?? '', entdocCodigo ? plantillaId : null);
      setEntdocAsignaciones((prev) => ({
        ...prev,
        ...(entdocCodigo ? { [entdocCodigo]: plantillaId } : {}),
      }));
      message.success(entdocCodigo ? `Asignada a ${entdocCodigo}` : 'Asignación removida');
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al asignar la plantilla');
      cargarPlantillas();
    }
  }, [entdocAsignaciones, cargarPlantillas]);

  return (
    <>
      <Row gutter={16}>
        {/* ===== Lista / selector de plantillas ===== */}
        <Col xxl={5} span={24}>
          <Card
            className="paces-card-erp paces-card-erp-padded"
            style={{ borderRadius: 8, marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ fontSize: 15, color: '#1a1d21', display: 'block' }}>
                  Plantillas
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {plantillas.length} plantilla{plantillas.length !== 1 ? 's' : ''}
                </Text>
              </div>
              <Tooltip title="Nueva plantilla">
                <Button icon={<PlusOutlined />} type="primary" onClick={() => setModalNuevoOpen(true)} />
              </Tooltip>
              <Tooltip title="Recargar">
                <Button icon={<ReloadOutlined />} onClick={handleRefresh} />
              </Tooltip>
            </div>

            {loadingError && (
              <Alert
                message="Error al cargar plantillas"
                type="error"
                showIcon
                style={{ marginBottom: 12 }}
                action={<Button size="small" onClick={handleRefresh}>Reintentar</Button>}
              />
            )}

            {loading ? (
              <div className="rc-plantillas-state">
                <Spin />
              </div>
            ) : plantillas.length === 0 ? (
              <div className="rc-plantillas-state">
                <Empty description="No hay plantillas" />
              </div>
            ) : (
              <div className="rc-plantillas-lista">
                {plantillas.map((p) => {
                  const seleccionada = p.plantillaId === selectedId;
                  return (
                    <div
                      key={p.plantillaId}
                      className={`rc-plantilla-card${seleccionada ? ' is-selected' : ''}`}
                      onClick={() => setSelectedId(p.plantillaId)}
                    >
                      <div className="rc-plantilla-icon">
                        <FileTextOutlined style={{ fontSize: 20, color: '#fff' }} />
                      </div>
                      <div className="rc-plantilla-info">
                        <Text strong ellipsis style={{ fontSize: 14, color: '#1a1d21' }}>
                          {p.nombre}
                        </Text>
                        <div className="rc-plantilla-meta">
                          <Tag
                            color={p.tieneConfig ? 'blue' : 'default'}
                            style={{ margin: 0, fontSize: 11, lineHeight: '18px' }}
                          >
                            {p.tieneConfig ? 'Personalizada' : 'Predeterminada'}
                          </Tag>
                          <Text type="secondary" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                            {p.codigo}
                          </Text>
                        </div>
                        <div
                          style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Select
                            size="small"
                            placeholder="Sin asignar"
                            style={{ width: 150, fontSize: 11 }}
                            value={Object.entries(entdocAsignaciones).find(([, pid]) => pid === p.plantillaId)?.[0]}
                            onChange={(val: string | undefined) => handleAsignarEntdoc(p.plantillaId, val ?? null)}
                            options={TIPOS_DOC_TICKET.map((cod) => ({ value: cod, label: cod }))}
                            allowClear
                          />
                        </div>
                      </div>
                      {seleccionada && <CheckCircleFilled className="rc-plantilla-check" />}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* ===== Editor + vista previa ===== */}
        <Col xxl={19} span={24}>
          {plantillaSeleccionada ? (
            <ReportesConfigEditor
              key={plantillaSeleccionada.plantillaId}
              plantilla={plantillaSeleccionada}
              onVolver={() => setSelectedId(null)}
              onGuardado={handleGuardado}
            />
          ) : (
            <Card
              className="paces-card-erp paces-card-erp-padded"
              style={{ borderRadius: 8, minHeight: 320 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '80px 0' }}>
                <Text type="secondary">Seleccione una plantilla de la lista para editarla</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Las plantillas controlan el formato de los tickets ESC/POS (Factura POS y Recibo de Ingreso).
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="Nueva plantilla"
        open={modalNuevoOpen}
        onOk={handleCrearPlantilla}
        onCancel={() => { setModalNuevoOpen(false); form.resetFields(); }}
        confirmLoading={creando}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Codigo"
            rules={[{ required: true, message: 'El codigo es obligatorio' }]}
          >
            <Input placeholder="Ej: FPV_TICKET_PROMO" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Ej: Factura POS Promocional" />
          </Form.Item>
          <Form.Item
            name="tipo"
            label="Tipo"
            rules={[{ required: true, message: 'El tipo es obligatorio' }]}
          >
            <Select options={TIPOS_PLANTILLA} placeholder="Seleccione el tipo" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ReportesConfig;
