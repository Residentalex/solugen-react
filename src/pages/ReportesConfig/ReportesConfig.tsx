import React, { useEffect, useState, useCallback } from 'react';
import { Card, message, Modal, Form, Input, Select } from 'antd';
import { useUIStore } from '../../stores/uiStore';
import { reportesConfigApi } from '../../api/reportesConfigApi';
import type { ReportePlantillaListaDTO } from '../../types/reportesConfig';
import ReportesConfigEditor from './ReportesConfigEditor';
import './ReportesConfig.css';

const TIPOS_PLANTILLA = [
  { value: 'TICKET_POS', label: 'Ticket POS (Factura POS)' },
  { value: 'TICKET_RI', label: 'Ticket RI (Recibo Ingreso)' },
  { value: 'TICKET_VSNT', label: 'Ticket VSNT (Voucher Visanet)' },
];

const TIPOS_DOC_TICKET = ['PV', 'RI', 'NC'];

const ReportesConfig: React.FC = () => {
  const setActiveModule = useUIStore((s) => s.setActiveModule);
  const setPageTitleOverride = useUIStore((s) => s.setPageTitleOverride);

  const [plantillas, setPlantillas] = useState<ReportePlantillaListaDTO[]>([]);
  const [loading, setLoading] = useState(false);
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
      message.error(err?.response?.data?.errorMessage || 'Error al cargar las plantillas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPlantillas();
  }, [cargarPlantillas]);

  const handleCrearPlantilla = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreando(true);
      const nueva = await reportesConfigApi.crear({
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
      cargarPlantillas();
    } catch (err: any) {
      message.error(err?.response?.data?.errorMessage || 'Error al asignar la plantilla');
    }
  }, [entdocAsignaciones, cargarPlantillas]);

  const handleNuevaPlantilla = useCallback(() => {
    setModalNuevoOpen(true);
  }, []);

  return (
    <>
      <Card className="paces-card-erp" style={{ borderRadius: 8 }}>
        <ReportesConfigEditor
          plantillas={plantillas}
          entdocAsignaciones={entdocAsignaciones}
          onSelectPlantilla={(id) => {/* se maneja internamente */}}
          onNuevaPlantilla={handleNuevaPlantilla}
          onAsignarEntdoc={handleAsignarEntdoc}
          onRefresh={cargarPlantillas}
        />
      </Card>

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
